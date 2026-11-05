import {
  FileDownIcon,
  MaximizeIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDiagrams } from "@/hooks/use-diagrams"
import { useIsMobile } from "@/hooks/use-mobile"
import type { PanZoomControls } from "@/hooks/use-pan-zoom"
import { MERMAID_THEMES, type MermaidTheme } from "@/types"

const ZOOM_STEP = 1.2

interface ViewerToolbarProps {
  controls: PanZoomControls
  onEdit: () => void
  onExport: () => void
  isExporting: boolean
}

export function ViewerToolbar({
  controls,
  onEdit,
  onExport,
  isExporting,
}: ViewerToolbarProps) {
  const { activeFile, theme, setTheme } = useDiagrams()
  const isMobile = useIsMobile()
  const hasDiagram = Boolean(activeFile)

  // Narrow screens drop the button labels so every control stays on one row.
  const actionSize = isMobile ? "icon-sm" : "sm"

  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-b px-3 py-2.5 sm:gap-x-3 sm:px-5">
      {/* basis-full keeps the file name readable on phones: it takes its own
          row rather than being squeezed to nothing by the controls. */}
      <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto">
        <SidebarTrigger className="md:hidden" />
        <span className="truncate font-mono text-[13px]">
          {activeFile?.name ?? "No diagram selected"}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <Select
          value={theme}
          onValueChange={(value) => setTheme(value as MermaidTheme)}
        >
          <SelectTrigger size="sm" className="w-28 sm:w-35" aria-label="Diagram theme">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {MERMAID_THEMES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-0.5 rounded-md border p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom out"
                disabled={!hasDiagram}
                onClick={() => controls.zoomBy(1 / ZOOM_STEP)}
              >
                <MinusIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>

          <span className="text-muted-foreground w-10 text-center font-mono text-[11px] tabular-nums">
            {Math.round(controls.zoom * 100)}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom in"
                disabled={!hasDiagram}
                onClick={() => controls.zoomBy(ZOOM_STEP)}
              >
                <PlusIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-0.5 !h-5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Fit to screen"
                disabled={!hasDiagram}
                onClick={controls.fit}
              >
                <MaximizeIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit to screen</TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={actionSize}
              aria-label="Edit source"
              disabled={!hasDiagram}
              onClick={onEdit}
            >
              <PencilIcon data-icon={isMobile ? undefined : "inline-start"} />
              {isMobile ? null : "Edit source"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit source</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={actionSize}
              aria-label="Export PDF"
              disabled={!hasDiagram || isExporting}
              onClick={onExport}
            >
              <FileDownIcon data-icon={isMobile ? undefined : "inline-start"} />
              {isMobile ? null : isExporting ? "Preparing…" : "Export PDF"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isExporting ? "Preparing…" : "Export PDF"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
