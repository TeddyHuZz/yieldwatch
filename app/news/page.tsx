"use client"

import React, { useEffect, useState } from "react"
import { usePortfolioStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { AuthScreen } from "@/components/auth-screen"
import {
  Newspaper,
  Globe,
  Briefcase,
  ArrowClockwise,
  ArrowSquareOut,
  CalendarBlank,
  SignOut,
} from "@phosphor-icons/react"

interface NewsArticle {
  id: string
  datetime: number // Unix timestamp
  headline: string
  summary: string
  source: string
  url: string
  image: string
  ticker?: string
}

export default function NewsPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<"market" | "portfolio">("market")
  const [marketNews, setMarketNews] = useState<NewsArticle[]>([])
  const [portfolioNews, setPortfolioNews] = useState<NewsArticle[]>([])
  const [selectedTicker, setSelectedTicker] = useState<string>("ALL")
  const [loadingNews, setLoadingNews] = useState(false)

  const {
    shares,
    isLoading,
    isAuthLoading,
    user,
    checkUserSession,
    signOut,
  } = usePortfolioStore()

  useEffect(() => {
    setMounted(true)
    checkUserSession()
  }, [checkUserSession])

  // Fetch News from Backend
  const fetchNews = async () => {
    if (!user) return
    setLoadingNews(true)
    try {
      // 1. Fetch general market news
      const marketRes = await fetch("/api/news?category=general")
      if (marketRes.ok) {
        const marketData = await marketRes.json()
        if (Array.isArray(marketData)) {
          const seenMarketIds = new Set()
          const uniqueMarket = marketData.filter((item: any) => {
            if (seenMarketIds.has(item.id)) return false
            seenMarketIds.add(item.id)
            return true
          })
          setMarketNews(uniqueMarket)
        } else {
          setMarketNews([])
        }
      }

      // 2. Fetch portfolio news for all unique tickers
      if (shares.length > 0) {
        const uniqueTickers = Array.from(new Set(shares.map((s) => s.ticker)))
        const allTickerNews: NewsArticle[] = []

        await Promise.all(
          uniqueTickers.map(async (ticker) => {
            try {
              const companyName = shares.find((s) => s.ticker === ticker)?.companyName || ticker
              const res = await fetch(
                `/api/news?symbol=${encodeURIComponent(ticker)}&name=${encodeURIComponent(companyName)}`
              )
              if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) {
                  // Inject ticker reference to filter later
                  const newsWithTicker = data.map((item) => ({
                    ...item,
                    ticker,
                  }))
                  allTickerNews.push(...newsWithTicker)
                }
              }
            } catch (err) {
              console.error(`Failed to fetch news for ticker ${ticker}:`, err)
            }
          })
        )

        // Deduplicate portfolio news by ID
        const seenIds = new Set()
        const uniqueNews = allTickerNews.filter((item) => {
          if (seenIds.has(item.id)) return false
          seenIds.add(item.id)
          return true
        })

        // Sort combined news by datetime descending
        const sortedPortfolioNews = uniqueNews.sort((a, b) => b.datetime - a.datetime)
        setPortfolioNews(sortedPortfolioNews)
      }
    } catch (e) {
      console.error("Failed to load news feed:", e)
    } finally {
      setLoadingNews(false)
    }
  }

  // Trigger news fetch after session check and mounting
  useEffect(() => {
    if (mounted && user) {
      fetchNews()
    }
  }, [mounted, user, shares])

  // Relative Time Formatter
  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return ""
    const now = Math.floor(Date.now() / 1000)
    const diff = now - timestamp

    if (diff < 60) return "Just now"
    const mins = Math.floor(diff / 60)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Filter portfolio news by select tag
  const filteredPortfolioNews = portfolioNews.filter((article: any) => {
    if (selectedTicker === "ALL") return true
    return article.ticker === selectedTicker
  })

  // Session loader spinner during page checks
  if (isAuthLoading && mounted) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-background text-foreground min-h-screen">
        <div className="flex flex-col items-center gap-2.5 animate-pulse select-none">
          <span className="text-emerald-500 font-bold font-sans text-xl animate-spin">%</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Syncing Session...</span>
        </div>
      </div>
    )
  }

  // Loading skeleton during SSR to avoid hydration flicker
  if (!mounted) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-background text-foreground p-8 min-h-screen">
        <div className="w-full max-w-6xl animate-pulse space-y-6">
          <div className="h-8 bg-muted w-1/4 rounded" />
          <div className="h-10 bg-muted w-1/3 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-muted rounded-xl" />
            <div className="h-64 bg-muted rounded-xl" />
            <div className="h-64 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // Authentication guard redirect
  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AuthScreen />
      </div>
    )
  }

  const uniquePortfolioTickers = Array.from(new Set(shares.map((s) => s.ticker)))

  return (
    <div className="flex flex-col flex-1 bg-background text-foreground min-h-screen font-sans antialiased selection:bg-foreground/10 py-6">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Navigation & Title Divider */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between border-b border-border/40 pb-4 mb-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-bold tracking-tight text-foreground uppercase flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-muted-foreground" /> News & Analysis
            </h2>
            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
              Curated market news intelligence and watchlist reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNews}
              disabled={loadingNews}
              className="h-8 text-[11px] rounded-md border-border/80 hover:bg-muted/40 font-medium transition-colors cursor-pointer"
            >
              <ArrowClockwise className={`w-3.5 h-3.5 mr-1 text-muted-foreground ${loadingNews ? "animate-spin" : ""}`} />
              {loadingNews ? "Refreshing..." : "Refresh News"}
            </Button>
          </div>
        </div>

        {/* Tabs switcher */}
        <div className="flex border-b border-border/60 pb-px gap-6 text-xs select-none">
          <button
            onClick={() => setActiveTab("market")}
            className={`pb-2.5 font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "market"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Market Intelligence</span>
          </button>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`pb-2.5 font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "portfolio"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>My Portfolio Feed</span>
          </button>
        </div>

        {/* Tab 1: General Market News */}
        {activeTab === "market" && (
          <div className="space-y-6">
            {loadingNews && marketNews.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-muted/30 border border-border/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : marketNews.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-border/80 p-16 text-center bg-card/15 rounded-xl min-h-75">
                <Globe className="w-8 h-8 text-muted-foreground/60 mb-3 animate-pulse" />
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">No market news feeds loaded.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketNews.map((article) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col justify-between bg-card border border-border/70 p-4 rounded-xl shadow-xs hover:shadow-md hover:border-border hover:scale-[1.005] active:scale-[0.995] transition-all duration-300 group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/80 uppercase mb-2">
                        <span className="font-sans font-bold bg-muted/65 dark:bg-muted/30 px-2 py-0.5 rounded border border-border/40 text-foreground">
                          {article.source}
                        </span>
                        <span>{formatRelativeTime(article.datetime)}</span>
                      </div>
                      <h3 className="text-xs font-bold text-foreground leading-snug group-hover:text-foreground/85 transition-colors line-clamp-2">
                        {article.headline}
                      </h3>
                      {article.summary && (
                        <p className="text-[10px] text-muted-foreground/90 mt-1.5 line-clamp-2 leading-relaxed">
                          {article.summary}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-[9px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">
                      <span>Read article</span>
                      <ArrowSquareOut className="w-3.5 h-3.5" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Company Portfolio News */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            {isLoading || isAuthLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-muted/30 border border-border/50 rounded-xl" />
                ))}
              </div>
            ) : shares.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-border/80 p-16 text-center bg-card/15 rounded-xl min-h-75">
                <CalendarBlank className="w-8 h-8 text-muted-foreground/60 mb-3" />
                <h4 className="text-xs font-bold text-foreground uppercase mb-1">Portfolio empty</h4>
                <p className="text-[10px] text-muted-foreground max-w-xs leading-relaxed">
                  Log your stock holdings on the dashboard, and company news feed feeds will populate here automatically.
                </p>
              </div>
            ) : (
              <>
                {/* Ticker Filter Chips */}
                <div className="flex items-center gap-1.5 flex-wrap font-mono text-[9px] select-none pb-2 border-b border-border/30">
                  <span className="text-muted-foreground font-sans font-bold uppercase tracking-wider mr-2">Filter Ticker:</span>
                  <button
                    onClick={() => setSelectedTicker("ALL")}
                    className={`px-2.5 py-1 rounded border transition-all cursor-pointer font-bold ${
                      selectedTicker === "ALL"
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    ALL
                  </button>
                  {uniquePortfolioTickers.map((ticker) => (
                    <button
                      key={ticker}
                      onClick={() => setSelectedTicker(ticker)}
                      className={`px-2.5 py-1 rounded border transition-all cursor-pointer font-bold ${
                        selectedTicker === ticker
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      {ticker}
                    </button>
                  ))}
                </div>

                {loadingNews && portfolioNews.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-32 bg-muted/30 border border-border/50 rounded-xl" />
                    ))}
                  </div>
                ) : filteredPortfolioNews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center border border-dashed border-border/80 p-16 text-center bg-card/15 rounded-xl min-h-62.5">
                    <Newspaper className="w-8 h-8 text-muted-foreground/60 mb-3" />
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                      {selectedTicker === "ALL"
                        ? "No recent news found for your holdings."
                        : `No recent news articles found for ticker: ${selectedTicker}`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPortfolioNews.map((article: any) => (
                      <a
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col justify-between bg-card border border-border/70 p-4 rounded-xl shadow-xs hover:shadow-md hover:border-border hover:scale-[1.005] active:scale-[0.995] transition-all duration-300 group cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/80 uppercase mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground bg-foreground/10 border border-foreground/15 px-2 py-0.5 rounded">
                                {article.ticker}
                              </span>
                              <span className="font-sans text-muted-foreground/85">
                                {article.source}
                              </span>
                            </div>
                            <span>{formatRelativeTime(article.datetime)}</span>
                          </div>
                          <h3 className="text-xs font-bold text-foreground leading-snug group-hover:text-foreground/85 transition-colors line-clamp-2">
                            {article.headline}
                          </h3>
                          {article.summary && (
                            <p className="text-[10px] text-muted-foreground/90 mt-1.5 line-clamp-2 leading-relaxed">
                              {article.summary}
                            </p>
                          )}
                        </div>
                        <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-[9px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">
                          <span>Read article</span>
                          <ArrowSquareOut className="w-3.5 h-3.5" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
