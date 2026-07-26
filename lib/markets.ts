export interface MarketConfig {
  id: string
  name: string
  country: string
  currency: string
  flag: string
  suffix: string
}

export const SUPPORTED_MARKETS: MarketConfig[] = [
  { id: "MY", name: "Bursa Malaysia", country: "Malaysia", currency: "MYR", flag: "🇲🇾", suffix: ".KL" },
  { id: "SG", name: "Singapore Exchange (SGX)", country: "Singapore", currency: "SGD", flag: "🇸🇬", suffix: ".SI" },
  { id: "US", name: "United States (NYSE/NASDAQ)", country: "United States", currency: "USD", flag: "🇺🇸", suffix: "" },
  { id: "HK", name: "Hong Kong Exchange (HKEX)", country: "Hong Kong", currency: "HKD", flag: "🇭🇰", suffix: ".HK" },
  { id: "AU", name: "Australian Securities Exchange (ASX)", country: "Australia", currency: "AUD", flag: "🇦🇺", suffix: ".AX" },
  { id: "CA", name: "Toronto Stock Exchange (TSX)", country: "Canada", currency: "CAD", flag: "🇨🇦", suffix: ".TO" },
  { id: "UK", name: "London Stock Exchange (LSE)", country: "United Kingdom", currency: "GBP", flag: "🇬🇧", suffix: ".L" },
  { id: "EU", name: "Xetra / Europe", country: "Europe", currency: "EUR", flag: "🇪🇺", suffix: ".DE" },
  { id: "JP", name: "Tokyo Stock Exchange (TSE)", country: "Japan", currency: "JPY", flag: "🇯🇵", suffix: ".T" },
]

export const COUNTRY_TO_MARKET: Record<string, string> = {
  MY: "MY",
  SG: "SG",
  US: "US",
  HK: "HK",
  AU: "AU",
  CA: "CA",
  GB: "UK",
  UK: "UK",
  DE: "EU",
  FR: "EU",
  NL: "EU",
  IT: "EU",
  ES: "EU",
  AT: "EU",
  BE: "EU",
  FI: "EU",
  IE: "EU",
  PT: "EU",
  JP: "JP",
}

export function getTickerMarket(ticker: string): MarketConfig {
  const upper = ticker.toUpperCase().trim()
  if (upper.endsWith(".KL")) return SUPPORTED_MARKETS.find((m) => m.id === "MY")!
  if (upper.endsWith(".SI")) return SUPPORTED_MARKETS.find((m) => m.id === "SG")!
  if (upper.endsWith(".HK")) return SUPPORTED_MARKETS.find((m) => m.id === "HK")!
  if (upper.endsWith(".AX")) return SUPPORTED_MARKETS.find((m) => m.id === "AU")!
  if (upper.endsWith(".TO")) return SUPPORTED_MARKETS.find((m) => m.id === "CA")!
  if (upper.endsWith(".L")) return SUPPORTED_MARKETS.find((m) => m.id === "UK")!
  if (upper.endsWith(".DE")) return SUPPORTED_MARKETS.find((m) => m.id === "EU")!
  if (upper.endsWith(".T")) return SUPPORTED_MARKETS.find((m) => m.id === "JP")!
  return SUPPORTED_MARKETS.find((m) => m.id === "US")!
}

// Client-side timezone heuristic (instant local detection fallback)
export function detectMarketFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
    if (tz.includes("Kuala_Lumpur") || tz.includes("Kuching")) return "MY"
    if (tz.includes("Singapore")) return "SG"
    if (tz.includes("Hong_Kong")) return "HK"
    if (tz.startsWith("Australia/")) return "AU"
    if (tz.includes("London")) return "UK"
    if (tz.startsWith("Europe/")) return "EU"
    if (tz.includes("Tokyo")) return "JP"
    if (tz.includes("Toronto") || tz.includes("Vancouver") || tz.includes("Montreal") || tz.includes("Edmonton")) return "CA"
    if (tz.startsWith("America/")) return "US"
  } catch {}
  return "US"
}

// IP-based Geolocation detection with timezone fallback
export async function detectUserLocationMarket(): Promise<{ market: string; countryCode: string; source: string }> {
  try {
    const res = await fetch("/api/geo")
    if (res.ok) {
      const data = await res.json()
      const countryCode = data.country || ""
      const mappedMarket = COUNTRY_TO_MARKET[countryCode]
      if (mappedMarket) {
        return { market: mappedMarket, countryCode, source: "ip" }
      }
    }
  } catch (e) {
    console.warn("Failed to fetch IP location:", e)
  }

  // Fallback to timezone heuristic
  const tzMarket = detectMarketFromTimezone()
  return { market: tzMarket, countryCode: tzMarket, source: "timezone" }
}
