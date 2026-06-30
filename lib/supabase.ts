import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env credentials are not configured. Database actions will fail.")
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
