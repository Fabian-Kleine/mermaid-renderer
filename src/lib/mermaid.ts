import mermaid from "mermaid"

import type { MermaidTheme } from "@/types"

let renderCounter = 0
let configuredTheme: MermaidTheme | null = null

export function configureMermaid(theme: MermaidTheme) {
  if (configuredTheme === theme) return
  configuredTheme = theme
  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: "loose",
  })
}

/**
 * Renders mermaid source to an SVG string. Each call uses a fresh id because
 * mermaid refuses to reuse an id that is still attached to the document.
 */
export async function renderMermaid(
  code: string,
  idPrefix = "mmd-render",
): Promise<string> {
  const id = `${idPrefix}-${renderCounter++}`
  try {
    const { svg } = await mermaid.render(id, code)
    return svg
  } finally {
    // On a parse error mermaid leaves its scratch container (`d` + the render
    // id) attached to <body>; without this, every failed render leaks one.
    document.getElementById(`d${id}`)?.remove()
  }
}

export function describeRenderError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string") return error
  return String(error)
}

/**
 * Mermaid emits `width="100%"` plus a `max-width` style, which gives an
 * absolutely positioned stage no intrinsic size. Pinning the intrinsic
 * dimensions from the viewBox makes pan/zoom math and fit-to-screen exact.
 */
export function normalizeDiagramSvg(
  svg: SVGSVGElement,
  /** Scale currently applied by the stage transform, so a measured fallback
   * can be converted back to intrinsic pixels. */
  appliedScale = 1,
): { width: number; height: number } | null {
  const box = svg.viewBox?.baseVal
  let width = box?.width ?? 0
  let height = box?.height ?? 0

  if (!width || !height) {
    const rect = svg.getBoundingClientRect()
    const scale = appliedScale || 1
    width = rect.width / scale
    height = rect.height / scale
  }

  if (!width || !height) return null

  svg.style.maxWidth = "none"
  svg.style.width = `${width}px`
  svg.style.height = `${height}px`
  svg.setAttribute("width", String(width))
  svg.setAttribute("height", String(height))

  return { width, height }
}
