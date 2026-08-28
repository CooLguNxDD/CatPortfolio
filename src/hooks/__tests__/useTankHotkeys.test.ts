import { describe, it, expect } from "vitest"
import { isEditableTarget } from "../useTankHotkeys"

function mockElement(opts: {
  tagName: string
  isContentEditable?: boolean
  getAttribute?: (attr: string) => string | null
}): EventTarget {
  return opts as unknown as EventTarget
}

describe("isEditableTarget", () => {
  it("returns false for null or undefined target", () => {
    expect(isEditableTarget(null)).toBe(false)
  })

  it("returns true for input, textarea, and select elements", () => {
    expect(isEditableTarget(mockElement({ tagName: "INPUT" }))).toBe(true)
    expect(isEditableTarget(mockElement({ tagName: "input" }))).toBe(true)
    expect(isEditableTarget(mockElement({ tagName: "TEXTAREA" }))).toBe(true)
    expect(isEditableTarget(mockElement({ tagName: "select" }))).toBe(true)
  })

  it("returns false for non-editable tags", () => {
    expect(isEditableTarget(mockElement({ tagName: "DIV" }))).toBe(false)
    expect(isEditableTarget(mockElement({ tagName: "BUTTON" }))).toBe(false)
    expect(isEditableTarget(mockElement({ tagName: "SPAN" }))).toBe(false)
    expect(isEditableTarget(mockElement({ tagName: "A" }))).toBe(false)
  })

  it("returns true for contenteditable elements", () => {
    expect(
      isEditableTarget(mockElement({ tagName: "DIV", isContentEditable: true })),
    ).toBe(true)
    expect(
      isEditableTarget(
        mockElement({
          tagName: "DIV",
          isContentEditable: false,
          getAttribute: (attr) => (attr === "contenteditable" ? "true" : null),
        }),
      ),
    ).toBe(true)
  })

  it("returns false for elements with contenteditable=false", () => {
    expect(
      isEditableTarget(
        mockElement({
          tagName: "DIV",
          isContentEditable: false,
          getAttribute: (attr) => (attr === "contenteditable" ? "false" : null),
        }),
      ),
    ).toBe(false)
  })
})
