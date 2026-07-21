import { NextResponse } from "next/server"
import YahooFinance from "yahoo-finance2"

const yahooFinance = new YahooFinance()

async function getDividendFrequency(symbol: string): Promise<string> {
  try {
    const end = new Date()
    const start = new Date()
    start.setFullYear(end.getFullYear() - 2) // 2 years back

    const period1 = start.toISOString().split("T")[0]
    const period2 = end.toISOString().split("T")[0]

    const dividends = await yahooFinance.historical(symbol, {
      period1,
      period2,
      events: "dividends",
    }) as any[]

    if (!dividends || dividends.length === 0) {
      return "quarterly" // default fallback
    }

    // Filter out very small special dividends / adjustments (e.g. less than 20% of average dividend)
    const values = dividends.map(d => d.dividends)
    const avgDividend = values.reduce((sum, v) => sum + v, 0) / values.length
    const mainDividends = dividends.filter(d => d.dividends >= avgDividend * 0.2)

    const count = mainDividends.length
    // Average payouts per year
    const payoutsPerYear = count / 2

    if (payoutsPerYear > 8) {
      return "monthly"
    } else if (payoutsPerYear > 2.5) {
      return "quarterly"
    } else if (payoutsPerYear > 1.2) {
      return "semi-annually"
    } else {
      return "annually"
    }
  } catch (e) {
    console.warn(`Failed to fetch historical dividends for ${symbol}:`, e)
    return "quarterly" // fallback
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 })
  }

  try {
    const symbolUpper = symbol.toUpperCase()
    
    // Fetch basic quote to get current price and names
    const quoteResult = (await yahooFinance.quote(symbolUpper)) as any
    
    let dividendYield = 0
    let annualDividendPerShare = 0
    let companyName = quoteResult.longName || quoteResult.shortName || symbolUpper
    const currentPrice = quoteResult.regularMarketPrice ?? 0

    const dayChange = quoteResult.regularMarketChange ?? 0
    const dayChangePercent = quoteResult.regularMarketChangePercent ?? 0
    const volume = quoteResult.regularMarketVolume ?? 0
    let exDividendDate = ""

    if (quoteResult.exDividendDate) {
      const exDate = new Date(quoteResult.exDividendDate)
      if (!isNaN(exDate.getTime())) {
        exDividendDate = exDate.toISOString().split("T")[0]
      }
    }

    let peRatio = quoteResult.trailingPE || 0
    let priceToBook = 0
    let returnOnEquity = 0
    let eps = quoteResult.trailingEps || 0

    let summary: any = null
    try {
      // Try quoteSummary for deep dividend detail modules
      summary = (await yahooFinance.quoteSummary(symbolUpper, {
        modules: ["summaryDetail", "price", "defaultKeyStatistics", "financialData", "calendarEvents"],
      })) as any

      if (summary) {
        const detail = summary.summaryDetail
        if (detail) {
          // Yahoo Finance yield is represented as fraction (e.g. 0.035 for 3.5%)
          dividendYield = detail.trailingAnnualDividendYield 
            ? detail.trailingAnnualDividendYield * 100 
            : detail.yield 
              ? detail.yield * 100 
              : 0
              
          annualDividendPerShare = detail.trailingAnnualDividendRate || detail.dividendRate || 0

          if (detail.exDividendDate) {
            const exDate = new Date(detail.exDividendDate)
            if (!isNaN(exDate.getTime())) {
              exDividendDate = exDate.toISOString().split("T")[0]
            }
          }

          if (detail.trailingPE) {
            peRatio = detail.trailingPE
          }
        }

        if (summary.defaultKeyStatistics) {
          const stats = summary.defaultKeyStatistics
          priceToBook = stats.priceToBook || 0
          if (stats.trailingEps) {
            eps = stats.trailingEps
          }
          if (!peRatio && stats.trailingPE) {
            peRatio = stats.trailingPE
          }
        }

        if (summary.financialData) {
          const finData = summary.financialData
          returnOnEquity = finData.returnOnEquity ? finData.returnOnEquity * 100 : 0
        }

        if (summary.price?.longName) {
          companyName = summary.price.longName
        } else if (summary.price?.shortName) {
          companyName = summary.price.shortName
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch quoteSummary details for ${symbolUpper}, using basic quote:`, e)
      dividendYield = quoteResult.trailingAnnualDividendYield ? quoteResult.trailingAnnualDividendYield * 100 : 0
      annualDividendPerShare = quoteResult.trailingAnnualDividendRate || 0
    }

    // Determine the payoutMonth based on the actual dividend date or ex-dividend date from Yahoo Finance
    let payoutMonth = 0 // default January
    if (summary) {
      if (summary.calendarEvents?.dividendDate) {
        const pDate = new Date(summary.calendarEvents.dividendDate)
        if (!isNaN(pDate.getTime())) {
          payoutMonth = pDate.getMonth()
        }
      } else if (exDividendDate) {
        const exDate = new Date(exDividendDate)
        if (!isNaN(exDate.getTime())) {
          payoutMonth = exDate.getMonth()
        }
      }
    }

    // Fetch and calculate the actual dividend payout frequency dynamically
    const frequency = await getDividendFrequency(symbolUpper)

    // Try to get historical price if purchaseDate is provided
    const purchaseDate = searchParams.get("purchaseDate")
    let purchasePrice = currentPrice

    if (purchaseDate) {
      try {
        const targetTime = new Date(purchaseDate).getTime()
        if (!isNaN(targetTime)) {
          // Fetch historical data for a 10-day window around the purchase date to cover weekends/holidays
          const period1 = new Date(targetTime - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          const period2 = new Date(targetTime + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

          const historicalData = (await yahooFinance.historical(symbolUpper, {
            period1,
            period2,
            interval: "1d",
          })) as any[]

          if (historicalData && historicalData.length > 0) {
            let closestItem = historicalData[0]
            let minDiff = Infinity

            for (const item of historicalData) {
              const itemTime = new Date(item.date).getTime()
              const diff = Math.abs(itemTime - targetTime)
              if (diff < minDiff) {
                minDiff = diff
                closestItem = item
              }
            }

            const historicalPrice = closestItem.close || closestItem.adjClose || closestItem.open || 0
            if (historicalPrice > 0) {
              purchasePrice = historicalPrice
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch historical price for ${symbolUpper} on ${purchaseDate}:`, e)
      }
    }

    return NextResponse.json({
      symbol: symbolUpper,
      companyName,
      currentPrice,
      purchasePrice,
      dividendYield,
      annualDividendPerShare,
      frequency,
      payoutMonth,
      dayChange,
      dayChangePercent,
      volume,
      exDividendDate,
      peRatio,
      priceToBook,
      returnOnEquity,
      eps,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
      }
    })
  } catch (error: any) {
    console.error(`Yahoo Finance quote error for ${symbol}:`, error)
    return NextResponse.json({ error: error.message || "Failed to fetch quote" }, { status: 500 })
  }
}
