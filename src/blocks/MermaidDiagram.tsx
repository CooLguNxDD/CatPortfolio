import { useEffect, useState, useId } from "react";
import mermaid from "mermaid";

let mermaidInitialized = false;

export default function MermaidDiagram({ source }: { source: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const rawId = useId();
  // Sanitizing the ID to be a valid HTML ID without colons
  const elementId = `mmd-${rawId.replace(/:/g, "-")}`;

  useEffect(() => {
    let active = true;

    async function drawDiagram() {
      try {
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            securityLevel: "strict",
          });
          mermaidInitialized = true;
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
  }, [elementId, source]);

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
