import { createPortal } from "react-dom"

import type { PrintPage } from "@/types"

/**
 * Rendered outside #root into document.body so the print stylesheet can hide
 * the whole app and show only these pages.
 */
export function PrintArea({ pages }: { pages: PrintPage[] | null }) {
  if (!pages?.length) return null

  return createPortal(
    <div id="print-area">
      {pages.map((page, index) => (
        <div className="print-page" key={`${page.name}-${index}`}>
          <p className="print-title">
            {page.error
              ? `${page.name} could not be rendered: ${page.error}`
              : page.name}
          </p>
          {page.svg ? (
            // Mermaid output is a trusted SVG string produced in this app.
            <div dangerouslySetInnerHTML={{ __html: page.svg }} />
          ) : null}
        </div>
      ))}
    </div>,
    document.body,
  )
}
