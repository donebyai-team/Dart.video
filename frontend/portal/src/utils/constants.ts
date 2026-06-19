export const TEMPLATE_PREFIX = 'template:'

export const isTemplateVideoId = (videoId?: string | null) => {
  if (!videoId) {
    return false
  }

  return decodeURIComponent(videoId).startsWith(TEMPLATE_PREFIX)
}
