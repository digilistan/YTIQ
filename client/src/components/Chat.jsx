import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RotateCcw, User, Bot } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const QUICK_ACTIONS = [
  { label: 'Audit my channel', prompt: 'Can you audit my channel and tell me what I should improve based on my current stats?' },
  { label: 'Find niche', prompt: 'Help me find an S-tier niche I can start a YouTube channel in right now. Walk me through the validation process.' },
  { label: 'New thumbnail', prompt: 'Give me specific thumbnail concepts for my niche that follow the golden rule and maximize CTR on the homepage.' },
  { label: 'Find keywords', prompt: 'What rising keywords should I be targeting in my niche right now? Give me specific ones with low competition and high RPM potential.' },
  { label: 'Video ideas', prompt: 'Generate 5 outlier-style video ideas for my channel. Use the competitor outlier strategy and explain why each idea has viral potential.' },
  { label: 'Write script', prompt: 'Help me write a high-retention script outline using the master outline method. Start by asking me what video topic I want to cover.' },
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: isUser ? 'var(--accent)' : 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        {isUser
          ? <User size={13} color="white" />
          : <Bot size={13} style={{ color: 'var(--accent)' }} />
        }
      </div>
      <div
        className="max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={{
          background: isUser ? 'var(--accent)' : 'var(--bg-elevated)',
          color: isUser ? '#fff' : 'var(--text-base)',
          border: isUser ? 'none' : '1px solid var(--border)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

export function Chat({ toast }) {
  const { activeChannel } = useSettings();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg = { role: 'user', content };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          channel_id: activeChannel?.id || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get response');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      toast(err.message, 'error');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col fade-in" style={{ height: 'calc(100vh - 3rem)', maxHeight: 900 }}>
      {/* Header */}
      <div className="page-header mb-0 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="page-title">AI Chat</h1>
            <p className="page-subtitle">Ask anything about growing your YouTube channel.</p>
          </div>
          {!isEmpty && (
            <button onClick={handleReset} className="btn btn-ghost btn-sm gap-1.5">
              <RotateCcw size={13} /> New chat
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-6 px-2" style={{ minHeight: 0 }}>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
                <Sparkles size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <h2 className="font-semibold text-xl" style={{ color: 'var(--text-base)' }}>Where should we start?</h2>
              <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
                Ask me anything about YouTube growth, niche research, thumbnails, scripts, or analytics.
              </p>
            </div>
            {/* Quick action chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {QUICK_ACTIONS.map(({ label, prompt }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: 999, fontSize: '0.78rem' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <Bot size={13} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="pt-3 pb-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-3xl mx-auto">
          {/* Quick chips above input when in conversation */}
          {!isEmpty && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUICK_ACTIONS.slice(0, 4).map(({ label, prompt }) => (
                <button key={label} onClick={() => sendMessage(prompt)} disabled={loading}
                  className="btn btn-ghost btn-sm"
                  style={{ borderRadius: 999, fontSize: '0.72rem', padding: '2px 10px' }}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              className="app-input flex-1 resize-none"
              style={{
                minHeight: 44,
                maxHeight: 140,
                lineHeight: '1.5',
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 12,
              }}
              placeholder="Ask about your channel, niche research, thumbnails, scripts…"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="btn btn-primary shrink-0"
              style={{ height: 44, width: 44, padding: 0, borderRadius: 12, justifyContent: 'center' }}
            >
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            Trained on S-tier YouTube growth framework · Modules 1–13
          </p>
        </div>
      </div>
    </div>
  );
}
