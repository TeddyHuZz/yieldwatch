import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Share {
  id: string
  ticker: string
  companyName: string
  shares: number // Quantity purchased
  purchasePrice: number // Price paid per share
  currentPrice: number // Current market price (updated from API)
  dividendYield: number // Annual yield percentage (e.g. 4.5 for 4.5%)
  annualDividendPerShare: number // Annual dividend amount per share (e.g. $1.20)
  frequency: "monthly" | "quarterly" | "semi-annually" | "annually"
  payoutMonth: number // Month index (0-11) when dividends are paid (or start cycle)
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
  error: string | null
  addShare: (share: Omit<Share, "id" | "currentPrice" | "lastUpdated">) => void
  updateShare: (id: string, share: Partial<Share>) => void
  deleteShare: (id: string) => void
  refreshSharePrices: () => Promise<void>
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
      error: null,
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),
      setCurrency: (currency) => set({ currency }),
      dismissAlert: (index) => {
        set((state) => ({
          triggeredAlerts: state.triggeredAlerts.filter((_, idx) => idx !== index),
        }))
      },
      
      addShare: (share) => {
        const id = Math.random().toString(36).substring(2, 9)
        set((state) => ({
          shares: [
            ...state.shares,
            {
              ...share,
              id,
              currentPrice: share.purchasePrice, // default to purchase price
              lastUpdated: new Date().toISOString(),
            },
          ],
        }))
      },

      updateShare: (id, updatedFields) => {
        set((state) => ({
          shares: state.shares.map((s) =>
            s.id === id
              ? { ...s, ...updatedFields, lastUpdated: new Date().toISOString() }
              : s
          ),
        }))
      },

      deleteShare: (id) => {
        set((state) => ({
          shares: state.shares.filter((s) => s.id !== id),
        }))
      },

      refreshSharePrices: async () => {
        const { shares } = get()
        if (shares.length === 0) return

        set({ isLoading: true, error: null })
        try {
          const newAlerts: string[] = []
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
                return share
              }
            })
          )
          set((state) => ({
            shares: updatedShares,
            isLoading: false,
            triggeredAlerts: [...state.triggeredAlerts, ...newAlerts],
          }))
        } catch (err: any) {
          set({ error: err.message || "Failed to refresh prices", isLoading: false })
        }
      },
    }),
    {
      name: "yieldwatch-portfolio",
      partialize: (state) => ({
        shares: state.shares,
        currency: state.currency,
        triggeredAlerts: state.triggeredAlerts,
      }), // Persist shares, currency, and triggered alerts
    }
  )
)
