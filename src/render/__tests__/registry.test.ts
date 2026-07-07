import { describe, it, expect } from "vitest";
import { LayoutSchema } from "@/content/schema";
import { REGISTRY } from "../registry";

describe("registry", () => {
  it("registry covers every schema block type", () => {
    const list = LayoutSchema.shape.blocks.element.options.map(
      (o) => o.shape.type.value
    );
    expect(new Set(list)).toEqual(new Set(Object.keys(REGISTRY)));
  });

  it("every registry value is a function/component", () => {
    Object.values(REGISTRY).forEach((v) => {
      expect(typeof v).toBe("function");
    });
  });
});
