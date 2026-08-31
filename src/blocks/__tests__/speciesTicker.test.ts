import { describe, expect, it } from "vitest"

import { speciesTicker } from "../fishTankTokens"
import latte from "../../themes/latte.theme.json"

describe("speciesTicker", () => {
  it("does not render devops as DEV (reads as a build badge)", () => {
    expect(speciesTicker("devops")).toBe("OPS")
    expect(speciesTicker("devops")).not.toBe("DEV")
  })

  it("covers the four WelTel domains", () => {
    expect(speciesTicker("ai")).toBe("AI")
    expect(speciesTicker("mobile")).toBe("APP")
    expect(speciesTicker("platform")).toBe("PLT")
  })
})

describe("light theme hairline", () => {
  it("latte hairline is darker than the card so borders stay visible", () => {
    const cardL = Number(latte.vars.card.match(/oklch\(([0-9.]+)/)?.[1])
    const lineL = Number(latte.vars.hairline.match(/oklch\(([0-9.]+)/)?.[1])
    expect(lineL).toBeLessThan(cardL)
  })
})
