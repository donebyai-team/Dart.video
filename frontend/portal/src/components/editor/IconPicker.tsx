import { useEffect, useMemo, useState } from "react"

export interface Icon {
  name: string
  icon: string
}

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

  const [brandIndex, setBrandIndex] = useState<Record<string, string[]>>({})

  /* Load datasets once */

  useEffect(() => {
    loadTablerIcons().then(setTablerIcons)
    loadTheSVGIcons().then(setBrandIndex)
  }, [])

  useEffect(() => {
    if (query.length > 0) setOpen(true)
    else setOpen(false)
  }, [query])

  /* Generic search */

  const genericIcons = useMemo(() => {
    if (query.length < 2) return []

    const q = query.toLowerCase()

    const outline = tablerIcons.outline
      .filter((i) => i.includes(q))
      .slice(0, 40)
      .map((name) => ({
        name,
        icon: tablerUrl("outline", name),
      }))

    const filled = tablerIcons.filled
      .filter((i) => i.includes(q))
      .slice(0, 40)
      .map((name) => ({
        name,
        icon: tablerUrl("filled", name),
      }))

    return [...outline, ...filled]
  }, [query, tablerIcons])

  /* Brand search (local index) */

  const brandIcons = useMemo(() => {
  if (query.length < 2) return []

  const q = query.toLowerCase()

  return Object.entries(brandIndex)
    .filter(([slug]) => slug.includes(q))
    .slice(0, 40)
    .flatMap(([slug, variants]) =>
      variants
        .filter(v => !v.toLowerCase().includes("wordmark"))
        .map(variant => ({
          name: `${slug}-${variant}`,
          icon: `https://www.thesvg.org/icons/${slug}/${variant}.svg`,
        }))
    )
    .slice(0, 80)
}, [query, brandIndex])

  const icons = tab === "generic" ? genericIcons : brandIcons

  return (
    <>
      {/* Search box */}

      <div className="border rounded-md bg-background">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons..."
          className="h-8 w-full px-3 text-base outline-none"
        />
      </div>

      {/* Dropdown */}

      {open && (
        <div className="border rounded-md bg-background shadow-sm">

          {/* Tabs */}

          <div className="border-b">
            <div className="flex rounded-md bg-muted p-0.5">
              <button
                onClick={() => setTab("brand")}
                className={`flex-1 rounded-sm px-2 py-1 text-xs ${
                  tab === "brand"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Brand
              </button>

              <button
                onClick={() => setTab("generic")}
                className={`flex-1 rounded-sm px-2 py-1 text-xs ${
                  tab === "generic"
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
              {icons.map((icon) => (
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
  )
}

/* ----------------------- helpers ----------------------- */

const TABLER_BASE =
  "https://cdn.jsdelivr.net/npm/@tabler/icons/icons"

function tablerUrl(style: "outline" | "filled", name: string) {
  return `${TABLER_BASE}/${style}/${name}.svg`
}

function pickVariant(variants: string[]) {
  const clean = variants.filter(
    (v) => !v.toLowerCase().includes("wordmark")
  )

  const priority = ["color", "light", "dark", "default"]

  for (const p of priority) {
    const match = clean.find((v) => v === p)
    if (match) return match
  }

  return clean[0] || variants[0]
}

/* ----------------------- loaders ----------------------- */

async function loadTablerIcons() {
  const res = await fetch(
    "https://storage.googleapis.com/coasterai-public/tabler-icons.json.gz"
  )
  return res.json()
}

async function loadTheSVGIcons() {
  const res = await fetch(
    "https://storage.googleapis.com/coasterai-public/thesvg-icons.json.gz"
  )
  return res.json()
}