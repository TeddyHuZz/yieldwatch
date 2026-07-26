import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // 1. Check CDN/Edge Geo IP headers (Vercel, Cloudflare, etc.)
    const headerCountry =
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") ||
      request.headers.get("x-country")

    if (headerCountry && headerCountry !== "XX") {
      return NextResponse.json({
        country: headerCountry.toUpperCase(),
        source: "header",
      })
    }

    // 2. Extract Client IP
    const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || ""
    const isLocalIp = !rawIp || rawIp === "127.0.0.1" || rawIp === "::1" || rawIp.startsWith("192.168.") || rawIp.startsWith("10.")

    const queryUrl = isLocalIp
      ? "http://ip-api.com/json/" // ip-api returns caller's public IP when querying root
      : `http://ip-api.com/json/${rawIp}`

    const res = await fetch(queryUrl, {
      cache: "no-store",
      headers: { "User-Agent": "YieldWatch/1.0" },
    })

    if (res.ok) {
      const data = await res.json()
      if (data && data.countryCode) {
        return NextResponse.json({
          country: data.countryCode.toUpperCase(),
          city: data.city || "",
          source: "ip-api",
        })
      }
    }

    return NextResponse.json({ country: "US", source: "fallback" })
  } catch (err: any) {
    console.warn("Geo IP detection error:", err)
    return NextResponse.json({ country: "US", source: "fallback-error" })
  }
}
