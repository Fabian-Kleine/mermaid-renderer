import { useRef, useState } from "react"
import { FileDownIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ACCEPTED_EXTENSIONS, useDiagrams } from "@/hooks/use-diagrams"
import { cn } from "@/lib/utils"

function Wave() {
  return (
    <svg
      viewBox="0 0 280 10"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="mt-3.5 mb-1 block h-2.5 w-full"
    >
      <path
        d="M0,5 C20,0 40,10 60,5 C80,0 100,10 120,5 C140,0 160,10 180,5 C200,0 220,10 240,5 C260,0 270,10 280,5"
        fill="none"
        stroke="var(--sidebar-primary)"
        strokeWidth={1.4}
        opacity={0.6}
      />
    </svg>
  )
}

interface AppSidebarProps {
  onPaste: () => void
  onExportAll: () => void
  isExporting: boolean
}

export function AppSidebar({
  onPaste,
  onExportAll,
  isExporting,
}: AppSidebarProps) {
  const {
    files,
    activeId,
    addFromFileList,
    removeDiagram,
    selectDiagram,
  } = useDiagrams()
  const { isMobile, setOpenMobile } = useSidebar()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  async function ingest(incoming: FileList | File[]) {
    const added = await addFromFileList(incoming)
    if (added === 0) {
      toast.error("Nothing to add", {
        description: "Those files were empty or could not be read.",
      })
    } else if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="gap-0 px-4.5 pt-5 pb-3">
        <h1 className="text-[17px] leading-tight font-semibold tracking-tight">
          Mermaid Renderer
        </h1>
        <p className="text-sidebar-foreground/55 mt-1.5 text-xs leading-relaxed">
          Upload .mmd files, view them, and export clean PDFs.
        </p>
        <Wave />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <div
              onDragEnter={(event) => {
                event.preventDefault()
                setIsDragOver(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                setIsDragOver(false)
              }}
              onDrop={(event) => {
                event.preventDefault()
                setIsDragOver(false)
                if (event.dataTransfer.files?.length) {
                  void ingest(event.dataTransfer.files)
                }
              }}
              className={cn(
                "rounded-lg border border-dashed px-3 py-4 text-center transition-colors",
                isDragOver
                  ? "border-sidebar-primary bg-sidebar-primary/10"
                  : "border-sidebar-border",
              )}
            >
              <p className="text-sidebar-foreground/55 mb-2 text-xs">
                Drag files here, or
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent"
                  onClick={() => inputRef.current?.click()}
                >
                  Browse files
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent"
                  onClick={onPaste}
                >
                  Paste code
                </Button>
              </div>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) {
                    void ingest(event.target.files)
                  }
                  event.target.value = ""
                }}
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {files.length > 0 ? (
            <SidebarGroupLabel>
              {files.length} diagram{files.length > 1 ? "s" : ""}
            </SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            {files.length === 0 ? (
              <p className="text-sidebar-foreground/55 px-2 py-3 text-xs leading-relaxed">
                No diagrams yet. Upload a .mmd file or paste some Mermaid code
                to get started.
              </p>
            ) : (
              <SidebarMenu>
                {files.map((file) => (
                  <SidebarMenuItem key={file.id}>
                    <SidebarMenuButton
                      isActive={file.id === activeId}
                      onClick={() => {
                        selectDiagram(file.id)
                        if (isMobile) setOpenMobile(false)
                      }}
                      className="data-[active=true]:bg-sidebar-primary/15 data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-[inset_2px_0_0_var(--sidebar-primary)]"
                    >
                      <span className="truncate font-mono text-xs">
                        {file.name}
                      </span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      aria-label={`Remove ${file.name}`}
                      title="Remove"
                      className="hover:text-destructive focus-visible:text-destructive"
                      onClick={() => removeDiagram(file.id)}
                    >
                      <XIcon />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t p-4">
        <Button
          className="w-full"
          disabled={files.length === 0 || isExporting}
          onClick={onExportAll}
        >
          <FileDownIcon data-icon="inline-start" />
          {isExporting ? "Preparing…" : "Export all as PDF"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
