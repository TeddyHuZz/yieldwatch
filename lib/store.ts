import { create } from "zustand"
import { persist } from "zustand/middleware"
// Removed Supabase client import for local-only storage mode

export interface Share {
  id: string
  ticker: string
  companyName: string
  shares: number // Quantity purchased
  purchasePrice: number // Price paid per share
  currentPrice: number // Current market price
  dividendYield: number // Annual yield percentage (e.g. 4.5)
  annualDividendPerShare: number // Annual dividend amount per share
  frequency: "monthly" | "quarterly" | "semi-annually" | "annually"
  payoutMonth: number // Month index (0-11)
  purchaseDate: string // YYYY-MM-DD
  dayChange?: number
  dayChangePercent?: number
  volume?: number
  exDividendDate?: string
  alertHigh?: number
  alertLow?: number
  peRatio?: number
  priceToBook?: number
  returnOnEquity?: number
  eps?: number
  lastUpdated?: string
}

interface PortfolioState {
  shares: Share[]
  currency: string
  triggeredAlerts: string[]
  isLoading: boolean
  isAuthLoading: boolean
  user: any | null
  error: string | null
  loadSharesFromDb: () => Promise<void>
  addShare: (share: Omit<Share, "id" | "currentPrice" | "lastUpdated">) => Promise<void>
  updateShare: (id: string, share: Partial<Share>) => Promise<void>
  deleteShare: (id: string) => Promise<void>
  refreshSharePrices: () => Promise<void>
  checkUserSession: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  setCurrency: (currency: string) => void
  dismissAlert: (index: number) => void
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      shares: [],
      currency: "USD",
      triggeredAlerts: [],
      isLoading: false,
      isAuthLoading: true,
      user: null,
      error: null,
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),
      setCurrency: (currency) => set({ currency }),
      dismissAlert: (index) => {
        set((state) => ({
          triggeredAlerts: state.triggeredAlerts.filter((_, idx) => idx !== index),
        }))
      },

      checkUserSession: async () => {
        set({ isAuthLoading: true })
        try {
          const stored = localStorage.getItem("yieldwatch_session_user")
          if (stored) {
            const sessionUser = JSON.parse(stored)
            set({ user: sessionUser, isAuthLoading: false })
            await get().loadSharesFromDb()
          } else {
            set({ user: null, shares: [], isAuthLoading: false })
          }
        } catch (err: any) {
          console.error("Check session error:", err)
          set({ user: null, shares: [], isAuthLoading: false })
        }
      },

      signIn: async (email, password) => {
        set({ isAuthLoading: true, error: null })
        try {
          const accountsJson = localStorage.getItem("yieldwatch_local_accounts")
          const accounts = accountsJson ? JSON.parse(accountsJson) : {}
          if (!accounts[email] || accounts[email] !== password) {
            throw new Error("Invalid email or password")
          }
          const sessionUser = { id: email, email }
          localStorage.setItem("yieldwatch_session_user", JSON.stringify(sessionUser))
          set({ user: sessionUser, isAuthLoading: false })
          await get().loadSharesFromDb()
        } catch (err: any) {
          set({ error: err.message || "Failed to sign in", isAuthLoading: false })
          throw err
        }
      },

      signUp: async (email, password) => {
        set({ isAuthLoading: true, error: null })
        try {
          const accountsJson = localStorage.getItem("yieldwatch_local_accounts")
          const accounts = accountsJson ? JSON.parse(accountsJson) : {}
          if (accounts[email]) {
            throw new Error("Account already exists")
          }
          accounts[email] = password
          localStorage.setItem("yieldwatch_local_accounts", JSON.stringify(accounts))
          const sessionUser = { id: email, email }
          localStorage.setItem("yieldwatch_session_user", JSON.stringify(sessionUser))
          set({ user: sessionUser, isAuthLoading: false })
          await get().loadSharesFromDb()
        } catch (err: any) {
          set({ error: err.message || "Failed to sign up", isAuthLoading: false })
          throw err
        }
      },

      signInWithGoogle: async () => {
        set({ isAuthLoading: true, error: null })
        try {
          const email = "google-user@yieldwatch.local"
          const sessionUser = { id: email, email }
          localStorage.setItem("yieldwatch_session_user", JSON.stringify(sessionUser))
          set({ user: sessionUser, isAuthLoading: false })
          await get().loadSharesFromDb()
        } catch (err: any) {
          set({ error: err.message || "Google login failed", isAuthLoading: false })
          throw err
        }
      },

      signOut: async () => {
        set({ isAuthLoading: true, error: null })
        try {
          localStorage.removeItem("yieldwatch_session_user")
          set({ user: null, shares: [], isAuthLoading: false })
        } catch (err: any) {
          set({ error: err.message || "Failed to sign out", isAuthLoading: false })
        }
      },

      loadSharesFromDb: async () => {
        const { user } = get()
        if (!user) return

        set({ isLoading: true, error: null })
        try {
          const storedShares = localStorage.getItem(`yieldwatch_shares_${user.id}`)
          const shares: Share[] = storedShares ? JSON.parse(storedShares) : []
          set({ shares, isLoading: false })
        } catch (err: any) {
          console.error("Local storage load error:", err)
          set({ error: err.message || "Failed to load shares", isLoading: false })
        }
      },

      addShare: async (share) => {
        const { user, shares } = get()
        if (!user) {
          set({ error: "User is not authenticated" })
          return
        }

        const newShare: Share = {
          id: `share-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          ticker: share.ticker,
          companyName: share.companyName,
          shares: share.shares,
          purchasePrice: share.purchasePrice,
          currentPrice: share.purchasePrice, // default to cost initially
          dividendYield: share.dividendYield,
          annualDividendPerShare: share.annualDividendPerShare,
          frequency: share.frequency,
          payoutMonth: share.payoutMonth,
          purchaseDate: share.purchaseDate,
          alertHigh: share.alertHigh,
          alertLow: share.alertLow,
          peRatio: share.peRatio,
          priceToBook: share.priceToBook,
          returnOnEquity: share.returnOnEquity,
          eps: share.eps,
          lastUpdated: new Date().toISOString(),
        }

        const updatedShares = [...shares, newShare]
        try {
          localStorage.setItem(`yieldwatch_shares_${user.id}`, JSON.stringify(updatedShares))
          set({ shares: updatedShares, error: null })
        } catch (err: any) {
          console.error("Local storage insert error:", err)
          set({ error: err.message || "Failed to add share" })
        }
      },

      updateShare: async (id, updatedFields) => {
        const { user, shares } = get()
        if (!user) return

        const updatedShares = shares.map((s) =>
          s.id === id ? { ...s, ...updatedFields } : s
        )

        try {
          localStorage.setItem(`yieldwatch_shares_${user.id}`, JSON.stringify(updatedShares))
          set({ shares: updatedShares, error: null })
        } catch (err: any) {
          console.error("Local storage update error:", err)
          set({ error: err.message || "Failed to update share" })
        }
      },

      deleteShare: async (id) => {
        const { user, shares } = get()
        if (!user) return

        const updatedShares = shares.filter((s) => s.id !== id)

        try {
          localStorage.setItem(`yieldwatch_shares_${user.id}`, JSON.stringify(updatedShares))
          set({ shares: updatedShares, error: null })
        } catch (err: any) {
          console.error("Local storage delete error:", err)
          set({ error: err.message || "Failed to delete share" })
        }
      },

      refreshSharePrices: async () => {
        const { shares, user } = get()
        if (!user || shares.length === 0) return

        set({ isLoading: true, error: null })
        try {
          const newAlerts: string[] = []
          const failedTickers: string[] = []

          const updatedShares = await Promise.all(
            shares.map(async (share) => {
              try {
                const res = await fetch(`/api/ticker?symbol=${encodeURIComponent(share.ticker)}`)
                if (!res.ok) throw new Error(`Failed to fetch quote for ${share.ticker}`)
                const data = await res.json()
                if (data.error) throw new Error(data.error)

                const currentPrice = typeof data.currentPrice === "number" ? data.currentPrice : share.currentPrice

                // Evaluate price alerts
                if (share.alertHigh && currentPrice >= share.alertHigh) {
                  newAlerts.push(
                    `Alert: ${share.ticker} has crossed ABOVE your target of $${share.alertHigh.toFixed(2)}! (Current: $${currentPrice.toFixed(2)})`
                  )
                }
                if (share.alertLow && currentPrice <= share.alertLow) {
                  newAlerts.push(
                    `Alert: ${share.ticker} has crossed BELOW your target of $${share.alertLow.toFixed(2)}! (Current: $${currentPrice.toFixed(2)})`
                  )
                }

                return {
                  ...share,
                  currentPrice,
                  companyName: data.companyName || share.companyName,
                  dividendYield: typeof data.dividendYield === "number" ? data.dividendYield : share.dividendYield,
                  annualDividendPerShare: typeof data.annualDividendPerShare === "number" ? data.annualDividendPerShare : share.annualDividendPerShare,
                  frequency: data.frequency || share.frequency,
                  dayChange: typeof data.dayChange === "number" ? data.dayChange : share.dayChange,
                  dayChangePercent: typeof data.dayChangePercent === "number" ? data.dayChangePercent : share.dayChangePercent,
                  volume: typeof data.volume === "number" ? data.volume : share.volume,
                  exDividendDate: data.exDividendDate || share.exDividendDate,
                  peRatio: typeof data.peRatio === "number" ? data.peRatio : share.peRatio,
                  priceToBook: typeof data.priceToBook === "number" ? data.priceToBook : share.priceToBook,
                  returnOnEquity: typeof data.returnOnEquity === "number" ? data.returnOnEquity : share.returnOnEquity,
                  eps: typeof data.eps === "number" ? data.eps : share.eps,
                  lastUpdated: new Date().toISOString(),
                }
              } catch (e) {
                console.error(`Failed to refresh price for ${share.ticker}:`, e)
                failedTickers.push(share.ticker)
                return share
              }
            })
          )

          // Save updated shares to local storage
          localStorage.setItem(`yieldwatch_shares_${user.id}`, JSON.stringify(updatedShares))

          set((state) => ({
            shares: updatedShares,
            isLoading: false,
            triggeredAlerts: [...state.triggeredAlerts, ...newAlerts],
            error: failedTickers.length > 0 
              ? `Sync incomplete. Failed to refresh: ${failedTickers.join(", ")}` 
              : null
          }))
        } catch (err: any) {
          console.error("Local storage refresh error:", err)
          set({ error: err.message || "Failed to refresh prices", isLoading: false })
        }
      },
    }),
    {
      name: "yieldwatch-portfolio-settings",
      partialize: (state) => ({
        currency: state.currency,
        triggeredAlerts: state.triggeredAlerts,
      }), // Persist client configuration settings, exclude database-managed shares list
    }
  )
)
