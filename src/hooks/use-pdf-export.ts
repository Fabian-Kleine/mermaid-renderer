import { useCallback, useEffect, useRef, useState } from "react"

import { describeRenderError, renderMermaid } from "@/lib/mermaid"
import type { DiagramFile, PrintPage } from "@/types"

/**
 * Exports diagrams as PDF through the browser's own print pipeline: render
 * every diagram to a standalone SVG, drop them into a print-only container,
 * then open the print dialog (where "Save as PDF" lives).
 */
export function usePdfExport() {
  const [pages, setPages] = useState<PrintPage[] | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const printPendingRef = useRef(false)

  const exportDiagrams = useCallback(async (files: DiagramFile[]) => {
    if (!files.length) return
    setIsExporting(true)

    const built: PrintPage[] = []
    // Sequential: mermaid keeps global render state, so parallel calls clash.
    for (const file of files) {
      try {
        const svg = await renderMermaid(file.content, "mmd-print")
        built.push({ name: file.name, svg })
      } catch (error) {
        built.push({
          name: file.name,
          svg: null,
          error: describeRenderError(error),
        })
      }
    }

    printPendingRef.current = true
    setPages(built)
  }, [])

  // Wait for the print container to be painted before opening the dialog,
  // otherwise some browsers capture an empty page.
  useEffect(() => {
    if (!printPendingRef.current || !pages) return
    printPendingRef.current = false

    const frames: number[] = []
    frames.push(
      requestAnimationFrame(() => {
        frames.push(
          requestAnimationFrame(() => {
            window.print()
            setIsExporting(false)
          }),
        )
      }),
    )

    return () => frames.forEach(cancelAnimationFrame)
  }, [pages])

  useEffect(() => {
    const onAfterPrint = () => {
      setPages(null)
      setIsExporting(false)
    }
    window.addEventListener("afterprint", onAfterPrint)
    return () => window.removeEventListener("afterprint", onAfterPrint)
  }, [])

  return { pages, isExporting, exportDiagrams }
}
