"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

import { AuthLoading } from "@/components/Loader/loader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getConnectError } from "@/utils/error"
import { formatTimestampToReadableDate } from "@/utils/format"
import { CreditLedgerEntry } from "@coasterai/pb/coasterai/core/v1/credits_pb"
import { useClientsContext } from "@coasterai/ui-core/context/ClientContext"

const formatLedgerAction = (action: string) =>
    action
        .split("_")
        .filter(Boolean)
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join("")

const BillingPage = () => {
    const { portalClient } = useClientsContext()

    const [availableCredits, setAvailableCredits] = useState(0)
    const [entries, setEntries] = useState<CreditLedgerEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchCredits = async () => {
            try {
                setIsLoading(true)
                const response = await portalClient.getCredits({ ledger: true })
                setAvailableCredits(response.available)
                setEntries(response.entries)
            } catch (err) {
                console.error("Failed to fetch credits", err)
                toast.error(getConnectError(err))
            } finally {
                setIsLoading(false)
            }
        }

        fetchCredits()
    }, [portalClient])

    const creditHistory = useMemo(() => entries, [entries])

    if (isLoading) {
        return <AuthLoading />
    }

    return (
        <div className="min-h-screen bg-muted/20 p-6 md:p-8">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight">Billing</h1>                   
                </div>

                <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
                    <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-3">
                            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                Available balance
                            </p>
                            <div className="flex items-end gap-3">
                                <p className="text-5xl font-semibold tracking-tight">{availableCredits}</p>
                                <span className="pb-2 text-sm text-muted-foreground">credits</span>
                            </div>
                        </div>
                       
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Credit history</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {creditHistory.length === 0 ? (
                            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                                No credit history found.
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border bg-background">
                                <div className="grid grid-cols-[1.2fr_1fr_auto] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    <span>Date</span>
                                    <span>Action</span>
                                    <span className="text-right">Amount</span>
                                </div>
                                <div className="divide-y">
                                    {creditHistory.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="grid grid-cols-[1.2fr_1fr_auto] items-center gap-4 px-4 py-4"
                                        >
                                            <span className="text-sm text-muted-foreground">
                                                {formatTimestampToReadableDate(entry.createdAt)}
                                            </span>
                                            <span className="text-sm font-medium">
                                                {formatLedgerAction(entry.action)}
                                            </span>
                                            <span
                                                className={`text-right text-sm font-semibold ${entry.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                                            >
                                                {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default BillingPage
