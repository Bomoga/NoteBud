'use client';

import { useRef, useState, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamChat, type ChatCitation } from '../lib/api/chat';
import ConnectionsPanel from './ConnectionsPanel';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: ChatCitation[];
  low_confidence?: boolean;
}

interface Props {
  notebookId: string;
}

export default function ChatPanel({ notebookId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit() {
    const query = input.trim();
    if (!query || isStreaming) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: query }]);

    // Placeholder assistant message to stream into
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        notebookId,
        query,
        (event) => {
          if ('token' in event) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + event.token,
                };
              }
              return updated;
            });
          } else if (event.done) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  citations: event.citations,
                  low_confidence: event.low_confidence,
                };
              }
              return updated;
            });
          }
        },
        controller.signal,
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: last.content || 'Something went wrong. Please try again.',
            };
          }
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-full glass-panel border border-white/30 bg-white/10 backdrop-blur-[30px] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/20 flex-shrink-0 flex items-center justify-center">
        <p className="text-lg font-semibold text-slate-700">Notebook Chat</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map((msg, i) => {
          const isLastStreaming = isStreaming && i === messages.length - 1 && msg.role === 'assistant';
          return (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-emerald-600/80 text-white'
                    : 'bg-white/40 text-white border border-white/30'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-slate max-w-none break-words
                    prose-p:leading-relaxed prose-p:my-1 prose-p:text-white
                    prose-headings:font-semibold prose-headings:my-1 prose-headings:text-white
                    prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-li:text-white
                    prose-code:bg-white/20 prose-code:rounded prose-code:px-1 prose-code:text-[11px] prose-code:text-white
                    prose-pre:bg-white/20 prose-pre:rounded-lg prose-pre:text-[11px]
                    prose-strong:text-white prose-a:text-emerald-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                )}

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/30 space-y-1">
                    <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wide">Sources</p>
                    {msg.citations.map((c, ci) => (
                      <div key={ci} className="text-[11px] text-white/70 leading-snug">
                        {c.notebook_title && (
                          <span className="inline-block mr-1.5 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-white/20 text-white/80">
                            {c.notebook_title}
                          </span>
                        )}
                        <span className="font-medium text-white/90">{c.filename}</span>
                        {' · '}
                        <span className="italic">{c.snippet}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Low confidence warning */}
                {msg.low_confidence && msg.role === 'assistant' && !isStreaming && (
                  <p className="mt-1 text-[10px] text-amber-300">
                    Low confidence — limited relevant content found.
                  </p>
                )}
              </div>

              {/* Pulsating dots shown below the bubble while streaming */}
              {isLastStreaming && (
                <div className="flex items-center gap-1 mt-1.5 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-white/20">
        <div className="flex items-center gap-2 bg-white/30 border border-white/40 rounded-xl px-3 py-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder=""
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none leading-5 disabled:opacity-50 overflow-hidden"
            style={{ height: '20px' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = '20px';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-600/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Send"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ConnectionsPanel notebookId={notebookId} />
    </div>
  );
}
