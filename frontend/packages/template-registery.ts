import type React from "react"

export type TemplateModule = {
  RemoteComponent: React.ComponentType<any>
}

export type TemplateRegistryEntry = {
  local?: () => Promise<TemplateModule>
  cdn?: {
    url: string
    globalName: string
  }
}

// Set NEXT_PUBLIC_TEMPLATE_CDN_BASE to your CDN root, e.g.:
// https://cdn.example.com/remotion-templates
const CDN_BASE = process.env.NEXT_PUBLIC_TEMPLATE_CDN_BASE ?? ''

export const templateRegistry: Record<string, TemplateRegistryEntry> = {
  textCascade: {
    // Local fallback: keeps existing behavior while testing.
    local: () => import('./build/TextCascade.mjs') as Promise<TemplateModule>,
    // CDN file to manually upload from scripts/build-component.mjs output.
    cdn: CDN_BASE
      ? {
          url: `https://ik.imagekit.io/coasterai/templates/TextCascade.cdn.js`,
          globalName: '__COASTER_TEMPLATE__TextCascade'
        }
      : undefined
  }
}
