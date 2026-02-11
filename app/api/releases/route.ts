import { NextResponse } from "next/server";

const REPO_OWNER = "ArjandenHartog";
const REPO_NAME = "opencalendar";

export async function GET() {
  const token = process.env.GITHUB_RELEASES_TOKEN;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    // Try "latest" tag first (used by the CI workflow)
    let response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/latest`,
      { headers, next: { revalidate: 300 } } // cache 5 min
    );

    if (!response.ok) {
      // Fallback: get latest release by date
      response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
        { headers, next: { revalidate: 300 } }
      );

      if (!response.ok) {
        return NextResponse.json(null);
      }

      const releases = await response.json();
      if (!releases.length) {
        return NextResponse.json(null);
      }

      const rel = releases[0];
      return NextResponse.json({
        tag_name: rel.tag_name,
        assets: rel.assets.map((a: { name: string; browser_download_url: string; size: number }) => ({
          name: a.name,
          browser_download_url: a.browser_download_url,
          size: a.size,
        })),
      });
    }

    const rel = await response.json();
    return NextResponse.json({
      tag_name: rel.tag_name,
      assets: rel.assets.map((a: { name: string; browser_download_url: string; size: number }) => ({
        name: a.name,
        browser_download_url: a.browser_download_url,
        size: a.size,
      })),
    });
  } catch {
    return NextResponse.json(null);
  }
}
