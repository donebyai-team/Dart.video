"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Plus, X, Type, Globe, FileText, Sparkles, Image } from "lucide-react"
import { create } from "@bufbuild/protobuf"
import toast from "react-hot-toast"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useClientsContext } from "@coasterai/ui-core/context/ClientContext"
import { AuthLoading } from "@/components/Loader/loader"
import { getConnectError } from "@/utils/error"
import { uploadMedia } from "@/services/utils"
import {
    BrandIdentity,
    BrandIdentitySchema,
    BrandMediaSchema,
    BrandColorSchema,
    BrandColor,
    BrandFont,
    BrandFontSchema,
    BrandMediaType,
    BrandAssetPriority
} from "@coasterai/pb/coasterai/core/v1/brandkit_pb"
import {
    BrandIdentityRequestSchema,
    UpdateBrandIdentityRequestSchema
} from "@coasterai/pb/coasterai/portal/v1/portal_pb"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DualColorPicker } from "@/components/editor/animation/toolbars/stylers/DualColorPicker"
import { FontSelector } from "@/components/editor/animation/toolbars/stylers/FontSelector"
import BackgroundSettings from "@/components/editor/settings/BackgroundSettings"
import { BackgroundStyle } from "@coasterai/pb/coasterai/core/v1/slide_pb"
import BrandBackgroundPreview from "@/components/brand/BrandBackgroundPreview"
import { useSearchParams } from "next/navigation"

const BRAND_PREVIEW_TEXT = "Brand Preview"
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

const getBrandColorByPriority = (
    colors: BrandColor[],
    priority: BrandAssetPriority
): string | undefined =>
    colors.find((color) => color.priority === priority)?.colorHexCode

const isValidBrandColor = (colorHexCode: string | undefined): colorHexCode is string =>
    typeof colorHexCode === "string" && HEX_COLOR_REGEX.test(colorHexCode)

const getSafeBrandColor = (
    colorHexCode: string | undefined,
    fallback: string = "#ffffff"
): string =>
    isValidBrandColor(colorHexCode) ? colorHexCode : fallback

const sanitizeBrandColors = (colors: BrandColor[]): BrandColor[] =>
    colors.filter((color) => isValidBrandColor(color.colorHexCode) || color.colorHexCode === "transparent")

const upsertBrandColor = (
    colors: BrandColor[],
    priority: BrandAssetPriority,
    colorHexCode: string
) => {
    const existingIndex = colors.findIndex((color) => color.priority === priority)

    if (existingIndex === -1) {
        return [
            ...colors,
            create(BrandColorSchema, {
                colorHexCode,
                priority,
            }),
        ]
    }

    const updatedColors = [...colors]
    updatedColors[existingIndex] = create(BrandColorSchema, {
        ...updatedColors[existingIndex],
        colorHexCode,
    })
    return updatedColors
}

const getPrimaryBrandFont = (fonts: BrandFont[]) =>
    fonts.find((font) => (font.googleFontsName || font.name || "").trim())?.googleFontsName
    || fonts.find((font) => (font.googleFontsName || font.name || "").trim())?.name
    || ""

