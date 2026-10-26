
import { useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm F.R.I.D.A.Y., your personal AI assistant. How can I help you today?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();

    if (!text || loading) return;

    // Display the user's message immediately.
    setMessages((previous) => [
      ...previous,
      { role: "user", content: text },
    ]);

    setMessage("");
    setLoading(true);

    try {
      // Detect the computer commands supported by our backend.
      const isComputerCommand =
        /\b(open|launch|start)\b.*\b(file explorer|file manager|explorer|chrome|google chrome)\b/i.test(
          text
        );

      const endpoint = isComputerCommand
        ? "http://127.0.0.1:3000/api/action"
        : "http://127.0.0.1:3000/api/chat";

      // Send the message to our Node.js backend.
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Request failed."
        );
      }

      // Display either the action result or the AI response.
      const assistantMessage = isComputerCommand
        ? data.message
        : data.reply;

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: assistantMessage || "No response received.",
        },
      ]);
    } catch (error) {
      console.error("F.R.I.D.A.Y. error:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: `Request failed: ${error.message}. Please check that the backend and Ollama are running.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">F</div>

        <h2>F.R.I.D.A.Y.</h2>
        <p className="muted">PERSONAL AI SYSTEM</p>

        <div className="status">
          <span className="status-dot" />
          Local assistant
        </div>

        <div className="sidebar-note">
          <span className="note-label">SYSTEM</span>
          <p>Private local AI</p>
          <p>Powered by Ollama</p>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">PERSONAL ASSISTANT</p>
            <h1>Command Center</h1>
          </div>

          <span className="model-tag">QWEN 2.5 · 3B</span>
        </header>

        <div className="chat-messages" aria-live="polite">
          {messages.map((item, index) => (
            <div
              className={`message-row ${item.role}`}
              key={`${item.role}-${index}`}
            >
              <div className="avatar">
                {item.role === "assistant" ? "F" : "Y"}
              </div>

              <div className="message-content">
                <span className="message-author">
                  {item.role === "assistant" ? "F.R.I.D.A.Y." : "YOU"}
                </span>

                <p>{item.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="thinking">
              F.R.I.D.A.Y. is thinking...
            </div>
          )}
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask F.R.I.D.A.Y. anything..."
            aria-label="Message F.R.I.D.A.Y."
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading || !message.trim()}
          >
            {loading ? "Thinking..." : "Send ↗"}
          </button>
        </form>

        <p className="footer-note">
          Local prototype · AI responses may need verification
        </p>
      </section>
    </main>
  );
}

export default App;
