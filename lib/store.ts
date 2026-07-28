import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "./supabase"

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
  originMarket: string
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
  setOriginMarket: (market: string) => void
  setCurrency: (currency: string) => void
  dismissAlert: (index: number) => void
}

export const CURRENCY_TO_MARKET: Record<string, string> = {
  MYR: "MY",
  SGD: "SG",
  USD: "US",
  HKD: "HK",
  AUD: "AU",
  CAD: "CA",
  GBP: "UK",
  EUR: "EU",
  JPY: "JP",
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      shares: [],
      currency: "USD",
      originMarket: "US",
      triggeredAlerts: [],
      isLoading: false,
      isAuthLoading: true,
      user: null,
      error: null,
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),
      setOriginMarket: (originMarket) => set({ originMarket }),
      setCurrency: (currency) => set({ currency, originMarket: CURRENCY_TO_MARKET[currency] || "US" }),
      dismissAlert: (index) => {
        set((state) => ({
          triggeredAlerts: state.triggeredAlerts.filter((_, idx) => idx !== index),
        }))
      },

      checkUserSession: async () => {
        set({ isAuthLoading: true })
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            set({ user: session.user, isAuthLoading: false })
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
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          set({ user: data.user, isAuthLoading: false })
          await get().loadSharesFromDb()
        } catch (err: any) {
          set({ error: err.message || "Failed to sign in", isAuthLoading: false })
          throw err
        }
      },

      signUp: async (email, password) => {
        set({ isAuthLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signUp({ email, password })
          if (error) throw error
          set({ user: data.user, isAuthLoading: false })
          await get().loadSharesFromDb()
        } catch (err: any) {
          set({ error: err.message || "Failed to sign up", isAuthLoading: false })
          throw err
        }
      },

      signInWithGoogle: async () => {
        set({ isAuthLoading: true, error: null })
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          })
          if (error) throw error
        } catch (err: any) {
          set({ error: err.message || "Google login failed", isAuthLoading: false })
          throw err
        }
      },

      signOut: async () => {
        set({ isAuthLoading: true, error: null })
        try {
          const { error } = await supabase.auth.signOut()
          if (error) throw error
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
          const { data, error } = await supabase
            .from("shares")
            .select("*")
            .order("created_at", { ascending: true })

          if (error) throw error

          // Map snake_case columns from Postgres to camelCase properties in JS
          const shares: Share[] = (data || []).map((row: any) => ({
            id: row.id,
            ticker: row.ticker,
            companyName: row.company_name,
            shares: Number(row.shares),
            purchasePrice: Number(row.purchase_price),
            currentPrice: Number(row.current_price || 0),
            dividendYield: Number(row.dividend_yield || 0),
            annualDividendPerShare: Number(row.annual_dividend_per_share || 0),
            frequency: row.frequency,
            payoutMonth: row.payout_month,
            purchaseDate: row.purchase_date,
            dayChange: row.day_change !== null ? Number(row.day_change) : undefined,
            dayChangePercent: row.day_change_percent !== null ? Number(row.day_change_percent) : undefined,
            volume: row.volume !== null ? Number(row.volume) : undefined,
            exDividendDate: row.ex_dividend_date || undefined,
            alertHigh: row.alert_high !== null ? Number(row.alert_high) : undefined,
            alertLow: row.alert_low !== null ? Number(row.alert_low) : undefined,
            peRatio: row.pe_ratio !== null ? Number(row.pe_ratio) : undefined,
            priceToBook: row.price_to_book !== null ? Number(row.price_to_book) : undefined,
            returnOnEquity: row.return_on_equity !== null ? Number(row.return_on_equity) : undefined,
            eps: row.eps !== null ? Number(row.eps) : undefined,
            lastUpdated: row.last_updated || undefined,
          }))

          set({ shares, isLoading: false })

          // Automatically trigger live price & dividend sync on login/mount
          if (shares.length > 0) {
            get().refreshSharePrices()
          }
        } catch (err: any) {
          console.error("Database load error:", err)
          set({ error: err.message || "Failed to load shares", isLoading: false })
        }
      },

      addShare: async (share) => {
        const { user, shares } = get()
        if (!user) {
          set({ error: "User is not authenticated" })
          return
        }

        const originalShares = [...shares]
        const tempId = `temp-${Date.now()}`
        const optimisticShare: Share = {
          id: tempId,
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
        }

        // Optimistically add to state
        set({ shares: [...originalShares, optimisticShare], error: null })

        try {
          const { data, error } = await supabase
            .from("shares")
            .insert([{
              user_id: user.id,
              ticker: share.ticker,
              company_name: share.companyName,
              shares: share.shares,
              purchase_price: share.purchasePrice,
              current_price: share.purchasePrice,
              dividend_yield: share.dividendYield,
              annual_dividend_per_share: share.annualDividendPerShare,
              frequency: share.frequency,
              payout_month: share.payoutMonth,
              purchase_date: share.purchaseDate,
              alert_high: share.alertHigh !== undefined ? share.alertHigh : null,
              alert_low: share.alertLow !== undefined ? share.alertLow : null,
              pe_ratio: share.peRatio !== undefined ? share.peRatio : null,
              price_to_book: share.priceToBook !== undefined ? share.priceToBook : null,
              return_on_equity: share.returnOnEquity !== undefined ? share.returnOnEquity : null,
              eps: share.eps !== undefined ? share.eps : null,
            }])
            .select()

          if (error) throw error

          // Swap temp ID with real DB ID
          if (data && data[0]) {
            const dbShare = data[0]
            set((state) => ({
              shares: state.shares.map((s) =>
                s.id === tempId ? { ...s, id: dbShare.id } : s
              ),
            }))
          }
        } catch (err: any) {
          console.error("Database insert error:", err)
          // Roll back on database error
          set({ shares: originalShares, error: err.message || "Failed to add share" })
        }
      },

      updateShare: async (id, updatedFields) => {
        const { user, shares } = get()
        if (!user) return

        const originalShares = [...shares]

        // Optimistically update state
        set((state) => ({
          shares: state.shares.map((s) =>
            s.id === id ? { ...s, ...updatedFields } : s
          ),
          error: null,
        }))

        try {
          const dbFields: any = {}
          if (updatedFields.ticker !== undefined) dbFields.ticker = updatedFields.ticker
          if (updatedFields.companyName !== undefined) dbFields.company_name = updatedFields.companyName
          if (updatedFields.shares !== undefined) dbFields.shares = updatedFields.shares
          if (updatedFields.purchasePrice !== undefined) dbFields.purchase_price = updatedFields.purchasePrice
          if (updatedFields.currentPrice !== undefined) dbFields.current_price = updatedFields.currentPrice
          if (updatedFields.dividendYield !== undefined) dbFields.dividend_yield = updatedFields.dividendYield
          if (updatedFields.annualDividendPerShare !== undefined) dbFields.annual_dividend_per_share = updatedFields.annualDividendPerShare
          if (updatedFields.frequency !== undefined) dbFields.frequency = updatedFields.frequency
          if (updatedFields.payoutMonth !== undefined) dbFields.payout_month = updatedFields.payoutMonth
          if (updatedFields.purchaseDate !== undefined) dbFields.purchase_date = updatedFields.purchaseDate
          if (updatedFields.dayChange !== undefined) dbFields.day_change = updatedFields.dayChange
          if (updatedFields.dayChangePercent !== undefined) dbFields.day_change_percent = updatedFields.dayChangePercent
          if (updatedFields.volume !== undefined) dbFields.volume = updatedFields.volume
          if (updatedFields.exDividendDate !== undefined) dbFields.ex_dividend_date = updatedFields.exDividendDate
          if (updatedFields.alertHigh !== undefined) dbFields.alert_high = updatedFields.alertHigh
          if (updatedFields.alertLow !== undefined) dbFields.alert_low = updatedFields.alertLow
          if (updatedFields.peRatio !== undefined) dbFields.pe_ratio = updatedFields.peRatio
          if (updatedFields.priceToBook !== undefined) dbFields.price_to_book = updatedFields.priceToBook
          if (updatedFields.returnOnEquity !== undefined) dbFields.return_on_equity = updatedFields.returnOnEquity
          if (updatedFields.eps !== undefined) dbFields.eps = updatedFields.eps
          if (updatedFields.lastUpdated !== undefined) dbFields.last_updated = updatedFields.lastUpdated

          const { error } = await supabase
            .from("shares")
            .update(dbFields)
            .eq("id", id)

          if (error) throw error
        } catch (err: any) {
          console.error("Database update error:", err)
          // Roll back on error
          set({ shares: originalShares, error: err.message || "Failed to update share" })
        }
      },

      deleteShare: async (id) => {
        const { user, shares } = get()
        if (!user) return

        const originalShares = [...shares]

        // Optimistically remove from state
        set((state) => ({
          shares: state.shares.filter((s) => s.id !== id),
          error: null,
        }))

        try {
          const { error } = await supabase
            .from("shares")
            .delete()
            .eq("id", id)

          if (error) throw error
        } catch (err: any) {
          console.error("Database delete error:", err)
          // Roll back on error
          set({ shares: originalShares, error: err.message || "Failed to delete share" })
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

                const updated = {
                  ...share,
                  currentPrice,
                  companyName: data.companyName || share.companyName,
                  dividendYield: typeof data.dividendYield === "number" ? data.dividendYield : share.dividendYield,
                  annualDividendPerShare: typeof data.annualDividendPerShare === "number" ? data.annualDividendPerShare : share.annualDividendPerShare,
                  frequency: data.frequency || share.frequency,
                  payoutMonth: typeof data.payoutMonth === "number" ? data.payoutMonth : share.payoutMonth,
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

                // Sync refreshed quotes back to Supabase
                await supabase
                  .from("shares")
                  .update({
                    current_price: updated.currentPrice,
                    company_name: updated.companyName,
                    dividend_yield: updated.dividendYield,
                    annual_dividend_per_share: updated.annualDividendPerShare,
                    frequency: updated.frequency,
                    payout_month: updated.payoutMonth,
                    day_change: updated.dayChange,
                    day_change_percent: updated.dayChangePercent,
                    volume: updated.volume,
                    ex_dividend_date: updated.exDividendDate,
                    pe_ratio: updated.peRatio,
                    price_to_book: updated.priceToBook,
                    return_on_equity: updated.returnOnEquity,
                    eps: updated.eps,
                    last_updated: updated.lastUpdated,
                  })
                  .eq("id", share.id)

                return updated
              } catch (e) {
                console.error(`Failed to refresh price for ${share.ticker}:`, e)
                failedTickers.push(share.ticker)
                return share
              }
            })
          )

          set((state) => ({
            shares: updatedShares,
            isLoading: false,
            triggeredAlerts: [...state.triggeredAlerts, ...newAlerts],
            error: failedTickers.length > 0 
              ? `Sync incomplete. Failed to refresh: ${failedTickers.join(", ")}` 
              : null
          }))
        } catch (err: any) {
          console.error("Database sync refresh error:", err)
          set({ error: err.message || "Failed to refresh prices", isLoading: false })
        }
      },
    }),
    {
      name: "yieldwatch-portfolio-settings",
      partialize: (state) => ({
        currency: state.currency,
        originMarket: state.originMarket || "US",
        triggeredAlerts: state.triggeredAlerts,
      }), // Persist client configuration settings, exclude database-managed shares list
    }
  )
)
