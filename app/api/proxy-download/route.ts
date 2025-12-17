import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams; // Use nextUrl for cleaner access
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
    }

    try {
        // Basic validation
        if (!url.startsWith("http")) {
            return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
        }

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
            return NextResponse.json({ error: "Failed to fetch source file" }, { status: response.status });
        }

        // Get the content type from the original response or default to webm
        const contentType = response.headers.get("content-type") || "video/webm";
        const contentLength = response.headers.get("content-length");

        // Create new headers
        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set("Content-Disposition", `attachment; filename="interview-recording-${new Date().toISOString().split('T')[0]}.webm"`);
        if (contentLength) {
            headers.set("Content-Length", contentLength);
        }

        // Return the stream
        return new NextResponse(response.body, {
            status: 200,
            headers: headers,
        });

    } catch (error: any) {
        console.error("Proxy download error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
