"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sun, Moon, ChartBar, Newspaper, User } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { usePortfolioStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export function NavBar() {
  const pathname = usePathname()
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [mounted, setMounted] = useState(false)
  const { user } = usePortfolioStore()

  // Sync theme status on mount
  useEffect(() => {
    setMounted(true)
    const isDark =
      document.documentElement.classList.contains("dark") ||
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    if (isDark) {
      setTheme("dark")
      document.documentElement.classList.add("dark")
    } else {
      setTheme("light")
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
      document.documentElement.classList.add("dark")
      localStorage.theme = "dark"
    } else {
      setTheme("light")
      document.documentElement.classList.remove("dark")
      localStorage.theme = "light"
    }
  }

  return (
    <header className="border-b border-border bg-card/65 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300 w-full font-sans">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
        {/* Logo and Branding */}
        <Link href="/" className="flex flex-col gap-0.5 group">
          <h1 className="text-sm font-bold tracking-widest uppercase text-foreground group-hover:text-foreground/80 transition-colors">
            YieldWatch
          </h1>
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest font-mono">
            Share & Dividend tracker
          </p>
        </Link>

        {/* Mid Navigation - Visible only when user is authenticated */}
        {user && (
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
                pathname === "/"
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <ChartBar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link
              href="/news"
              className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
                pathname === "/news"
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">News & Analysis</span>
              <span className="inline sm:hidden">News</span>
            </Link>
            <Link
              href="/profile"
              className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
                pathname === "/profile"
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Profile</span>
              <span className="inline sm:hidden">Me</span>
            </Link>
          </nav>
        )}

        {/* Right Action: Theme Switcher */}
        <div className="flex items-center">
          {mounted && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-md border-border/80 hover:bg-muted/40 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="w-3.5 h-3.5 text-foreground" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-foreground" />
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
