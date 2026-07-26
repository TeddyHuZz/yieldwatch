"use client"

import React, { useEffect, useState } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { CalendarBlank } from "@phosphor-icons/react"

interface TickerChartProps {
  symbol: string
  currency: string
}

interface PriceData {
  date: string
  price: number
}

const RANGES = [
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1m" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
]

export function TickerChart({ symbol, currency }: TickerChartProps) {
  const [range, setRange] = useState<string>("1m")
  const [data, setData] = useState<PriceData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function fetchHistory() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/history?symbol=${encodeURIComponent(symbol)}&range=${range}`
        )
        if (!res.ok) throw new Error("Failed to fetch price history")
        const historyData = await res.json()
        if (active) {
          setData(Array.isArray(historyData) ? historyData : [])
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Failed to load price chart")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchHistory()

    return () => {
      active = false
    }
  }, [symbol, range])

  // Local currency formatter
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(value)
  }

  // Date label formatter based on active range
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ""

    if (range === "1d") {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    if (range === "1w") {
      return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit" })}`
    }
    if (range === "1m") {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
    if (range === "1y") {
      return date.toLocaleDateString([], { month: "short", year: "numeric" })
    }
    return date.toLocaleDateString([], { year: "numeric" })
  }

  // Brief date label for X-Axis ticks
  const formatXAxisTick = (dateStr: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ""

    if (range === "1d") {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    if (range === "1w" || range === "1m") {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
    if (range === "1y") {
      return date.toLocaleDateString([], { month: "short" })
    }
    return date.toLocaleDateString([], { year: "numeric" })
  }

  // Determine performance color (Emerald Green for gain, Rose Red for loss)
  const isGain = data.length >= 2 ? data[data.length - 1].price >= data[0].price : true
  const strokeColor = isGain ? "oklch(0.60 0.13 145)" : "oklch(0.60 0.15 20)"
  const stopColor = isGain ? "oklch(0.65 0.15 145)" : "oklch(0.65 0.15 20)"

  return (
    <div className="flex flex-col bg-card/45 border border-border/50 p-4 rounded-xl shadow-xs transition-colors duration-300 w-full mt-2">
      {/* Timeframe Selector Header */}
      <div className="flex items-center justify-between mb-4 select-none">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5 font-sans">
          <CalendarBlank className="w-3.5 h-3.5" /> Price History
        </span>
        <div className="flex items-center gap-1 bg-muted/65 dark:bg-muted/30 border border-border/30 p-0.5 rounded-lg">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all cursor-pointer ${
                range === r.value
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-45 w-full flex items-center justify-center relative font-mono text-[9px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-card/20 z-10 backdrop-blur-xs">
            <span className="text-xs text-muted-foreground animate-pulse">Loading chart data...</span>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/5 text-destructive p-4 text-center rounded-xl z-10">
            <span>{error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground p-4 text-center rounded-xl z-10">
            <span>No price data recorded for this range</span>
          </div>
        ) : null}

        {data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${symbol}-${range}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stopColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={stopColor} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                fontSize={9}
                stroke="var(--color-muted-foreground)"
                tickFormatter={formatXAxisTick}
                opacity={0.8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={9}
                stroke="var(--color-muted-foreground)"
                domain={["auto", "auto"]}
                tickFormatter={(val) => formatCurrency(val)}
                opacity={0.8}
              />
              <Tooltip
                cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: "3 3", opacity: 0.5 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const priceItem = payload[0].payload
                    return (
                      <div className="bg-popover/90 backdrop-blur-md border border-border/80 px-2.5 py-1.5 text-[10px] rounded-md shadow-md text-popover-foreground">
                        <p className="text-muted-foreground font-sans uppercase font-bold text-[8px] tracking-wider">
                          {formatDateLabel(priceItem.date)}
                        </p>
                        <p className="font-bold text-foreground mt-0.5">
                          {formatCurrency(priceItem.price)}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={1.5}
                fillOpacity={1}
                fill={`url(#gradient-${symbol}-${range})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
