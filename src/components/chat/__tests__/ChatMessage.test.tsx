import { describe, expect, it, vi } from "vitest"
import { runMessageAction, type MessageAction } from "../ChatMessage"

describe("runMessageAction", () => {
  it("dispatches ask chips to onAsk with the follow-up prompt", () => {
    const onAsk = vi.fn()
    const onAdd = vi.fn()
    const action: MessageAction = {
      kind: "ask",
      target: "Tell me about WelTel AI",
      label: "💡 Ask about WelTel AI",
      slug: "weltel-ai",
    }
    runMessageAction(action, { onAsk, onAdd })
    expect(onAsk).toHaveBeenCalledWith("Tell me about WelTel AI")
    expect(onAdd).not.toHaveBeenCalled()
  })

  it("dispatches add chips to onAdd with the slug", () => {
    const onAsk = vi.fn()
    const onAdd = vi.fn()
    const action: MessageAction = {
      kind: "add",
      target: "fisoul",
      label: "+ Add Fisoul to tank",
      slug: "fisoul",
    }
    runMessageAction(action, { onAsk, onAdd })
    expect(onAdd).toHaveBeenCalledWith("fisoul")
    expect(onAsk).not.toHaveBeenCalled()
  })

  it("leaves focus and view on their existing handlers", () => {
    const focus = vi.fn()
    const view = vi.fn()
    runMessageAction(
      { kind: "focus", target: "weltel-ai", label: "weltel-ai" },
      { focus, view },
    )
    expect(focus).toHaveBeenCalledWith("weltel-ai")
    runMessageAction(
      { kind: "view", target: "card-ai", label: "card-ai" },
      { focus, view },
    )
    expect(view).toHaveBeenCalledWith("card-ai")
  })
})
