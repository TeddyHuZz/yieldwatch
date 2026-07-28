"use client"

import React, { useEffect, useState, useCallback } from "react"
import { usePortfolioStore } from "@/lib/store"
import { getTickerMarket } from "@/lib/markets"
import { AuthScreen } from "@/components/auth-screen"
import { Button } from "@/components/ui/button"
import {
  FileText,
  DownloadSimple,
  Printer,
  MagnifyingGlass,
  ArrowClockwise,
  ArrowSquareOut,
  Buildings,
  Bank,
  Scales,
  TrendUp,
  Coins,
  Info,
  FolderUser,
  CheckCircle,
  Clock,
} from "@phosphor-icons/react"

interface StatementItem {
  endDate: string
  [key: string]: any
}

interface ReportData {
  symbol: string
  companyName: string
  currency: string
  incomeStatements: StatementItem[]
  incomeStatementsQuarterly: StatementItem[]
  balanceSheets: StatementItem[]
  balanceSheetsQuarterly: StatementItem[]
  cashflowStatements: StatementItem[]
  cashflowStatementsQuarterly: StatementItem[]
  keyMetrics: {
    peRatio: number | null
    pbRatio: number | null
    roe: number | null
    payoutRatio: number | null
    dividendYield: number | null
    currentPrice: number | null
  }
  secFilings: Array<{
    date: string
    title: string
    type: string
    url: string
  }>
}

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false)
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [statementPeriod, setStatementPeriod] = useState<"annual" | "quarterly">("annual")
  const [activeTab, setActiveTab] = useState<"income" | "balance" | "cashflow" | "filings">("income")

  const { user, isAuthLoading, shares, checkUserSession } = usePortfolioStore()

  useEffect(() => {
    setMounted(true)
    checkUserSession()
  }, [checkUserSession])

  // Fetch report data for a symbol
  const fetchReport = useCallback(async (symbol: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports?symbol=${encodeURIComponent(symbol)}`)
      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || "Failed to load financial report")
      }
      const data: ReportData = await res.json()
      setReportData(data)
      setActiveSymbol(data.symbol)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to fetch company financial statements")
    } finally {
      setLoading(false)
    }
  }, [])

  // Default load first share from portfolio on page render
  useEffect(() => {
    if (mounted && user && !activeSymbol && !loading) {
      const initialSymbol = shares.length > 0 ? shares[0].ticker : "KO"
      fetchReport(initialSymbol)
    }
  }, [mounted, user, shares, activeSymbol, loading, fetchReport])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) return
    fetchReport(searchQuery.toUpperCase().trim())
    setSearchQuery("")
  }

  // Format monetary values in millions/billions
  const formatCompact = (val: number | null | undefined, currency: string = "USD") => {
    if (val === null || val === undefined || isNaN(val)) return "N/A"
    const absVal = Math.abs(val)
    let formatted = ""

    if (absVal >= 1e9) {
      formatted = `${(val / 1e9).toFixed(2)}B`
    } else if (absVal >= 1e6) {
      formatted = `${(val / 1e6).toFixed(2)}M`
    } else if (absVal >= 1e3) {
      formatted = `${(val / 1e3).toFixed(2)}K`
    } else {
      formatted = val.toFixed(2)
    }

    return `${currency} ${formatted}`
  }

  // Download structured CSV report file
  const handleDownloadCSV = () => {
    if (!reportData) return

    const lines: string[] = []
    lines.push(`FINANCIAL STATEMENT REPORT FOR ${reportData.companyName} (${reportData.symbol})`)
    lines.push(`Report Date,${new Date().toISOString().split("T")[0]}`)
    lines.push(`Currency,${reportData.currency}`)
    lines.push("")

    // Key metrics
    lines.push("KEY METRICS & VALUATION RATIOS")
    lines.push(`Current Price,${reportData.keyMetrics.currentPrice ?? "N/A"}`)
    lines.push(`Dividend Yield,${reportData.keyMetrics.dividendYield ? `${reportData.keyMetrics.dividendYield.toFixed(2)}%` : "N/A"}`)
    lines.push(`Payout Ratio,${reportData.keyMetrics.payoutRatio ? `${reportData.keyMetrics.payoutRatio.toFixed(2)}%` : "N/A"}`)
    lines.push(`P/E Ratio,${reportData.keyMetrics.peRatio ? reportData.keyMetrics.peRatio.toFixed(2) : "N/A"}`)
    lines.push(`P/B Ratio,${reportData.keyMetrics.pbRatio ? reportData.keyMetrics.pbRatio.toFixed(2) : "N/A"}`)
    lines.push(`Return on Equity (ROE),${reportData.keyMetrics.roe ? `${reportData.keyMetrics.roe.toFixed(2)}%` : "N/A"}`)
    lines.push("")

    // Income Statement
    lines.push(`INCOME STATEMENT (${statementPeriod.toUpperCase()})`)
    const incomeList = statementPeriod === "annual" ? reportData.incomeStatements : reportData.incomeStatementsQuarterly
    if (incomeList.length > 0) {
      lines.push(["Line Item", ...incomeList.map((x) => x.endDate)].join(","))
      lines.push(["Total Revenue", ...incomeList.map((x) => x.totalRevenue ?? "N/A")].join(","))
      lines.push(["Cost of Revenue", ...incomeList.map((x) => x.costOfRevenue ?? "N/A")].join(","))
      lines.push(["Gross Profit", ...incomeList.map((x) => x.grossProfit ?? "N/A")].join(","))
      lines.push(["Operating Expenses", ...incomeList.map((x) => x.operatingExpenses ?? "N/A")].join(","))
      lines.push(["Operating Income", ...incomeList.map((x) => x.operatingIncome ?? "N/A")].join(","))
      lines.push(["Net Income", ...incomeList.map((x) => x.netIncome ?? "N/A")].join(","))
      lines.push(["EBIT", ...incomeList.map((x) => x.ebit ?? "N/A")].join(","))
    }
    lines.push("")

    // Balance Sheet
    lines.push(`BALANCE SHEET (${statementPeriod.toUpperCase()})`)
    const balanceList = statementPeriod === "annual" ? reportData.balanceSheets : reportData.balanceSheetsQuarterly
    if (balanceList.length > 0) {
      lines.push(["Line Item", ...balanceList.map((x) => x.endDate)].join(","))
      lines.push(["Cash & Equivalents", ...balanceList.map((x) => x.cash ?? "N/A")].join(","))
      lines.push(["Total Assets", ...balanceList.map((x) => x.totalAssets ?? "N/A")].join(","))
      lines.push(["Total Liabilities", ...balanceList.map((x) => x.totalLiab ?? "N/A")].join(","))
      lines.push(["Stockholder Equity", ...balanceList.map((x) => x.totalStockholderEquity ?? "N/A")].join(","))
      lines.push(["Total Debt", ...balanceList.map((x) => x.totalDebt ?? "N/A")].join(","))
      lines.push(["Working Capital", ...balanceList.map((x) => x.workingCapital ?? "N/A")].join(","))
    }
    lines.push("")

    // Cash Flow Statement
    lines.push(`CASH FLOW STATEMENT (${statementPeriod.toUpperCase()})`)
    const cashflowList = statementPeriod === "annual" ? reportData.cashflowStatements : reportData.cashflowStatementsQuarterly
    if (cashflowList.length > 0) {
      lines.push(["Line Item", ...cashflowList.map((x) => x.endDate)].join(","))
      lines.push(["Operating Cash Flow", ...cashflowList.map((x) => x.operatingCashflow ?? "N/A")].join(","))
      lines.push(["Capital Expenditure (CapEx)", ...cashflowList.map((x) => x.capitalExpenditures ?? "N/A")].join(","))
      lines.push(["Free Cash Flow", ...cashflowList.map((x) => x.freeCashFlow ?? "N/A")].join(","))
      lines.push(["Dividends Paid", ...cashflowList.map((x) => x.dividendsPaid ?? "N/A")].join(","))
    }

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"))
    const link = document.createElement("a")
    link.setAttribute("href", csvContent)
    link.setAttribute("download", `${reportData.symbol}_Financial_Report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print/PDF summary view handler
  const handlePrintReport = () => {
    window.print()
  }

  if (isAuthLoading && mounted) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-background text-foreground min-h-screen">
        <div className="flex flex-col items-center gap-2.5 animate-pulse select-none">
          <span className="text-emerald-500 font-bold font-sans text-xl animate-spin">%</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Loading Reports...</span>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-background text-foreground p-8 min-h-screen">
        <div className="w-full max-w-6xl animate-pulse space-y-6">
          <div className="h-8 bg-muted w-1/4 rounded" />
          <div className="h-15 bg-muted rounded-xl" />
          <div className="h-96 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AuthScreen />
      </div>
    )
  }

  const activeIncomeList = statementPeriod === "annual" ? reportData?.incomeStatements || [] : reportData?.incomeStatementsQuarterly || []
  const activeBalanceList = statementPeriod === "annual" ? reportData?.balanceSheets || [] : reportData?.balanceSheetsQuarterly || []
  const activeCashflowList = statementPeriod === "annual" ? reportData?.cashflowStatements || [] : reportData?.cashflowStatementsQuarterly || []
  const activeMarket = activeSymbol ? getTickerMarket(activeSymbol) : null

  return (
    <div className="flex flex-col flex-1 bg-background text-foreground min-h-screen font-sans antialiased selection:bg-foreground/10 py-6">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4 select-none print:hidden">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-bold tracking-tight text-foreground uppercase flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" /> Financial Reports & Statements
            </h2>
            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
              Inspect multi-year Income Statements, Balance Sheets, Cash Flow, and export report files
            </p>
          </div>

          {/* Quick Search Ticker Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:max-w-xs shrink-0">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <MagnifyingGlass className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search symbol (e.g. 1155.KL)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted/30 border border-border/80 rounded-lg py-1.5 pl-9 pr-4 text-xs font-mono focus:outline-none focus:border-foreground/45 transition-colors placeholder:text-muted-foreground/50 uppercase"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="h-8 text-[10px] uppercase font-bold tracking-wider rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer shrink-0"
            >
              Inspect
            </Button>
          </form>
        </div>

        {/* Portfolio Quick Select Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none scrollbar-none print:hidden">
          <span className="text-[9px] font-mono font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5 shrink-0">
            <FolderUser className="w-3.5 h-3.5 text-emerald-500" /> My Holdings:
          </span>

          {shares.length === 0 ? (
            <span className="text-[9px] font-mono text-muted-foreground">No portfolio shares added yet.</span>
          ) : (
            shares.map((share) => {
              const isSelected = activeSymbol === share.ticker
              const mInfo = getTickerMarket(share.ticker)
              return (
                <button
                  key={share.id}
                  onClick={() => fetchReport(share.ticker)}
                  className={`px-3 py-1 rounded-xl border text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/40 shadow-xs"
                      : "bg-card border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <span>{mInfo.flag}</span>
                  <span>{share.ticker}</span>
                </button>
              )
            })
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[11px] px-4 py-3 rounded-xl font-mono text-center select-none">
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card/20 border border-dashed border-border/60 rounded-2xl min-h-75">
            <ArrowClockwise className="w-6 h-6 text-emerald-500 animate-spin mb-3" />
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
              Fetching financial statements for {activeSymbol}...
            </p>
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            
            {/* Report Header Card */}
            <div className="bg-card border border-border/70 p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg text-foreground bg-muted border border-border/50 px-2.5 py-0.5 rounded leading-none">
                      {reportData.symbol}
                    </span>
                    {activeMarket && (
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-border/40 bg-muted/30 text-muted-foreground flex items-center gap-1">
                        <span>{activeMarket.flag}</span>
                        <span>{activeMarket.country}</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-0.5">{reportData.companyName}</h3>
                </div>

                {/* Download & Print Actions */}
                <div className="flex items-center gap-2 select-none print:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCSV}
                    className="h-8 text-[10px] uppercase font-bold tracking-wider rounded-lg border-border/80 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <DownloadSimple className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintReport}
                    className="h-8 text-[10px] uppercase font-bold tracking-wider rounded-lg border-border/80 hover:bg-foreground hover:text-background transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / PDF
                  </Button>
                </div>
              </div>

              {/* Key Valuation & Financial Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-[10px]">
                <div className="bg-muted/20 border border-border/30 p-3 rounded-xl">
                  <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider block">Current Price</span>
                  <span className="font-bold text-foreground text-xs mt-0.5 block">
                    {reportData.keyMetrics.currentPrice ? `${reportData.currency} ${reportData.keyMetrics.currentPrice.toFixed(2)}` : "N/A"}
                  </span>
                </div>
                <div className="bg-muted/20 border border-border/30 p-3 rounded-xl">
                  <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider block">Dividend Yield</span>
                  <span className="font-bold text-emerald-500 text-xs mt-0.5 block">
                    {reportData.keyMetrics.dividendYield !== null ? `${reportData.keyMetrics.dividendYield.toFixed(2)}%` : "N/A"}
                  </span>
                </div>
                <div className="bg-muted/20 border border-border/30 p-3 rounded-xl">
                  <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider block">Payout Ratio</span>
                  <span className="font-bold text-foreground text-xs mt-0.5 block">
                    {reportData.keyMetrics.payoutRatio !== null ? `${reportData.keyMetrics.payoutRatio.toFixed(2)}%` : "N/A"}
                  </span>
                </div>
                <div className="bg-muted/20 border border-border/30 p-3 rounded-xl">
                  <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider block">Valuation P/E</span>
                  <span className="font-bold text-foreground text-xs mt-0.5 block">
                    {reportData.keyMetrics.peRatio !== null ? reportData.keyMetrics.peRatio.toFixed(2) : "N/A"}
                  </span>
                </div>
                <div className="bg-muted/20 border border-border/30 p-3 rounded-xl">
                  <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider block">Price to Book (P/B)</span>
                  <span className="font-bold text-foreground text-xs mt-0.5 block">
                    {reportData.keyMetrics.pbRatio !== null ? reportData.keyMetrics.pbRatio.toFixed(2) : "N/A"}
                  </span>
                </div>
                <div className="bg-muted/20 border border-border/30 p-3 rounded-xl">
                  <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider block">Return on Equity</span>
                  <span className="font-bold text-foreground text-xs mt-0.5 block">
                    {reportData.keyMetrics.roe !== null ? `${reportData.keyMetrics.roe.toFixed(2)}%` : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Statements Controls (Tabs & Annual/Quarterly switcher) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/25 pb-3 select-none print:hidden">
              {/* Tab navigation */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setActiveTab("income")}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "income"
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <TrendUp className="w-3.5 h-3.5" /> Income Statement
                </button>
                <button
                  onClick={() => setActiveTab("balance")}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "balance"
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Scales className="w-3.5 h-3.5" /> Balance Sheet
                </button>
                <button
                  onClick={() => setActiveTab("cashflow")}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "cashflow"
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" /> Cash Flow
                </button>
                <button
                  onClick={() => setActiveTab("filings")}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "filings"
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Bank className="w-3.5 h-3.5" /> SEC & IR Filings ({reportData.secFilings.length})
                </button>
              </div>

              {/* Annual vs Quarterly Switcher (Only for Financial Statements) */}
              {activeTab !== "filings" && (
                <div className="flex items-center gap-1 bg-muted/40 border border-border/80 p-1 rounded-lg text-[9px] font-mono font-bold uppercase self-start sm:self-auto">
                  <button
                    onClick={() => setStatementPeriod("annual")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      statementPeriod === "annual"
                        ? "bg-card text-foreground border border-border/50 shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Annual
                  </button>
                  <button
                    onClick={() => setStatementPeriod("quarterly")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      statementPeriod === "quarterly"
                        ? "bg-card text-foreground border border-border/50 shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Quarterly
                  </button>
                </div>
              )}
            </div>

            {/* STATEMENT CONTENT AREA */}
            <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
              
              {/* TAB 1: Income Statement */}
              {activeTab === "income" && (
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <TrendUp className="w-4 h-4 text-emerald-500" /> Income Statement Breakdown ({statementPeriod.toUpperCase()})
                    </h4>
                    <span className="text-[9px] font-mono text-muted-foreground">Currency: {reportData.currency}</span>
                  </div>

                  {activeIncomeList.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-mono py-8 text-center">
                      No {statementPeriod} income statement records available for this asset.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-border/60 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            <th className="p-3.5 pl-4">Financial Line Item</th>
                            {activeIncomeList.map((st) => (
                              <th key={st.endDate} className="p-3.5 text-right">{st.endDate}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30 text-[11px]">
                          <tr className="hover:bg-muted/10 font-bold">
                            <td className="p-3.5 pl-4 text-foreground">Total Revenue</td>
                            {activeIncomeList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-foreground">
                                {formatCompact(st.totalRevenue, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10">
                            <td className="p-3.5 pl-4 text-muted-foreground">Cost of Revenue</td>
                            {activeIncomeList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-muted-foreground">
                                {formatCompact(st.costOfRevenue, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10 font-semibold bg-emerald-500/5">
                            <td className="p-3.5 pl-4 text-emerald-500">Gross Profit</td>
                            {activeIncomeList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-emerald-500 font-bold">
                                {formatCompact(st.grossProfit, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10">
                            <td className="p-3.5 pl-4 text-muted-foreground">Operating Expenses</td>
                            {activeIncomeList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-muted-foreground">
                                {formatCompact(st.operatingExpenses, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10 font-semibold">
                            <td className="p-3.5 pl-4 text-foreground">Operating Income</td>
                            {activeIncomeList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-foreground">
                                {formatCompact(st.operatingIncome, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10 font-bold bg-muted/20 border-t border-border/60">
                            <td className="p-3.5 pl-4 text-foreground">Net Income</td>
                            {activeIncomeList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-foreground text-xs">
                                {formatCompact(st.netIncome, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10 text-muted-foreground">
                            <td className="p-3.5 pl-4">EBIT</td>
                            {activeIncomeList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right">
                                {formatCompact(st.ebit, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Balance Sheet */}
              {activeTab === "balance" && (
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Scales className="w-4 h-4 text-emerald-500" /> Balance Sheet Assets & Liabilities ({statementPeriod.toUpperCase()})
                    </h4>
                    <span className="text-[9px] font-mono text-muted-foreground">Currency: {reportData.currency}</span>
                  </div>

                  {activeBalanceList.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-mono py-8 text-center">
                      No {statementPeriod} balance sheet records available for this asset.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-border/60 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            <th className="p-3.5 pl-4">Financial Line Item</th>
                            {activeBalanceList.map((st) => (
                              <th key={st.endDate} className="p-3.5 text-right">{st.endDate}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30 text-[11px]">
                          <tr className="hover:bg-muted/10 font-bold">
                            <td className="p-3.5 pl-4 text-emerald-500">Cash & Equivalents</td>
                            {activeBalanceList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-emerald-500 font-bold">
                                {formatCompact(st.cash, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10 font-bold">
                            <td className="p-3.5 pl-4 text-foreground">Total Assets</td>
                            {activeBalanceList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-foreground">
                                {formatCompact(st.totalAssets, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10">
                            <td className="p-3.5 pl-4 text-muted-foreground">Total Liabilities</td>
                            {activeBalanceList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-muted-foreground">
                                {formatCompact(st.totalLiab, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10 font-semibold bg-muted/20">
                            <td className="p-3.5 pl-4 text-foreground">Stockholder Equity</td>
                            {activeBalanceList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-foreground">
                                {formatCompact(st.totalStockholderEquity, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10">
                            <td className="p-3.5 pl-4 text-muted-foreground">Total Debt</td>
                            {activeBalanceList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-muted-foreground">
                                {formatCompact(st.totalDebt, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10">
                            <td className="p-3.5 pl-4 text-muted-foreground">Working Capital</td>
                            {activeBalanceList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-muted-foreground">
                                {formatCompact(st.workingCapital, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Cash Flow Statement */}
              {activeTab === "cashflow" && (
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-500" /> Cash Flow Mapping ({statementPeriod.toUpperCase()})
                    </h4>
                    <span className="text-[9px] font-mono text-muted-foreground">Currency: {reportData.currency}</span>
                  </div>

                  {activeCashflowList.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-mono py-8 text-center">
                      No {statementPeriod} cash flow records available for this asset.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-border/60 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            <th className="p-3.5 pl-4">Financial Line Item</th>
                            {activeCashflowList.map((st) => (
                              <th key={st.endDate} className="p-3.5 text-right">{st.endDate}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30 text-[11px]">
                          <tr className="hover:bg-muted/10 font-bold">
                            <td className="p-3.5 pl-4 text-foreground">Operating Cash Flow</td>
                            {activeCashflowList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-foreground">
                                {formatCompact(st.operatingCashflow, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10">
                            <td className="p-3.5 pl-4 text-muted-foreground">Capital Expenditure (CapEx)</td>
                            {activeCashflowList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-muted-foreground">
                                {formatCompact(st.capitalExpenditures, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10 font-bold bg-emerald-500/5">
                            <td className="p-3.5 pl-4 text-emerald-500">Free Cash Flow (FCF)</td>
                            {activeCashflowList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-emerald-500 font-bold">
                                {formatCompact(st.freeCashFlow, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                          <tr className="hover:bg-muted/10">
                            <td className="p-3.5 pl-4 text-muted-foreground">Dividends Paid</td>
                            {activeCashflowList.map((st) => (
                              <td key={st.endDate} className="p-3.5 text-right text-muted-foreground">
                                {formatCompact(st.dividendsPaid, reportData.currency)}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SEC & Official Filings */}
              {activeTab === "filings" && (
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Bank className="w-4 h-4 text-emerald-500" /> Official SEC EDGAR & IR Filings
                    </h4>
                    <span className="text-[9px] font-mono text-muted-foreground">Direct Links</span>
                  </div>

                  {reportData.secFilings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground font-mono text-xs">
                      <Info className="w-6 h-6 mb-2 text-muted-foreground/60" />
                      <p>No direct SEC filings links recorded for this symbol.</p>
                      <a
                        href={`https://finance.yahoo.com/quote/${reportData.symbol}/financials`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-500 underline mt-2 flex items-center gap-1 text-[10px]"
                      >
                        View external financials page <ArrowSquareOut className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[10px]">
                      {reportData.secFilings.map((filing, idx) => (
                        <a
                          key={idx}
                          href={filing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-muted/20 border border-border/40 hover:border-border p-4 rounded-xl flex items-center justify-between gap-3 group transition-colors cursor-pointer"
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase text-[9px]">
                                {filing.type}
                              </span>
                              <span className="text-muted-foreground text-[9px] flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {filing.date}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-foreground truncate group-hover:text-emerald-500 transition-colors font-sans mt-0.5">
                              {filing.title}
                            </span>
                          </div>

                          <ArrowSquareOut className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>
        ) : null}

      </main>
    </div>
  )
}
