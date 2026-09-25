import { useEffect, useMemo, useRef, useState } from "react";

const MODES = [
  { id: "auto", label: "Auto", icon: "✦", model: "Smart router", note: "Chooses the right model" },
  { id: "instant", label: "Instant", icon: "⚡", model: "MiniCPM5-2B", note: "Fast simple answers" },
  { id: "easy", label: "Easy", icon: "●", model: "Gemma 3 4B IT", note: "Everyday chat" },
  { id: "medium", label: "Medium", icon: "◆", model: "Qwen3.8-27B", note: "Coding + reasoning" },
  { id: "high", label: "High", icon: "▲", model: "Qwen3.8-Flash-Next", note: "Harder long-form work" },
  { id: "research", label: "Research", icon: "◉", model: "DeepSeek-V4.1-Flash", note: "Deep analysis" },
];

const STARTER = {
  role: "assistant",
  content:
    "Hey — I’m DVILR. Choose a mode or leave it on Auto. I’ll route your message to the best available open model.",
  meta: { mode: "auto", model: "DVILR Router" },
};

function loadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem("dvilr-chat") || "null");
    return Array.isArray(saved) && saved.length ? saved : [STARTER];
  } catch {
    return [STARTER];
  }
}

export default function App() {
  const [mode, setMode] = useState(localStorage.getItem("dvilr-mode") || "auto");
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  const selected = useMemo(
    () => MODES.find((item) => item.id === mode) || MODES[0],
    [mode]
  );

  const hasConversation = messages.some((message) => message.role === "user");
  const tokenError = /HF_TOKEN/i.test(error);

  useEffect(() => {
    localStorage.setItem("dvilr-mode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("dvilr-chat", JSON.stringify(messages.slice(-50)));
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    const field = textareaRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = Math.min(field.scrollHeight, 180) + "px";
  }, [input]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || busy) return;

    setError("");
    setInput("");

    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setBusy(true);

    try {
      const history = next
        .filter((message) => ["user", "assistant"].includes(message.role))
        .map(({ role, content: text }) => ({ role, content: text }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, messages: history }),
      });

      const data = await response.json();

      if (!response.ok) {
        const details = Array.isArray(data.details)
          ? data.details.map((x) => `${x.mode}: ${x.message}`).join(" • ")
          : "";
        throw new Error([data.error || "Request failed", details].filter(Boolean).join(" — "));
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.text,
          meta: {
            mode: data.mode,
            model: data.model,
            fallbackUsed: data.fallbackUsed,
          },
        },
      ]);
    } catch (err) {
      setError(err.message || "DVILR could not reach a model.");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([STARTER]);
    setError("");
    setInput("");
  }

  async function copyMessage(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1200);
    } catch {
      setError("Could not copy that response.");
    }
  }

  return (
    <main className="app-shell">
      <div className="ambient" aria-hidden="true">
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
        <div className="grid-field" />
      </div>
      <aside className="sidebar">
        <div className="brand brand-v2">
          <div className="brand-mark">D</div>
          <div>
            <h1>DVILR</h1>
            <p>Multi-model intelligence</p>
          </div>
        </div>

        <div className="mode-title">
          <span>MODE</span>
          <span className="live-dot">LIVE</span>
        </div>

        <div className="mode-list">
          {MODES.map((item) => (
            <button
              key={item.id}
              className={`mode-card ${mode === item.id ? "active" : ""}`}
              onClick={() => setMode(item.id)}
              type="button"
            >
              <span className="mode-icon">{item.icon}</span>
              <span className="mode-copy">
                <strong>{item.label}</strong>
                <small>{item.model}</small>
                <em>{item.note}</em>
              </span>
              {mode === item.id && <span className="selected-dot" />}
            </button>
          ))}
        </div>

        <button className="ghost-button" type="button" onClick={clearChat}>
          New conversation
        </button>

        <div className="sidebar-footer">
          <span>DVILR AI1 · V2</span>
          <span>Open-model router</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">CURRENT MODE</span>
            <div className="current-mode">
              <span>{selected.icon}</span>
              <strong>{selected.label}</strong>
              <span className="divider">/</span>
              <span>{selected.model}</span>
            </div>
          </div>
          <div className="status-pill">
            <span className="pulse" />
            Router ready
          </div>
        </header>

        <div className="chat">
          <div className="route-glow" aria-hidden="true" />
          <div className={`hero ${hasConversation ? "compact" : ""}`}>
            <div className="hero-orb-wrap">
              <div className="hero-ring ring-one" />
              <div className="hero-ring ring-two" />
              <div className="hero-orb">D</div>
            </div>
            <div className="hero-kicker"><span>DVILR ROUTER</span><i /><span>6 MODEL TIERS</span></div>
            <h2>One AI. <span>Multiple brains.</span></h2>
            <p>
              DVILR routes each conversation to the model tier you choose — or
              automatically picks one for you.
            </p>
            {!hasConversation && (
              <div className="quick-prompts">
                <button type="button" onClick={() => setInput("Explain this clearly and simply: ")}><span>⌁</span><strong>Explain</strong><small>Break it down</small></button>
                <button type="button" onClick={() => setInput("Help me build and debug this: ")}><span>&lt;/&gt;</span><strong>Code</strong><small>Build + debug</small></button>
                <button type="button" onClick={() => setInput("Create a practical step-by-step plan for: ")}><span>◇</span><strong>Plan</strong><small>Make a roadmap</small></button>
                <button type="button" onClick={() => setInput("Compare these options and explain the tradeoffs: ")}><span>⇄</span><strong>Compare</strong><small>Find tradeoffs</small></button>
              </div>
            )}
          </div>

          <div className="messages" aria-live="polite">
            {messages.map((message, index) => (
              <article
                key={index}
                className={`message ${message.role === "user" ? "user" : "assistant"}`}
              >
                <div className="avatar">{message.role === "user" ? "YOU" : "D"}</div>
                <div className="bubble">
                  <div className="message-head">
                    <strong>{message.role === "user" ? "You" : "DVILR"}</strong>
                    {message.meta?.model && (
                      <span>
                        {message.meta.mode} · {message.meta.model}
                        {message.meta.fallbackUsed ? " · fallback" : ""}
                      </span>
                    )}
                    {message.role === "assistant" && (
                      <button className="copy-button" type="button" onClick={() => void copyMessage(message.content, index)}>
                        {copiedIndex === index ? "✓ COPIED" : "COPY"}
                      </button>
                    )}
                  </div>
                  <div className="message-text">{message.content}</div>
                </div>
              </article>
            ))}

            {busy && (
              <article className="message assistant">
                <div className="avatar">D</div>
                <div className="bubble loading-bubble">
                  <div className="thinking-copy"><strong>DVILR is thinking</strong><small>{selected.label} · {selected.model}</small></div>
                  <div className="typing-dots"><span /><span /><span /></div>
                  <div className="thinking-bar"><i /></div>
                </div>
              </article>
            )}

            <div ref={endRef} />
          </div>
        </div>

        <div className="composer-wrap">
          {error && (
            <div className={`error-banner ${tokenError ? "config-error" : ""}`}>
              <div className="error-icon">!</div>
              <div className="error-copy">
                <strong>{tokenError ? "Server setup required" : "Request failed"}</strong>
                <span>{error}</span>
                {tokenError && <small>Add <code>HF_TOKEN</code> in Netlify environment variables, then redeploy. Never expose the token in frontend code.</small>}
              </div>
            </div>
          )}
          <div className="composer">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 4000))}
              onKeyDown={onKeyDown}
              placeholder={`Message DVILR · ${selected.label} mode`}
              rows={1}
              disabled={busy}
            />
            <button
              className="send-button"
              type="button"
              onClick={sendMessage}
              disabled={busy || !input.trim()}
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
          <div className="composer-meta">
            <span>Enter to send · Shift + Enter for a new line</span>
            <span>Server-routed inference · keys stay private</span>
          </div>
        </div>
      </section>
    </main>
  );
}
