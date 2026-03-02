import React from "react"

interface Props {
  message?: string
}

export const FallbackTemplate: React.FC<Props> = ({
  message = "Template props schema is invalid"
}) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a", // dark background
        color: "#f1f5f9",
        fontFamily: "Inter, sans-serif",
        padding: 24,
        textAlign: "center"
      }}
    >
      <div
        style={{
          maxWidth: 420,
          borderRadius: 12,
          padding: 24,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)"
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 8
          }}
        >
          ⚠ Template Error
        </div>

        <div
          style={{
            fontSize: 14,
            opacity: 0.8,
            lineHeight: 1.5
          }}
        >
          {message}
        </div>
      </div>
    </div>
  )
}
