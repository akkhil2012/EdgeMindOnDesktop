import React, { useEffect, useRef, useState } from 'react'
import { useAppStore, submitQuery } from '../store/appStore'
import type { Message } from '../store/appStore'

const PATH_BADGE: Record<string, { label: string; cls: string }> = {
  slm: { label: 'SLM · Path 1', cls: 'bg-success/20 text-success border-success/30' },
  rag: { label: 'RAG · Path 3', cls: 'bg-warn/20 text-warn border-warn/30' },
  llm: { label: 'LLM · Path 2', cls: 'bg-accent/20 text-accent border-accent/30' }
}

const DEMO_PROMPTS = [
  'I have chest pain and shortness of breath',
  'What is the differential diagnosis?',
  'Is this an emergency?'
]

function MessageBubble({ msg }: { msg: Message }): React.ReactElement {
  const isUser = msg.role === 'user'
  const badge = msg.path ? PATH_BADGE[msg.path] : null
  const confPct = msg.confidence !== undefined ? Math.round(msg.confidence * 100) : null

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} max-w-[80%] ${isUser ? 'self-end' : 'self-start'}`}>
      <div
        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-accent text-white rounded-tr-sm'
            : 'bg-surface-raised text-slate-200 rounded-tl-sm border border-white/8'
        }`}
      >
        {msg.text}
      </div>
      {!isUser && (badge || confPct !== null) && (
        <div className="flex items-center gap-2 text-[11px]">
          {badge && (
            <span className={`px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          )}
          {confPct !== null && (
            <span className={`font-mono ${confPct >= 75 ? 'text-success' : confPct >= 50 ? 'text-warn' : 'text-danger'}`}>
              {confPct}% conf
            </span>
          )}
          {msg.latencyMs !== undefined && (
            <span className="text-muted font-mono">{msg.latencyMs}ms</span>
          )}
        </div>
      )}
    </div>
  )
}

function TypingIndicator(): React.ReactElement {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-surface-raised rounded-2xl rounded-tl-sm border border-white/8 self-start max-w-[80%]">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-muted">Processing through MCP pipeline…</span>
    </div>
  )
}

export function AssistantScreen(): React.ReactElement {
  const { messages, loading, error, clearMessages } = useAppStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (): Promise<void> => {
    const prompt = input.trim()
    if (!prompt || loading) return
    setInput('')
    await submitQuery(prompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-sm font-semibold text-white">Assistant</h2>
          <p className="text-xs text-muted mt-0.5">
            All inference runs on-device · No data egress · Zero cloud dependency
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="px-3 py-1.5 text-xs rounded-md bg-surface-overlay hover:bg-white/10 text-muted border border-white/10 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div>
              <div className="text-4xl mb-2">🧠</div>
              <h3 className="text-base font-semibold text-white mb-1">EdgeMind Desktop</h3>
              <p className="text-sm text-muted max-w-xs">
                MCP-orchestrated on-device AI with three-path routing: SLM → RAG → LLM escalation
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <p className="text-xs text-muted uppercase tracking-wider">Try a demo prompt</p>
              {DEMO_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setInput(p); inputRef.current?.focus() }}
                  className="text-left px-3 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/8 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div className="self-start px-3 py-2 bg-danger/10 border border-danger/30 rounded-xl text-xs text-danger">
            Error: {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe symptoms or ask a clinical question… (Enter to send)"
            rows={1}
            className="flex-1 resize-none rounded-xl bg-surface-overlay border border-white/10 px-3 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent/60 transition-colors max-h-32 overflow-y-auto"
            style={{ minHeight: 40 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-dim disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shrink-0"
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-muted mt-1.5 px-1">
          Guard → IAM → SLM (Path 1) → RAG (Path 3) → LLM (Path 2) · All decisions audited
        </p>
      </div>
    </div>
  )
}
