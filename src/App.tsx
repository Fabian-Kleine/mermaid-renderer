import { useState, type CSSProperties } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { DiagramViewer } from "@/components/diagram-viewer"
import { EditSourceSheet } from "@/components/edit-source-sheet"
import { PasteDialog } from "@/components/paste-dialog"
import { PrintArea } from "@/components/print-area"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DiagramsProvider, useDiagrams } from "@/hooks/use-diagrams"
import { usePdfExport } from "@/hooks/use-pdf-export"

function Workspace() {
  const { files, activeFile } = useDiagrams()
  const { pages, isExporting, exportDiagrams } = usePdfExport()
  const [pasteOpen, setPasteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "17.5rem" } as CSSProperties}
    >
      <AppSidebar
        onPaste={() => setPasteOpen(true)}
        onExportAll={() => void exportDiagrams(files)}
        isExporting={isExporting}
      />

      <SidebarInset className="flex h-svh min-w-0 flex-col overflow-hidden">
        <DiagramViewer
          onEdit={() => setEditOpen(true)}
          onExport={() => activeFile && void exportDiagrams([activeFile])}
          isExporting={isExporting}
        />
      </SidebarInset>

      <PasteDialog open={pasteOpen} onOpenChange={setPasteOpen} />
      <EditSourceSheet open={editOpen} onOpenChange={setEditOpen} />
      <PrintArea pages={pages} />
    </SidebarProvider>
  )
}

export default function App() {
  return (
    <TooltipProvider>
      <DiagramsProvider>
        <Workspace />
        <Toaster />
      </DiagramsProvider>
    </TooltipProvider>
  )
}
