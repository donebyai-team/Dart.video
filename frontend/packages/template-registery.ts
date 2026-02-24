import type React from 'react'

export type TemplateModule = {
  RemoteComponent: React.ComponentType<any>
}

export type TemplateRegistryEntry = {
  local?: {
    url: string
    globalNames: string[]
  }
  cdn?: {
    url: string
    globalNames: string[]
  }
}

const CDN_BASE = process.env.NEXT_PUBLIC_TEMPLATE_CDN_BASE ?? 'https://storage.googleapis.com/coasterai-public/'
const LOCAL_BASE = '/templates'

const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9_$]/g, '')
const toGlobalName = (name: string) => `__COASTER_TEMPLATE__${sanitizeName(name)}`
const toPascalCase = (value: string) =>
  value
    .split(/[-_]/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const normalizeTemplatePath = (templatePath: string) => templatePath.replace(/^\/+/, '')

const resolveGlobalNames = (templatePath: string): string[] => {
  const normalizedPath = normalizeTemplatePath(templatePath)
  const fileName = normalizedPath.split('/').pop() ?? normalizedPath
  const baseName = fileName.replace(/\.cdn\.js$/i, '').replace(/\.js$/i, '')
  const lastSegment = normalizedPath.split('/').slice(-2).join('/')

  const candidates = [
    templatePath,
    normalizedPath,
    `templates/${normalizedPath}`,
    fileName,
    baseName,
    toPascalCase(baseName),
    lastSegment,
    'Index'
  ]

  return Array.from(new Set(candidates.filter(Boolean).map(toGlobalName)))
}

// Keep file names aligned with the template path passed in slide.content.templateUrl.
export const resolveTemplateEntry = (templatePath: string): TemplateRegistryEntry => {
  const normalizedPath = normalizeTemplatePath(templatePath)
  const fileName = normalizedPath
  const localFileName = normalizedPath.startsWith('templates/')
    ? normalizedPath.replace(/^templates\//, '')
    : normalizedPath
  const globalNames = resolveGlobalNames(templatePath)
  const localBase = LOCAL_BASE.replace(/\/$/, '')

  return {
    cdn: CDN_BASE
      ? {
          url: `${CDN_BASE.replace(/\/$/, '')}/${fileName}`,
          globalNames
        }
      : undefined,
    local: {
      url: `${localBase}/${localFileName}`,
      globalNames
    }
  }
}
