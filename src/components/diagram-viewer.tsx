import { DiagramCanvas } from "@/components/diagram-canvas"
import { ViewerToolbar } from "@/components/viewer-toolbar"
import { useDiagrams } from "@/hooks/use-diagrams"
import { usePanZoom } from "@/hooks/use-pan-zoom"

interface DiagramViewerProps {
  onEdit: () => void
  onExport: () => void
  isExporting: boolean
}

/**
 * Owns the pan/zoom state so the toolbar buttons and the canvas gestures
 * drive the same transform.
 */
export function DiagramViewer({
  onEdit,
  onExport,
  isExporting,
}: DiagramViewerProps) {
  const { activeFile } = useDiagrams()
  const controls = usePanZoom(Boolean(activeFile))

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ViewerToolbar
        controls={controls}
        onEdit={onEdit}
        onExport={onExport}
        isExporting={isExporting}
      />
      <DiagramCanvas controls={controls} />
    </div>
  )
}
