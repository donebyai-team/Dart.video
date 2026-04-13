import { useState } from "react"

export function ArrayControlButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      style={{
        width: 20,
        height: 20,
        background: hovered ? 'rgba(99, 102, 241, 0.9)' : 'rgba(15, 15, 15, 0.75)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        padding: 0,
      }}
      onClick={e => {
        e.stopPropagation()
        onClick()
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )
}