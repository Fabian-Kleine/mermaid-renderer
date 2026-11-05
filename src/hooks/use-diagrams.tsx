import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { DiagramFile, MermaidTheme } from "@/types"

export const ACCEPTED_EXTENSIONS = [".mmd", ".mermaid", ".txt"]

const EXAMPLE_DIAGRAM = `flowchart TD
    A[Upload a .mmd file] --> B{Looks right?}
    B -->|Yes| C[Export as PDF]
    B -->|No| D[Edit source]
    D --> B
    C --> E[Done]`

function uid() {
  return `f${Math.random().toString(36).slice(2, 10)}`
}

function readAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"))
    reader.readAsText(file)
  })
}

interface DiagramsContextValue {
  files: DiagramFile[]
  activeId: string | null
  activeFile: DiagramFile | null
  theme: MermaidTheme
  setTheme: (theme: MermaidTheme) => void
  addDiagram: (name: string, content: string) => void
  addFromFileList: (files: FileList | File[]) => Promise<number>
  removeDiagram: (id: string) => void
  selectDiagram: (id: string) => void
  updateDiagram: (id: string, content: string) => void
  suggestedName: () => string
}

const DiagramsContext = createContext<DiagramsContextValue | null>(null)

export function DiagramsProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<DiagramFile[]>(() => [
    { id: uid(), name: "example.mmd", content: EXAMPLE_DIAGRAM },
  ])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [theme, setTheme] = useState<MermaidTheme>("default")

  // Falling back to the first file keeps a selection after a removal, and
  // leaves the seeded example selected on first load.
  const resolvedActiveId =
    (activeId && files.some((file) => file.id === activeId) ? activeId : null) ??
    files[0]?.id ??
    null

  const addDiagram = useCallback((name: string, content: string) => {
    const file = { id: uid(), name, content }
    setFiles((current) => [...current, file])
    setActiveId(file.id)
  }, [])

  const addFromFileList = useCallback(
    async (incoming: FileList | File[]) => {
      const list = Array.from(incoming)
      if (!list.length) return 0

      const parsed = await Promise.all(
        list.map(async (file) => ({
          id: uid(),
          name: file.name,
          content: await readAsText(file).catch(() => ""),
        })),
      )
      const usable = parsed.filter((file) => file.content.trim().length > 0)
      if (!usable.length) return 0

      setFiles((current) => [...current, ...usable])
      setActiveId(usable[usable.length - 1].id)
      return usable.length
    },
    [],
  )

  const removeDiagram = useCallback((id: string) => {
    setFiles((current) => current.filter((file) => file.id !== id))
  }, [])

  const updateDiagram = useCallback((id: string, content: string) => {
    setFiles((current) =>
      current.map((file) => (file.id === id ? { ...file, content } : file)),
    )
  }, [])

  const suggestedName = useCallback(
    () => `diagram-${files.length + 1}.mmd`,
    [files.length],
  )

  const value = useMemo<DiagramsContextValue>(
    () => ({
      files,
      activeId: resolvedActiveId,
      activeFile: files.find((file) => file.id === resolvedActiveId) ?? null,
      theme,
      setTheme,
      addDiagram,
      addFromFileList,
      removeDiagram,
      selectDiagram: setActiveId,
      updateDiagram,
      suggestedName,
    }),
    [
      addDiagram,
      addFromFileList,
      files,
      removeDiagram,
      resolvedActiveId,
      suggestedName,
      theme,
      updateDiagram,
    ],
  )

  return (
    <DiagramsContext.Provider value={value}>{children}</DiagramsContext.Provider>
  )
}

export function useDiagrams() {
  const context = useContext(DiagramsContext)
  if (!context) {
    throw new Error("useDiagrams must be used inside a DiagramsProvider")
  }
  return context
}
