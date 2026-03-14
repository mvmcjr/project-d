
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
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
        let htmlUrl: string | null = null;
        if (url.pathname === "/log") {
            htmlUrl = url.toString(); // capture the /log URL before rewriting
            url.pathname = "/dlog";
            fetchUrl = url.toString();
        }

        // Fetch CSV (and optionally the HTML page for the log name) in parallel.
        const [response, htmlResponse] = await Promise.all([
            fetch(fetchUrl),
            htmlUrl ? fetch(htmlUrl) : Promise.resolve(null),
        ]);

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch from Bootmod3: ${response.statusText}` },
                { status: response.status }
            );
        }

        const csvText = await response.text();

        // Extract log name from the HTML page if available.
        let logName: string | null = null;
        if (htmlResponse?.ok) {
            const html = await htmlResponse.text();
            const match = html.match(/<pre[^>]*id="log-name"[^>]*>([^<]*)<\/pre>/i);
            if (match) {
                logName = match[1].trim();
            }
        }

        const responseHeaders: Record<string, string> = {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="bootmod3_log.csv"`,
        };
        if (logName) {
            responseHeaders["X-Log-Name"] = logName;
        }

        return new NextResponse(csvText, {
            status: 200,
            headers: responseHeaders,
        });

    } catch (error) {
        console.error("Proxy error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
