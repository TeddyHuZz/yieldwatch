# YieldWatch — Share & Dividend Portfolio Tracker

A minimalist, dark-themed portfolio tracker built for **long-term dividend investors**. Track your holdings, monitor dividend cashflow projections, screen stocks for safety & trend signals, and stay informed with real-time market news — all in one place.

**Live Demo:** [shares-yieldwatch.vercel.app](https://shares-yieldwatch.vercel.app)

---

## Features

### 📊 Portfolio Dashboard
- Add and manage stock holdings with purchase price, shares, dividend frequency, and payout months.
- Real-time price syncing via Yahoo Finance (current price, day change, volume, P/E, EPS, ex-dividend dates).
- Portfolio summary cards: total value, invested capital, annual dividends, monthly average, and yield-on-cost (YOC).
- **Today's Performance Movers** ribbon showing the day's top gainer and laggard.
- Interactive **price history charts** (1D, 1W, 1M, 1Y, 5Y) with performance-graded area fills inside expandable table rows.

### 🥧 Visual Analytics
- **Portfolio Weight** donut chart showing allocation distribution by current market value.
- **Dividend Forecast** bar chart projecting monthly cashflow across 12 months based on payout schedules.

### 📰 News & Analysis
- Google News RSS feed integration filtered by company name (not raw ticker) for relevant results.
- Clean card-based layout with source attribution, timestamps, and direct article links.

### 📈 Dividend Screener & Insights
- **Automated Safety Scoring (0–100)** based on three fundamental pillars:
  - **Payout Ratio** — dividend sustainability vs. earnings retention.
  - **Beta** — price volatility relative to the broad market.
  - **Return on Equity (ROE)** — capital efficiency and business moat strength.
- **Trend Classification** using 50-day and 200-day moving averages: Bullish / Bearish / Neutral.
- **Curated Watchlist** of global dividend stalwarts (US Aristocrats, Malaysian banks, Singapore REITs) scanned in parallel on page load.
- **⭐ Top Beginner Picks** spotlight — dynamically surfaces the top 3 Safe + Bullish assets.
- **Suitability Tags** on every card: "Top Beginner Pick", "Accumulate / DCA", "Moderate Risk", or "High Risk / Avoid".
- Click-to-drill-down detail panel with progress bar breakdowns, P/E valuation, and AI-style analyst commentary.
- Filter bar: All Assets · Bullish Only · Bearish Only · Safe Dividends.

### 👤 User Profile & Settings
- Account details: email, UUID, signup date, authentication provider (Google / Email).
- Global reporting currency selector (USD, MYR, SGD, EUR, GBP, AUD, CAD, JPY, HKD).
- Active price alert summary aggregating all configured high/low warning thresholds.

### 🔐 Authentication
- Email/password sign-up and sign-in via Supabase Auth.
- Google OAuth social login.
- Route-guarded pages — unauthenticated visitors see a glassmorphic login portal.
- Conditional navigation — header links are hidden until the user logs in.

### 🗄️ Database & Persistence
- Supabase PostgreSQL with Row-Level Security (RLS) — each user's data is isolated by `user_id`.
- Client-side Zustand store with `localStorage` hydration for instant UI on revisit.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui components |
| State | Zustand with localStorage persistence |
| Auth & DB | Supabase (Auth + PostgreSQL + RLS) |
| Market Data | Yahoo Finance via [`yahoo-finance2`](https://github.com/gadicc/yahoo-finance2) |
| Charts | Recharts |
| Icons | Phosphor Icons |
| Deployment | Vercel |

---

## Project Structure

```
yieldwatch/
├── app/
│   ├── api/
│   │   ├── analysis/route.ts    # Dividend safety scoring & trend classification
│   │   ├── history/route.ts     # Price history charts (1D–5Y)
│   │   ├── news/route.ts        # Google News RSS feed parser
│   │   ├── search/route.ts      # Ticker symbol search autocomplete
│   │   └── ticker/route.ts      # Real-time quote & fundamentals
│   ├── auth/callback/route.ts   # OAuth code exchange
│   ├── insights/page.tsx        # Dividend screener & watchlist
│   ├── news/page.tsx            # Market news feed
│   ├── profile/page.tsx         # User settings & preferences
│   ├── page.tsx                 # Main portfolio dashboard
│   ├── layout.tsx               # Root layout with navbar
│   └── globals.css              # Design tokens & theme
├── components/
│   ├── add-share-dialog.tsx     # Add/edit stock holding modal
│   ├── auth-screen.tsx          # Login/signup portal
│   ├── nav-bar.tsx              # Conditional navigation header
│   ├── portfolio-charts.tsx     # Donut & bar chart widgets
│   ├── ticker-chart.tsx         # Interactive price history chart
│   └── ui/                      # shadcn/ui primitives
├── lib/
│   ├── store.ts                 # Zustand store (state, actions, Supabase sync)
│   ├── supabase.ts              # Supabase client factory
│   └── utils.ts                 # Utility helpers
└── public/                      # Static assets
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- pnpm

### 1. Clone & Install

```bash
git clone https://github.com/TeddyHuZz/yieldwatch.git
cd yieldwatch
pnpm install
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
```

### 3. Database Setup

Run this SQL in your **Supabase SQL Editor** to create the shares table:

```sql
create table if not exists public.shares (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ticker text not null,
  company_name text not null,
  shares numeric not null,
  purchase_price numeric not null,
  current_price numeric default 0,
  dividend_yield numeric default 0,
  annual_dividend_per_share numeric default 0,
  frequency text not null,
  payout_month integer not null,
  purchase_date text not null,
  day_change numeric,
  day_change_percent numeric,
  volume numeric,
  ex_dividend_date text,
  alert_high numeric,
  alert_low numeric,
  pe_ratio numeric,
  price_to_book numeric,
  return_on_equity numeric,
  eps numeric,
  last_updated text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.shares enable row level security;

create policy "Users can perform all operations on their own shares data"
  on public.shares for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 4. Run Locally

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

The app is deployed on **Vercel** with zero configuration. Push to your connected GitHub repository and Vercel will build and deploy automatically.

Make sure to add your environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) in **Vercel → Settings → Environment Variables**.

For Google OAuth to work in production, update your **Supabase Dashboard → Authentication → URL Configuration**:
- **Site URL**: `https://your-domain.vercel.app`
- **Redirect URLs**: `https://your-domain.vercel.app/**`

---

## License

This project is for personal use and learning purposes.
