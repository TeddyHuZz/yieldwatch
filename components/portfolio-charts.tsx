"use client"

import React, { useEffect, useState } from "react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { Share } from "@/lib/store"

interface PortfolioChartsProps {
  shares: Share[]
  currency: string
}

const COLORS = [
  "oklch(0.60 0.13 145)", // Modern Emerald
  "oklch(0.55 0.12 195)", // Clean Teal
  "oklch(0.50 0.11 235)", // Indigo Blue
  "oklch(0.62 0.14 275)", // Royal Purple
  "oklch(0.68 0.15 315)", // Premium Rose
  "oklch(0.70 0.13 75)",  // Soft Bronze
  "oklch(0.58 0.15 35)",  // Terra Cotta
  "oklch(0.48 0.10 160)", // Deep Mint
]

export function PortfolioCharts({ shares, currency }: PortfolioChartsProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-h-87.5">
        <div className="h-87.5 bg-card border border-border/70 animate-pulse rounded-xl" />
        <div className="h-87.5 bg-card border border-border/70 animate-pulse rounded-xl" />
      </div>
    )
  }

  // 1. Portfolio Allocation Data
  const allocationData = shares
    .map((share) => ({
      name: share.ticker,
      value: share.shares * share.currentPrice,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const totalValue = allocationData.reduce((sum, d) => sum + d.value, 0)

  // 2. Projected Monthly Dividend Data
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const monthlyDividends = months.map((monthName, monthIndex) => {
    let amount = 0
    shares.forEach((share) => {
      const annualPayout = share.shares * share.annualDividendPerShare
      if (annualPayout <= 0) return

      if (share.frequency === "monthly") {
        amount += annualPayout / 12
      } else if (share.frequency === "quarterly") {
        const payoutMonths = [
          share.payoutMonth,
          (share.payoutMonth + 3) % 12,
          (share.payoutMonth + 6) % 12,
          (share.payoutMonth + 9) % 12,
        ]
        if (payoutMonths.includes(monthIndex)) {
          amount += annualPayout / 4
        }
      } else if (share.frequency === "semi-annually") {
        const payoutMonths = [
          share.payoutMonth,
          (share.payoutMonth + 6) % 12,
        ]
        if (payoutMonths.includes(monthIndex)) {
          amount += annualPayout / 2
        }
      } else if (share.frequency === "annually") {
        if (share.payoutMonth === monthIndex) {
          amount += annualPayout
        }
      }
    })
    return {
      name: monthName,
      amount: Number(amount.toFixed(2)),
    }
  })

  const hasHoldings = shares.length > 0
  const hasDividends = monthlyDividends.some((m) => m.amount > 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(value)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
      {/* Allocation Chart */}
      <div className="flex flex-col bg-card border border-border/70 p-6 rounded-xl shadow-xs">
        <div className="flex flex-col gap-0.5 mb-4">
          <h3 className="font-sans text-sm font-semibold text-foreground uppercase tracking-wider">
            Portfolio Weight
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Distribution based on current market values
          </p>
        </div>

        <div className="flex-1 min-h-62.5 flex items-center justify-center">
          {hasHoldings ? (
            <div className="relative w-full h-62.5 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 1000 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        const percent = ((data.value / totalValue) * 100).toFixed(1)
                        return (
                          <div className="bg-popover border border-border/80 px-3 py-2 text-xs rounded-md shadow-xl text-popover-foreground font-mono">
                            <p className="font-semibold text-foreground font-sans">{data.name}</p>
                            <p className="text-muted-foreground mt-0.5">
                              Value: {formatCurrency(data.value)}
                            </p>
                            <p className="text-emerald-500 font-bold">
                              Weight: {percent}%
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center overlay for donut chart */}
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none z-0">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-sans font-bold">
                  Holdings Value
                </span>
                <span className="text-sm font-bold font-mono text-foreground mt-0.5">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground font-mono">
              No holdings to display
            </div>
          )}
        </div>

        {hasHoldings && (
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 max-h-20 overflow-y-auto pt-2 border-t border-border/30">
            {allocationData.slice(0, 8).map((data, index) => {
              const percent = ((data.value / totalValue) * 100).toFixed(1)
              return (
                <div key={data.name} className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span
                    className="w-2 h-2 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-bold text-foreground">{data.name}</span>
                  <span className="text-muted-foreground/80">{percent}%</span>
                </div>
              )
            })}
            {allocationData.length > 8 && (
              <div className="text-[9px] font-mono text-muted-foreground pt-0.5">
                + {allocationData.length - 8} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dividend Calendar Chart */}
      <div className="flex flex-col bg-card border border-border/70 p-6 rounded-xl shadow-xs">
        <div className="flex flex-col gap-0.5 mb-4">
          <h3 className="font-sans text-sm font-semibold text-foreground uppercase tracking-wider">
            Dividend Forecast
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Projected cashflow mapping by month
          </p>
        </div>

        <div className="flex-1 min-h-62.5 flex items-center justify-center">
          {hasDividends ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyDividends}
                margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="emeraldBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.15 145)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="oklch(0.52 0.11 140)" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  width={65}
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  stroke="var(--color-muted-foreground)"
                  tickFormatter={(value) => 
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currency,
                      maximumFractionDigits: 0,
                    }).format(value)
                  }
                />
                <Tooltip
                  wrapperStyle={{ zIndex: 1000 }}
                  cursor={{ fill: "var(--color-muted)", opacity: 0.12 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-popover border border-border/80 px-3 py-2 text-xs rounded-md shadow-xl text-popover-foreground font-mono">
                          <p className="font-semibold text-foreground font-sans">{data.name}</p>
                          <p className="text-emerald-500 font-bold mt-0.5">
                            Payout: {formatCurrency(data.amount)}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="amount"
                  fill="url(#emeraldBarGrad)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-muted-foreground font-mono">
              No projected dividends
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
