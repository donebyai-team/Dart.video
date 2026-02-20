import type React from 'react'

export type TemplateModule = {
  RemoteComponent: React.ComponentType<any>
}

export type TemplateRegistryEntry = {
  local?: {
    url: string
    globalName: string
  }
  cdn?: {
    url: string
    globalName: string
  }
}

const CDN_BASE = process.env.NEXT_PUBLIC_TEMPLATE_CDN_BASE ?? 'https://ik.imagekit.io/coasterai/templates'
const LOCAL_BASE = '/templates'

const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9_$]/g, '')
const toGlobalName = (name: string) => `__COASTER_TEMPLATE__${sanitizeName(name)}`

// Keep file names aligned with the template name passed in slide.content.templateId.
// Example templateId: TextCascade -> TextCascade.cdn.js
export const resolveTemplateEntry = (templateName: string): TemplateRegistryEntry => {
  const fileName = `${templateName}.cdn.js`
  const globalName = toGlobalName(templateName)
  const localBase = LOCAL_BASE.replace(/\/$/, '')

  return {
    cdn: CDN_BASE
      ? {
          url: `${CDN_BASE.replace(/\/$/, '')}/${fileName}`,
          globalName
        }
      : undefined,
    local: {
      url: `${localBase}/${fileName}`,
      globalName
    }
  }
}
