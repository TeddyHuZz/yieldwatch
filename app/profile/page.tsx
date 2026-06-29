"use client"

import React, { useEffect, useState } from "react"
import { usePortfolioStore } from "@/lib/store"
import { AuthScreen } from "@/components/auth-screen"
import { Button } from "@/components/ui/button"
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
} from "@phosphor-icons/react"

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

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

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(e.target.value)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
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

  const isGoogleProvider = user.app_metadata?.provider === "google" || user.identities?.some((id: any) => id.provider === "google")
  const userInitial = user.email ? user.email.charAt(0).toUpperCase() : "?"

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
            {/* Subtle glow background */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Glowing Avatar */}
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-emerald-500/20 to-teal-500/5 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] mb-4">
              <span className="text-emerald-500 dark:text-emerald-400 text-2xl font-black">{userInitial}</span>
            </div>

            {/* User credentials */}
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

            {/* Logout Button inside the sidebar */}
            <Button
              onClick={signOut}
              variant="outline"
              className="w-full mt-8 h-9 text-[10px] uppercase font-bold tracking-wider rounded-lg border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <SignOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>

          {/* Right Column: Settings & Alerts (2/3 Width) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Preferences Panel */}
            <div className="bg-card border border-border/70 p-6 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2 mb-4 border-b border-border/30 pb-3">
                <Gear className="w-4 h-4 text-emerald-500" />
                <h3 className="font-sans text-xs font-bold text-foreground uppercase tracking-wider">
                  App Preferences
                </h3>
              </div>

              <div className="space-y-6">
                {/* Global Currency Selection */}
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

                {/* Portfolio Aggregates Summary */}
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
                    No active price warnings set. Define target boundaries (upper or lower limits) inside any stock holding card on your main dashboard to track real-time changes.
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
        </div>
      </main>
    </div>
  )
}
