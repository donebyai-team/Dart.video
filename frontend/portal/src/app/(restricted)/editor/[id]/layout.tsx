'use client'

import AuthGuard from "@/components/guard/AuthGuard"
import { AuthLoading } from "@/components/Loader/loader"
import { FontLoader } from "@/components/editor/FontLoader"

export default function EditorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard fallback={<AuthLoading />}>
            <FontLoader />
            <div className="min-h-screen bg-background">
                {children}
            </div>
        </AuthGuard>
    )
}
