"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePortfolioStore, Share } from "@/lib/store"
import { MagnifyingGlass, Spinner, CaretDown } from "@phosphor-icons/react"

interface AddShareDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  editShareId: string | null
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function AddShareDialog({ isOpen, onOpenChange, editShareId }: AddShareDialogProps) {
  const { addShare, updateShare, shares: storedShares } = usePortfolioStore()

  // Form states
  const [ticker, setTicker] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [sharesQuantity, setSharesQuantity] = useState<number | "">("")
  const [purchasePrice, setPurchasePrice] = useState<number | "">("")
  const [currentPrice, setCurrentPrice] = useState<number | "">("")
  const [dividendYield, setDividendYield] = useState<number | "">("")
  const [annualDividendPerShare, setAnnualDividendPerShare] = useState<number | "">("")
  const [frequency, setFrequency] = useState<Share["frequency"]>("quarterly")
  const [payoutMonth, setPayoutMonth] = useState<number>(0) // 0 = Jan
  const [purchaseDate, setPurchaseDate] = useState("")
  const [alertHigh, setAlertHigh] = useState<number | "">("")
  const [alertLow, setAlertLow] = useState<number | "">("")

  // Autocomplete & UI states
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Reset form helper
  const resetForm = () => {
    setTicker("")
    setCompanyName("")
    setSharesQuantity("")
    setPurchasePrice("")
    setCurrentPrice("")
    setDividendYield("")
    setAnnualDividendPerShare("")
    setFrequency("quarterly")
    setPayoutMonth(0)
    setPurchaseDate(new Date().toISOString().split("T")[0])
    setAlertHigh("")
    setAlertLow("")
    setSearchQuery("")
    setSuggestions([])
    setErrorMsg("")
    setShowAdvanced(false)
  }

  // Populate data when editing
  useEffect(() => {
    if (isOpen) {
      if (editShareId) {
        const share = storedShares.find((s) => s.id === editShareId)
        if (share) {
          setTicker(share.ticker)
          setCompanyName(share.companyName)
          setSharesQuantity(share.shares)
          setPurchasePrice(share.purchasePrice)
          setCurrentPrice(share.currentPrice)
          setDividendYield(share.dividendYield)
          setAnnualDividendPerShare(share.annualDividendPerShare)
          setFrequency(share.frequency)
          setPayoutMonth(share.payoutMonth)
          setPurchaseDate(share.purchaseDate)
          setAlertHigh(share.alertHigh !== undefined ? share.alertHigh : "")
          setAlertLow(share.alertLow !== undefined ? share.alertLow : "")
          setShowAdvanced(true) // show advanced fields when editing existing holdings
        }
      } else {
        resetForm()
      }
    }
  }, [isOpen, editShareId, storedShares])

  // Autocomplete search debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSuggestions([])
      return
    }

    if (searchQuery.toUpperCase() === ticker) {
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data)
        }
      } catch (err) {
        console.error("Search suggestion error:", err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, ticker])

  // Fetch ticker details (both current price and historical price for buy date)
  const fetchTickerDetails = async (symbol: string, date: string) => {
    if (!symbol) return
    setIsLoadingDetails(true)
    setErrorMsg("")
    try {
      const res = await fetch(
        `/api/ticker?symbol=${encodeURIComponent(symbol)}&purchaseDate=${date}`
      )
      if (!res.ok) throw new Error("Ticker details could not be retrieved")

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setTicker(data.symbol)
      setCompanyName(data.companyName)
      setCurrentPrice(data.currentPrice)
      setDividendYield(Number(data.dividendYield.toFixed(2)))
      setAnnualDividendPerShare(Number(data.annualDividendPerShare.toFixed(4)))
      setFrequency(data.frequency)
      if (typeof data.payoutMonth === "number") {
        setPayoutMonth(data.payoutMonth)
      }
      
      // Auto-set the buy price based on historical price lookup
      setPurchasePrice(data.purchasePrice)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load ticker details. You can override manually.")
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleSelectSuggestion = (suggestion: any) => {
    setTicker(suggestion.symbol)
    setCompanyName(suggestion.name)
    setSearchQuery(suggestion.symbol)
    setSuggestions([])
    fetchTickerDetails(suggestion.symbol, purchaseDate)
  }

  const handlePurchaseDateChange = (dateVal: string) => {
    setPurchaseDate(dateVal)
    if (ticker && !editShareId) {
      fetchTickerDetails(ticker, dateVal)
    }
  }

  const handleTickerBlur = () => {
    if (ticker && !editShareId) {
      fetchTickerDetails(ticker, purchaseDate)
    }
  }

  // Handle changes with automatic sync calculations
  const handleYieldChange = (val: string) => {
    if (val === "") {
      setDividendYield("")
      return
    }
    const numYield = parseFloat(val)
    setDividendYield(numYield)
    const priceVal =
      typeof currentPrice === "number"
        ? currentPrice
        : typeof purchasePrice === "number"
        ? purchasePrice
        : 0
    if (priceVal > 0) {
      setAnnualDividendPerShare(Number((priceVal * (numYield / 100)).toFixed(4)))
    }
  }

  const handleDividendAmountChange = (val: string) => {
    if (val === "") {
      setAnnualDividendPerShare("")
      return
    }
    const numDiv = parseFloat(val)
    setAnnualDividendPerShare(numDiv)
    const priceVal =
      typeof currentPrice === "number"
        ? currentPrice
        : typeof purchasePrice === "number"
        ? purchasePrice
        : 0
    if (priceVal > 0) {
      setDividendYield(Number(((numDiv / priceVal) * 100).toFixed(2)))
    }
  }

  const handlePriceChange = (val: string, isCurrentPrice: boolean) => {
    const numPrice = val === "" ? "" : parseFloat(val)
    if (isCurrentPrice) {
      setCurrentPrice(numPrice)
      if (typeof numPrice === "number" && numPrice > 0) {
        if (typeof annualDividendPerShare === "number" && annualDividendPerShare > 0) {
          setDividendYield(Number(((annualDividendPerShare / numPrice) * 100).toFixed(2)))
        } else if (typeof dividendYield === "number" && dividendYield > 0) {
          setAnnualDividendPerShare(Number((numPrice * (dividendYield / 100)).toFixed(4)))
        }
      }
    } else {
      setPurchasePrice(numPrice)
      if (currentPrice === "" && typeof numPrice === "number") {
        setCurrentPrice(numPrice)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker.trim()) {
      setErrorMsg("Ticker symbol is required.")
      return
    }
    if (sharesQuantity === "" || sharesQuantity <= 0) {
      setErrorMsg("Shares quantity must be greater than 0.")
      return
    }

    // Default price attributes if not fetched or edited
    const resolvedBuyPrice = purchasePrice !== "" ? Number(purchasePrice) : Number(currentPrice) || 0

    const shareData = {
      ticker: ticker.toUpperCase().trim(),
      companyName: companyName.trim() || ticker.toUpperCase().trim(),
      shares: Number(sharesQuantity),
      purchasePrice: resolvedBuyPrice,
      dividendYield: Number(dividendYield) || 0,
      annualDividendPerShare: Number(annualDividendPerShare) || 0,
      frequency,
      payoutMonth,
      purchaseDate: purchaseDate || new Date().toISOString().split("T")[0],
      alertHigh: alertHigh !== "" ? Number(alertHigh) : undefined,
      alertLow: alertLow !== "" ? Number(alertLow) : undefined,
    }

    if (editShareId) {
      updateShare(editShareId, shareData)
    } else {
      addShare(shareData)
    }

    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (!open) resetForm()
      }}
    >
      <DialogContent className="max-w-md border border-border bg-card p-6 rounded-lg text-foreground font-sans">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-sm font-semibold tracking-tight uppercase font-heading">
            {editShareId ? "Edit Share Holding" : "Add Share Holding"}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground font-mono">
            {editShareId
              ? "Update transaction details."
              : "Simply enter the ticker, shares, and purchase date. YieldWatch auto-fetches cost and dividend yields."}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[10px] px-3 py-2 rounded mb-4 font-mono">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Autocomplete Ticker Search (Only show if adding new) */}
          {!editShareId && (
            <div className="relative flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                Ticker Lookup
              </label>
              <div className="relative flex items-center">
                <MagnifyingGlass className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 font-mono text-xs"
                  placeholder="Search Ticker (e.g. AAPL, O, MSFT)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                  <Spinner className="absolute right-2.5 w-3.5 h-3.5 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Suggestions dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 bg-popover border border-border rounded-md mt-1 max-h-[160px] overflow-y-auto shadow-lg">
                  {suggestions.map((item) => (
                    <div
                      key={item.symbol}
                      onClick={() => handleSelectSuggestion(item)}
                      className="px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center text-[10px] border-b border-border/40 last:border-0 font-mono"
                    >
                      <span className="font-semibold text-foreground">{item.symbol}</span>
                      <span className="text-muted-foreground text-[9px] truncate max-w-[200px]">
                        {item.name} ({item.exchange})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Simple Form Grid */}
          <div className="space-y-3.5">
            {/* Ticker Symbol */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                Ticker Symbol
              </label>
              <Input
                required
                disabled={!!editShareId || isLoadingDetails}
                placeholder="AAPL"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onBlur={handleTickerBlur}
                className="uppercase font-semibold tracking-wide font-mono"
              />
            </div>

            {/* Side-by-Side: Shares and Purchase Date */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                  Shares Quantity
                </label>
                <Input
                  required
                  type="number"
                  step="any"
                  min="0.000001"
                  placeholder="10.0"
                  value={sharesQuantity}
                  onChange={(e) =>
                    setSharesQuantity(e.target.value === "" ? "" : parseFloat(e.target.value))
                  }
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                  Purchase Date
                </label>
                <Input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => handlePurchaseDateChange(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Advanced toggle */}
          <div className="pt-3 border-t border-border/40 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-[9px] text-muted-foreground hover:text-foreground font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <CaretDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showAdvanced ? "rotate-180" : ""
                }`}
              />
              {showAdvanced ? "Hide Custom Details" : "Show Custom Overrides"}
            </button>
            {isLoadingDetails && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-1 font-mono">
                <Spinner className="w-3.5 h-3.5 animate-spin" /> Fetching quotes...
              </span>
            )}
          </div>

          {/* Advanced Options panel */}
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3.5 border-t border-border/40 pt-4 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Company Name */}
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                  Company Name
                </label>
                <Input
                  placeholder="Apple Inc."
                  disabled={isLoadingDetails}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              {/* Buy Price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                  Buy Price ($/share)
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="150.00"
                  value={purchasePrice}
                  onChange={(e) => handlePriceChange(e.target.value, false)}
                  className="font-mono text-xs"
                />
              </div>

              {/* Current Price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                  Current Price ($)
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="180.00"
                  value={currentPrice}
                  onChange={(e) => handlePriceChange(e.target.value, true)}
                  disabled={isLoadingDetails}
                  className="font-mono text-xs"
                />
              </div>

              {/* Dividend Yield */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                  Dividend Yield (%)
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="3.50"
                  value={dividendYield}
                  onChange={(e) => handleYieldChange(e.target.value)}
                  disabled={isLoadingDetails}
                  className="font-mono text-xs"
                />
              </div>

              {/* Annual Div Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                  Annual Dividend ($)
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="2.40"
                  value={annualDividendPerShare}
                  onChange={(e) => handleDividendAmountChange(e.target.value)}
                  disabled={isLoadingDetails}
                  className="font-mono text-xs"
                />
              </div>

              {/* Payout Frequency */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                  Frequency
                </label>
                <div className="relative flex items-center">
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Share["frequency"])}
                    className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 appearance-none font-mono cursor-pointer"
                  >
                    <option value="monthly" className="bg-popover text-foreground">
                      Monthly
                    </option>
                    <option value="quarterly" className="bg-popover text-foreground">
                      Quarterly
                    </option>
                    <option value="semi-annually" className="bg-popover text-foreground">
                      Semi-Annually
                    </option>
                    <option value="annually" className="bg-popover text-foreground">
                      Annually
                    </option>
                  </select>
                  <CaretDown className="absolute right-2.5 w-3 h-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Payout Month */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                  Payout Cycle Month
                </label>
                <div className="relative flex items-center">
                  <select
                    disabled={frequency === "monthly"}
                    value={payoutMonth}
                    onChange={(e) => setPayoutMonth(parseInt(e.target.value))}
                    className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:bg-muted/40 disabled:text-muted-foreground appearance-none font-mono cursor-pointer"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx} className="bg-popover text-foreground">
                        {m}
                      </option>
                    ))}
                  </select>
                  <CaretDown className="absolute right-2.5 w-3 h-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Alert High Target */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                  High Alert Target ($)
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Crosses above..."
                  value={alertHigh}
                  onChange={(e) => setAlertHigh(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="font-mono text-xs"
                />
              </div>

              {/* Alert Low Target */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                  Low Alert Target ($)
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Crosses below..."
                  value={alertLow}
                  onChange={(e) => setAlertLow(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-none border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoadingDetails}
              className="flex-1 rounded-none font-semibold bg-foreground text-background hover:bg-foreground/90"
            >
              {isLoadingDetails ? (
                <Spinner className="w-3.5 h-3.5 animate-spin" />
              ) : editShareId ? (
                "Save Changes"
              ) : (
                "Add Share"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
