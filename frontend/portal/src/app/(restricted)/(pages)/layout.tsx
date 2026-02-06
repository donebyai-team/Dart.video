import AuthGuard from '@/components/guard/AuthGuard'
import type { ReactNode } from "react";
import { AuthLoading } from '@/components/Loader/loader'

export default function Layout({ children, }: { children: ReactNode }) {
    return (
        <AuthGuard fallback={<AuthLoading />}>
            {/* <DashboardLayout>{children}</DashboardLayout> */}
            {children}
        </AuthGuard>
    )
}

