import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatWindow from "./components/ChatWindow";
import MessageInput from "./components/MessageInput";
import ModelSwitcher from "./components/ModelSwitcher";
import { sendMessage } from "./api/chat";

const SESSION_ID = uuidv4();

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Spinner() {
  return (
    <div style={spinnerStyles.wrapper}>
      <div style={spinnerStyles.dot1} />
      <div style={spinnerStyles.dot2} />
      <div style={spinnerStyles.dot3} />
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const [loading, setLoading] = useState(false);

  const addMessage = useCallback((role, content, isError = false) => {
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        role,
        content,
        isError,
        time: formatTime(new Date()),
      },
    ]);
  }, []);

  const handleSend = useCallback(
    async (text) => {
      addMessage("user", text);
      setLoading(true);
      try {
        const data = await sendMessage({
          message: text,
          model,
          sessionId: SESSION_ID,
        });
        addMessage("assistant", data.response);
      } catch (err) {
        addMessage("assistant", `Error: ${err.message}`, true);
      } finally {
        setLoading(false);
      }
    },
    [model, addMessage]
  );

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.avatar}>AI</div>
          <div>
            <div style={styles.headerTitle}>AI Chatbot</div>
            <div style={styles.headerSub}>Powered by Groq · Traced by Langfuse</div>
          </div>
        </div>
        <ModelSwitcher model={model} onChange={setModel} disabled={loading} />
      </header>

      {/* Chat area */}
      <div style={styles.chatArea}>
        {messages.length === 0 && !loading ? (
          <div style={styles.empty}>
            <p>Send a message to start chatting</p>
          </div>
        ) : (
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
                  <p style={styles.bubbleText}>{msg.content}</p>
                  <span style={styles.time}>{msg.time}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ ...styles.row, justifyContent: "flex-start" }}>
                <div style={{ ...styles.bubble, ...styles.aiBubble }}>
                  <Spinner />
                </div>
              </div>
            )}
            <div id="scroll-anchor" />
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={loading} />
    </div>
  );
}

// Auto-scroll effect via a simple ref trick inside window div
// Using a plain div with id we scroll via effect — handled in ChatWindow-like div below

const styles = {
  app: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#111b21",
    fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
    color: "#e9edef",
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    background: "#202c33",
    borderBottom: "1px solid #2a3942",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#00a884",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "14px",
    color: "#fff",
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: "16px",
    color: "#e9edef",
  },
  headerSub: {
    fontSize: "12px",
    color: "#8696a0",
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    backgroundImage:
      "radial-gradient(circle at 1px 1px, #1a2530 1px, transparent 0)",
    backgroundSize: "24px 24px",
    display: "flex",
    flexDirection: "column",
  },
  empty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8696a0",
    fontSize: "14px",
  },
  window: {
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  row: {
    display: "flex",
    marginBottom: "4px",
  },
  bubble: {
    maxWidth: "65%",
    borderRadius: "8px",
    padding: "8px 12px",
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
  bubbleText: {
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

const spinnerStyles = {
  wrapper: {
    display: "flex",
    gap: "5px",
    alignItems: "center",
    padding: "4px 0",
  },
  dot1: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#8696a0",
    animation: "bounce 1.2s infinite",
    animationDelay: "0s",
  },
  dot2: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#8696a0",
    animation: "bounce 1.2s infinite",
    animationDelay: "0.2s",
  },
  dot3: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#8696a0",
    animation: "bounce 1.2s infinite",
    animationDelay: "0.4s",
  },
};
