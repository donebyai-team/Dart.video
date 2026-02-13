'use client'

import AuthGuard from "@/components/guard/AuthGuard"
import { AuthLoading } from "@/components/Loader/loader"

export default function EditorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard fallback={<AuthLoading />}>
            <div className="min-h-screen bg-background">
                {children}
            </div>
        </AuthGuard>
    )
}
