import { useEffect, useMemo, useState } from "react"
import { Icon } from "../../../../packages/animation/src"


export function IconPicker({
    value,
    onChange,
}: {
    value?: string
    onChange: (icon: Icon) => void
}) {
    const [tab, setTab] = useState<"generic" | "brand">("brand")
    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)
    const [tablerIcons, setTablerIcons] = useState({
        outline: [] as string[],
        filled: [] as string[],
    })
    const [brandIcons, setBrandIcons] = useState<Icon[]>([])

    /* Load tabler dataset once */

    useEffect(() => {
        loadTablerIcons().then(setTablerIcons)
    }, [])

    useEffect(() => {
        if (query.length > 0) setOpen(true)
        else setOpen(false)
    }, [query])

    /* Brand search */

    useEffect(() => {
        if (tab !== "brand" || query.length < 2) {
            setBrandIcons([])
            return
        }

        searchBrandIcons(query).then(setBrandIcons)
    }, [query, tab])

    /* Generic search */

    const genericIcons = useMemo(() => {
        if (query.length < 2) return []

        const q = query.toLowerCase()

        const outline = tablerIcons.outline
            .filter(i => i.includes(q))
            .slice(0, 40)
            .map(name => ({
                name,
                icon: tablerUrl("outline", name),
            }))

        const filled = tablerIcons.filled
            .filter(i => i.includes(q))
            .slice(0, 40)
            .map(name => ({
                name,
                icon: tablerUrl("filled", name),
            }))

        return [...outline, ...filled]
    }, [query, tablerIcons])

    const icons = tab === "generic" ? genericIcons : brandIcons.slice(0, 80)

    return (
        <>
            <>
                {/* Search box */}

                <div className=" border rounded-md bg-background">
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search icons..."
                        className="h-8 w-full px-3 text-base outline-none"
                    />
                </div>

                {/* Dropdown */}

                {open && (
                    <div className=" border rounded-md bg-background shadow-sm">

                        {/* Tabs */}

                        <div className="border-b">
                            <div className="flex rounded-md bg-muted p-0.5">
                                <button
                                    onClick={() => setTab("brand")}
                                    className={`flex-1 rounded-sm px-2 py-1 text-xs ${tab === "brand"
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground"
                                        }`}
                                >
                                    Brand
                                </button>
                                <button
                                    onClick={() => setTab("generic")}
                                    className={`flex-1 rounded-sm px-2 py-1 text-xs ${tab === "generic"
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground"
                                        }`}
                                >
                                    Icons
                                </button>
                            </div>
                        </div>

                        {/* Grid */}

                        <div className="max-h-[260px] overflow-y-auto p-2">
                            <div className="grid grid-cols-4 gap-1.5">
                                {icons.map(icon => (
                                    <button
                                        key={icon.icon}
                                        title={icon.name}
                                        onClick={() => {
                                            onChange(icon)
                                            setOpen(false)
                                        }}
                                        className="group flex h-12 w-12 items-center justify-center rounded-md border border-transparent hover:border-border hover:bg-accent/40"
                                    >
                                        <img
                                            src={icon.icon}
                                            width={32}
                                            height={32}
                                            loading="lazy"
                                            className="opacity-80 group-hover:opacity-100"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </>
        </>
    )
}

const TABLER_BASE =
    "https://cdn.jsdelivr.net/npm/@tabler/icons/icons"

function tablerUrl(style: "outline" | "filled", name: string) {
    return `${TABLER_BASE}/${style}/${name}.svg`
}

async function loadTablerIcons() {
    const res = await fetch(
        "https://storage.googleapis.com/coasterai-public/tabler-icons.json.gz"
    )
    return res.json()
}

async function searchBrandIcons(query: string) {
    const res = await fetch(
        `https://www.thesvg.org/api/registry?limit=1&q=${encodeURIComponent(query)}`
    )

    const data = await res.json()

    if (!data.icons?.length) return []

    const icon = data.icons[0]

    return icon.variants
        .filter((variant: string) =>
            !variant.toLowerCase().includes("wordmark")
        )
        .map((variant: string) => ({
            name: `${icon.slug}-${variant}`,
            icon: `https://www.thesvg.org/icons/${icon.slug}/${variant}.svg`,
        }))
}