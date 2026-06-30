import React from "react"
import Link from "next/link"
import { ShieldCheck, ArrowLeft } from "@phosphor-icons/react/dist/ssr"

export default function PrivacyPage() {
  return (
    <div className="flex flex-col flex-1 bg-background text-foreground min-h-screen font-sans antialiased selection:bg-foreground/10 py-10 px-4 sm:px-6">
      <main className="max-w-3xl w-full mx-auto space-y-6">
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors uppercase font-mono tracking-wider">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to App
        </Link>

        {/* Title */}
        <div className="border-b border-border/40 pb-4">
          <h2 className="text-base font-bold tracking-tight text-foreground uppercase flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Privacy Policy
          </h2>
          <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
            Effective Date: June 30, 2026
          </p>
        </div>

        {/* Policy Body */}
        <div className="space-y-6 text-xs text-muted-foreground leading-relaxed font-mono">
          
          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">1. Information Collection & Scope</h3>
            <p>
              We collect user emails, account sign-up metadata, and authentication parameters created via Supabase Auth (or Google OAuth). We also store the stock holdings data (tickers, quantities, purchase prices) you manually record in your dashboard.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">2. Use of Information</h3>
            <p>
              Your data is utilized solely to compile your portfolio overview totals, map dividend cashflow charts, and check price threshold alerts. We do not sell, trade, or distribute your holdings or account information to any third-party advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">3. Data Security & RLS Isolation</h3>
            <p className="text-foreground">
              All portfolio holdings are stored inside a secure Supabase PostgreSQL database protected by strict **Row-Level Security (RLS)**. This database architecture guarantees that your portfolio records are strictly isolated, and only accessible by your authenticated account ID.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">4. Cookies and State Persistence</h3>
            <p>
              YieldWatch uses local storage to hydrate configuration settings (such as reporting currency preferences and active alerts) so you get an instant interface render upon returning. Supabase uses authentication cookies to manage and maintain your active server session state securely.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">5. Third-Party API Queries</h3>
            <p>
              YieldWatch calls public, edge-cached APIs (like Yahoo Finance quote engines and exchange rate index services) to fetch stock valuations. No personal identifiable account information is shared during these quantitative fetch queries.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">6. Policy Revisions</h3>
            <p>
              We reserve the right to revise this policy at any time. Changes will be reflected directly on this page with an updated effective date.
            </p>
          </section>

        </div>
      </main>
    </div>
  )
}
