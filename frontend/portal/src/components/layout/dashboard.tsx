'use client'

import { AppSidebar } from '../dashboard/AppSideBar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen flex w-full'>
      <AppSidebar />
      <main className='min-w-0 flex-1 bg-gradient-to-b from-background to-secondary/20'>{children}</main>
    </div>
  )
}