const BrandPage = () => {
    const { portalClient } = useClientsContext()
    const searchParams = useSearchParams()

    const [identities, setIdentities] = useState<BrandIdentity[]>([])
    const [availableFonts, setAvailableFonts] = useState<string[]>([])
    const [selectedIdentity, setSelectedIdentity] = useState<BrandIdentity | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [websiteUrl, setWebsiteUrl] = useState("")
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
        fetchBrandIdentities()
    }, [portalClient])

    useEffect(() => {
        const prefetchedWebsiteUrl = searchParams?.get("websiteUrl")
        if (!prefetchedWebsiteUrl) return

        setWebsiteUrl((currentValue) => currentValue || prefetchedWebsiteUrl)
    }, [searchParams])

    const fetchBrandIdentities = async () => {
        try {
            setIsLoading(true)
            const res = await portalClient.getBrandIdentities({})
            setIdentities(res.identities)
            setAvailableFonts(res.supportedFonts)
            if (res.identities.length > 0 && !selectedIdentity) {
                setSelectedIdentity(res.identities[0])
            }
        } catch (err) {
            console.error("Failed to fetch brand identities", err)
            toast.error(getConnectError(err))
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateBrandIdentity = async () => {
        if (!websiteUrl.trim()) {
            toast.error("Please enter a website URL")
            return
        }

        try {
            setIsCreating(true)
            const request = create(BrandIdentityRequestSchema, { websiteUrl })
            const newIdentity = await portalClient.createBrandIdentity(request)
            setIdentities([...identities, newIdentity])
            setSelectedIdentity(newIdentity)
            setWebsiteUrl("")
            toast.success("Brand identity created successfully!")
        } catch (err) {
            console.error("Failed to create brand identity", err)
            toast.error(getConnectError(err))
        } finally {
            setIsCreating(false)
        }
    }

    const handleUpdateIdentity = async (updatedIdentity: BrandIdentity) => {
        try {
            const sanitizedIdentity = create(BrandIdentitySchema, {
                ...updatedIdentity,
                colors: sanitizeBrandColors(updatedIdentity.colors)
            })
            const request = create(UpdateBrandIdentityRequestSchema, {
                identity: sanitizedIdentity
            })
            await portalClient.updateBrandIdentity(request)

            setIdentities(identities.map(i => i.id === sanitizedIdentity.id ? sanitizedIdentity : i))
            setSelectedIdentity(sanitizedIdentity)
        } catch (err) {
            console.error("Failed to update brand identity", err)
            toast.error(getConnectError(err))
        }
    }

    const handleBrandMediaUpload = async (file: File, type: BrandMediaType) => {
        try {
            setIsUploading(true)
            const uploadedMedia = await uploadMedia(file)

            if (selectedIdentity) {
                const newBrandMedia = create(BrandMediaSchema, {
                    asset: uploadedMedia,
                    type,
                    priority: BrandAssetPriority.PRIMARY
                })

                const updatedIdentity = create(BrandIdentitySchema, {
                    ...selectedIdentity,
                    logos: [
                        ...selectedIdentity.logos.filter((media) => media.type !== type),
                        newBrandMedia
                    ]
                })

                await handleUpdateIdentity(updatedIdentity)
                toast.success(type === BrandMediaType.ICON ? "Icon uploaded!" : "Logo uploaded!")
            }
        } catch (err) {
            console.error("Failed to upload brand media", err)
            toast.error(getConnectError(err))
        } finally {
            setIsUploading(false)
        }
    }

    if (isLoading) {
        return <AuthLoading />
    }

    if (identities.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-semibold mb-2">Create Your Brand Identity</h2>
                            <p className="text-muted-foreground">
                                Enter your website URL to automatically extract brand information
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="website">Website URL</Label>
                                <Input
                                    id="website"
                                    type="url"
                                    placeholder="https://example.com"
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleCreateBrandIdentity()}
                                />
                            </div>

                            <Button
                                onClick={handleCreateBrandIdentity}
                                disabled={isCreating || !websiteUrl.trim()}
                                className="w-full"
                            >
                                {isCreating ? "Creating..." : "Create Brand Identity"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Brand Identity</h1>
                    <Button
                        onClick={() => {
                            setIdentities([])
                            setSelectedIdentity(null)
                        }}
                        variant="outline"
                        size="sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Brand
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Brand List Sidebar */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardContent className="p-3">
                                <h3 className="font-semibold text-sm mb-3">Your Brands</h3>
                                <div className="space-y-1.5">
                                    {identities.map((identity) => (
                                        <motion.div
                                            key={identity.id}
                                            whileHover={{ x: 4 }}
                                            onClick={() => setSelectedIdentity(identity)}
                                            className={`p-2.5 rounded-md cursor-pointer transition-colors ${selectedIdentity?.id === identity.id
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-muted"
                                                }`}
                                        >
                                            <div className="font-medium text-sm truncate">{identity.name}</div>
                                            {/* {identity.websiteUrl && (
                                                <div className="text-xs opacity-70 truncate mt-0.5">
                                                    {identity.websiteUrl}
                                                </div>
                                            )} */}
                                        </motion.div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Brand Details */}
                    {selectedIdentity && (
                        <div className="lg:col-span-3">
                            <BrandIdentityEditor
                                availableFonts={availableFonts}
                                identity={selectedIdentity}
                                onUpdate={handleUpdateIdentity}
                                onBrandMediaUpload={handleBrandMediaUpload}
                                isUploading={isUploading}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

interface BrandIdentityEditorProps {
    identity: BrandIdentity
    onUpdate: (identity: BrandIdentity) => void | Promise<void>
    onBrandMediaUpload: (file: File, type: BrandMediaType) => void
    isUploading: boolean
    availableFonts: string[]
}

const BrandIdentityEditor = ({ availableFonts, identity, onUpdate, onBrandMediaUpload, isUploading }: BrandIdentityEditorProps) => {
    const [localIdentity, setLocalIdentity] = useState(identity)
    const [isBackgroundEditorOpen, setIsBackgroundEditorOpen] = useState(false)

    useEffect(() => {
        setLocalIdentity(identity)
    }, [identity])

    const previewFont = getPrimaryBrandFont(localIdentity.fonts)
    const previewPrimary = getBrandColorByPriority(
        localIdentity.colors,
        BrandAssetPriority.PRIMARY
    )
    const previewSecondaryRaw = getBrandColorByPriority(
        localIdentity.colors,
        BrandAssetPriority.SECONDARY
    )
    const previewPrimarySafe = getSafeBrandColor(previewPrimary)
    const previewSecondary = getSafeBrandColor(previewSecondaryRaw)
    const previewBackground = getBrandColorByPriority(
        localIdentity.colors,
        BrandAssetPriority.BACKGROUND
    ) || "#ffffff"
    const previewTextPrimary = getBrandColorByPriority(
        localIdentity.colors,
        BrandAssetPriority.TEXT_PRIMARY
    )
    const previewTextPrimarySafe = getSafeBrandColor(previewTextPrimary)
    const primaryIcon = localIdentity.logos.find((media) => media.type === BrandMediaType.ICON)
    const primaryLogo = localIdentity.logos.find((media) => media.type === BrandMediaType.LOGO)

    const updateField = (field: keyof BrandIdentity, value: any) => {
        const updated = create(BrandIdentitySchema, {
            ...localIdentity,
            [field]: value
        })
        setLocalIdentity(updated)
    }

    const handleSave = () => {
        onUpdate(localIdentity)
    }

    const updateBrandStyleField = async (field: keyof BrandIdentity, value: any) => {
        const updated = create(BrandIdentitySchema, {
            ...localIdentity,
            [field]: value
        })

        setLocalIdentity(updated)
        await onUpdate(updated)
    }

    const updatePrimaryFont = async (googleFontsName: string) => {
        const nextFont = create(BrandFontSchema, {
            name: googleFontsName,
            googleFontsName,
        })
        const nextFonts = localIdentity.fonts.length > 0
            ? [nextFont, ...localIdentity.fonts.slice(1)]
            : [nextFont]

        await updateBrandStyleField("fonts", nextFonts)
    }

    const updateBrandColor = async (priority: BrandAssetPriority, colorHexCode: string) => {
        await updateBrandStyleField(
            "colors",
            upsertBrandColor(localIdentity.colors, priority, colorHexCode)
        )
    }

    const updateTextPrimary = async (colorHexCode: string) => {
        await updateBrandColor(BrandAssetPriority.TEXT_PRIMARY, colorHexCode)
    }

    const updateBackgroundStyle = async (bgStyle: BackgroundStyle) => {
        await updateBrandStyleField("bgStyle", bgStyle)
    }

    const removeBrandMedia = async (type: BrandMediaType) => {
        const updated = create(BrandIdentitySchema, {
            ...localIdentity,
            logos: localIdentity.logos.filter((media) => media.type !== type)
        })
        await onUpdate(updated)
    }

    return (
        <div className="space-y-4">
            {/* Brand Assets */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Image className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">Brand Assets</h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                            <div className="w-full rounded-lg border p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-semibold">Icon</h4>
                                        <p className="text-xs text-muted-foreground">
                                            A simple symbol or mark used in small spaces like avatars, favicons, or app icons.
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => document.getElementById("icon-upload")?.click()}
                                        disabled={isUploading}
                                        className="h-8 text-xs"
                                    >
                                        <Plus className="w-3 h-3 mr-1.5" />
                                        {isUploading ? "Uploading..." : primaryIcon ? "Replace" : "Add"}
                                    </Button>
                                    <input
                                        id="icon-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                onBrandMediaUpload(file, BrandMediaType.ICON)
                                                e.target.value = ""
                                            }
                                        }}
                                    />
                                </div>

                                {primaryIcon ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="relative group w-fit"
                                    >
                                        <div className="w-32 h-20 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                                            <img
                                                src={primaryIcon.asset?.url}
                                                alt="Primary brand icon"
                                                className="w-full h-full object-contain p-1.5"
                                            />
                                        </div>

                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeBrandMedia(BrandMediaType.ICON)}
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <div className="text-sm text-muted-foreground py-3 text-center border border-dashed rounded-md">
                                        No icon uploaded yet
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-full rounded-lg border p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-semibold">Logo</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Your full brand lockup, wordmark, or complete logo used in headers, decks, and marketing.
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => document.getElementById("logo-upload")?.click()}
                                        disabled={isUploading}
                                        className="h-8 text-xs"
                                    >
                                        <Plus className="w-3 h-3 mr-1.5" />
                                        {isUploading ? "Uploading..." : primaryLogo ? "Replace" : "Add"}
                                    </Button>
                                    <input
                                        id="logo-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                onBrandMediaUpload(file, BrandMediaType.LOGO)
                                                e.target.value = ""
                                            }
                                        }}
                                    />
                                </div>

                                {primaryLogo ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="relative group w-fit"
                                    >
                                        <div className="w-32 h-20 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                                            <img
                                                src={primaryLogo.asset?.url}
                                                alt="Primary brand logo"
                                                className="w-full h-full object-contain p-1.5"
                                            />
                                        </div>

                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeBrandMedia(BrandMediaType.LOGO)}
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <div className="text-sm text-muted-foreground py-3 text-center border border-dashed rounded-md">
                                        No logo uploaded yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Brand Style */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Type className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-semibold">Brand Style</h3>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                            <div className="w-[400px] h-[225px] overflow-hidden rounded-xl border">
                                <BrandBackgroundPreview
                                    backgroundStyle={localIdentity.bgStyle}
                                    text={BRAND_PREVIEW_TEXT}
                                    subtext={`${previewFont || "Choose a font"} · ${previewTextPrimarySafe}`}
                                    textColor={previewTextPrimarySafe}
                                    primaryColor={previewPrimarySafe}
                                    secondaryColor={previewSecondary}
                                    fontFamily={previewFont || undefined}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Brand Colors</Label>
                                    <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                                        <div className="flex items-center gap-3">
                                            <DualColorPicker
                                                primaryColor={previewPrimarySafe}
                                                onPrimaryColor={(value) => updateBrandColor(BrandAssetPriority.PRIMARY, value)}
                                                primaryLabel="Primary"
                                                triggerVariant="input"
                                                triggerStyle="active-color"
                                            />
                                            <div>
                                                <p className="text-sm font-medium">Primary</p>
                                                <p className="text-xs text-muted-foreground">{previewPrimarySafe}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <DualColorPicker
                                                primaryColor={previewSecondary}
                                                onPrimaryColor={(value) => updateBrandColor(BrandAssetPriority.SECONDARY, value)}
                                                primaryLabel="Secondary"
                                                triggerVariant="input"
                                                triggerStyle="active-color"
                                            />
                                            <div>
                                                <p className="text-sm font-medium">Secondary</p>
                                                <p className="text-xs text-muted-foreground">{previewSecondary}</p>
                                            </div>
                                        </div>

                                        {/* <div className="flex items-center gap-3">
                                            <DualColorPicker
                                                primaryColor={previewBackground}
                                                onPrimaryColor={(value) => updateBrandColor(BrandAssetPriority.BACKGROUND, value)}
                                                primaryLabel="Secondary"
                                                triggerVariant="input"
                                                triggerStyle="active-color"
                                            />
                                            <div>
                                                <p className="text-sm font-medium">Background</p>
                                                <p className="text-xs text-muted-foreground">{previewSecondary}</p>
                                            </div>
                                        </div> */}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">Text Primary</Label>
                                    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                                            <DualColorPicker
                                                primaryColor={previewTextPrimarySafe}
                                                onPrimaryColor={updateTextPrimary}
                                                primaryLabel="Text primary"
                                                triggerVariant="input"
                                                triggerStyle="active-color"
                                            />
                                        <span className="text-sm text-muted-foreground">{previewTextPrimarySafe}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">Font</Label>
                            <FontSelector
                                value={previewFont}
                                onChange={updatePrimaryFont}
                                availableFonts={availableFonts}
                                brandFonts={[]}
                                placeholder="Search fonts..."
                                emptyLabel="Select a Google Font..."
                                defaultOptionLabel="Default"
                                className="w-full"
                                inputClassName="h-9 w-full bg-background text-sm"
                                popoverClassName="w-full max-h-72"
                            />
                        </div>

                        <div className="rounded-xl border bg-muted/20">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium">Video Background</p>
                                    <p className="text-xs text-muted-foreground">
                                        Select a background style for your video
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setIsBackgroundEditorOpen(true)}
                                >
                                    Edit background
                                </Button>
                            </div>
                        </div>

                        <Dialog open={isBackgroundEditorOpen} onOpenChange={setIsBackgroundEditorOpen}>
                            <DialogContent className="max-w-[500px] overflow-hidden p-0">
                                <BackgroundSettings
                                    value={localIdentity.bgStyle}
                                    onChange={updateBackgroundStyle}
                                    onClose={() => setIsBackgroundEditorOpen(false)}
                                    showApplyAll={false}
                                    className="max-h-[80vh] pb-0"
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
            {/* Basic Information */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">Basic Information</h3>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="name" className="text-xs">Brand Name</Label>
                            <Input
                                id="name"
                                value={localIdentity.name}
                                onChange={(e) => updateField("name", e.target.value)}
                                placeholder="Enter brand name"
                                className="h-9 text-sm"
                            />
                        </div>

                        <div>
                            <Label htmlFor="website" className="text-xs">Website URL</Label>
                            <div className="flex items-center gap-2">
                                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    id="website"
                                    value={localIdentity.websiteUrl || ""}
                                    disabled
                                    className="flex-1 h-9 text-sm"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Website URL cannot be changed
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="tagline" className="text-xs">Tagline</Label>
                            <Input
                                id="tagline"
                                value={localIdentity.tagline || ""}
                                onChange={(e) => updateField("tagline", e.target.value)}
                                placeholder="Your brand's tagline"
                                className="h-9 text-sm"
                            />
                        </div>

                        <div>
                            <Label htmlFor="description" className="text-xs">Description</Label>
                            <Textarea
                                id="description"
                                value={localIdentity.description || ""}
                                onChange={(e) => updateField("description", e.target.value)}
                                placeholder="Describe your brand"
                                rows={3}
                                className="text-sm"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>



            {/* Save Button for text fields */}
            <div className="flex justify-end">
                <Button onClick={handleSave} size="sm">
                    Save
                </Button>
            </div>
        </div>
    )
}

export default BrandPage
