"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuth, setIsAuth] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const authed = await isAuthenticated()
      setIsAuth(authed)
      if (!authed) {
        router.push("/login")
      }
    }

    checkAuth()
  }, [router, pathname])

  if (isAuth === null) {
    return null
  }

  if (!isAuth) {
    return null
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar>
          <AppSidebar />
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 items-center gap-2 border-b border-border bg-background px-4 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-semibold">
              Car Rental Back Office
            </span>
          </header>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
