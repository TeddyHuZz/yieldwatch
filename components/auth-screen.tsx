"use client"

import React, { useState, useEffect } from "react"
import { usePortfolioStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { LockKey, Envelope, GoogleLogo, Eye, EyeSlash } from "@phosphor-icons/react"

export function AuthScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const { signIn, signUp, signInWithGoogle, error: storeError, setError } = usePortfolioStore()

  // Clear errors when toggling modes
  useEffect(() => {
    setFormError(null)
    setError(null)
  }, [isSignUp, setError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setError(null)

    if (!email || !password) {
      setFormError("Please fill in all credentials.")
      return
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
    } catch (err: any) {
      // Error is set in store and displayed
      console.warn("Auth action failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setFormError(null)
    setError(null)
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error("Google OAuth redirect failed:", err)
      setLoading(false)
    }
  }

  const activeError = formError || storeError

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4 font-sans select-none antialiased">
      <div className="w-full max-w-md bg-card/40 border border-border/70 p-8 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300">
        
        {/* Subtle glowing orb background */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-1 mb-8">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <span className="text-emerald-500 font-bold text-base">%</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-foreground uppercase">
            YieldWatch
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
            Share and Dividend Portfolio Tracker
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-1 bg-muted/65 dark:bg-muted/30 border border-border/30 p-1 rounded-xl mb-6">
          <button
            onClick={() => setIsSignUp(false)}
            className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
              !isSignUp
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
              isSignUp
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        {activeError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[10px] p-3 rounded-lg font-mono mb-4 text-center">
            {activeError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80">
                <Envelope className="w-3.5 h-3.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-muted/30 border border-border/80 rounded-lg py-2 pl-9 pr-4 text-xs font-mono focus:outline-none focus:border-foreground/45 transition-colors placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80">
                <LockKey className="w-3.5 h-3.5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-muted/30 border border-border/80 rounded-lg py-2 pl-9 pr-10 text-xs font-mono focus:outline-none focus:border-foreground/45 transition-colors placeholder:text-muted-foreground/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeSlash className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-9 mt-2 text-[10px] uppercase font-bold tracking-wider rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
          >
            {loading ? (
              <span className="animate-pulse">Processing...</span>
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="relative my-6 flex items-center justify-center text-[8px] font-bold uppercase tracking-widest text-muted-foreground/75 font-mono select-none">
          <div className="absolute w-full border-t border-border/40" />
          <span className="relative bg-background/5 px-3 uppercase tracking-wider backdrop-blur-md">
            OR
          </span>
        </div>

        {/* Social login */}
        <Button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          variant="outline"
          className="w-full h-9 text-[10px] uppercase font-bold tracking-wider rounded-lg border-border/80 hover:bg-muted/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <GoogleLogo className="w-4 h-4 text-red-500" weight="bold" />
          Continue with Google
        </Button>
      </div>
    </div>
  )
}
