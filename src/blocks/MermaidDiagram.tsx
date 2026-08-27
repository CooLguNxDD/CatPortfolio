import { useEffect, useState, useId } from "react";
import mermaid from "mermaid";
import { usePreferencesStore } from "@/store";
import { themeRegistry } from "@/themes/registry";

let mermaidInitialized = false;
let mermaidTheme: string | null = null;

/**
 * Renders Mermaid `source` (agent- or backend-authored, not just the baked
 * snapshot) to SVG via `mermaid.render` under `securityLevel: "strict"`.
 * Shows the raw source as a pulsing placeholder while rendering and as a
 * plain fallback on render error.
 */
export default function MermaidDiagram({ source }: { source: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const rawId = useId();
  // Sanitizing the ID to be a valid HTML ID without colons
  const elementId = `mmd-${rawId.replace(/:/g, "-")}`;
  const themeId = usePreferencesStore((s) => s.theme);
  const mermaidThemeName = themeRegistry[themeId]?.isLight ? "neutral" : "dark";

  useEffect(() => {
    let active = true;

    async function drawDiagram() {
      try {
        if (!mermaidInitialized || mermaidTheme !== mermaidThemeName) {
          mermaid.initialize({
            startOnLoad: false,
            theme: mermaidThemeName,
            securityLevel: "strict",
          });
          mermaidInitialized = true;
          mermaidTheme = mermaidThemeName;
        }

        const { svg: renderedSvg } = await mermaid.render(elementId, source);
        if (active) {
          setSvg(renderedSvg);
          setError(false);
        }
      } catch (err) {
        console.error("Mermaid render error:", err);
        if (active) {
          setError(true);
        }
      }
    }

    drawDiagram();

    return () => {
      active = false;
    };
  }, [elementId, source, mermaidThemeName]);

  if (error) {
    return (
      <pre className="w-full overflow-x-auto p-4 font-mono text-xs text-(--fg-muted) bg-(--bg-sunken) border border-(--hairline) rounded-lg">
        {source}
      </pre>
    );
  }

  if (svg === null) {
    return (
      <pre className="w-full overflow-x-auto p-4 font-mono text-xs text-(--fg-muted) bg-(--bg-sunken) border border-(--hairline) rounded-lg animate-pulse">
        {source}
      </pre>
    );
  }

  return (
    <div
      className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
