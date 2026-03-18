import { useEffect, useRef } from "react";

export default function ChatWindow({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div style={styles.empty}>
        <p>Send a message to start chatting</p>
      </div>
    );
  }

  return (
    <div style={styles.window}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            ...styles.row,
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}
        >
          <div
            style={{
              ...styles.bubble,
              ...(msg.role === "user" ? styles.userBubble : styles.aiBubble),
              ...(msg.isError ? styles.errorBubble : {}),
            }}
          >
            <p style={styles.text}>{msg.content}</p>
            <span style={styles.time}>{msg.time}</span>
          </div>
        </div>
      ))}
      {/* Loading indicator injected as a message with role "loading" */}
      <div ref={bottomRef} />
    </div>
  );
}

const styles = {
  window: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    backgroundImage:
      "radial-gradient(circle at 1px 1px, #2a3942 1px, transparent 0)",
    backgroundSize: "24px 24px",
  },
  empty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8696a0",
    fontSize: "14px",
  },
  row: {
    display: "flex",
    marginBottom: "4px",
  },
  bubble: {
    maxWidth: "65%",
    borderRadius: "8px",
    padding: "8px 12px",
    position: "relative",
  },
  userBubble: {
    background: "#005c4b",
    borderTopRightRadius: "2px",
  },
  aiBubble: {
    background: "#202c33",
    borderTopLeftRadius: "2px",
  },
  errorBubble: {
    background: "#4a1c1c",
    border: "1px solid #7a2d2d",
  },
  text: {
    margin: 0,
    color: "#e9edef",
    fontSize: "14px",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  time: {
    display: "block",
    textAlign: "right",
    fontSize: "11px",
    color: "#8696a0",
    marginTop: "4px",
  },
};
