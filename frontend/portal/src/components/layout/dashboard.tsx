'use client'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className='h-screen flex w-full overflow-hidden'>
        {/*<AppSidebar />*/}
        <SidebarInset className='bg-gradient-to-b from-background to-secondary/20 flex-1 overflow-hidden'>{children}</SidebarInset>
      </div>
    </SidebarProvider>
  )
}
