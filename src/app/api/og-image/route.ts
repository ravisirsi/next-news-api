// src/app/api/og-image/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { status: "error", message: "URL parameter is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: "Could not fetch URL" },
        { status: 404 }
      );
    }

    const html = await response.text();

    // Extract og:image meta tag
    let imageUrl: string | null = null;

    // Try og:image (property before content)
    const ogMatch1 = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogMatch1) imageUrl = ogMatch1[1];

    // Try og:image (content before property)
    if (!imageUrl) {
      const ogMatch2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      if (ogMatch2) imageUrl = ogMatch2[1];
    }

    // Try twitter:image as fallback
    if (!imageUrl) {
      const twMatch = html.match(/<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
      if (twMatch) imageUrl = twMatch[1];
    }

    if (!imageUrl) {
      return NextResponse.json(
        { status: "error", message: "No og:image found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { status: "success", imageUrl },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );

  } catch (error) {
    console.error("Error fetching og:image:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch image" },
      { status: 500 }
    );
  }
}
