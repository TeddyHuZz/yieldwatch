"use client"

import React, { useEffect, useState } from "react"
import { usePortfolioStore, Share } from "@/lib/store"
import { AuthScreen } from "@/components/auth-screen"
import { Button } from "@/components/ui/button"
import {
  CalendarBlank,
  Coins,
  Clock,
  ArrowRight,
  Info,
  Calendar,
  HandCoins,
  BellSimple,
} from "@phosphor-icons/react"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false)
  const [rates, setRates] = useState<Record<string, number>>({})
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

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

  // Fetch exchange rates on mount for currency conversions
  useEffect(() => {
    fetch("/api/exchange-rates")
      .then((res) => res.json())
      .then((data) => {
        if (data.rates) setRates(data.rates)
      })
      .catch((err) => console.error("Failed to load exchange rates:", err))
  }, [])

  // Deduce the native trading currency of a stock symbol based on its exchange suffix
  const getTickerCurrency = (ticker: string): string => {
    const upper = ticker.toUpperCase().trim()
    if (upper.endsWith(".KL")) return "MYR" // Bursa Malaysia
    if (upper.endsWith(".SI")) return "SGD" // SGX
    if (upper.endsWith(".TO")) return "CAD" // TSX
    if (upper.endsWith(".AX")) return "AUD" // ASX
    if (upper.endsWith(".L")) return "GBP"  // LSE
    if (upper.endsWith(".DE")) return "EUR" // XETRA
    if (upper.endsWith(".T")) return "JPY"  // TSE
    if (upper.endsWith(".HK")) return "HKD" // HKEX
    return "USD" // Default to USD (NASDAQ, NYSE)
  }

  // Convert live rates to chosen display currency format
  const convertValue = (val: number, ticker: string, targetCurrency: string): number => {
    if (!rates || Object.keys(rates).length === 0) return val
    const native = getTickerCurrency(ticker)
    if (native === targetCurrency) return val

    const rateNative = rates[native] || 1
    const rateTarget = rates[targetCurrency] || 1

    const valueInUsd = val / rateNative
    return valueInUsd * rateTarget
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(val)
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-[300px] bg-muted rounded-xl" />
            <div className="h-[300px] bg-muted rounded-xl" />
            <div className="h-[300px] bg-muted rounded-xl" />
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

  const getPayoutsPerYear = (freq: string): number => {
    if (freq === "monthly") return 12
    if (freq === "quarterly") return 4
    if (freq === "semi-annually") return 2
    return 1
  }

  // Filter which holdings pay in a given month index (0-11)
  const getPayingHoldingsForMonth = (monthIdx: number) => {
    return shares.filter((share) => {
      const startMonth = share.payoutMonth
      if (share.frequency === "monthly") return true
      if (share.frequency === "quarterly") {
        return (
          startMonth === monthIdx ||
          (startMonth + 3) % 12 === monthIdx ||
          (startMonth + 6) % 12 === monthIdx ||
          (startMonth + 9) % 12 === monthIdx
        )
      }
      if (share.frequency === "semi-annually") {
        return startMonth === monthIdx || (startMonth + 6) % 12 === monthIdx
      }
      if (share.frequency === "annually") {
        return startMonth === monthIdx
      }
      return false
    })
  }

  // Calculate estimated dividend payout amount for a single holding in a specific payout event
  const getPayoutAmount = (share: Share): number => {
    const convertedAnnual = convertValue(share.annualDividendPerShare, share.ticker, currency)
    const payoutsPerYear = getPayoutsPerYear(share.frequency)
    return (share.shares * convertedAnnual) / payoutsPerYear
  }

  // Calculate monthly total dividend income
  const getMonthTotalIncome = (monthIdx: number): number => {
    const paying = getPayingHoldingsForMonth(monthIdx)
    return paying.reduce((sum, share) => sum + getPayoutAmount(share), 0)
  }

  // Get active upcoming ex-dividend dates in chronological order
  const getUpcomingExDates = () => {
    const nowTime = new Date().setHours(0, 0, 0, 0)
    return shares
      .filter((s) => s.exDividendDate)
      .map((s) => {
        const exDate = new Date(s.exDividendDate!)
        const diffDays = Math.ceil((exDate.getTime() - nowTime) / (1000 * 60 * 60 * 24))
        return {
          id: s.id,
          ticker: s.ticker,
          companyName: s.companyName,
          exDateStr: s.exDividendDate!,
          diffDays,
        }
      })
      .sort((a, b) => a.diffDays - b.diffDays)
  }

  const upcomingExDates = getUpcomingExDates()

  // Find max monthly payout to scale calendar progress bars
  const maxMonthlyPayout = Math.max(
    ...Array.from({ length: 12 }, (_, i) => getMonthTotalIncome(i)),
    1 // avoid division by 0
  )

  const activeMonthIndex = selectedMonth !== null ? selectedMonth : new Date().getMonth()
  const activeMonthHoldings = getPayingHoldingsForMonth(activeMonthIndex)
  const activeMonthTotal = getMonthTotalIncome(activeMonthIndex)

  return (
    <div className="flex flex-col flex-1 bg-background text-foreground min-h-screen font-sans antialiased selection:bg-foreground/10 py-6">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Page Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4 select-none">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-bold tracking-tight text-foreground uppercase flex items-center gap-2">
              <CalendarBlank className="w-4 h-4 text-emerald-500" /> Payout Calendar
            </h2>
            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
              Visualize your monthly dividend income scheduling and ex-dividend alerts
            </p>
          </div>
        </div>

        {shares.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center border border-dashed border-border/80 p-16 text-center bg-card/15 rounded-xl min-h-[350px]">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase mb-1.5">
              No calendar events available
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Add holdings with dividend payout parameters on the dashboard to build your visual calendar.
            </p>
          </div>
        ) : (
          /* Calendar Dashboard Layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left 2 Columns: 12-Month Calendar Grid */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-border/20 pb-2 select-none">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  12-Month Expected Timelines
                </h3>
                <span className="text-[9px] font-mono text-muted-foreground">
                  Click any month to inspect payout details
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MONTHS.map((monthName, idx) => {
                  const totalIncome = getMonthTotalIncome(idx)
                  const holdingsCount = getPayingHoldingsForMonth(idx).length
                  const isCurrentMonth = new Date().getMonth() === idx
                  const isSelected = selectedMonth === idx
                  const progress = (totalIncome / maxMonthlyPayout) * 100

                  return (
                    <button
                      key={monthName}
                      onClick={() => setSelectedMonth(idx)}
                      className={`text-left p-4 rounded-xl border bg-card/60 hover:bg-card/90 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[116px] relative group overflow-hidden ${
                        isSelected
                          ? "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-500/5"
                          : isCurrentMonth
                          ? "border-emerald-500/30 bg-muted/20"
                          : "border-border/70"
                      }`}
                    >
                      <div className="w-full flex items-center justify-between z-10">
                        <span className="font-sans font-bold text-xs text-foreground flex items-center gap-1.5">
                          {monthName.slice(0, 3)}
                          {isCurrentMonth && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Current Month" />
                          )}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {holdingsCount} {holdingsCount === 1 ? "asset" : "assets"}
                        </span>
                      </div>

                      <div className="mt-4 z-10 w-full">
                        <span className="font-mono font-bold text-sm text-foreground block">
                          {formatCurrency(totalIncome)}
                        </span>
                      </div>

                      {/* Small visual allocation progress bar */}
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-3 z-10">
                        <div
                          className="h-full bg-emerald-500/80 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Selected Month Detail Card */}
              <div className="bg-card border border-border/70 p-5 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-border/20 pb-3">
                  <div className="flex items-center gap-2">
                    <HandCoins className="w-4 h-4 text-emerald-500" />
                    <h4 className="font-sans text-xs font-bold text-foreground uppercase tracking-wider">
                      Payout Details: {MONTHS[activeMonthIndex]}
                    </h4>
                  </div>
                  <span className="font-mono font-bold text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Total: {formatCurrency(activeMonthTotal)}
                  </span>
                </div>

                {activeMonthHoldings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/60 select-none">
                    <Info className="w-6 h-6 mb-2" />
                    <p className="text-[10px] font-mono leading-relaxed">No dividend payments expected in {MONTHS[activeMonthIndex]}.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {activeMonthHoldings.map((share) => {
                      const eventPayout = getPayoutAmount(share)
                      return (
                        <div
                          key={share.id}
                          className="bg-muted/20 border border-border/40 hover:border-border/80 transition-colors p-3 rounded-xl flex items-center justify-between font-mono text-[10px]"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-foreground bg-muted border border-border/50 px-1.5 py-0.5 rounded w-fit text-[9px]">
                              {share.ticker}
                            </span>
                            <span className="text-[8px] text-muted-foreground truncate max-w-[150px] sm:max-w-xs block font-sans">
                              {share.companyName}
                            </span>
                          </div>

                          <div className="text-right flex items-center gap-6">
                            <div className="hidden sm:flex flex-col gap-0.5 text-right font-sans">
                              <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">Holding status</span>
                              <span className="text-[9px] text-foreground font-semibold">{share.shares.toLocaleString()} shares</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] text-muted-foreground font-sans uppercase font-bold tracking-wider">Est. Payout</span>
                              <span className="font-bold text-foreground">{formatCurrency(eventPayout)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Upcoming Ex-Dividend Dates (1/3 Width) */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 border-b border-border/20 pb-2 select-none">
                <Clock className="w-4 h-4 text-emerald-500" />
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Upcoming Ex-Dividend Dates
                </h3>
              </div>

              {upcomingExDates.length === 0 ? (
                <div className="bg-card border border-border/70 p-5 rounded-2xl text-center py-10 text-muted-foreground/60 select-none">
                  <BellSimple className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-[10px] font-mono leading-relaxed max-w-xs mx-auto">
                    No active ex-dividend dates found for your current holdings. Dates will populate as companies declare schedules.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {upcomingExDates.map((item) => {
                    const isOverdue = item.diffDays < 0
                    const isToday = item.diffDays === 0

                    return (
                      <div
                        key={item.id}
                        className={`bg-card border p-4 rounded-xl flex flex-col justify-between gap-3 transition-colors ${
                          isToday
                            ? "border-amber-500 bg-amber-500/5 shadow-xs"
                            : isOverdue
                            ? "border-border/40 opacity-70"
                            : "border-border/70 hover:border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono font-bold text-xs bg-muted border border-border/50 px-1.5 py-0.5 rounded leading-none">
                            {item.ticker}
                          </span>
                          <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                            isToday
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : isOverdue
                              ? "bg-muted text-muted-foreground"
                              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse"
                          }`}>
                            {isToday ? "Today" : isOverdue ? "Passed" : `In ${item.diffDays} days`}
                          </span>
                        </div>

                        <div className="font-mono text-[10px] space-y-1">
                          <p className="text-[9px] text-muted-foreground font-sans truncate font-bold">{item.companyName}</p>
                          <div className="flex justify-between items-baseline pt-1">
                            <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider font-sans">Ex-Dividend Date</span>
                            <span className="font-bold text-foreground text-right">{item.exDateStr}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
