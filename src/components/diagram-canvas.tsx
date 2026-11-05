import { useEffect, useLayoutEffect, useState } from "react"
import { ActivityIcon, HandIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useDiagrams } from "@/hooks/use-diagrams"
import type { PanZoomControls } from "@/hooks/use-pan-zoom"
import {
  configureMermaid,
  describeRenderError,
  normalizeDiagramSvg,
  renderMermaid,
} from "@/lib/mermaid"
import { cn } from "@/lib/utils"

const GESTURE_HINT_KEY = "mermaid-renderer:gesture-hint-dismissed"

function GestureHint() {
  // Only worth showing where the gestures are not obvious: touch input.
  const [visible, setVisible] = useState(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return false
    try {
      return localStorage.getItem(GESTURE_HINT_KEY) !== "1"
    } catch {
      // Storage can be unavailable (private mode); showing the hint is fine.
      return true
    }
  })

  useEffect(() => {
    if (!visible) return

    const timer = window.setTimeout(() => {
      setVisible(false)
      try {
        localStorage.setItem(GESTURE_HINT_KEY, "1")
      } catch {
        // Ignore: the hint simply shows again next time.
      }
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [visible])

  if (!visible) return null

  return (
    <div
      data-canvas-overlay
      className="bg-foreground/85 text-background pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-3.5 py-2 text-xs shadow-lg"
    >
      <HandIcon className="size-3.5" />
      Drag to pan, pinch to zoom, double tap to fit
    </div>
  )
}

export function DiagramCanvas({ controls }: { controls: PanZoomControls }) {
  const { activeFile, theme } = useDiagrams()
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const source = activeFile?.content ?? null

  useEffect(() => {
    if (source === null) {
      setSvg(null)
      setError(null)
      return
    }

    let cancelled = false
    configureMermaid(theme)

    renderMermaid(source)
      .then((result) => {
        if (cancelled) return
        setSvg(result)
        setError(null)
      })
      .catch((renderError: unknown) => {
        if (cancelled) return
        setSvg(null)
        setError(describeRenderError(renderError))
      })

    return () => {
      cancelled = true
    }
  }, [source, theme])

  const { stageRef, wrapRef, fit, reset, getZoom } = controls

  // Pin the SVG's intrinsic size, then frame it, every time it changes.
  // Deps are the stable refs and callbacks only, so panning never refits.
  useLayoutEffect(() => {
    if (!svg) {
      reset()
      return
    }
    const element = stageRef.current?.querySelector("svg")
    if (element) normalizeDiagramSvg(element, getZoom())
    fit()
  }, [fit, getZoom, reset, stageRef, svg])

  const showEmptyState = !activeFile

  return (
    <div
      ref={wrapRef}
      className="canvas-dots relative flex-1 touch-none overflow-hidden"
    >
      {/* The transform is owned by usePanZoom and written straight to the DOM,
          so it is deliberately not a React-managed style. */}
      <div
        ref={stageRef}
        aria-hidden={!svg}
        className={cn(
          "diagram-stage absolute top-1/2 left-1/2 origin-center",
          svg && (controls.isPanning ? "cursor-grabbing" : "cursor-grab"),
        )}
        // Mermaid output is an SVG string this app generated itself.
        dangerouslySetInnerHTML={{ __html: svg ?? "" }}
      />

      {showEmptyState ? (
        <Empty className="absolute inset-0" data-canvas-overlay>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ActivityIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing to show yet</EmptyTitle>
            <EmptyDescription>
              Drop a Mermaid file onto the sidebar, or paste diagram code, and
              it will render here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {error ? (
        <Alert
          variant="destructive"
          data-canvas-overlay
          className="bg-card absolute bottom-4 left-1/2 w-auto max-w-[min(42rem,88%)] -translate-x-1/2 shadow-lg"
        >
          <AlertTitle>Could not render this diagram</AlertTitle>
          <AlertDescription>
            {/* Mermaid parse errors can run to dozens of lines, so the body
                scrolls rather than growing past the canvas. */}
            <pre className="max-h-50 w-full overflow-auto font-mono text-xs whitespace-pre-wrap">
              {error}
            </pre>
          </AlertDescription>
        </Alert>
      ) : null}

      {svg ? <GestureHint /> : null}
    </div>
  )
}
