"use client"

import type React from "react"

import { Moon, Sun, Search } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PageHeaderProps {
  title: string
  actions?: React.ReactNode
  showSearch?: boolean
  onSearch?: (value: string) => void
  searchValue?: string
}

export function PageHeader({
  title,
  actions,
  showSearch,
  onSearch,
  searchValue,
}: PageHeaderProps) {
  const { setTheme, theme } = useTheme()

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-card-foreground sm:text-2xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-end">
          {showSearch && (
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="w-full pl-9"
                value={searchValue ?? ""}
                onChange={(e) => onSearch?.(e.target.value)}
              />
            </div>
          )}
          {actions}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
