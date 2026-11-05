export interface DiagramFile {
  id: string
  name: string
  content: string
}

export const MERMAID_THEMES = [
  { value: "default", label: "Default theme" },
  { value: "neutral", label: "Neutral" },
  { value: "forest", label: "Forest" },
  { value: "dark", label: "Dark" },
  { value: "base", label: "Base" },
] as const

export type MermaidTheme = (typeof MERMAID_THEMES)[number]["value"]

export interface PrintPage {
  name: string
  svg: string | null
  error?: string
}
