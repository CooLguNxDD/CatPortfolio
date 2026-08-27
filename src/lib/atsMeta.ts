/** Absolute recruiter/ATS URL for the WebGL-free text view. */
export function recruiterTextUrl(): string {
  if (typeof window === "undefined") return "/CatPortfolio/?v=text"
  return new URL("?v=text", `${window.location.origin}${import.meta.env.BASE_URL}`).href
}

/** Stamp canonical + og:url so ATS/Slack crawlers get an absolute text-mode link. */
export function stampAtsMeta(): void {
  if (typeof document === "undefined") return
  const url = recruiterTextUrl()
  let canonical = document.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement("link")
    canonical.setAttribute("rel", "canonical")
    document.head.appendChild(canonical)
  }
  canonical.setAttribute("href", url)
  let og = document.querySelector('meta[property="og:url"]')
  if (!og) {
    og = document.createElement("meta")
    og.setAttribute("property", "og:url")
    document.head.appendChild(og)
  }
  og.setAttribute("content", url)
}
