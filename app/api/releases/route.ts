import { NextResponse } from "next/server";

const REPO_OWNER = "OpenCalendarsHQ";
const REPO_NAME = "opencalendar";

export async function GET() {
  const token = process.env.GITHUB_RELEASES_TOKEN;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`;
  console.log("Fetching releases from:", url);
  console.log("Using token:", token ? "Yes" : "No");

  try {
    // Get all releases and find the latest non-prerelease
    const response = await fetch(url, { 
      headers, 
      cache: 'no-store' // Disable cache for immediate updates
    });

    console.log("GitHub API response:", response.status, response.statusText);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("GitHub API error body:", errorBody);
      return NextResponse.json(null);
    }

    const releases = await response.json();
    console.log("Total releases found:", releases.length);
    
    if (!releases.length) {
      console.error("No releases found");
      return NextResponse.json(null);
    }

    // Find first non-draft, non-prerelease release, or fallback to first release
    const rel = releases.find((r: { draft: boolean; prerelease: boolean }) => !r.draft && !r.prerelease) || releases[0];
    
    console.log("Selected release:", rel.tag_name, "with", rel.assets?.length, "assets");
    if (rel.assets?.length > 0) {
      console.log("Asset names:", rel.assets.map((a: any) => a.name).join(", "));
    }
    
    // Replace GitHub URLs with our proxy URLs for private repo
    return NextResponse.json({
      tag_name: rel.tag_name,
      assets: rel.assets.map((a: { name: string; browser_download_url: string; size: number }) => ({
        name: a.name,
        browser_download_url: `/api/releases/download/${rel.tag_name}/${a.name}`,
        size: a.size,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch releases:", error);
    return NextResponse.json(null);
  }
}
