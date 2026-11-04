import { type Locator } from "@playwright/test"

/**
 * Dispatch a one-finger swipe up (touchstart → touchend, 150px) on an element.
 * FishTankStage dives on a swipe up at the surface; on short touch screens
 * (phone landscape) that is the only visible way to dive.
 */
export async function swipeUp(target: Locator) {
  await target.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y0 = Math.min(r.bottom - 4, window.innerHeight - 4)
    const mk = (y: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y })
    el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [mk(y0)], changedTouches: [mk(y0)] }))
    el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [mk(y0 - 150)] }))
  })
}
