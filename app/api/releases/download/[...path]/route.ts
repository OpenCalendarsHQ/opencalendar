import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const token = process.env.GITHUB_RELEASES_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Await params in Next.js 15+
  const { path } = await params;

  // Reconstruct the GitHub download URL from path segments
  // path will be like: ["v34", "OpenCalendars_0.2.0_x64_en-US.msi"]
  const tag = path[0];
  const filename = path.slice(1).join("/");
  
  const downloadUrl = `https://api.github.com/repos/OpenCalendarsHQ/opencalendar/releases/assets/${filename}`;

  try {
    // First, get the release to find the asset ID
    const releaseResponse = await fetch(
      `https://api.github.com/repos/OpenCalendarsHQ/opencalendar/releases/tags/${tag}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!releaseResponse.ok) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    const release = await releaseResponse.json();
    const asset = release.assets.find((a: any) => a.name === filename);

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Download the asset with authentication
    const assetResponse = await fetch(asset.url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/octet-stream",
      },
    });

    if (!assetResponse.ok) {
      return NextResponse.json({ error: "Failed to download asset" }, { status: 500 });
    }

    // Stream the file back to the client
    const blob = await assetResponse.blob();
    
    return new NextResponse(blob, {
      headers: {
        "Content-Type": assetResponse.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": assetResponse.headers.get("Content-Length") || "",
      },
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
