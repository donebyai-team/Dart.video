"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Upload, X, Palette, Type, Globe, FileText, Sparkles, Check, ChevronsUpDown, LucideOctagon, Stamp, Image } from "lucide-react"
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
    BrandMedia,
    BrandMediaSchema,
    BrandColorSchema,
    BrandFont,
    BrandFontSchema,
    BrandMediaType,
    BrandAssetPriority
} from "@coasterai/pb/coasterai/core/v1/brandkit_pb"
import {
    BrandIdentityRequestSchema,
    UpdateBrandIdentityRequestSchema
} from "@coasterai/pb/coasterai/portal/v1/portal_pb"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { DualColorPicker } from "@/components/editor/animation/toolbars/stylers/DualColorPicker"

const BrandPage = () => {
    const { portalClient } = useClientsContext()

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
            const request = create(UpdateBrandIdentityRequestSchema, {
                identity: updatedIdentity
            })
            await portalClient.updateBrandIdentity(request)

            setIdentities(identities.map(i => i.id === updatedIdentity.id ? updatedIdentity : i))
            setSelectedIdentity(updatedIdentity)
            toast.success("Brand identity updated!")
        } catch (err) {
            console.error("Failed to update brand identity", err)
            toast.error(getConnectError(err))
        }
    }

    const handleLogoUpload = async (file: File) => {
        try {
            setIsUploading(true)
            const uploadedMedia = await uploadMedia(file)

            if (selectedIdentity) {
                const newLogo = create(BrandMediaSchema, {
                    asset: uploadedMedia,
                    type: BrandMediaType.LOGO,
                    priority: BrandAssetPriority.PRIMARY
                })

                const updatedIdentity = create(BrandIdentitySchema, {
                    ...selectedIdentity,
                    logos: [...selectedIdentity.logos, newLogo]
                })

                await handleUpdateIdentity(updatedIdentity)
                toast.success("Logo uploaded!")
            }
        } catch (err) {
            console.error("Failed to upload logo", err)
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
                                onLogoUpload={handleLogoUpload}
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
    onUpdate: (identity: BrandIdentity) => void
    onLogoUpload: (file: File) => void
    isUploading: boolean
    availableFonts: string[]
}

const BrandIdentityEditor = ({ availableFonts, identity, onUpdate, onLogoUpload, isUploading }: BrandIdentityEditorProps) => {
    const [localIdentity, setLocalIdentity] = useState(identity)

    useEffect(() => {
        setLocalIdentity(identity)
    }, [identity])

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

    const updateColor = async (index: number, colorHexCode: string) => {
        const updated = [...localIdentity.colors]
        updated[index] = create(BrandColorSchema, {
            ...updated[index],
            colorHexCode
        })
        const updatedIdentity = create(BrandIdentitySchema, {
            ...localIdentity,
            colors: updated
        })
        await onUpdate(updatedIdentity)
    }

    const removeColor = async (index: number) => {
        const updated = create(BrandIdentitySchema, {
            ...localIdentity,
            colors: localIdentity.colors.filter((_, i) => i !== index)
        })
        await onUpdate(updated)
    }

    const addFont = async () => {
        const newFont = create(BrandFontSchema, {
            name: "",
            googleFontsName: ""
        })
        const updated = create(BrandIdentitySchema, {
            ...localIdentity,
            fonts: [...localIdentity.fonts, newFont]
        })
        await onUpdate(updated)
    }

    const updateFont = (index: number, field: keyof BrandFont, value: string) => {
        const updated = [...localIdentity.fonts]
        updated[index] = create(BrandFontSchema, {
            ...updated[index],
            [field]: value
        })
        updateField("fonts", updated)
    }

    const updateFontAndSave = async (index: number, googleFontsName: string) => {
        const updated = [...localIdentity.fonts]
        updated[index] = create(BrandFontSchema, {
            ...updated[index],
            name: googleFontsName,
            googleFontsName: googleFontsName
        })
        const updatedIdentity = create(BrandIdentitySchema, {
            ...localIdentity,
            fonts: updated
        })
        await onUpdate(updatedIdentity)
    }

    const removeFont = async (index: number) => {
        const updated = create(BrandIdentitySchema, {
            ...localIdentity,
            fonts: localIdentity.fonts.filter((_, i) => i !== index)
        })
        await onUpdate(updated)
    }

    const removeLogo = async (index: number) => {
        const updated = create(BrandIdentitySchema, {
            ...localIdentity,
            logos: localIdentity.logos.filter((_, i) => i !== index)
        })
        await onUpdate(updated)
    }

    return (
        <div className="space-y-4">
            {/* Logos */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Image className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-semibold">Logos</h3>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById("logo-upload")?.click()}
                            disabled={isUploading}
                            className="h-8 text-xs"
                        >
                            <Plus className="w-3 h-3 mr-1.5" />
                            {isUploading ? "Uploading..." : "Add"}
                        </Button>
                        <input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                    onLogoUpload(file)
                                    e.target.value = ""
                                }
                            }}
                        />
                    </div>

                    <AnimatePresence>
                        {localIdentity.logos.map((logo, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative group"
                            >
                                <div className="w-32 h-20 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                                    <img
                                        src={logo.asset?.url}
                                        alt={`Logo ${index + 1}`}
                                        className="w-full h-full object-contain p-1.5"
                                    />
                                </div>

                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeLogo(index)}
                                >
                                    <X className="w-2.5 h-2.5" />
                                </Button>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {localIdentity.logos.length === 0 && (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                            No logos uploaded yet
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Colors */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-semibold">Brand Colors</h3>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <AnimatePresence>
                            {localIdentity.colors.map((color, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="relative group"
                                >
                                    <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                                        <div className="flex items-center justify-center w-10 h-10 rounded border bg-background flex-shrink-0">
                                            <DualColorPicker
                                                primaryColor={color.colorHexCode}
                                                onPrimaryColor={(value) => updateColor(index, value)}
                                                primaryLabel="Brand color"
                                                triggerVariant="input"
                                                triggerStyle="active-color"
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs text-muted-foreground">
                                                {BrandAssetPriority[color.priority]}
                                            </span>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeColor(index)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {localIdentity.colors.length === 0 && (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                            No colors defined yet
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Fonts */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Type className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-semibold">Brand Fonts</h3>
                        </div>
                        <Button size="sm" variant="outline" onClick={addFont} className="h-8 text-xs">
                            <Plus className="w-3 h-3 mr-1.5" />
                            Add Font
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <AnimatePresence>
                            {localIdentity.fonts.map((font, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="relative group"
                                >
                                    <div className="p-3 rounded-lg border-2 border-muted hover:border-primary/50 transition-colors bg-gradient-to-br from-background to-muted/30">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <FontSelector
                                                    value={font.googleFontsName || ""}
                                                    availableFonts={availableFonts}
                                                    onSelect={(value) => updateFontAndSave(index, value)}
                                                />
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => removeFont(index)}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                        {font.googleFontsName && (
                                            <div className="mt-2 pt-2 border-t border-border/50">
                                                <p
                                                    className="text-lg truncate"
                                                    style={{ fontFamily: font.googleFontsName }}
                                                >
                                                    The quick brown fox
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {font.googleFontsName}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {localIdentity.fonts.length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No fonts defined yet</p>
                            <p className="text-xs mt-1">Add a Google Font to get started</p>
                        </div>
                    )}
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

interface FontSelectorProps {
    value: string
    onSelect: (value: string) => void
    availableFonts: string[]
}

const FontSelector = ({ value, onSelect, availableFonts }: FontSelectorProps) => {
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const filteredFonts = useMemo(() => {
        if (!searchQuery) return availableFonts.slice(0, 100)
        return availableFonts
            .filter((font: string) =>
                font.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .slice(0, 100)
    }, [searchQuery])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-9 text-sm font-normal hover:bg-muted/50 transition-colors"
                >
                    <span className="truncate">{value || "Select a Google Font..."}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start" sideOffset={4}>
                <Command className="rounded-lg border shadow-md">
                    <div className="flex items-center border-b px-3">
                        <Type className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <CommandInput
                            placeholder="Search Google Fonts..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            className="h-10 text-sm border-0 focus:ring-0"
                        />
                    </div>
                    <CommandList>
                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                            <Type className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>No font found.</p>
                            <p className="text-xs mt-1">Try a different search term</p>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto p-2">
                            {filteredFonts.map((font) => (
                                <CommandItem
                                    key={font}
                                    value={font}
                                    onSelect={() => {
                                        onSelect(font)
                                        setOpen(false)
                                    }}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer aria-selected:bg-accent"
                                >
                                    <Check
                                        className={cn(
                                            "h-4 w-4 shrink-0",
                                            value === font ? "opacity-100 text-primary" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{font}</p>
                                        <p
                                            className="text-xs text-muted-foreground truncate mt-0.5"
                                            style={{ fontFamily: font }}
                                        >
                                            The quick brown fox jumps
                                        </p>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

export default BrandPage
