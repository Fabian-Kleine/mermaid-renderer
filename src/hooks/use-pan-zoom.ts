import { useCallback, useEffect, useRef, useState } from "react"

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 6
const MAX_FIT_ZOOM = 3
const FIT_PADDING = 90

/** Movement past this many px turns a tap into a drag. */
const TAP_SLOP = 10
const DOUBLE_TAP_MS = 320
const DOUBLE_TAP_SLOP = 36
const DOUBLE_TAP_ZOOM = 2.5

interface Point {
  x: number
  y: number
}

interface Transform {
  zoom: number
  panX: number
  panY: number
}

const clampZoom = (zoom: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

export interface PanZoomControls {
  /** Attach to the scroll/gesture container. */
  wrapRef: React.RefObject<HTMLDivElement | null>
  /** Attach to the transformed element that holds the diagram. */
  stageRef: React.RefObject<HTMLDivElement | null>
  /** Live zoom, throttled to one update per frame for display purposes. */
  zoom: number
  isPanning: boolean
  zoomBy: (factor: number) => void
  /** Scale the diagram to fit the container, centred. */
  fit: () => void
  reset: () => void
  getZoom: () => number
}

/**
 * Pan and zoom for the diagram stage, driven by Pointer Events so mouse, pen
 * and touch all land in the same code path:
 *
 * - one pointer drag pans
 * - two pointers pinch to zoom around their midpoint, and drag to pan
 * - wheel / trackpad zooms around the cursor
 * - double tap (or double click) toggles between fit and a closer look
 *
 * The transform is written straight to the DOM during a gesture; React state
 * only carries the zoom read-out, so dragging never re-renders the diagram.
 */
export function usePanZoom(enabled: boolean): PanZoomControls {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  const transformRef = useRef<Transform>({ zoom: 1, panX: 0, panY: 0 })
  const fitZoomRef = useRef(1)
  const pointersRef = useRef(new Map<number, Point>())
  const gestureRef = useRef({ moved: false })
  const lastTapRef = useRef<{ at: number; point: Point } | null>(null)
  const frameRef = useRef<number | null>(null)

  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)

  const publishZoom = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      setZoom(transformRef.current.zoom)
    })
  }, [])

  const applyTransform = useCallback(() => {
    const stage = stageRef.current
    if (stage) {
      const { zoom: z, panX, panY } = transformRef.current
      stage.style.transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${z})`
    }
    publishZoom()
  }, [publishZoom])

  const wrapCenter = useCallback((): Point => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }, [])

  /**
   * Zooms so the content under `anchor` (client coordinates) stays put.
   *
   * The stage sits at the container centre, so a client point maps to content
   * offset `(p - centre - pan) / zoom`. Holding that fixed across a zoom
   * change by `k` gives `pan' = (p - centre)(1 - k) + pan * k`.
   */
  const zoomAtPoint = useCallback(
    (anchor: Point, nextZoom: number) => {
      const current = transformRef.current
      const target = clampZoom(nextZoom)
      if (target === current.zoom) return

      const k = target / current.zoom
      const centre = wrapCenter()

      transformRef.current = {
        zoom: target,
        panX: (anchor.x - centre.x) * (1 - k) + current.panX * k,
        panY: (anchor.y - centre.y) * (1 - k) + current.panY * k,
      }
      applyTransform()
    },
    [applyTransform, wrapCenter],
  )

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const current = transformRef.current
      transformRef.current = {
        ...current,
        panX: current.panX + dx,
        panY: current.panY + dy,
      }
      applyTransform()
    },
    [applyTransform],
  )

  const zoomBy = useCallback(
    (factor: number) => {
      zoomAtPoint(wrapCenter(), transformRef.current.zoom * factor)
    },
    [wrapCenter, zoomAtPoint],
  )

  const reset = useCallback(() => {
    transformRef.current = { zoom: 1, panX: 0, panY: 0 }
    fitZoomRef.current = 1
    applyTransform()
  }, [applyTransform])

  const fit = useCallback(() => {
    const stage = stageRef.current
    const wrap = wrapRef.current
    if (!stage || !wrap) return

    const svg = stage.querySelector("svg")
    if (!svg) return

    const box = svg.viewBox?.baseVal
    let width = box?.width ?? 0
    let height = box?.height ?? 0

    if (!width || !height) {
      const rect = svg.getBoundingClientRect()
      const scale = transformRef.current.zoom || 1
      width = rect.width / scale
      height = rect.height / scale
    }
    if (!width || !height) return

    const wrapRect = wrap.getBoundingClientRect()
    const scale = Math.min(
      (wrapRect.width - FIT_PADDING) / width,
      (wrapRect.height - FIT_PADDING) / height,
      MAX_FIT_ZOOM,
    )

    const next = clampZoom(scale > 0 ? scale : 1)
    fitZoomRef.current = next
    transformRef.current = { zoom: next, panX: 0, panY: 0 }
    applyTransform()
  }, [applyTransform])

  /**
   * Double tap / double click: step in for a closer look, or back to fit if we
   * are already zoomed in past it.
   */
  const toggleZoomAt = useCallback(
    (anchor: Point) => {
      const fitZoom = fitZoomRef.current || 1
      if (transformRef.current.zoom > fitZoom * 1.2) {
        fit()
        return
      }
      zoomAtPoint(anchor, Math.max(fitZoom, 1) * DOUBLE_TAP_ZOOM)
    },
    [fit, zoomAtPoint],
  )

  // Wheel and trackpad zoom. Registered manually because React's onWheel is
  // passive, and a passive listener cannot preventDefault the page scroll.
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || !enabled) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      // A trackpad pinch arrives as ctrl+wheel with small deltas.
      const intensity = event.ctrlKey ? 0.01 : 0.0016
      const factor = Math.exp(-event.deltaY * intensity)
      zoomAtPoint(
        { x: event.clientX, y: event.clientY },
        transformRef.current.zoom * factor,
      )
    }

    // Safari fires its own pinch gesture events on top of pointer events,
    // which would zoom the whole page instead of the diagram.
    const blockSafariGesture = (event: Event) => event.preventDefault()

    wrap.addEventListener("wheel", onWheel, { passive: false })
    wrap.addEventListener("gesturestart", blockSafariGesture)
    wrap.addEventListener("gesturechange", blockSafariGesture)

    return () => {
      wrap.removeEventListener("wheel", onWheel)
      wrap.removeEventListener("gesturestart", blockSafariGesture)
      wrap.removeEventListener("gesturechange", blockSafariGesture)
    }
  }, [enabled, zoomAtPoint])

  // Pointer gestures: drag to pan, pinch to zoom, double tap to toggle.
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || !enabled) {
      pointersRef.current.clear()
      return
    }

    const pointers = pointersRef.current

    const onPointerDown = (event: PointerEvent) => {
      // Let the UI layered over the canvas (toolbar, panels) keep its clicks.
      if ((event.target as Element | null)?.closest("[data-canvas-overlay]")) {
        return
      }
      if (event.pointerType === "mouse" && event.button !== 0) return

      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      try {
        wrap.setPointerCapture(event.pointerId)
      } catch {
        // Capture is best effort; the window listeners below still fire.
      }

      if (pointers.size === 1) {
        gestureRef.current.moved = false
        setIsPanning(true)
      } else {
        // A second finger cancels the pending tap so a pinch never
        // registers as a double tap.
        lastTapRef.current = null
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId)
      if (!previous) return

      const next = { x: event.clientX, y: event.clientY }

      if (pointers.size === 1) {
        const dx = next.x - previous.x
        const dy = next.y - previous.y
        if (Math.hypot(dx, dy) > TAP_SLOP) gestureRef.current.moved = true
        panBy(dx, dy)
      } else {
        // Pinch: use this pointer plus the other active one, comparing the
        // pair before and after this move.
        const otherId = [...pointers.keys()].find((id) => id !== event.pointerId)
        const other = otherId === undefined ? undefined : pointers.get(otherId)

        if (other) {
          const previousSpan = distance(previous, other)
          const nextSpan = distance(next, other)
          const previousMid = midpoint(previous, other)
          const nextMid = midpoint(next, other)

          if (previousSpan > 0 && nextSpan > 0) {
            zoomAtPoint(
              previousMid,
              transformRef.current.zoom * (nextSpan / previousSpan),
            )
          }
          panBy(nextMid.x - previousMid.x, nextMid.y - previousMid.y)
          gestureRef.current.moved = true
        }
      }

      pointers.set(event.pointerId, next)
    }

    const endPointer = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return
      try {
        wrap.releasePointerCapture(event.pointerId)
      } catch {
        // Already released.
      }

      if (pointers.size === 0) {
        setIsPanning(false)

        if (!gestureRef.current.moved) {
          const point = { x: event.clientX, y: event.clientY }
          const previousTap = lastTapRef.current
          const now = event.timeStamp || Date.now()

          if (
            previousTap &&
            now - previousTap.at < DOUBLE_TAP_MS &&
            distance(previousTap.point, point) < DOUBLE_TAP_SLOP
          ) {
            lastTapRef.current = null
            toggleZoomAt(point)
          } else {
            lastTapRef.current = { at: now, point }
          }
        }
      }
    }

    const onPointerCancel = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      if (pointers.size === 0) setIsPanning(false)
    }

    wrap.addEventListener("pointerdown", onPointerDown)
    // Move/up go on the window so a gesture that leaves the canvas still ends.
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", endPointer)
    window.addEventListener("pointercancel", onPointerCancel)

    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", endPointer)
      window.removeEventListener("pointercancel", onPointerCancel)
      pointers.clear()
      setIsPanning(false)
    }
  }, [enabled, panBy, toggleZoomAt, zoomAtPoint])

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        // Must be cleared, or publishZoom sees a stale handle and never
        // schedules again after a remount.
        frameRef.current = null
      }
    },
    [],
  )

  const getZoom = useCallback(() => transformRef.current.zoom, [])

  return {
    wrapRef,
    stageRef,
    zoom,
    isPanning,
    zoomBy,
    fit,
    reset,
    getZoom,
  }
}
