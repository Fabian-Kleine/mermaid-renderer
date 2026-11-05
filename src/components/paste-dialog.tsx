import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useDiagrams } from "@/hooks/use-diagrams"

const PLACEHOLDER = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do thing]
    B -->|No| D[Skip]`

interface PasteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PasteDialog({ open, onOpenChange }: PasteDialogProps) {
  const { addDiagram, suggestedName } = useDiagrams()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")

  // Reset to a fresh suggested name each time the dialog opens.
  useEffect(() => {
    if (open) {
      setName(suggestedName())
      setCode("")
    }
  }, [open, suggestedName])

  function submit() {
    const trimmed = code.trim()
    if (!trimmed) return

    let fileName = name.trim() || suggestedName()
    if (!/\.(mmd|mermaid|txt)$/i.test(fileName)) fileName += ".mmd"

    addDiagram(fileName, trimmed)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Paste Mermaid code</DialogTitle>
          <DialogDescription>
            Add a diagram directly without uploading a file.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="paste-name">File name</FieldLabel>
            <Input
              id="paste-name"
              className="font-mono"
              placeholder="diagram.mmd"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="paste-code">Mermaid code</FieldLabel>
            <Textarea
              id="paste-code"
              spellCheck={false}
              className="min-h-45 font-mono text-xs leading-relaxed"
              placeholder={PLACEHOLDER}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!code.trim()}>
            Add diagram
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
