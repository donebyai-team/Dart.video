import AuthGuard from '@/components/guard/AuthGuard'
import type { ReactNode } from "react";
import { AuthLoading } from '@/components/Loader/loader'
import DashboardLayout from '@/components/layout/dashboard';

export default function Layout({ children, }: { children: ReactNode }) {
    return (
        <AuthGuard fallback={<AuthLoading />}>
             <DashboardLayout>{children}</DashboardLayout>
        </AuthGuard>
    )
}

