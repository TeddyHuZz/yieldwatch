import { NextResponse } from "next/server"
import YahooFinance from "yahoo-finance2"

const yahooFinance = new YahooFinance()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter q" }, { status: 400 })
  }

  try {
    // Search symbols using yahoo-finance2
    const result = (await yahooFinance.search(query, {
      newsCount: 0,
    })) as any

    // Filter and map quotes
    const suggestions = (result.quotes || [])
      .filter(
        (quote: any) =>
          quote.quoteType === "EQUITY" ||
          quote.quoteType === "ETF" ||
          quote.quoteType === "MUTUALFUND"
      )
      .map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        exchange: quote.exchange,
        type: quote.quoteType,
      }))
      .slice(0, 8) // Limit results for readability

    return NextResponse.json(suggestions)
  } catch (error: any) {
    console.error("Yahoo Finance search error:", error)
    return NextResponse.json({ error: error.message || "Failed to search ticker" }, { status: 500 })
  }
}
