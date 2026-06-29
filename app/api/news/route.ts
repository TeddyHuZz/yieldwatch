import { NextResponse } from "next/server"
import YahooFinance from "yahoo-finance2"

const yahooFinance = new YahooFinance()

// Custom XML RSS feed fetcher and parser
async function fetchRssFeed(url: string, defaultSource: string) {
  try {
    const res = await fetch(url, {
      next: { revalidate: 600 }, // Cache for 10 minutes
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })
    if (!res.ok) throw new Error(`HTTP error ${res.status}`)
    const xml = await res.text()

    const items: any[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    while ((match = itemRegex.exec(xml)) !== null) {
      const content = match[1]

      // Extract title
      const titleMatch =
        content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
        content.match(/<title>([\s\S]*?)<\/title>/)
      const title = titleMatch ? titleMatch[1].trim() : ""

      // Split title to extract source from Google News format "Headline - Source"
      let headline = title
      let source = defaultSource
      if (title.includes(" - ")) {
        const parts = title.split(" - ")
        source = parts.pop() || defaultSource
        headline = parts.join(" - ")
      }

      // Extract link
      const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/)
      const link = linkMatch ? linkMatch[1].trim() : ""

      // Extract pubDate
      const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/)
      let datetime = Math.floor(Date.now() / 1000)
      if (pubDateMatch) {
        const date = new Date(pubDateMatch[1].trim())
        if (!isNaN(date.getTime())) {
          datetime = Math.floor(date.getTime() / 1000)
        }
      }

      // Extract description / summary
      const descMatch =
        content.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
        content.match(/<description>([\s\S]*?)<\/description>/)
      let summary = ""
      if (descMatch) {
        // 1. Unescape HTML entities first so we can parse tags correctly
        const unescaped = descMatch[1]
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&#39;/g, "'")

        // 2. Strip HTML tags
        let cleanText = unescaped.replace(/<[^>]*>/g, "").trim()

        // 3. Set summary based on feed source
        if (url.includes("news.google.com")) {
          // Google News descriptions duplicate the headline with related hyperlinks.
          // We set it to empty so the UI renders a clean card layout.
          summary = ""
        } else {
          if (cleanText.length > 220) {
            cleanText = cleanText.slice(0, 220) + "..."
          }
          summary = cleanText
        }
      }

      if (headline && link) {
        items.push({
          id: link,
          datetime,
          headline,
          summary,
          source,
          url: link,
          image: "",
        })
      }
    }
    return items
  } catch (err) {
    console.warn(`RSS fetch/parse failed for ${url}:`, err)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")
  const name = searchParams.get("name")
  const category = searchParams.get("category") || "general"

  const apiKey = process.env.FINNHUB_API_KEY

  // 1. If Finnhub API Key is present, query Finnhub
  if (apiKey) {
    try {
      if (symbol) {
        const todayStr = new Date().toISOString().split("T")[0]
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0]

        const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
          symbol
        )}&from=${thirtyDaysAgoStr}&to=${todayStr}&token=${apiKey}`

        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          const formattedNews = data.map((item: any) => ({
            id: item.id?.toString() || Math.random().toString(),
            datetime: item.datetime, // UNIX timestamp in seconds
            headline: item.headline || item.title || "",
            summary: item.summary || "",
            source: item.source || "News",
            url: item.url || "",
            image: item.image || "",
          }))
          return NextResponse.json(formattedNews)
        }
      } else {
        const url = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(
          category
        )}&token=${apiKey}`

        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          const formattedNews = data.map((item: any) => ({
            id: item.id?.toString() || Math.random().toString(),
            datetime: item.datetime,
            headline: item.headline || item.title || "",
            summary: item.summary || "",
            source: item.source || "Market News",
            url: item.url || "",
            image: item.image || "",
          }))
          return NextResponse.json(formattedNews)
        }
      }
    } catch (err) {
      console.warn("Finnhub news fetch failed, falling back to RSS:", err)
    }
  }

  // 2. Fallback to RSS Feeds if Finnhub is not set up
  try {
    if (symbol) {
      let queryName = symbol
      if (name) {
        queryName = name
      } else {
        try {
          const quote = await yahooFinance.quote(symbol)
          if (quote) {
            queryName = quote.longName || quote.shortName || symbol
          }
        } catch (e) {
          console.warn(`Failed to resolve quote name for ticker news ${symbol}:`, e)
        }
      }

      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(queryName)}`
      const rssArticles = await fetchRssFeed(rssUrl, "Google News")
      
      if (rssArticles && rssArticles.length > 0) {
        return NextResponse.json(rssArticles)
      }
    } else {
      const rssUrl = "https://finance.yahoo.com/news/rssindex"
      const rssArticles = await fetchRssFeed(rssUrl, "Yahoo Finance")
      if (rssArticles && rssArticles.length > 0) {
        return NextResponse.json(rssArticles)
      }
    }
  } catch (rssErr) {
    console.warn("RSS news retrieval failed, falling back to search API:", rssErr)
  }

  // 3. Fallback to Yahoo Finance Search API as final backup
  try {
    const searchQuery = symbol ? symbol.toUpperCase() : "financial market stock news"
    const searchResult = (await yahooFinance.search(searchQuery, {
      newsCount: 15,
    })) as any

    const yahooNews = (searchResult.news || []).map((item: any) => ({
      id: item.uuid || Math.random().toString(),
      datetime: item.providerPublishTime, // UNIX timestamp in seconds
      headline: item.title || "",
      summary: `Published by ${item.publisher || "Finance News"}. Click to view full coverage.`,
      source: item.publisher || "Yahoo Finance",
      url: item.link || "",
      image: "",
    }))

    return NextResponse.json(yahooNews)
  } catch (error: any) {
    console.error("All news retrieval options failed:", error)
    return NextResponse.json({ error: error.message || "Failed to retrieve news" }, { status: 500 })
  }
}
