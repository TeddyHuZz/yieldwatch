import { NextResponse } from "next/server"
import YahooFinance from "yahoo-finance2"

const yahooFinance = new YahooFinance()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")
  const range = searchParams.get("range") || "1m" // 1d, 1w, 1m, 1y, 5y

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  const symbolUpper = symbol.toUpperCase().trim()

  try {
    let period1 = new Date()
    let interval: "15m" | "1h" | "1d" | "1wk" | "1mo" = "1d"

    const now = new Date()
    switch (range) {
      case "1d":
        // 1 Day: Fetch 15-minute interval quotes for last 24h
        period1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
        interval = "15m"
        break
      case "1w":
        // 1 Week: Fetch 1-hour interval quotes for last 7d
        period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        interval = "1h"
        break
      case "1m":
        // 1 Month: Fetch daily quotes for last 30d
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        interval = "1d"
        break
      case "1y":
        // 1 Year: Fetch weekly quotes for last 365d
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        interval = "1wk"
        break
      case "5y":
        // 5 Years: Fetch monthly quotes for last 5 years
        period1 = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
        interval = "1mo"
        break
      default:
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        interval = "1d"
    }

    const result = await yahooFinance.chart(symbolUpper, {
      period1,
      interval,
    })

    // Format output to simple array objects
    const formattedData = (result.quotes || [])
      .filter((q: any) => q.close !== null && q.close !== undefined)
      .map((q: any) => ({
        date: new Date(q.date).toISOString(),
        price: Number(q.close.toFixed(4)),
      }))

    return NextResponse.json(formattedData)
  } catch (error: any) {
    console.error(`Failed to fetch history for ${symbolUpper}:`, error)
    return NextResponse.json({ error: error.message || "Failed to retrieve history" }, { status: 500 })
  }
}
