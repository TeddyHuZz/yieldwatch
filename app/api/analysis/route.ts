import { NextResponse } from "next/server"
import YahooFinance from "yahoo-finance2"

const yahooFinance = new YahooFinance()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  const symbolUpper = symbol.toUpperCase().trim()

  try {
    // 1. Fetch Quote Details (Moving Averages, Price, Yield, P/E)
    const quote = await yahooFinance.quote(symbolUpper)
    if (!quote) throw new Error("Ticker quote not found")

    // 2. Fetch Quote Summary (Payout Ratio, Beta, Return on Equity)
    let payoutRatio: number | null = null
    let beta: number | null = null
    let roe: number | null = null

    try {
      const summary = await yahooFinance.quoteSummary(symbolUpper, {
        modules: ["defaultKeyStatistics", "financialData", "summaryDetail"],
      })

      if (summary) {
        payoutRatio = summary.summaryDetail?.payoutRatio ?? null
        beta = summary.summaryDetail?.beta ?? null
        roe = summary.financialData?.returnOnEquity ?? null
      }
    } catch (summaryError) {
      console.warn(`Failed to retrieve quote summary details for ${symbolUpper}:`, summaryError)
      // Non-blocking: proceed with basic quote parameters
    }

    // 3. Extract core metrics
    const price = quote.regularMarketPrice ?? quote.regularMarketOpen ?? 0
    const fiftyDayAverage = quote.fiftyDayAverage ?? 0
    const twoHundredDayAverage = quote.twoHundredDayAverage ?? 0
    const peRatio = quote.trailingPE ?? quote.forwardPE ?? null
    const companyName = quote.longName ?? quote.shortName ?? symbolUpper
    
    // Normalize dividend yield as percentage (e.g. 4.5 for 4.5%)
    let dividendYield = 0
    if (quote.dividendYield !== undefined) {
      dividendYield = quote.dividendYield
    } else if (quote.yield !== undefined) {
      dividendYield = quote.yield * 100
    }

    // 4. Scoring Algorithm (Dividend Safety Score out of 100)
    let score = 100

    // Payout Ratio Deductions (Max 40 points)
    if (payoutRatio !== null && payoutRatio !== undefined) {
      if (payoutRatio > 0.90) {
        score -= 40 // Very high / unsafe payout (dividend trap risk)
      } else if (payoutRatio > 0.75 && payoutRatio <= 0.90) {
        score -= 15 // Borderline payout
      } else if (payoutRatio < 0.30) {
        score -= 10 // Low payout: Safe, but suggests lower income efficiency
      }
    }

    // Beta / Volatility Deductions (Max 30 points)
    if (beta !== null && beta !== undefined) {
      if (beta >= 1.4) {
        score -= 30 // High market swings
      } else if (beta >= 1.0 && beta < 1.4) {
        score -= 15 // Moderate market swings
      }
    }

    // Return on Equity / ROE Deductions (Max 30 points)
    if (roe !== null && roe !== undefined) {
      if (roe < 0.05) {
        score -= 25 // Very low or negative capital returns
      } else if (roe >= 0.05 && roe < 0.10) {
        score -= 10 // Average capital returns
      }
    }

    // Grade classification
    let safetyGrade: "Safe" | "Moderate" | "Speculative" = "Safe"
    if (score >= 80) {
      safetyGrade = "Safe"
    } else if (score >= 50 && score < 80) {
      safetyGrade = "Moderate"
    } else {
      safetyGrade = "Speculative"
    }

    // 5. Market Trend sentiment based on Moving Averages (MA)
    let trend: "Bullish" | "Bearish" | "Neutral" = "Neutral"
    if (price && fiftyDayAverage && twoHundredDayAverage) {
      if (price > fiftyDayAverage && price > twoHundredDayAverage) {
        trend = "Bullish"
      } else if (price < fiftyDayAverage && price < twoHundredDayAverage) {
        trend = "Bearish"
      } else {
        trend = "Neutral"
      }
    }

    // Return full result payload
    return NextResponse.json({
      ticker: symbolUpper,
      companyName,
      price,
      dividendYield,
      payoutRatio,
      beta,
      roe,
      peRatio,
      fiftyDayAverage,
      twoHundredDayAverage,
      score,
      safetyGrade,
      trend,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
      }
    })
  } catch (error: any) {
    console.error(`Failed to analyze stock ${symbolUpper}:`, error)
    return NextResponse.json({ error: error.message || "Failed to analyze ticker" }, { status: 500 })
  }
}
