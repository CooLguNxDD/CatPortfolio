/**
 * Live `PHONE_PORTRAIT_QUERY` match — re-renders on rotation so the
 * landscape gate can dismiss itself the moment the phone turns sideways.
 */
import { useSyncExternalStore } from "react"
import { PHONE_PORTRAIT_QUERY, probePhonePortrait } from "@/routes/viewMode"

function subscribe(onChange: () => void): () => void {
  if (typeof matchMedia !== "function") return () => {}
  let mql: MediaQueryList
  try {
    mql = matchMedia(PHONE_PORTRAIT_QUERY)
  } catch {
    return () => {}
  }
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/** True while a touch-first, narrow device is held in portrait. */
export function usePhonePortrait(): boolean {
  return useSyncExternalStore(subscribe, probePhonePortrait, () => false)
}
