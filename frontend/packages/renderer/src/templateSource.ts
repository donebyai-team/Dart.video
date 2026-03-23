const templateSourceCache = new Map<string, string>()
const templateSourcePromiseCache = new Map<string, Promise<string>>()

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
