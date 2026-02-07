import React, { useState } from "react"
import { createPortal } from "react-dom"
import { FONT_FAMILIES, FONT_SIZE_PRESETS } from "./constants"
import { EditableTextStyle, FontSizePreset, getPresetFromFontSize } from "./types"

interface TextStylerProps {
  rect: DOMRect
  value: EditableTextStyle
  onChange: (styles: Partial<EditableTextStyle>) => void
  toolbarRef: React.RefObject<HTMLDivElement>
}

const COLORS = ["#000000", "#FFFFFF", "#FFD700", "#FF6B6B", "#4D96FF", "#6BCB77", "#9333EA"]

export const TextStyler: React.FC<TextStylerProps> = ({
  rect,
  value,
  onChange,
  toolbarRef
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false)

  const set = <K extends keyof EditableTextStyle>(key: K, val: EditableTextStyle[K]) => {
    onChange({ [key]: val })
  }

  const fontSize = value.fontSize ?? 48
  const fontFamily = value.fontFamily ?? "Inter"
  const color = value.color ?? "#000000"
  const textAlign = value.textAlign ?? "left"

  // Positioning logic
  const toolbarWidth = 420
  const top = rect.top - 16
  const left = rect.left + rect.width / 2 - toolbarWidth / 2

  // Cycle alignment: left -> center -> right -> left
  const toggleAlignment = () => {
    const alignments: Array<EditableTextStyle['textAlign']> = ["left", "center", "right"]
    const currentIndex = alignments.indexOf(textAlign)
    const nextIndex = (currentIndex + 1) % alignments.length
    set("textAlign", alignments[nextIndex])
  }

  const getAlignmentIcon = () => {
    if (textAlign === "center") return "≡"
    if (textAlign === "right") return "⌸"
    return "≣"
  }

  return createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        top,
        left: Math.max(20, left),
        transform: "translateY(-100%)",
        zIndex: 100000,
        width: toolbarWidth,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {showColorPicker && (
        <div style={colorPanelStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => set("color", c)}
                style={{
                  ...swatchStyle,
                  background: c,
                  border: color === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)'
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div style={mainToolbarStyle}>
        {/* 1. TRUNCATED FONT SELECT */}
        <div style={{ width: 70, overflow: 'hidden' }}>
          <select
            value={fontFamily}
            onChange={e => set("fontFamily", e.target.value as any)}
            style={truncatedDropdownStyle}
          >
            {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div style={dividerStyle} />

        <button style={iconButtonStyle}><b>B</b></button>
        
        {/* 2. TEXT ALIGNMENT OPTION */}
        <button 
          style={{...iconButtonStyle, fontSize: 18, width: 30}} 
          onClick={toggleAlignment}
          title={`Align: ${textAlign}`}
        >
          {getAlignmentIcon()}
        </button>
        
        <div style={dividerStyle} />

        <select
          value={getPresetFromFontSize(fontSize)}
          onChange={e => set("fontSize", FONT_SIZE_PRESETS[e.target.value as FontSizePreset])}
          style={modernDropdownStyle}
        >
          {Object.keys(FONT_SIZE_PRESETS).map(size => <option key={size} value={size}>{size}</option>)}
        </select>

        <div style={dividerStyle} />

        <button 
          onClick={() => setShowColorPicker(!showColorPicker)}
          style={{
            ...iconButtonStyle,
            background: color,
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            padding: 0
          }}
        />
      </div>
    </div>,
    document.body
  )
}

const mainToolbarStyle: React.CSSProperties = {
  height: 44,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0 14px",
  background: "rgba(28, 28, 30, 0.85)",
  backdropFilter: "blur(20px) saturate(180%)",
  borderRadius: 100,
  border: "1px solid rgba(255, 255, 255, 0.15)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
}

// Added ellipsis styling for the font family
const truncatedDropdownStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#E5E5E7",
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  cursor: "pointer",
  width: "120px", // Constrained width
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  overflow: "hidden"
}

const modernDropdownStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#E5E5E7",
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  cursor: "pointer",
}

const colorPanelStyle: React.CSSProperties = {
  background: "rgba(28, 28, 30, 0.95)",
  backdropFilter: "blur(20px)",
  padding: 12,
  borderRadius: 16,
  border: "1px solid rgba(255, 255, 255, 0.15)",
  marginBottom: 8
}

const iconButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#E5E5E7",
  cursor: "pointer",
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 4
}

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 18,
  background: "rgba(255,255,255,0.15)"
}

const swatchStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  cursor: 'pointer',
  border: 'none'
}