"use client"

import React, { useEffect, useState, useCallback } from "react"
import { usePortfolioStore } from "@/lib/store"
import { AuthScreen } from "@/components/auth-screen"
import { Button } from "@/components/ui/button"
import {
  TrendUp,
  TrendDown,
  Info,
  ShieldCheck,
  ShieldWarning,
  MagnifyingGlass,
  ArrowClockwise,
  ChartLineUp,
  Lightning,
  Funnel,
  FolderUser,
  Globe,
  Star,
  Warning,
  HandCoins,
} from "@phosphor-icons/react"

interface AnalysisData {
  ticker: string
  companyName: string
  price: number
  dividendYield: number
  payoutRatio: number | null
  beta: number | null
  roe: number | null
  peRatio: number | null
  fiftyDayAverage: number
  twoHundredDayAverage: number
  score: number
  safetyGrade: "Safe" | "Moderate" | "Speculative"
  trend: "Bullish" | "Bearish" | "Neutral"
}

// Curated high-yield watchlist tickers to help users scan opportunities
const DEFAULT_WATCHLIST = [
  "O",       // Realty Income (US REIT)
  "PG",      // Procter & Gamble (US Consumer)
  "KO",      // Coca-Cola (US Consumer)
  "JNJ",     // Johnson & Johnson (US Healthcare)
  "SCHD",    // Schwab US Dividend ETF
  "1155.KL", // Maybank (Malaysian Bank)
  "D05.SI",  // DBS Group (Singapore Bank)
  "C38U.SI", // CapitaLand Integrated Commercial REIT (Singapore REIT)
]

