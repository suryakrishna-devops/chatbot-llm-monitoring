import { useState } from "react";

export default function MessageInput({ onSend, disabled }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.wrapper}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
        rows={1}
        disabled={disabled}
        style={styles.textarea}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        style={{
          ...styles.button,
          ...(disabled || !text.trim() ? styles.buttonDisabled : {}),
        }}
        aria-label="Send"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="22"
          height="22"
        >
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    padding: "12px 16px",
    background: "#202c33",
    borderTop: "1px solid #2a3942",
  },
  textarea: {
    flex: 1,
    background: "#2a3942",
    color: "#e9edef",
    border: "none",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "15px",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: "1.4",
    maxHeight: "120px",
    overflowY: "auto",
  },
  button: {
    background: "#00a884",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background 0.15s",
  },
  buttonDisabled: {
    background: "#3b4a54",
    cursor: "not-allowed",
  },
};
