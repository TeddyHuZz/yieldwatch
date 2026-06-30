"use client"

import React, { useEffect, useState, useCallback } from "react"
import { usePortfolioStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { AuthScreen } from "@/components/auth-screen"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import {
  User,
  Gear,
  BellSimple,
  CalendarBlank,
  GoogleLogo,
  Envelope,
  Coins,
  ShieldCheck,
  SignOut,
  Fingerprint,
  Plus,
  Trash,
  HandCoins,
} from "@phosphor-icons/react"

interface DividendLog {
  id: string
  ticker: string
  amount: number
  payout_date: string
}

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<"settings" | "logs">("settings")

  // Log Form State
  const [logs, setLogs] = useState<DividendLog[]>([])
  const [logTicker, setLogTicker] = useState("")
  const [logAmount, setLogAmount] = useState("")
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0])
  const [logLoading, setLogLoading] = useState(false)

  const {
    user,
    isAuthLoading,
    shares,
    currency,
    setCurrency,
    checkUserSession,
    signOut,
  } = usePortfolioStore()

  useEffect(() => {
    setMounted(true)
    checkUserSession()
  }, [checkUserSession])

  // Load dividend logs from Supabase
  const loadLogs = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from("dividend_history")
        .select("*")
        .order("payout_date", { ascending: false })

      if (error) throw error
      setLogs(
        (data || []).map((row: any) => ({
          id: row.id,
          ticker: row.ticker,
          amount: Number(row.amount),
          payout_date: row.payout_date,
        }))
      )
    } catch (err) {
      console.error("Failed to load dividend payout history:", err)
    }
  }, [user])

  useEffect(() => {
    if (mounted && user) {
      loadLogs()
    }
  }, [mounted, user, loadLogs])

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(e.target.value)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!logTicker || !logAmount || !user) return

    setLogLoading(true)
    try {
      const { error } = await supabase.from("dividend_history").insert([
        {
          user_id: user.id,
          ticker: logTicker,
          amount: Number(logAmount),
          payout_date: logDate,
        },
      ])

      if (error) throw error

      setLogAmount("")
      await loadLogs()
    } catch (err) {
      console.error("Failed to insert dividend log:", err)
    } finally {
      setLogLoading(false)
    }
  }

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payout log?")) return
    try {
      const { error } = await supabase.from("dividend_history").delete().eq("id", id)
      if (error) throw error
      await loadLogs()
    } catch (err) {
      console.error("Failed to delete log:", err)
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-[250px] bg-muted rounded-xl" />
            <div className="h-[250px] bg-muted rounded-xl" />
            <div className="h-[250px] bg-muted rounded-xl" />
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

  // Aggregate metrics
  const totalValue = shares.reduce((sum, s) => sum + s.shares * s.currentPrice, 0)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(val)
  }

  // Filter shares with active price alerts
  const sharesWithAlerts = shares.filter(
    (s) => s.alertHigh !== undefined || s.alertLow !== undefined
  )

  const signupDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString([], {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A"

  const isGoogleProvider =
    user.app_metadata?.provider === "google" ||
    user.identities?.some((id: any) => id.provider === "google")
  const userInitial = user.email ? user.email.charAt(0).toUpperCase() : "?"

  // Aggregate logs by chronological Month-Year to render bar charts
  const getChartData = () => {
    const grouped: Record<string, number> = {}
    const chronLogs = [...logs].reverse()

    chronLogs.forEach((log) => {
      const date = new Date(log.payout_date)
      if (isNaN(date.getTime())) return
      const label = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      grouped[label] = (grouped[label] || 0) + log.amount
    })

    return Object.entries(grouped).map(([name, amount]) => ({
      name,
      amount: parseFloat(amount.toFixed(2)),
    }))
  }

  const chartData = getChartData()

  return (
    <div className="flex flex-col flex-1 bg-background text-foreground min-h-screen font-sans antialiased selection:bg-foreground/10 py-6">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation & Title Divider */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-bold tracking-tight text-foreground uppercase flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" /> Settings & Profile
            </h2>
            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
              Manage your personal settings, triggers, and preferences
            </p>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Profile Card Sidebar (1/3 Width) */}
          <div className="lg:col-span-1 flex flex-col items-center bg-card border border-border/70 p-8 rounded-2xl shadow-xs text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Glowing Avatar */}
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-emerald-500/20 to-teal-500/5 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] mb-4">
              <span className="text-emerald-500 dark:text-emerald-400 text-2xl font-black">{userInitial}</span>
            </div>

            <h3 className="font-bold text-base text-foreground leading-snug truncate max-w-full px-2">
              {user.email}
            </h3>

            <div className="text-[10px] font-mono text-muted-foreground mt-1 flex items-center gap-1.5 justify-center">
              {isGoogleProvider ? (
                <>
                  <GoogleLogo className="w-3.5 h-3.5 text-red-500" weight="bold" />
                  <span>Google Social Auth</span>
                </>
              ) : (
                <>
                  <Envelope className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Email Credentials</span>
                </>
              )}
            </div>

            {/* Info details box */}
            <div className="w-full mt-6 pt-5 border-t border-border/40 text-left space-y-4 font-mono text-[10px]">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-sans">
                  Account Identifier
                </span>
                <span className="text-foreground truncate w-full flex items-center gap-1.5 bg-muted/30 border border-border/30 px-2 py-1 rounded">
                  <Fingerprint className="w-3.5 h-3.5 text-muted-foreground" />
                  {user.id}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-sans">
                  Account Created
                </span>
                <span className="text-foreground flex items-center gap-1.5 bg-muted/30 border border-border/30 px-2 py-1 rounded">
                  <CalendarBlank className="w-3.5 h-3.5 text-muted-foreground" />
                  {signupDate}
                </span>
              </div>
            </div>

            <Button
              onClick={signOut}
              variant="outline"
              className="w-full mt-8 h-9 text-[10px] uppercase font-bold tracking-wider rounded-lg border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <SignOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>

          {/* Right Column: Settings & Alerts & Logs Tabbed Layout (2/3 Width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Horizontal Tabs Selectors */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase border-b border-border/25 pb-2 select-none">
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-foreground text-background border-foreground shadow-xs"
                    : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                App settings
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  activeTab === "logs"
                    ? "bg-foreground text-background border-foreground shadow-xs"
                    : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                Dividend Payout Logs
              </button>
            </div>

            {/* TAB 1: Preferences Settings */}
            {activeTab === "settings" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Preferences Panel */}
                <div className="bg-card border border-border/70 p-6 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2 mb-4 border-b border-border/30 pb-3">
                    <Gear className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-sans text-xs font-bold text-foreground uppercase tracking-wider">
                      App Preferences
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
                        Global Reporting Currency
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative w-full max-w-[220px]">
                          <select
                            value={currency}
                            onChange={handleCurrencyChange}
                            className="w-full bg-muted/40 border border-border/80 rounded-lg py-2 px-3 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-foreground/45 appearance-none cursor-pointer"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="MYR">MYR (RM)</option>
                            <option value="SGD">SGD (S$)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="AUD">AUD (A$)</option>
                            <option value="CAD">CAD (C$)</option>
                            <option value="JPY">JPY (¥)</option>
                            <option value="HKD">HKD (HK$)</option>
                          </select>
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none text-muted-foreground">▼</span>
                        </div>

                        {saveSuccess && (
                          <span className="text-[9px] font-mono text-emerald-500 font-bold flex items-center gap-1 transition-all animate-in fade-in duration-200">
                            <ShieldCheck className="w-4 h-4" /> Preferences Saved
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground leading-relaxed pt-1 font-mono">
                        Sets currency formatting globally across dashboard calculations, summaries, and monthly dividend cashflow charts.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-border/30">
                      <div className="bg-muted/20 border border-border/40 p-4 rounded-xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-mono text-muted-foreground uppercase font-bold tracking-wider">Assets Tracked</span>
                          <p className="text-lg font-bold font-mono text-foreground leading-none">{shares.length}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <Coins className="w-4 h-4 text-emerald-500" />
                        </div>
                      </div>

                      <div className="bg-muted/20 border border-border/40 p-4 rounded-xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-mono text-muted-foreground uppercase font-bold tracking-wider">Total Value</span>
                          <p className="text-lg font-bold font-mono text-foreground leading-none">{formatCurrency(totalValue)}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <Coins className="w-4 h-4 text-emerald-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price Alerts Panel */}
                <div className="bg-card border border-border/70 p-6 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2 mb-4 border-b border-border/30 pb-3">
                    <BellSimple className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-sans text-xs font-bold text-foreground uppercase tracking-wider">
                      Active Price Limits & Alerts
                    </h3>
                  </div>

                  {sharesWithAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-8 px-4 bg-muted/20 border border-dashed border-border/60 rounded-xl">
                      <BellSimple className="w-6 h-6 text-muted-foreground/60 mb-2" />
                      <p className="text-[10px] text-muted-foreground font-mono leading-relaxed max-w-sm">
                        No active price warnings set. Define target boundaries inside any stock holding card on your main dashboard.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                      {sharesWithAlerts.map((share) => (
                        <div
                          key={share.id}
                          className="bg-muted/30 border border-border/40 p-3.5 rounded-xl text-[10px] font-mono flex items-center justify-between hover:border-border transition-colors"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-foreground bg-muted/80 px-2 py-0.5 rounded w-fit border border-border/40 text-[9px]">
                              {share.ticker}
                            </span>
                            <span className="text-[8px] text-muted-foreground truncate max-w-[140px] block">
                              {share.companyName}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-[9px] font-bold">
                            {share.alertHigh && (
                              <span className="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                High: {formatCurrency(share.alertHigh)}
                              </span>
                            )}
                            {share.alertLow && (
                              <span className="text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                                Low: {formatCurrency(share.alertLow)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Dividend History Logs */}
            {activeTab === "logs" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Visual Historical Income Chart */}
                {logs.length > 0 && (
                  <div className="bg-card border border-border/70 p-6 rounded-2xl shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-border/30 pb-3">
                      <HandCoins className="w-4 h-4 text-emerald-500" />
                      <h3 className="font-sans text-xs font-bold text-foreground uppercase tracking-wider">
                        Historical Dividend Income
                      </h3>
                    </div>

                    <div className="h-48 w-full font-mono text-[10px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <XAxis dataKey="name" stroke="#888888" tickLine={false} axisLine={false} />
                          <YAxis
                            stroke="#888888"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${currency} ${value}`}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "rgba(18, 18, 18, 0.85)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "#888888", fontFamily: "monospace" }}
                            itemStyle={{ color: "#10b981", fontFamily: "monospace" }}
                            formatter={(value) => [`${currency} ${value}`, "Payout"]}
                          />
                          <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Log form & data lists */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Log input form (1/3 width) */}
                  <div className="md:col-span-1 bg-card border border-border/70 p-5 rounded-2xl shadow-xs">
                    <h3 className="font-sans text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/20 pb-2 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-500 font-bold" /> Log Payout
                    </h3>

                    {shares.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                        Add shares to your portfolio first before logging history payouts.
                      </p>
                    ) : (
                      <form onSubmit={handleAddLog} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Asset Ticker
                          </label>
                          <select
                            required
                            value={logTicker}
                            onChange={(e) => setLogTicker(e.target.value)}
                            className="w-full bg-muted/40 border border-border/80 rounded-lg py-2 px-3 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                          >
                            <option value="">Select Asset...</option>
                            {shares.map((s) => (
                              <option key={s.id} value={s.ticker}>
                                {s.ticker}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Amount Received
                          </label>
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="0.00"
                            value={logAmount}
                            onChange={(e) => setLogAmount(e.target.value)}
                            className="w-full bg-muted/30 border border-border/80 rounded-lg py-2 px-3 text-xs font-mono text-foreground focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Date Received
                          </label>
                          <input
                            type="date"
                            required
                            value={logDate}
                            onChange={(e) => setLogDate(e.target.value)}
                            className="w-full bg-muted/30 border border-border/80 rounded-lg py-2 px-3 text-xs font-mono text-foreground focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={logLoading || !logTicker}
                          className="w-full h-9 text-[10px] uppercase font-bold tracking-wider rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
                        >
                          {logLoading ? "Saving..." : "Log Dividend"}
                        </Button>
                      </form>
                    )}
                  </div>

                  {/* Log lists table (2/3 width) */}
                  <div className="md:col-span-2 bg-card border border-border/70 p-5 rounded-2xl shadow-xs">
                    <h3 className="font-sans text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/20 pb-2">
                      Recent Dividend Payout Logs
                    </h3>

                    {logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground/60 select-none">
                        <HandCoins className="w-8 h-8 mb-2" />
                        <p className="text-[10px] font-mono leading-relaxed">No payout history logged yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-y-auto max-h-[290px] pr-1">
                        <table className="w-full text-left border-collapse text-[10px] font-mono">
                          <thead>
                            <tr className="border-b border-border/60 text-muted-foreground font-sans uppercase font-bold text-[8px] tracking-wider">
                              <th className="pb-2">Asset</th>
                              <th className="pb-2">Payout Date</th>
                              <th className="pb-2 text-right">Amount</th>
                              <th className="pb-2 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {logs.map((log) => (
                              <tr key={log.id} className="hover:bg-muted/10">
                                <td className="py-2.5">
                                  <span className="bg-muted px-1.5 py-0.5 rounded border border-border/40 font-bold">
                                    {log.ticker}
                                  </span>
                                </td>
                                <td className="py-2.5 text-muted-foreground">{log.payout_date}</td>
                                <td className="py-2.5 text-right font-bold text-emerald-500">
                                  {formatCurrency(log.amount)}
                                </td>
                                <td className="py-2.5 text-center">
                                  <button
                                    onClick={() => handleDeleteLog(log.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                    title="Delete log entry"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
