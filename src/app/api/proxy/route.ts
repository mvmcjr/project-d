
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const urlParam = searchParams.get("url");

    if (!urlParam) {
        return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    try {
        const url = new URL(urlParam);

        // Basic validation to ensure we're only proxying bootmod3 URLs
        if (!url.hostname.includes("bootmod3.net")) {
            return NextResponse.json({ error: "Invalid domain. Only bootmod3.net URLs are supported." }, { status: 400 });
        }

        // Logic to transform /log to /dlog
        // https://bootmod3.net/log?id=xyz -> https://bootmod3.net/dlog?id=xyz
        let fetchUrl = url.toString();
        if (url.pathname === "/log") {
            url.pathname = "/dlog";
            fetchUrl = url.toString();
        }

        // Fetch from bootmod3 - server-side fetch doesn't send the browser's referer by default, 
        // or we can set a neutral one if needed.
        const response = await fetch(fetchUrl);

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch from Bootmod3: ${response.statusText}` },
                { status: response.status }
            );
        }

        const csvText = await response.text();

        return new NextResponse(csvText, {
            status: 200,
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="bootmod3_log.csv"`,
            },
        });

    } catch (error) {
        console.error("Proxy error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
