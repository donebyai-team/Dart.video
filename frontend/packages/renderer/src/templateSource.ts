const templateSourceCache = new Map<string, string>()
const templateSourcePromiseCache = new Map<string, Promise<string>>()

 export function sanitizeTemplateCode(code: string, defaults?: unknown): string {
   return code.replace(
     '__DEFAULT_DATA__',
     JSON.stringify(defaults, null, 2)
   )
 }

export async function loadTemplateSource(templateUrl: string): Promise<string> {
  const cached = templateSourceCache.get(templateUrl)
  if (cached) return cached

  const inFlight = templateSourcePromiseCache.get(templateUrl)
  if (inFlight) return inFlight

  const promise = (async () => {
    const response = await fetch(templateUrl, { cache: 'force-cache' })
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`)
    }

    const code = await response.text()
    templateSourceCache.set(templateUrl, code)
    templateSourcePromiseCache.delete(templateUrl)
    return code
  })().catch((error) => {
    templateSourcePromiseCache.delete(templateUrl)
    throw error
  })

  templateSourcePromiseCache.set(templateUrl, promise)
  return promise
}

export function getCachedTemplateSource(templateUrl: string): string | undefined {
  return templateSourceCache.get(templateUrl)
}

 export async function loadPreparedTemplateSource({
   templateUrl,
   defaults,
   inlineCode,
 }: {
   templateUrl?: string | null
   defaults?: unknown
   inlineCode?: string | null
 }): Promise<string> {
   if (inlineCode?.trim()) {
     return inlineCode
   }

   if (!templateUrl?.trim()) {
     return ''
   }

   return sanitizeTemplateCode(
     await loadTemplateSource(templateUrl),
     defaults
   )
 }