export default function InsightsPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTicker, setActiveTicker] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Scanned database directory state
  const [batchData, setBatchData] = useState<AnalysisData[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  // Filter settings
  const [filterType, setFilterType] = useState<"ALL" | "BULLISH" | "BEARISH" | "SAFE">("ALL")

  const {
    user,
    isAuthLoading,
    shares,
    currency,
    checkUserSession,
  } = usePortfolioStore()

  useEffect(() => {
    setMounted(true)
    checkUserSession()
  }, [checkUserSession])

  // Core single-ticker analysis fetcher
  const fetchSingleAnalysis = async (symbol: string): Promise<AnalysisData | null> => {
    try {
      const res = await fetch(`/api/analysis?symbol=${encodeURIComponent(symbol)}`)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  // Load directory in parallel on mount
  const loadDirectory = useCallback(async () => {
    setBatchLoading(true)
    setFetchError(null)
    try {
      // 1. Gather all portfolio symbols
      const portfolioTickers = shares.map((s) => s.ticker)
      // 2. Combine and deduplicate with the default watchlist
      const allTickers = Array.from(new Set([...portfolioTickers, ...DEFAULT_WATCHLIST]))
      
      // 3. Batch load stats in parallel
      const results = await Promise.all(
        allTickers.map((t) => fetchSingleAnalysis(t))
      )
      
      // 4. Filter out any failed fetch queries
      const validResults = results.filter((r): r is AnalysisData => r !== null)
      setBatchData(validResults)
      
      // 5. Auto-select first asset to showcase details below
      if (validResults.length > 0) {
        setActiveTicker(validResults[0].ticker)
      }
    } catch (err) {
      console.error(err)
      setFetchError("Failed to build insights directory. Please refresh.")
    } finally {
      setBatchLoading(false)
    }
  }, [shares])

  // Trigger load on session initialization
  useEffect(() => {
    if (mounted && user && batchData.length === 0 && !batchLoading) {
      loadDirectory()
    }
  }, [mounted, user, loadDirectory, batchData, batchLoading])

  // Trigger search of other tickers
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) return
    
    const targetSymbol = searchQuery.toUpperCase().trim()
    setDetailLoading(true)
    setFetchError(null)
    
    try {
      const result = await fetchSingleAnalysis(targetSymbol)
      if (!result) {
        throw new Error(`Ticker symbol "${targetSymbol}" could not be resolved. Please verify.`)
      }

      // Add to directory list if not already present
      setBatchData((prev) => {
        const exists = prev.some((x) => x.ticker === result.ticker)
        if (exists) {
          return prev.map((x) => x.ticker === result.ticker ? result : x)
        }
        return [result, ...prev]
      })

      setActiveTicker(result.ticker)
      setSearchQuery("")
    } catch (err: any) {
      setFetchError(err.message || "Failed to search ticker details")
    } finally {
      setDetailLoading(false)
    }
  }

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

  // Hydration skeleton loader
  if (!mounted) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-background text-foreground p-8 min-h-screen">
        <div className="w-full max-w-6xl animate-pulse space-y-6">
          <div className="h-8 bg-muted w-1/4 rounded" />
          <div className="h-[60px] bg-muted rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="h-[90px] bg-muted rounded-xl" />
            <div className="h-[90px] bg-muted rounded-xl" />
            <div className="h-[90px] bg-muted rounded-xl" />
            <div className="h-[90px] bg-muted rounded-xl" />
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(val)
  }

  // Filter batch list based on active screening tab
  const filteredData = batchData.filter((item) => {
    if (filterType === "BULLISH") return item.trend === "Bullish"
    if (filterType === "BEARISH") return item.trend === "Bearish"
    if (filterType === "SAFE") return item.safetyGrade === "Safe"
    return true
  })

  // Group items by Holdings vs. Watchlist
  const portfolioTickersList = shares.map((s) => s.ticker)
  const holdingsItems = filteredData.filter((item) => portfolioTickersList.includes(item.ticker))
  const watchlistItems = filteredData.filter((item) => !portfolioTickersList.includes(item.ticker))

  // Find currently selected ticker detail payload
  const activeAnalysis = batchData.find((x) => x.ticker === activeTicker)

  // Beginner Suitability Rating helper
  const getSuitability = (item: AnalysisData) => {
    if (item.safetyGrade === "Safe" && item.trend === "Bullish") {
      return { label: "Top Beginner Pick", style: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" }
    }
    if (item.safetyGrade === "Safe" && (item.trend === "Bearish" || item.trend === "Neutral")) {
      return { label: "Accumulate / DCA", style: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" }
    }
    if (item.safetyGrade === "Moderate") {
      return { label: "Moderate Risk", style: "bg-amber-500/10 text-amber-500 border-amber-500/20" }
    }
    return { label: "High Risk / Avoid", style: "bg-destructive/10 text-destructive border-destructive/20" }
  }

  // Calculate the TOP 3 stocks currently perfect for beginners (Safe + Bullish, sorted by highest safety score)
  const topBeginnerPicks = batchData
    .filter((item) => item.safetyGrade === "Safe" && item.trend === "Bullish")
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  // Dynamic recommendation copy generator
  const getRecommendation = (data: AnalysisData) => {
    const isBullish = data.trend === "Bullish"
    const isBearish = data.trend === "Bearish"

    if (data.safetyGrade === "Safe") {
      if (isBullish) {
        return `Excellent long-term compounding profile. ${data.companyName} exhibits robust fundamentals (Payout Ratio: ${data.payoutRatio ? (data.payoutRatio * 100).toFixed(0) : "N/A"}%) and low volatility (Beta: ${data.beta ? data.beta.toFixed(2) : "N/A"}). The stock is in a solid market uptrend, making it a highly reliable selection for steady passive dividend accumulation.`
      }
      if (isBearish) {
        return `${data.companyName} is fundamentally secure with a stable dividend payout profile, but is currently experiencing downward market pressure (trading below MAs). For long-term income investors, this presents a potential buying opportunity. Consider Dollar-Cost Averaging (DCA) to lower your average entry price.`
      }
      return `Solid capital structure and high dividend safety. The stock is currently consolidating (neutral trend). It is a reliable holding for yield collection; consider purchasing in blocks or setting lower limit triggers to capture dips.`
    }

    if (data.safetyGrade === "Moderate") {
      if (data.payoutRatio && data.payoutRatio > 0.75) {
        return `Fundamentals are solid, but the payout ratio is borderline (${(data.payoutRatio * 100).toFixed(0)}%). This suggests the company retains less cash for internal reinvestment. While it is stable now, monitor quarterly earnings reports closely for any signs of margin compression.`
      }
      if (data.beta && data.beta > 1.2) {
        return `The dividend payout is sustainable, but the stock experiences higher price swings than the average market (Beta: ${data.beta.toFixed(2)}). Suitable for a dividend portfolio, but be prepared for short-term price volatility. Focus strictly on the cashflow rather than paper gains/losses.`
      }
      return `Moderate safety profile. The stock's profitability margins and market price trends are stable. Continue to hold, but diversify with other high-safety assets to mitigate single-stock concentration risks.`
    }

    // Speculative
    let warnings = []
    if (data.payoutRatio && data.payoutRatio > 0.90) warnings.push(`an unsustainably high payout ratio (${(data.payoutRatio * 100).toFixed(0)}%)`)
    if (data.roe && data.roe < 0.05) warnings.push("low capital return margins (ROE)")
    if (data.beta && data.beta > 1.4) warnings.push("aggressive market volatility")

    return `Warning: This stock is flagged as Speculative for long-term dividend income, showing ${warnings.join(" and ")}. There is a heightened risk of a future dividend cut if earnings decrease. Not recommended as a core passive income holding. Approach with caution or avoid.`
  }

  // Get color schemes based on safety grade
  const getGradeColor = (grade: "Safe" | "Moderate" | "Speculative") => {
    if (grade === "Safe") return { text: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", border: "border-emerald-500/30" }
    if (grade === "Moderate") return { text: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", border: "border-amber-500/30" }
    return { text: "text-destructive", bg: "bg-destructive/10 border-destructive/20", border: "border-destructive/30" }
  }

  return (
    <div className="flex flex-col flex-1 bg-background text-foreground min-h-screen font-sans antialiased selection:bg-foreground/10 py-6">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Navigation & Title Divider */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4 select-none">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-bold tracking-tight text-foreground uppercase flex items-center gap-2">
              <ChartLineUp className="w-4 h-4 text-emerald-500" /> Dividend Screener & Watchlist
            </h2>
            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
              Scan macro trends, safety ratings, and watch lists to filter buy opportunities
            </p>
          </div>
        </div>

        {/* TOP PICKS FOR BEGINNERS (Dynamic highlight widget) */}
        {!batchLoading && topBeginnerPicks.length > 0 && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-emerald-500" weight="fill" />
              <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wider font-sans">
                Top Picks for Long-Term Dividend Beginners
              </h3>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono leading-relaxed max-w-2xl">
              These assets are currently scored as **Safe** (low risk, healthy payouts) and are in a **Bullish** uptrend. They represent the most stable, buy-and-hold entry points right now.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {topBeginnerPicks.map((pick) => (
                <button
                  key={pick.ticker}
                  onClick={() => setActiveTicker(pick.ticker)}
                  className={`flex items-center justify-between p-3.5 bg-card/60 hover:bg-card border rounded-xl text-left cursor-pointer transition-all duration-300 ${
                    activeTicker === pick.ticker ? "border-emerald-500 ring-1 ring-emerald-500/20" : "border-emerald-500/20"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-mono font-bold text-xs bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded w-fit border border-emerald-500/20">
                      {pick.ticker}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-bold truncate max-w-[120px]">
                      {pick.companyName}
                    </span>
                  </div>
                  <div className="text-right flex flex-col gap-0.5">
                    <span className="text-[10px] font-mono font-bold text-foreground">
                      Yield: {pick.dividendYield.toFixed(2)}%
                    </span>
                    <span className="text-[8px] font-mono font-bold text-emerald-500">
                      Score: {pick.score}/100
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Directory Filters & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/25 pb-4 select-none">
          {/* Sizing Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono font-bold uppercase">
            <span className="text-muted-foreground mr-1.5 flex items-center gap-1">
              <Funnel className="w-3.5 h-3.5" /> Filters:
            </span>
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                filterType === "ALL"
                  ? "bg-foreground text-background border-foreground shadow-xs"
                  : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              All Assets
            </button>
            <button
              onClick={() => setFilterType("BULLISH")}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                filterType === "BULLISH"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Bullish Only
            </button>
            <button
              onClick={() => setFilterType("BEARISH")}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                filterType === "BEARISH"
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Bearish Only
            </button>
            <button
              onClick={() => setFilterType("SAFE")}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                filterType === "SAFE"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Safe Dividends
            </button>
          </div>

          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:max-w-xs shrink-0">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <MagnifyingGlass className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Analyze new ticker (e.g. JNJ)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted/30 border border-border/80 rounded-lg py-1.5 pl-9 pr-4 text-xs font-mono focus:outline-none focus:border-foreground/45 transition-colors placeholder:text-muted-foreground/50 uppercase"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={detailLoading}
              className="h-8 text-[10px] uppercase font-bold tracking-wider rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer shrink-0"
            >
              Analyze
            </Button>
          </form>
        </div>

        {/* Global Loading Spinner for Initial Load */}
        {batchLoading && (
          <div className="flex flex-col items-center justify-center py-20 bg-card/25 border border-dashed border-border/75 rounded-2xl min-h-[250px] select-none">
            <ArrowClockwise className="w-7 h-7 text-emerald-500 animate-spin mb-3" />
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest animate-pulse">Scanning watchlists and calculating trend models...</p>
          </div>
        )}

        {/* Error Notification */}
        {fetchError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[11px] px-4 py-3 rounded-lg font-mono text-center select-none">
            {fetchError}
          </div>
        )}

        {/* Summary Directory Grid */}
        {!batchLoading && batchData.length > 0 && (
          <div className="space-y-6">
            
            {/* My Portfolio Holdings */}
            {holdingsItems.length > 0 && (
              <div className="space-y-2 select-none animate-in fade-in duration-350">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FolderUser className="w-4 h-4 text-emerald-500" /> My Holdings ({holdingsItems.length})
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {holdingsItems.map((item) => {
                    const isSelected = activeTicker === item.ticker
                    const cardGradeStyle = getGradeColor(item.safetyGrade)
                    const suitability = getSuitability(item)
                    
                    return (
                      <button
                        key={item.ticker}
                        onClick={() => setActiveTicker(item.ticker)}
                        className={`text-left p-4 rounded-xl border bg-card transition-all duration-300 hover:border-border cursor-pointer flex flex-col justify-between h-[106px] ${
                          isSelected
                            ? "border-emerald-500 shadow-sm ring-1 ring-emerald-500/25 bg-emerald-500/5"
                            : "border-border/70"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono font-bold text-xs bg-muted border border-border/40 px-1.5 py-0.5 rounded leading-none">
                            {item.ticker}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground">
                            Yield: <span className="font-bold text-foreground">{item.dividendYield.toFixed(1)}%</span>
                          </span>
                        </div>

                        {/* Beginner investment suitability tag */}
                        <div className={`mt-2 text-[8px] font-mono font-bold border rounded px-1.5 py-0.5 w-fit ${suitability.style}`}>
                          {suitability.label}
                        </div>
                        
                        <div className="flex items-center justify-between w-full mt-2.5">
                          <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded ${cardGradeStyle.bg} ${cardGradeStyle.text} font-bold border border-border/50`}>
                            {item.safetyGrade}
                          </span>
                          
                          <span className={`text-[8px] font-mono uppercase font-bold flex items-center gap-0.5 ${
                            item.trend === "Bullish"
                              ? "text-emerald-500 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/20"
                              : item.trend === "Bearish"
                              ? "text-destructive bg-destructive/5 px-1.5 py-0.5 rounded border border-destructive/20"
                              : "text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/20"
                          }`}>
                            {item.trend === "Bullish" && <TrendUp className="w-3 h-3" />}
                            {item.trend === "Bearish" && <TrendDown className="w-3 h-3" />}
                            {item.trend}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Curated Global Ideas Watchlist */}
            {watchlistItems.length > 0 && (
              <div className="space-y-2 select-none animate-in fade-in duration-350 pt-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-500" /> Dividend Ideas Watchlist ({watchlistItems.length})
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {watchlistItems.map((item) => {
                    const isSelected = activeTicker === item.ticker
                    const cardGradeStyle = getGradeColor(item.safetyGrade)
                    const suitability = getSuitability(item)
                    
                    return (
                      <button
                        key={item.ticker}
                        onClick={() => setActiveTicker(item.ticker)}
                        className={`text-left p-4 rounded-xl border bg-card transition-all duration-300 hover:border-border cursor-pointer flex flex-col justify-between h-[106px] ${
                          isSelected
                            ? "border-emerald-500 shadow-sm ring-1 ring-emerald-500/25 bg-emerald-500/5"
                            : "border-border/70"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono font-bold text-xs bg-muted border border-border/40 px-1.5 py-0.5 rounded leading-none">
                            {item.ticker}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground">
                            Yield: <span className="font-bold text-foreground">{item.dividendYield.toFixed(1)}%</span>
                          </span>
                        </div>

                        {/* Beginner investment suitability tag */}
                        <div className={`mt-2 text-[8px] font-mono font-bold border rounded px-1.5 py-0.5 w-fit ${suitability.style}`}>
                          {suitability.label}
                        </div>
                        
                        <div className="flex items-center justify-between w-full mt-2.5">
                          <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded ${cardGradeStyle.bg} ${cardGradeStyle.text} font-bold border border-border/50`}>
                            {item.safetyGrade}
                          </span>
                          
                          <span className={`text-[8px] font-mono uppercase font-bold flex items-center gap-0.5 ${
                            item.trend === "Bullish"
                              ? "text-emerald-500 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/20"
                              : item.trend === "Bearish"
                              ? "text-destructive bg-destructive/5 px-1.5 py-0.5 rounded border border-destructive/20"
                              : "text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/20"
                          }`}>
                            {item.trend === "Bullish" && <TrendUp className="w-3 h-3" />}
                            {item.trend === "Bearish" && <TrendDown className="w-3 h-3" />}
                            {item.trend}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty state filters */}
            {filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center border border-dashed border-border/80 py-12 text-center bg-card/15 rounded-xl min-h-[150px] select-none">
                <Info className="w-7 h-7 text-muted-foreground/60 mb-2" />
                <p className="text-[11px] text-muted-foreground font-mono">No holdings or watchlist tickers match the selected filter category.</p>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-border/25 pt-4 my-2 select-none" />

            {/* Drill-down Detail Panel */}
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-dashed border-border/60 rounded-2xl min-h-[300px]">
                <ArrowClockwise className="w-6 h-6 text-emerald-500 animate-spin mb-3" />
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Resolving data models...</p>
              </div>
            ) : activeAnalysis ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Header Info */}
                <div className="flex flex-col gap-0.5 bg-muted/30 border border-border/40 p-4 rounded-xl">
                  <span className="text-[8px] font-mono text-muted-foreground uppercase font-bold tracking-wider">Currently Inspecting:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono font-bold text-base text-foreground bg-muted border border-border/50 px-2 py-0.5 rounded leading-none">{activeAnalysis.ticker}</span>
                    <span className="text-xs font-bold text-foreground truncate">{activeAnalysis.companyName}</span>
                  </div>
                </div>

                {/* Dashboard layout details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left Column: Safety Score (1/3 Width) */}
                  <div className="lg:col-span-1 bg-card border border-border/70 p-6 rounded-2xl flex flex-col items-center text-center shadow-xs">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-sans mb-1 block">
                      Safety Score
                    </span>

                    {/* Score Circle */}
                    <div className="relative w-28 h-28 rounded-full flex flex-col items-center justify-center border border-border/50 mb-6 bg-muted/10">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground font-sans tracking-widest leading-none">
                        Grade
                      </span>
                      <span className="text-3xl font-black font-mono tracking-tighter text-foreground mt-1">
                        {activeAnalysis.score}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground/80 mt-0.5">
                        out of 100
                      </span>
                      <div className={`absolute inset-0 rounded-full blur-xl opacity-10 pointer-events-none ${
                        activeAnalysis.safetyGrade === "Safe" ? "bg-emerald-500" : activeAnalysis.safetyGrade === "Moderate" ? "bg-amber-500" : "bg-destructive"
                      }`} />
                    </div>

                    {/* Safety Badge */}
                    {(() => {
                      const badgeStyles = getGradeColor(activeAnalysis.safetyGrade)
                      return (
                        <div className={`px-3 py-1 rounded-full border text-[10px] uppercase font-extrabold tracking-wider ${badgeStyles.bg} ${badgeStyles.text} ${badgeStyles.border} flex items-center gap-1.5 mb-6`}>
                          {activeAnalysis.safetyGrade === "Safe" ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldWarning className="w-3.5 h-3.5" />
                          )}
                          <span>{activeAnalysis.safetyGrade} Dividend</span>
                        </div>
                      )
                    })()}

                    {/* Moving Averages details */}
                    <div className="w-full mt-4 pt-4 border-t border-border/40 text-left font-mono text-[10px] space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-sans">
                          Market Trend Status
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase flex items-center gap-1 ${
                          activeAnalysis.trend === "Bullish"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : activeAnalysis.trend === "Bearish"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {activeAnalysis.trend === "Bullish" && <TrendUp className="w-3 h-3" />}
                          {activeAnalysis.trend === "Bearish" && <TrendDown className="w-3 h-3" />}
                          {activeAnalysis.trend}
                        </span>
                      </div>

                      <div className="space-y-1 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>Current Price:</span>
                          <span className="font-bold text-foreground">{formatCurrency(activeAnalysis.price)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>50-Day MA:</span>
                          <span className="text-foreground">{formatCurrency(activeAnalysis.fiftyDayAverage)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>200-Day MA:</span>
                          <span className="text-foreground">{formatCurrency(activeAnalysis.twoHundredDayAverage)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Detailed Breakdown (2/3 Width) */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Metrics Progress bars */}
                    <div className="bg-card border border-border/70 p-6 rounded-2xl shadow-xs">
                      <h4 className="font-sans text-xs font-bold text-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border/30 flex items-center gap-1.5">
                        <Lightning className="w-4 h-4 text-emerald-500" /> Fundamental Health Parameters
                      </h4>

                      <div className="space-y-5">
                        {/* Payout Ratio */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-bold text-foreground flex items-center gap-1">
                              Payout Ratio 
                              <span title="The percentage of net income paid out as dividends. Lower is safer. Target: 30% - 75%">
                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                              </span>
                            </span>
                            <span className="font-bold text-foreground">
                              {activeAnalysis.payoutRatio !== null ? `${(activeAnalysis.payoutRatio * 100).toFixed(1)}%` : "N/A"}
                            </span>
                          </div>
                          {activeAnalysis.payoutRatio !== null ? (
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  activeAnalysis.payoutRatio <= 0.75
                                    ? "bg-emerald-500"
                                    : activeAnalysis.payoutRatio <= 0.90
                                    ? "bg-amber-500"
                                    : "bg-destructive"
                                }`}
                                style={{ width: `${Math.min(activeAnalysis.payoutRatio * 100, 100)}%` }}
                              />
                            </div>
                          ) : (
                            <p className="text-[9px] text-muted-foreground font-mono">Data not recorded for this ticker. Graded as neutral.</p>
                          )}
                          {activeAnalysis.payoutRatio !== null && (
                            <div className="flex justify-between text-[8px] text-muted-foreground/80 font-mono">
                              <span>Safe (30-75%)</span>
                              <span>Borderline (75-90%)</span>
                              <span>Risky (&gt;90%)</span>
                            </div>
                          )}
                        </div>

                        {/* Volatility Beta */}
                        <div className="space-y-1.5 pt-2 border-t border-border/20">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-bold text-foreground flex items-center gap-1">
                              Beta (Market Volatility)
                              <span title="Measures stock swings compared to the market. Beta < 1.0 is lower risk (preferred for dividends)">
                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                              </span>
                            </span>
                            <span className="font-bold text-foreground">
                              {activeAnalysis.beta !== null ? activeAnalysis.beta.toFixed(2) : "N/A"}
                            </span>
                          </div>
                          {activeAnalysis.beta !== null ? (
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  activeAnalysis.beta < 1.0
                                    ? "bg-emerald-500"
                                    : activeAnalysis.beta < 1.4
                                    ? "bg-amber-500"
                                    : "bg-destructive"
                                }`}
                                style={{ width: `${Math.min((activeAnalysis.beta / 2) * 100, 100)}%` }}
                              />
                            </div>
                          ) : (
                            <p className="text-[9px] text-muted-foreground font-mono">Data not recorded for this ticker.</p>
                          )}
                          {activeAnalysis.beta !== null && (
                            <div className="flex justify-between text-[8px] text-muted-foreground/80 font-mono">
                              <span>Stable (&lt;1.0)</span>
                              <span>Market (1.0)</span>
                              <span>Volatile (&gt;1.4)</span>
                            </div>
                          )}
                        </div>

                        {/* Return on Equity */}
                        <div className="space-y-1.5 pt-2 border-t border-border/20">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-bold text-foreground flex items-center gap-1">
                              Return on Equity (ROE)
                              <span title="Measures profit generated from shareholder equity. Higher indicates healthy business moats">
                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                              </span>
                            </span>
                            <span className="font-bold text-foreground">
                              {activeAnalysis.roe !== null ? `${(activeAnalysis.roe * 100).toFixed(1)}%` : "N/A"}
                            </span>
                          </div>
                          {activeAnalysis.roe !== null ? (
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  activeAnalysis.roe >= 0.10
                                    ? "bg-emerald-500"
                                    : activeAnalysis.roe >= 0.05
                                    ? "bg-amber-500"
                                    : "bg-destructive"
                                }`}
                                style={{ width: `${Math.min(Math.max(activeAnalysis.roe * 100, 0), 100)}%` }}
                              />
                            </div>
                          ) : (
                            <p className="text-[9px] text-muted-foreground font-mono">Data not recorded for this ticker.</p>
                          )}
                          {activeAnalysis.roe !== null && (
                            <div className="flex justify-between text-[8px] text-muted-foreground/80 font-mono">
                              <span>Low (&lt;5%)</span>
                              <span>Healthy (5-10%)</span>
                              <span>Excellent (&gt;10%)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Valuation Yield & PE */}
                      <div className="grid grid-cols-2 gap-4 pt-5 mt-5 border-t border-border/30 text-[10px] font-mono">
                        <div className="bg-muted/15 p-3 rounded-lg border border-border/30">
                          <span className="text-[8px] font-mono text-muted-foreground uppercase font-bold tracking-wider">Dividend Yield</span>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {activeAnalysis.dividendYield.toFixed(2)}%
                          </p>
                        </div>
                        <div className="bg-muted/15 p-3 rounded-lg border border-border/30">
                          <span className="text-[8px] font-mono text-muted-foreground uppercase font-bold tracking-wider">Valuation P/E Ratio</span>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {activeAnalysis.peRatio !== null ? activeAnalysis.peRatio.toFixed(2) : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Commentary */}
                    <div className="bg-card border border-border/70 p-6 rounded-2xl shadow-xs">
                      <h4 className="font-sans text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Analyst Commentary & Recommendation
                      </h4>
                      <p className="text-xs text-muted-foreground/90 font-mono leading-relaxed bg-muted/20 border border-border/40 p-4 rounded-xl">
                        {getRecommendation(activeAnalysis)}
                      </p>
                      <div className="flex items-center gap-2 mt-4 text-[9px] text-muted-foreground/80 font-mono">
                        <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Always cross-reference with quarterly reports before deploying capital. YieldWatch insights are not direct financial advice.</span>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            ) : null}

          </div>
        )}

      </main>
    </div>
  )
}
