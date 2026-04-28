import { useRef } from 'react'
import { useArrayPatch } from '../../patches'

interface ArrayItemProps {
  index: number
  source: string
  min?: number
  max?: number
  removeControl?: ControlPosition
  addControl?: ControlPosition
  style?: React.CSSProperties
  children: React.ReactNode
}

export type ControlPosition =
  | 'corner-top-left'
  | 'corner-top-right'
  | 'corner-bottom-left'
  | 'corner-bottom-right'
  | 'mid-top'
  | 'mid-right'
  | 'mid-bottom'
  | 'mid-left'

export function ArrayItem({
  index,
  source,
  removeControl = 'corner-top-right',
  addControl = 'mid-right',
  style,
  min = 1,
  max,
  children,
}: ArrayItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const array = useArrayPatch(source)

  // write directly on render, not in useEffect
  if (ref.current) {
    ; (ref.current as any).__arrayMeta = {
      index,
      source,
      removeControl,
      addControl,
      array,
      min, 
      max,
    }
  }

  return (
    <div
      ref={ref}
      data-array-index={String(index)}
      data-array-source={source}
      style={style}
    >
      {children}
    </div>
  )
}
