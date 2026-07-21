import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase configuration variables are not set in the environment" },
      { status: 500 }
    )
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Execute a basic select query to ensure Supabase registers active database transactions.
    // Querying the "shares" table with a limit of 1 is fast and safe.
    const { data, error } = await supabase.from("shares").select("id").limit(1)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: "Supabase database pinged successfully to prevent inactivity pause",
      timestamp: new Date().toISOString(),
      recordCount: data ? data.length : 0,
    })
  } catch (err: any) {
    console.error("Supabase keep-alive database ping failed:", err)
    return NextResponse.json(
      { error: err.message || "Database query failed" },
      { status: 500 }
    )
  }
}
