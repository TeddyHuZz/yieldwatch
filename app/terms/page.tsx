import React from "react"
import Link from "next/link"
import { Scales, ArrowLeft } from "@phosphor-icons/react/dist/ssr"

export default function TermsPage() {
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
            <Scales className="w-4 h-4 text-emerald-500" /> Terms & Conditions
          </h2>
          <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
            Effective Date: June 30, 2026
          </p>
        </div>

        {/* Policy Body */}
        <div className="space-y-6 text-xs text-muted-foreground leading-relaxed font-mono">
          
          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">1. Acceptance of Terms</h3>
            <p>
              By accessing or using the YieldWatch platform (the "Service"), you agree to be bound by these Terms and Conditions. If you do not agree, you are prohibited from utilizing the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">2. Use License & Scope</h3>
            <p>
              YieldWatch is a private, educational portfolio tracking tool. You are granted a limited, non-transferable, revocable license to access the interface for personal, non-commercial tracking only. You may not reverse-engineer, scrap, or systematically query our market API endpoints.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">3. Absolute Financial Disclaimer</h3>
            <p className="text-foreground">
              ALL DATA, quote prices, dividend yields, calculations, safety scores, and moving average trends are provided "as is" for convenience and reference. YieldWatch does not warrant the accuracy, timeliness, or completeness of the data. We do not provide financial advice, broker services, or investment consulting. All financial actions you take are solely your own responsibility.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">4. Limitations of Liability</h3>
            <p>
              In no event shall YieldWatch, its developers, or partners be liable for any damages (including, without limitation, damages for loss of capital, data, or profit) arising out of the use or inability to use the materials on the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">5. Revisions and Data Errors</h3>
            <p>
              The materials appearing on YieldWatch could include technical, typographical, or financial data errors. We do not promise that any of the materials on our web routes are accurate, complete, or current. We may make changes to the services at any time without notice.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-sans text-sm font-bold text-foreground uppercase">6. Governing Law</h3>
            <p>
              Any claim relating to YieldWatch shall be governed by local laws without regard to conflict of law provisions.
            </p>
          </section>

        </div>
      </main>
    </div>
  )
}
