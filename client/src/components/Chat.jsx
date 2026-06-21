import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RotateCcw, User, Bot, Trash2, Plus, BrainCircuit, RefreshCw, BarChart2, Youtube } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

// --- Custom Markdown Parser Component ---
export function Markdown({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = null;
  let currentTable = null;

  const flushList = (key) => {
    if (currentList) {
      const ListTag = currentList.type;
      elements.push(
        <ListTag key={`list-${key}`} className={currentList.type === 'ul' ? 'list-disc ml-5 my-2 space-y-1' : 'list-decimal ml-5 my-2 space-y-1'}>
          {currentList.items.map((item, i) => (
            <li key={i} className="text-sm text-[var(--text-base)]">{parseInlineMarkdown(item)}</li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  const flushTable = (key) => {
    if (currentTable) {
      elements.push(
        <div key={`table-wrapper-${key}`} className="overflow-x-auto my-3 rounded-lg border border-[var(--border)]">
          <table className="w-full text-xs text-left border-collapse" style={{ background: 'var(--bg-elevated)' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border)' }}>
                {currentTable.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-semibold text-[var(--text-base)]" style={{ borderRight: '1px solid var(--border)' }}>
                    {parseInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentTable.rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-[var(--bg-hover)]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-[var(--text-base)]" style={{ borderRight: '1px solid var(--border)' }}>
                      {parseInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = null;
    }
  };

  const parseInlineMarkdown = (text) => {
    let parts = [{ type: 'text', content: text }];

    // Parse Bold **text**
    parts = parts.flatMap(p => {
      if (p.type !== 'text') return p;
      const subparts = [];
      const regex = /\*\*([\s\S]*?)\*\*/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(p.content)) !== null) {
        if (match.index > lastIndex) {
          subparts.push({ type: 'text', content: p.content.substring(lastIndex, match.index) });
        }
        subparts.push({ type: 'bold', content: match[1] });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < p.content.length) {
        subparts.push({ type: 'text', content: p.content.substring(lastIndex) });
      }
      return subparts;
    });

    // Parse Inline Code `code`
    parts = parts.flatMap(p => {
      if (p.type !== 'text') return p;
      const subparts = [];
      const regex = /`([^`]+)`/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(p.content)) !== null) {
        if (match.index > lastIndex) {
          subparts.push({ type: 'text', content: p.content.substring(lastIndex, match.index) });
        }
        subparts.push({ type: 'code', content: match[1] });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < p.content.length) {
        subparts.push({ type: 'text', content: p.content.substring(lastIndex) });
      }
      return subparts;
    });

    return parts.map((p, i) => {
      if (p.type === 'bold') return <strong key={i} className="font-bold text-[var(--text-base)]">{p.content}</strong>;
      if (p.type === 'code') return <code key={i} className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] font-mono text-xs text-[var(--accent)]">{p.content}</code>;
      return p.content;
    });
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Check Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList(idx);
      flushTable(idx);
      elements.push(<hr key={idx} className="my-4 border-[var(--border)]" />);
      continue;
    }

    // Check Headings
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushList(idx);
      flushTable(idx);
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const HeadingTag = `h${level}`;
      const sizeClass = level === 1 ? 'text-lg font-bold mt-4 mb-2' : level === 2 ? 'text-base font-semibold mt-3.5 mb-2' : 'text-sm font-semibold mt-3 mb-1.5';
      elements.push(
        <HeadingTag key={idx} className={`${sizeClass} text-[var(--text-base)]`}>
          {parseInlineMarkdown(text)}
        </HeadingTag>
      );
      continue;
    }

    // Check Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList(idx);
      const cells = trimmed.split('|').map(c => c.trim()).slice(1, -1);
      const isDivider = cells.every(c => /^:-{1,}:?|^-{1,}$/.test(c));
      if (isDivider) continue;

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      flushTable(idx);
    }

    // Check Lists
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

    if (ulMatch) {
      const text = ulMatch[2];
      if (!currentList || currentList.type !== 'ul') {
        flushList(idx);
        currentList = { type: 'ul', items: [text] };
      } else {
        currentList.items.push(text);
      }
      continue;
    } else if (olMatch) {
      const text = olMatch[2];
      if (!currentList || currentList.type !== 'ol') {
        flushList(idx);
        currentList = { type: 'ol', items: [text] };
      } else {
        currentList.items.push(text);
      }
      continue;
    } else {
      flushList(idx);
    }

    // Paragraph
    if (trimmed === '') {
      elements.push(<div key={idx} className="h-2" />);
    } else {
      elements.push(
        <p key={idx} className="mb-2 text-sm leading-relaxed text-[var(--text-base)]">
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  }

  flushList(lines.length);
  flushTable(lines.length);

  return <div className="space-y-1">{elements}</div>;
}

// --- Chat Message Bubble Component ---
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
        className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={{
          background: isUser ? 'var(--accent)' : 'var(--bg-elevated)',
          color: isUser ? '#fff' : 'var(--text-base)',
          border: isUser ? 'none' : '1px solid var(--border)',
          wordBreak: 'break-word',
        }}
      >
        {isUser ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
        ) : (
          <Markdown content={msg.content} />
        )}
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: 'Audit my channel', prompt: 'Can you audit my channel and tell me what I should improve based on my current stats?' },
  { label: 'Find niche', prompt: 'Help me find an S-tier niche I can start a YouTube channel in right now. Walk me through the validation process.' },
  { label: 'New thumbnail', prompt: 'Give me specific thumbnail concepts for my niche that follow the golden rule and maximize CTR on the homepage.' },
  { label: 'Find keywords', prompt: 'What rising keywords should I be targeting in my niche right now? Give me specific ones with low competition and high RPM potential.' },
  { label: 'Video ideas', prompt: 'Generate 5 outlier-style video ideas for my channel. Use the competitor outlier strategy and explain why each idea has viral potential.' },
  { label: 'Write script', prompt: 'Help me write a high-retention script outline using the master outline method. Start by asking me what video topic I want to cover.' },
];

export function Chat({ toast }) {
  const { activeChannel } = useSettings();
  
  // Conversations State
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Memory State
  const [memory, setMemory] = useState([]);
  const [newMemoryFact, setNewMemoryFact] = useState('');
  
  // API Quota State
  const [apiUsage, setApiUsage] = useState({ used: 0, limit: 2000 });
  
  // Input State
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrapeYoutube, setScrapeYoutube] = useState(false);
  
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load initial lists
  useEffect(() => {
    fetchSessions();
    fetchMemory();
    fetchApiUsage();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const fetchMemory = async () => {
    try {
      const res = await fetch('/api/chat/memory');
      const data = await res.json();
      setMemory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch memory:', err);
    }
  };

  const fetchApiUsage = async () => {
    try {
      const res = await fetch('/api/youtube/api-usage');
      if (res.ok) {
        const data = await res.json();
        setApiUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch API usage:', err);
    }
  };

  // Load session messages when active session changes
  const selectSession = async (sessionId) => {
    if (!sessionId) {
      setActiveSessionId(null);
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed to load thread');
      const data = await res.json();
      setActiveSessionId(sessionId);
      setMessages(data.messages || []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete thread');
      toast('Conversation deleted', 'success');
      fetchSessions();
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const addMemoryFact = async (e) => {
    e.preventDefault();
    if (!newMemoryFact.trim()) return;
    try {
      const res = await fetch('/api/chat/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact: newMemoryFact.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save memory fact');
      setNewMemoryFact('');
      toast('Memory fact saved', 'success');
      fetchMemory();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const deleteMemoryFact = async (factId) => {
    try {
      const res = await fetch(`/api/chat/memory/${factId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete memory fact');
      toast('Memory fact removed', 'success');
      fetchMemory();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg = { role: 'user', content };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    // Add placeholder assistant message
    const assistantIndex = nextMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '⏳ Initializing...' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          channel_id: activeChannel?.id || null,
          session_id: activeSessionId,
          scrape_youtube: scrapeYoutube,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep last incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let parsed = null;
          try {
            parsed = JSON.parse(trimmed);
          } catch (e) {
            console.error('Error parsing NDJSON line:', e);
            continue;
          }

          if (parsed.status === 'info') {
            setMessages(prev => {
              const copy = [...prev];
              if (copy[assistantIndex]) {
                copy[assistantIndex] = { role: 'assistant', content: parsed.message };
              }
              return copy;
            });
          } else if (parsed.status === 'reply') {
            setMessages(prev => {
              const copy = [...prev];
              if (copy[assistantIndex]) {
                copy[assistantIndex] = { role: 'assistant', content: parsed.reply };
              }
              return copy;
            });

            // Implicitly load active session if it was just created
            if (!activeSessionId && parsed.session_id) {
              setActiveSessionId(parsed.session_id);
            }
          } else if (parsed.status === 'error') {
            throw new Error(parsed.error || 'Failed to get response');
          }
        }
      }

      // Refresh ancillary indicators & panel items
      fetchSessions();
      fetchMemory();
      fetchApiUsage();
    } catch (err) {
      toast(err.message, 'error');
      setMessages(prev => prev.slice(0, assistantIndex)); // remove placeholder message
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
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col md:flex-row gap-6 fade-in h-full" style={{ height: 'calc(100vh - 3rem)', maxHeight: 900 }}>
      
      {/* --- LEFT SIDE PANEL --- */}
      <div className="w-full md:w-80 shrink-0 flex flex-col gap-5 overflow-y-auto pb-4" style={{ borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
        
        {/* API Limit Usage Widget */}
        <div className="card p-4 space-y-2.5 bg-[var(--bg-elevated)]" style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-base)' }}>
              <BarChart2 size={13} style={{ color: 'var(--accent)' }} /> YouTube API Quota
            </span>
            <span className="text-[var(--text-muted)] font-mono">{apiUsage.used.toLocaleString()} / {apiUsage.limit.toLocaleString()}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((apiUsage.used / apiUsage.limit) * 100, 100)}%`,
                background: apiUsage.used > apiUsage.limit * 0.85 ? 'var(--red)' : apiUsage.used > apiUsage.limit * 0.5 ? 'var(--amber)' : 'var(--accent)'
              }}
            />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] leading-normal">
            Searches consume 100 units. Reads consume 1 unit. Cached queries cost 0 units. Limit resets daily.
          </p>
        </div>

        {/* New Chat Button */}
        <button onClick={handleReset} className="btn btn-primary w-full py-2.5 justify-center gap-2 font-medium" style={{ borderRadius: 10 }}>
          <Plus size={15} /> New chat
        </button>

        {/* Recent Conversations */}
        <div className="space-y-2">
          <span className="section-label uppercase tracking-wider text-[10px] opacity-75">Recent Conversations</span>
          <div className="space-y-1 overflow-y-auto max-h-48 pr-1">
            {sessions.length === 0 ? (
              <p className="text-xs italic text-[var(--text-muted)] pl-2">No past chats.</p>
            ) : (
              sessions.map(s => (
                <div 
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer group ${activeSessionId === s.id ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-elevated)]'}`}
                >
                  <span className="truncate pr-2 font-medium" style={{ color: activeSessionId === s.id ? 'var(--accent-2)' : 'var(--text-base)' }}>
                    {s.title}
                  </span>
                  <button 
                    onClick={(e) => deleteSession(e, s.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-[var(--red)] transition-opacity p-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Long-Term Memory Panel */}
        <div className="space-y-2.5 flex-1 flex flex-col min-h-[200px]">
          <div className="flex items-center gap-1.5">
            <BrainCircuit size={13} style={{ color: 'var(--accent-2)' }} />
            <span className="section-label uppercase tracking-wider text-[10px] opacity-75">AI Long-Term Memory</span>
          </div>

          {/* Facts list */}
          <div className="flex-1 overflow-y-auto max-h-52 space-y-1.5 pr-1 border border-[var(--border)] rounded-xl p-2.5 bg-[var(--bg-elevated)] bg-opacity-30">
            {memory.length === 0 ? (
              <p className="text-[11px] italic text-[var(--text-muted)] leading-relaxed">
                No facts memorized yet. As you chat, the AI will automatically save key facts about your goals and style here.
              </p>
            ) : (
              memory.map(m => (
                <div key={m.id} className="flex items-start justify-between gap-1.5 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] hover:bg-opacity-80 group">
                  <p className="text-[11px] leading-relaxed text-[var(--text-base)]">{m.fact}</p>
                  <button 
                    onClick={() => deleteMemoryFact(m.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-[var(--red)] transition-opacity p-0.5 shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add fact manually */}
          <form onSubmit={addMemoryFact} className="flex gap-1.5">
            <input 
              className="app-input text-[11px]" 
              placeholder="Remember fact manually…"
              style={{ height: 32, padding: '0 8px' }}
              value={newMemoryFact}
              onChange={e => setNewMemoryFact(e.target.value)}
            />
            <button type="submit" disabled={!newMemoryFact.trim()} className="btn btn-secondary text-xs px-2.5 shrink-0" style={{ height: 32 }}>
              Save
            </button>
          </form>
        </div>
      </div>

      {/* --- MAIN CHAT PANEL --- */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Header */}
        <div className="page-header mb-0 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h1 className="page-title">AI Chat Assistant</h1>
            <p className="page-subtitle">Personalized advisory backed by long-term LLM memory.</p>
          </div>
        </div>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto py-6 px-2" style={{ minHeight: 0 }}>
          {loadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <RefreshCw size={24} className="animate-spin text-[var(--accent)]" />
              <span className="text-xs text-[var(--text-muted)]">Loading conversation…</span>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
                  <Sparkles size={22} style={{ color: 'var(--accent)' }} />
                </div>
                <h2 className="font-semibold text-xl" style={{ color: 'var(--text-base)' }}>Where should we start?</h2>
                <p className="text-sm max-w-xs mx-auto text-[var(--text-muted)]">
                  Ask anything about S-tier niches, thumbnail design, keyword strategy, or scripts.
                </p>
              </div>
              
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
                  <div className="rounded-2xl px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)]">
                    <span className="spinner animate-pulse" style={{ width: 14, height: 14 }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="pt-3 pb-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="max-w-3xl mx-auto">
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
              <button
                type="button"
                onClick={() => setScrapeYoutube(!scrapeYoutube)}
                disabled={loading}
                className="btn shrink-0"
                style={{
                  height: 44,
                  width: 44,
                  padding: 0,
                  borderRadius: 12,
                  justifyContent: 'center',
                  background: 'var(--bg-elevated)',
                  border: scrapeYoutube ? '1px solid #22c55e' : '1px solid var(--border)',
                  boxShadow: scrapeYoutube ? '0 0 10px rgba(34, 197, 94, 0.4), inset 0 0 5px rgba(34, 197, 94, 0.2)' : 'none',
                  transition: 'all 0.2s ease-in-out',
                }}
                title={scrapeYoutube ? "YouTube Live Search: Enabled" : "YouTube Live Search: Disabled"}
              >
                <Youtube 
                  size={16} 
                  style={{ 
                    color: scrapeYoutube ? '#22c55e' : 'var(--text-muted)',
                    filter: scrapeYoutube ? 'drop-shadow(0 0 3px rgba(34, 197, 94, 0.6))' : 'none'
                  }} 
                />
              </button>

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
                  border: scrapeYoutube ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border)',
                  boxShadow: scrapeYoutube ? '0 0 5px rgba(34, 197, 94, 0.05)' : 'none',
                  transition: 'all 0.2s ease-in-out',
                }}
                placeholder={scrapeYoutube ? "Enter query to search YouTube directly..." : "Message YouTube Advisor..."}
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
            <p className="text-[10px] text-center mt-2 text-[var(--text-muted)] opacity-60">
              Trained on S-tier YouTube growth framework · Long-term context persistent
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
