import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useDiagrams } from "@/hooks/use-diagrams"

interface EditSourceSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSourceSheet({ open, onOpenChange }: EditSourceSheetProps) {
  const { activeFile, updateDiagram } = useDiagrams()
  const [draft, setDraft] = useState("")

  // Load the active source whenever the panel opens or the file changes.
  useEffect(() => {
    if (open && activeFile) setDraft(activeFile.content)
  }, [open, activeFile])

  function apply() {
    if (!activeFile) return
    updateDiagram(activeFile.id, draft)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md [&>button]:top-4"
      >
        <SheetHeader className="border-b">
          <SheetTitle className="text-sm">Edit source</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {activeFile?.name ?? "No diagram selected"}
          </SheetDescription>
        </SheetHeader>

        <Textarea
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-4 py-3.5 font-mono text-xs leading-relaxed shadow-none focus-visible:ring-0"
        />

        <SheetFooter className="flex-row border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={apply} disabled={!activeFile}>
            Apply and re-render
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
