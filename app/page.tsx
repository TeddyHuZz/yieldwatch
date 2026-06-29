"use client"

import React, { useEffect, useState } from "react"
import { usePortfolioStore, Share } from "@/lib/store"
import { PortfolioCharts } from "@/components/portfolio-charts"
import { TickerChart } from "@/components/ticker-chart"
import { AuthScreen } from "@/components/auth-screen"
import { AddShareDialog } from "@/components/add-share-dialog"
import { Button } from "@/components/ui/button"
import {
  Plus,
  ArrowClockwise,
  Trash,
  PencilSimple,
  ArrowUpRight,
  ArrowDownRight,
  List,
  CalendarBlank,
  Coins,
  Percent,
  TrendUp,
  BellSimple,
  SignOut,
} from "@phosphor-icons/react"

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editShareId, setEditShareId] = useState<string | null>(null)
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null)

  const {
    shares,
    currency,
    triggeredAlerts,
    isLoading,
    isAuthLoading,
    user,
    error,
    refreshSharePrices,
    deleteShare,
    setCurrency,
    dismissAlert,
    checkUserSession,
    signOut,
  } = usePortfolioStore()

  useEffect(() => {
    setMounted(true)
    checkUserSession()
  }, [checkUserSession])

  const handleEditShare = (id: string) => {
    setEditShareId(id)
    setIsDialogOpen(true)
  }

  const handleAddShare = () => {
    setEditShareId(null)
    setIsDialogOpen(true)
  }

  const toggleExpandShare = (id: string) => {
    setExpandedShareId(expandedShareId === id ? null : id)
  }

  // Format helper functions
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(val)
  }

  const formatPercent = (val: number) => {
    return `${val.toFixed(2)}%`
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-[250px] bg-muted rounded" />
            <div className="h-[250px] bg-muted rounded" />
          </div>
          <div className="h-64 bg-muted rounded" />
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

  // Math Calculations
  const totalCost = shares.reduce((sum, s) => sum + s.shares * s.purchasePrice, 0)
  const totalValue = shares.reduce((sum, s) => sum + s.shares * s.currentPrice, 0)
  const totalReturn = totalValue - totalCost
  const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0

  const forwardAnnualDividends = shares.reduce(
    (sum, s) => sum + s.shares * s.annualDividendPerShare,
    0
  )
  const portfolioYield = totalValue > 0 ? (forwardAnnualDividends / totalValue) * 100 : 0
  const yieldOnCost = totalCost > 0 ? (forwardAnnualDividends / totalCost) * 100 : 0
  const monthlyAverageIncome = forwardAnnualDividends / 12

  // Find Daily Movers (Gainers / Laggards) for Performance summary card
  const sharesWithDailyMovers = shares.filter(
    (s) => s.dayChangePercent !== undefined && s.dayChangePercent !== 0
  )
  
  let topGainer: Share | null = null
  let topLaggard: Share | null = null

  if (sharesWithDailyMovers.length > 0) {
    const sortedMovers = [...sharesWithDailyMovers].sort(
      (a, b) => (b.dayChangePercent || 0) - (a.dayChangePercent || 0)
    )
    const first = sortedMovers[0]
    const last = sortedMovers[sortedMovers.length - 1]

    if (first && first.dayChangePercent !== undefined && first.dayChangePercent > 0) {
      topGainer = first
    }
    if (last && last.dayChangePercent !== undefined && last.dayChangePercent < 0) {
      topLaggard = last
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-background text-foreground min-h-screen font-sans antialiased selection:bg-foreground/10 py-6">
      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Page Actions Header Bar */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-bold tracking-tight text-foreground uppercase">
              Portfolio Overview
            </h2>
            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
              Analyze your holdings and dividend cashflows
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Logged in User Profile Info */}
            <div className="flex flex-col items-end select-none text-right leading-tight max-w-[100px] sm:max-w-[180px]">
              <span className="text-[9px] font-mono text-muted-foreground truncate w-full">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="text-[9px] font-bold text-muted-foreground/80 hover:text-destructive transition-colors uppercase tracking-wider cursor-pointer mt-0.5 flex items-center gap-0.5"
              >
                <SignOut className="w-3 h-3" /> Sign Out
              </button>
            </div>

            {/* Separator line */}
            <div className="h-6 w-px bg-border/40 shrink-0" />

            {shares.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSharePrices}
                disabled={isLoading}
                className="h-8 text-[11px] rounded-md border-border/80 hover:bg-muted/40 font-medium transition-colors cursor-pointer"
              >
                <ArrowClockwise className={`w-3.5 h-3.5 mr-1 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Syncing..." : "Sync Prices"}
              </Button>
            )}

            <Button
              onClick={handleAddShare}
              size="sm"
              className="h-8 text-[11px] rounded-md font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1 font-bold" />
              Add Share
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[11px] px-4 py-3 rounded font-mono">
            Error: {error}
          </div>
        )}

        {/* Alerts Banner */}
        {triggeredAlerts && triggeredAlerts.length > 0 && (
          <div className="space-y-2">
            {triggeredAlerts.map((alertMessage, idx) => (
              <div
                key={`${alertMessage}-${idx}`}
                className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="font-mono text-[10px]">{alertMessage}</span>
                </div>
                <button
                  onClick={() => dismissAlert(idx)}
                  className="text-[9px] font-bold text-amber-500 hover:text-amber-600 dark:hover:text-amber-300 uppercase tracking-wider cursor-pointer pl-4"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        {shares.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center border border-dashed border-border/80 p-16 text-center bg-card/15 rounded-xl min-h-[400px]">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <CalendarBlank className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase mb-1.5">
              No holdings recorded
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
              Start building your tracker by logging your stock, ETF, or mutual fund holdings. YieldWatch does the analytical heavy-lifting.
            </p>
            <Button
              onClick={handleAddShare}
              size="sm"
              className="rounded-md font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5 font-bold" />
              Add Your First Share
            </Button>
          </div>
        ) : (
          /* Active Dashboard */
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Portfolio Value */}
              <div className="bg-card border border-border/70 p-4 rounded-xl shadow-xs hover:shadow-sm hover:border-border transition-all duration-300 flex flex-col justify-between group">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Portfolio Value
                  </span>
                  <div className="p-1 rounded-md bg-muted/40 group-hover:bg-muted/80 transition-colors">
                    <Coins className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-2">
                  <h2 className="text-xl font-bold font-mono tracking-tight text-foreground">
                    {formatCurrency(totalValue)}
                  </h2>
                </div>
                <div className="mt-3 pt-2 border-t border-border/30 flex items-center gap-1.5 text-[10px] font-mono">
                  {totalReturn >= 0 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                      +{formatPercent(totalReturnPercent)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-destructive bg-destructive/10 dark:bg-destructive/15 px-1.5 py-0.5 rounded font-bold">
                      <ArrowDownRight className="w-3 h-3 shrink-0" />
                      {formatPercent(totalReturnPercent)}
                    </span>
                  )}
                  <span className="text-muted-foreground/80">
                    ({totalReturn >= 0 ? "+" : ""}{formatCurrency(totalReturn)})
                  </span>
                </div>
              </div>

              {/* Invested Capital */}
              <div className="bg-card border border-border/70 p-4 rounded-xl shadow-xs hover:shadow-sm hover:border-border transition-all duration-300 flex flex-col justify-between group">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Invested Capital
                  </span>
                  <div className="p-1 rounded-md bg-muted/40 group-hover:bg-muted/80 transition-colors">
                    <TrendUp className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-2">
                  <h2 className="text-xl font-bold font-mono tracking-tight text-foreground">
                    {formatCurrency(totalCost)}
                  </h2>
                </div>
                <div className="mt-3 pt-2 border-t border-border/30 flex items-center gap-1.5 text-[10px] text-muted-foreground font-sans">
                  <span>Holdings:</span>
                  <span className="font-semibold text-foreground font-mono">{shares.length} assets</span>
                </div>
              </div>

              {/* Forward Annual Income */}
              <div className="bg-card border border-border/70 p-4 rounded-xl shadow-xs hover:shadow-sm hover:border-border transition-all duration-300 flex flex-col justify-between group">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Annual Dividends
                  </span>
                  <div className="p-1 rounded-md bg-muted/40 group-hover:bg-muted/80 transition-colors">
                    <CalendarBlank className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-2">
                  <h2 className="text-xl font-bold font-mono tracking-tight text-foreground">
                    {formatCurrency(forwardAnnualDividends)}
                  </h2>
                </div>
                <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground font-sans">Yield:</span>
                    <span className="font-semibold text-foreground">
                      {formatPercent(portfolioYield)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground font-sans">YOC:</span>
                    <span className="font-bold text-emerald-500 bg-emerald-500/10 px-1 py-0.25 rounded">
                      {formatPercent(yieldOnCost)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly Average */}
              <div className="bg-card border border-border/70 p-4 rounded-xl shadow-xs hover:shadow-sm hover:border-border transition-all duration-300 flex flex-col justify-between group">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Monthly Average
                  </span>
                  <div className="p-1 rounded-md bg-muted/40 group-hover:bg-muted/80 transition-colors">
                    <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-2">
                  <h2 className="text-xl font-bold font-mono tracking-tight text-foreground">
                    {formatCurrency(monthlyAverageIncome)}
                  </h2>
                </div>
                <div className="mt-3 pt-2 border-t border-border/30 flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                  <span className="font-sans">Daily projection:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(forwardAnnualDividends / 365)}
                  </span>
                </div>
              </div>
            </div>

            {/* Today's Movers Banner */}
            {(topGainer || topLaggard) && (
              <div className="bg-card/45 border border-border/70 px-4 py-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] select-none font-mono">
                <div className="flex items-center gap-1.5 font-sans font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Today's Performance Movers:</span>
                </div>
                <div className="flex items-center gap-6">
                  {topGainer && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-sans">Top Gainer:</span>
                      <span className="font-bold text-foreground">{topGainer.ticker}</span>
                      <span className="font-bold text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 px-1.5 py-0.5 rounded">
                        +{topGainer.dayChangePercent?.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {topLaggard && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-sans">Laggard:</span>
                      <span className="font-bold text-foreground">{topLaggard.ticker}</span>
                      <span className="font-bold text-destructive bg-destructive/10 dark:bg-destructive/15 px-1.5 py-0.5 rounded">
                        {topLaggard.dayChangePercent?.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Charts Component */}
            <PortfolioCharts shares={shares} currency={currency} />

            {/* Holdings Details Section */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
                  <List className="w-4 h-4 text-muted-foreground" /> Asset Holdings
                </h3>
                <div className="relative flex items-center text-[10px] font-mono bg-muted/50 border border-border/50 rounded pl-2 pr-1 py-0.5 text-muted-foreground select-none">
                  <span className="mr-1">Currency:</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-transparent border-0 font-mono font-bold text-foreground focus:outline-none appearance-none cursor-pointer pr-4"
                  >
                    <option value="USD" className="bg-popover text-foreground">USD ($)</option>
                    <option value="MYR" className="bg-popover text-foreground">MYR (RM)</option>
                    <option value="SGD" className="bg-popover text-foreground">SGD (S$)</option>
                    <option value="EUR" className="bg-popover text-foreground">EUR (€)</option>
                    <option value="GBP" className="bg-popover text-foreground">GBP (£)</option>
                    <option value="AUD" className="bg-popover text-foreground">AUD (A$)</option>
                    <option value="CAD" className="bg-popover text-foreground">CAD (C$)</option>
                    <option value="JPY" className="bg-popover text-foreground">JPY (¥)</option>
                    <option value="HKD" className="bg-popover text-foreground">HKD (HK$)</option>
                  </select>
                  <span className="absolute right-1.5 text-[8px] pointer-events-none text-muted-foreground">▼</span>
                </div>
              </div>

              {/* Holdings Table */}
              <div className="w-full overflow-x-auto border border-border/70 rounded-xl bg-card shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/20 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      <th className="p-4 pl-5">Asset</th>
                      <th className="p-4 text-right">Shares</th>
                      <th className="p-4 text-right hidden sm:table-cell">Avg Cost / Price</th>
                      <th className="p-4 text-right">Cost / Value</th>
                      <th className="p-4 text-right">Total Return</th>
                      <th className="p-4 text-right hidden md:table-cell">Yield / YOC</th>
                      <th className="p-4 text-right">Annual Dividends</th>
                      <th className="p-4 text-center pr-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono text-[11px] text-foreground">
                    {shares.map((share) => {
                      const shareCost = share.shares * share.purchasePrice
                      const shareValue = share.shares * share.currentPrice
                      const shareReturn = shareValue - shareCost
                      const shareReturnPercent = shareCost > 0 ? (shareReturn / shareCost) * 100 : 0
                      const shareYieldOnCost =
                        share.purchasePrice > 0
                          ? (share.annualDividendPerShare / share.purchasePrice) * 100
                          : 0

                      const isExpanded = expandedShareId === share.id

                      return (
                        <React.Fragment key={share.id}>
                          <tr
                            onClick={() => toggleExpandShare(share.id)}
                            className={`hover:bg-muted/10 transition-colors cursor-pointer ${
                              isExpanded ? "bg-muted/20 border-b border-border/30" : ""
                            }`}
                          >
                            {/* Symbol & Name */}
                            <td className="p-4 pl-5 max-w-[150px] sm:max-w-none font-sans">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-foreground bg-muted/65 dark:bg-muted/30 border border-border/30 px-1.5 py-0.5 rounded w-fit tracking-wide text-xs">
                                    {share.ticker}
                                  </span>
                                  {(share.alertHigh !== undefined || share.alertLow !== undefined) && (
                                    <span title="Active alerts set">
                                      <BellSimple className="w-3.5 h-3.5 text-amber-500 shrink-0" weight="fill" />
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[140px] sm:max-w-xs">
                                  {share.companyName}
                                </span>
                                {share.exDividendDate && (
                                  <span className="text-[9px] text-amber-600/90 dark:text-amber-500/80 font-mono tracking-tight mt-0.5">
                                    Ex-Div: {share.exDividendDate}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Shares */}
                            <td className="p-4 text-right font-medium">
                              <div>
                                {share.shares.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 4,
                                })}
                              </div>
                              {share.volume !== undefined && share.volume > 0 && (
                                <div className="text-[9px] text-muted-foreground/80 font-normal">
                                  Vol: {share.volume.toLocaleString()}
                                </div>
                              )}
                            </td>

                            {/* Avg Cost / Price */}
                            <td className="p-4 text-right hidden sm:table-cell text-muted-foreground font-mono">
                              <div>{formatCurrency(share.purchasePrice)}</div>
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-foreground font-semibold">
                                  {formatCurrency(share.currentPrice)}
                                </span>
                                {share.dayChange !== undefined && share.dayChangePercent !== undefined && share.dayChange !== 0 && (
                                  <span className={`text-[9px] font-semibold font-mono ${share.dayChange >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                                    {share.dayChange >= 0 ? "+" : ""}{share.dayChange.toFixed(2)} ({share.dayChangePercent >= 0 ? "+" : ""}{share.dayChangePercent.toFixed(2)}%)
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Cost / Value */}
                            <td className="p-4 text-right">
                              <div className="text-muted-foreground">
                                {formatCurrency(shareCost)}
                              </div>
                              <div className="font-semibold text-foreground">
                                {formatCurrency(shareValue)}
                              </div>
                            </td>

                            {/* Return */}
                            <td className="p-4 text-right font-medium">
                              <div className="flex flex-col items-end gap-0.5">
                                <span
                                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                                    shareReturn >= 0
                                      ? "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400"
                                      : "bg-destructive/10 text-destructive dark:bg-destructive/15"
                                  }`}
                                >
                                  {shareReturn >= 0 ? "+" : ""}
                                  {formatPercent(shareReturnPercent)}
                                </span>
                                <span className="text-[9px] text-muted-foreground/80 font-mono">
                                  {shareReturn >= 0 ? "+" : ""}
                                  {formatCurrency(shareReturn)}
                                </span>
                              </div>
                            </td>

                            {/* Yield / YOC */}
                            <td className="p-4 text-right hidden md:table-cell">
                              <div className="text-muted-foreground">
                                {formatPercent(share.dividendYield)}
                              </div>
                              <div className="text-emerald-500 font-bold bg-emerald-500/10 dark:bg-emerald-500/15 px-1 py-0.25 rounded w-fit ml-auto">
                                {formatPercent(shareYieldOnCost)}
                              </div>
                            </td>

                            {/* Annual Dividends */}
                            <td className="p-4 text-right">
                              <div className="font-semibold text-foreground">
                                {formatCurrency(share.shares * share.annualDividendPerShare)}
                              </div>
                              <div className="text-[8px] text-muted-foreground uppercase font-sans font-bold tracking-wider mt-0.5">
                                {share.frequency}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="p-4 text-center pr-5 font-sans" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleEditShare(share.id)}
                                  className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                  title="Edit holding"
                                >
                                  <PencilSimple className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Are you sure you want to delete your holding for ${share.ticker}?`
                                      )
                                    ) {
                                      deleteShare(share.id)
                                    }
                                  }}
                                  className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                  title="Delete holding"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Key Fundamentals Row */}
                          {isExpanded && (
                            <tr className="bg-muted/10 dark:bg-muted/5 transition-colors">
                              <td colSpan={8} className="p-4 pl-8 border-b border-border/40">
                                <div className="space-y-4">
                                  {/* Key statistics */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-2 px-1 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                                    {/* PE Ratio */}
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-sans">
                                        P/E Ratio (PER)
                                      </span>
                                      <span className="font-semibold font-mono text-foreground text-xs">
                                        {share.peRatio && share.peRatio > 0 ? share.peRatio.toFixed(2) : "N/A"}
                                      </span>
                                    </div>

                                    {/* Price to Book */}
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-sans">
                                        Price to Book (PBR)
                                      </span>
                                      <span className="font-semibold font-mono text-foreground text-xs">
                                        {share.priceToBook && share.priceToBook > 0 ? share.priceToBook.toFixed(2) : "N/A"}
                                      </span>
                                    </div>

                                    {/* Return on Equity */}
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-sans">
                                        Return on Equity (ROE)
                                      </span>
                                      <span className="font-semibold font-mono text-emerald-500 dark:text-emerald-400 text-xs">
                                        {share.returnOnEquity && share.returnOnEquity > 0 ? `${share.returnOnEquity.toFixed(2)}%` : "N/A"}
                                      </span>
                                    </div>

                                    {/* EPS */}
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-sans">
                                        Earnings Per Share (EPS)
                                      </span>
                                      <span className="font-semibold font-mono text-foreground text-xs">
                                        {share.eps !== undefined ? formatCurrency(share.eps) : "N/A"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Interactive Price History Chart */}
                                  <div className="border-t border-border/30 pt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <TickerChart symbol={share.ticker} currency={currency} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Dialog for Add/Edit Share */}
      <AddShareDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editShareId={editShareId}
      />
    </div>
  )
}
