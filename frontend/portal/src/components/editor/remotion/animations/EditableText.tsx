import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

type EditableTextProps = {
  initialText?: string;
  initialStyle?: React.CSSProperties;
};

const EditableText: React.FC<EditableTextProps> = ({
  initialText = "Your text here",
  initialStyle = {}
}) => {
  const [text, setText] = useState(initialText);
  const [editing, setEditing] = useState(false);

  const [style, setStyle] = useState<React.CSSProperties>({
    fontSize: 24,
    fontFamily: "sans-serif",
    color: "#000",
    ...initialStyle
  });

  const elRef = useRef<HTMLDivElement | null>(null);

  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);

  const applyStyle = (patch: Partial<React.CSSProperties>) => {
    setStyle(prev => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    if (editing && elRef.current) {
      const rect = elRef.current.getBoundingClientRect();
      setToolbarPos({
        top: rect.top - 45,
        left: rect.left + rect.width / 2
      });
    }
  }, [editing, text, style]);

  const Toolbar = () => {
    if (!toolbarPos) return null;

    return ReactDOM.createPortal(
      <div
        style={{
          position: "fixed",
          top: toolbarPos.top,
          left: toolbarPos.left,
          transform: "translateX(-50%)",
          background: "#333",
          color: "#fff",
          padding: "6px 10px",
          borderRadius: 8,
          display: "flex",
          gap: 8,
          fontSize: 14,
          zIndex: 9999
        }}
      >
        {/* Font Family */}
        <select
          value={style.fontFamily}
          onChange={(e) => applyStyle({ fontFamily: e.target.value })}
        >
          <option value="sans-serif">Sans</option>
          <option value="serif">Serif</option>
          <option value="monospace">Mono</option>
        </select>

        {/* Font Size */}
        <input
          type="number"
          value={style.fontSize as number}
          min={10}
          max={200}
          style={{ width: 50 }}
          onChange={(e) => applyStyle({ fontSize: Number(e.target.value) })}
        />

        {/* Color */}
        <input
          type="color"
          value={style.color as string}
          onChange={(e) => applyStyle({ color: e.target.value })}
        />
      </div>,
      document.body
    );
  };

  return (
    <>
      {!editing && (
        <div
          style={{ ...style, cursor: "text", display: "inline-block" }}
          onClick={() => setEditing(true)}
        >
          {text}
        </div>
      )}

      {editing && (
        <div
          ref={elRef}
          contentEditable
          suppressContentEditableWarning
          style={{
            ...style,
            outline: "2px solid #4DA3FF",
            padding: "2px",
            display: "inline-block",
            minWidth: 30
          }}
          onInput={(e) => setText((e.target as HTMLElement).textContent || "")}
          onBlur={() => setEditing(false)}
        >
          {text}
        </div>
      )}

      {editing && <Toolbar />}
    </>
  );
};

export default EditableText;
