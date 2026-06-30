import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Query keyless Open Exchange Rates endpoint, cache the query for 1 hour in Next.js fetch cache
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    })

    if (!res.ok) throw new Error("Failed to retrieve exchange rates")
    const data = await res.json()

    return NextResponse.json(
      {
        rates: data.rates,
        base: "USD",
        lastUpdated: data.time_last_update_utc,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
        },
      }
    )
  } catch (err: any) {
    console.error("Exchange rate fetch error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to load exchange rates" },
      { status: 500 }
    )
  }
}
