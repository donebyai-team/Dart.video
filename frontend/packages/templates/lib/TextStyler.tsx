import React from "react"
import { createPortal } from "react-dom"
import { FONT_FAMILIES, FONT_SIZE_PRESETS } from "./constants"
import { EditableTextStyle, FontSizePreset, getPresetFromFontSize } from "./types"

interface TextStylerProps {
  rect: DOMRect
  value: EditableTextStyle
  onChange: (styles: Partial<EditableTextStyle>) => void
  toolbarRef: React.RefObject<HTMLDivElement>
}

export const TextStyler: React.FC<TextStylerProps> = ({
  rect,
  value,
  onChange,
  toolbarRef
}) => {
  const set = <K extends keyof EditableTextStyle>(
    key: K,
    value: EditableTextStyle[K]
  ) => {
    onChange({ [key]: value })
  }

  const fontSize = value.fontSize ?? 48
  const fontFamily = value.fontFamily ?? "Inter"
  const color = value.color ?? "#000000"

  // ---- Toolbar positioning (centered above text) ----
  const toolbarWidth = 340

  const top = rect.top - 12
  const left = rect.left + rect.width / 2 - toolbarWidth / 2

  return createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        top,
        left,
        transform: "translateY(-100%)",
        zIndex: 10000,
        width: toolbarWidth,
        height: 44,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        background: "rgba(30,30,30,0.92)",
        backdropFilter: "blur(12px)",
        borderRadius: 10,
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
      }}
    >

      {/* FONT DROPDOWN */}
      <select
        value={fontFamily}
        onChange={e =>
          set("fontFamily", e.target.value as EditableTextStyle["fontFamily"])
        }
        style={dropdownStyle}
      >
        {FONT_FAMILIES.map(f => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      {/* SIZE DROPDOWN */}
      <select
        value={getPresetFromFontSize(fontSize)}
        onChange={e =>
          set(
            "fontSize",
            FONT_SIZE_PRESETS[e.target.value as FontSizePreset]
          )
        }
        style={dropdownStyle}
      >
        {Object.keys(FONT_SIZE_PRESETS).map(size => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>

      {/* COLOR PICKER */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="color"
          value={color}
          onChange={e =>
            set("color", e.target.value as EditableTextStyle["color"])
          }
          style={{
            width: 32,
            height: 32,
            border: "none",
            background: "transparent",
            cursor: "pointer"
          }}
        />
      </div>

    </div>,
    document.body
  )
}

const dropdownStyle: React.CSSProperties = {
  height: 30,
  borderRadius: 6,
  border: "none",
  padding: "0 8px",
  fontSize: 13,
  background: "rgba(255,255,255,0.12)",
  color: "white",
  outline: "none",
  cursor: "pointer"
}

export default TextStyler
