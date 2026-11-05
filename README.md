# Mermaid Renderer

Upload `.mmd` files, view them on a pannable/zoomable canvas, and export clean PDFs.

A Vite + React + TypeScript + shadcn/ui rebuild of a single-file HTML prototype,
with full touch support for panning and zooming added.

## Running it

This project uses [pnpm](https://pnpm.io). The exact version is pinned in
`package.json` (`packageManager`), so with Corepack enabled the right one is
picked up automatically.

```bash
pnpm install
```

```bash
pnpm dev
```

Other scripts: `pnpm build` (typecheck + production build), `pnpm preview`,
`pnpm lint`. To add shadcn/ui components, use `pnpm dlx shadcn@latest add <name>`.

pnpm refuses to install any package version published less than a day ago
(its `minimumReleaseAge` default), which guards against compromised releases.
So a freshly published version will not resolve until it is a day old. If
`pnpm install` reports `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`, wait it out
rather than adding an exemption.

## What it does

- **Load diagrams** by dragging files onto the sidebar, browsing for them
  (`.mmd`, `.mermaid`, `.txt`), or pasting Mermaid source into a dialog.
- **Render** with Mermaid, switching between the `default`, `neutral`, `forest`,
  `dark` and `base` themes. Parse errors surface in a scrollable alert instead
  of a blank canvas.
- **Edit source** in a side panel and re-render in place.
- **Export PDF** for the current diagram or all of them, via the browser's print
  pipeline (one diagram per page). Choose "Save as PDF" in the print dialog.

## Pan and zoom

Mouse, pen and touch all run through the same Pointer Event handlers in
[`src/hooks/use-pan-zoom.ts`](src/hooks/use-pan-zoom.ts):

| Gesture                       | Result                                   |
| ----------------------------- | ---------------------------------------- |
| Drag (one pointer or finger)  | Pan                                      |
| Two-finger pinch              | Zoom around the midpoint of the fingers  |
| Two-finger drag               | Pan                                      |
| Wheel / trackpad scroll       | Zoom around the cursor                   |
| Ctrl + wheel (trackpad pinch) | Zoom around the cursor                   |
| Double tap / double click     | Toggle between fit-to-screen and 2.5×    |
| Toolbar `−` / `+` / fit       | Zoom around the canvas centre, or refit  |

Zoom is clamped to 10%–600%, and fit-to-screen never scales past 3×.

Notes on the implementation:

- Zoom is **anchor-preserving**: the content under the cursor or the pinch
  midpoint stays put. The stage is centred in its container, so a client point
  maps to the content offset `(p − centre − pan) / zoom`; holding that fixed
  across a zoom change by `k` gives `pan' = (p − centre)(1 − k) + pan · k`.
- During a gesture the transform is written straight to the DOM and the zoom
  read-out is published once per animation frame, so dragging never re-renders
  the diagram SVG.
- The canvas sets `touch-action: none` and the page sets `user-scalable=no`, so
  the browser does not steal the pinch gesture; Safari's own `gesturestart` /
  `gesturechange` events are suppressed for the same reason.
- Mermaid emits `width="100%"` with a `max-width` style, which leaves an
  absolutely positioned stage with no intrinsic size. The rendered SVG's
  dimensions are pinned from its `viewBox` so fit-to-screen is exact.

## Layout

```
src/
  App.tsx                     shell: providers, sidebar, viewer, dialogs
  types.ts                    DiagramFile, MermaidTheme, PrintPage
  components/
    app-sidebar.tsx           upload zone, file list, export all
    diagram-viewer.tsx        owns pan/zoom, composes toolbar + canvas
    viewer-toolbar.tsx        file name, theme, zoom controls, actions
    diagram-canvas.tsx        renders the SVG, empty/error states, touch hint
    edit-source-sheet.tsx     side panel source editor
    paste-dialog.tsx          add a diagram from pasted code
    print-area.tsx            print-only pages, portalled to <body>
    ui/                       shadcn/ui components
  hooks/
    use-pan-zoom.ts           pointer gestures, wheel, anchored zoom, fit
    use-diagrams.tsx          diagram list, selection, theme (context)
    use-pdf-export.ts         render to SVG, mount print pages, window.print()
  lib/
    mermaid.ts                mermaid init, render, SVG normalisation
```

On screens under 768px the sidebar becomes an off-canvas sheet, the toolbar
drops its button labels, and a one-time hint names the available gestures.
