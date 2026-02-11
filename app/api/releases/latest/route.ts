import { NextResponse } from "next/server";

const REPO_OWNER = "ArjandenHartog";
const REPO_NAME = "opencalendar";

interface TauriPlatform {
  signature: string;
  url: string;
}

interface TauriUpdateResponse {
  version: string;
  notes: string;
  pub_date: string;
  platforms: {
    [key: string]: TauriPlatform;
  };
}

export async function GET() {
  const token = process.env.GITHUB_RELEASES_TOKEN;

  if (!token) {
    console.error("GITHUB_RELEASES_TOKEN not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `token ${token}`,
  };

  try {
    // Try "latest" tag first (used by the CI workflow)
    let response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/latest`,
      { headers, next: { revalidate: 300 } } // cache 5 min
    );

    let release: any;

    if (!response.ok) {
      // Fallback: get latest release by date
      response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
        { headers, next: { revalidate: 300 } }
      );

      if (!response.ok) {
        return NextResponse.json(null, { status: 404 });
      }

      const releases = await response.json();
      if (!releases.length) {
        return NextResponse.json(null, { status: 404 });
      }

      release = releases[0];
    } else {
      release = await response.json();
    }

    // Transform to Tauri updater format
    const tauriResponse: TauriUpdateResponse = {
      version: release.tag_name.replace(/^v/, ""), // Remove 'v' prefix if present
      notes: release.body || "New version available",
      pub_date: release.published_at || new Date().toISOString(),
      platforms: {},
    };

    // Parse assets and map to Tauri platforms
    for (const asset of release.assets || []) {
      const name = asset.name.toLowerCase();
      
      // Windows x64 - Look for .msi.zip.sig files
      if (name.endsWith(".msi.zip.sig")) {
        const downloadUrl = asset.browser_download_url.replace(".sig", "");
        const sigResponse = await fetch(asset.browser_download_url, { headers });
        const signature = await sigResponse.text();
        
        tauriResponse.platforms["windows-x86_64"] = {
          signature: signature.trim(),
          url: downloadUrl,
        };
      }
      
      // Linux x64 - Look for .AppImage.tar.gz.sig files
      else if (name.includes("amd64") && name.endsWith(".appimage.tar.gz.sig")) {
        const downloadUrl = asset.browser_download_url.replace(".sig", "");
        const sigResponse = await fetch(asset.browser_download_url, { headers });
        const signature = await sigResponse.text();
        
        tauriResponse.platforms["linux-x86_64"] = {
          signature: signature.trim(),
          url: downloadUrl,
        };
      }
    }

    // Only return update if we have at least one platform
    if (Object.keys(tauriResponse.platforms).length === 0) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(tauriResponse);
  } catch (error) {
    console.error("Failed to fetch release data:", error);
    return NextResponse.json({ error: "Failed to fetch release data" }, { status: 500 });
  }
}
