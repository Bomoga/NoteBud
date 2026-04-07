'use client';

import { useRef, useState, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
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
      <div className="px-4 py-3 border-b border-white/20 flex-shrink-0">
        <p className="text-sm font-semibold text-slate-700">Notebook Chat</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-green-600/80 text-white'
                  : 'bg-white/40 text-slate-800 border border-white/30'
              }`}
            >
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {msg.content}
                {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                  <span className="inline-block w-1 h-3 ml-0.5 bg-slate-500 animate-pulse align-middle" />
                )}
              </p>

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/30 space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Sources</p>
                  {msg.citations.map((c, ci) => (
                    <div key={ci} className="text-[11px] text-slate-500 leading-snug">
                      <span className="font-medium text-slate-600">{c.filename}</span>
                      {' · '}
                      <span className="italic">{c.snippet}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Low confidence warning */}
              {msg.low_confidence && msg.role === 'assistant' && !isStreaming && (
                <p className="mt-1 text-[10px] text-amber-600">
                  Low confidence — limited relevant content found.
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-white/20">
        <div className="flex items-end gap-2 bg-white/30 border border-white/40 rounded-xl px-3 py-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder=""
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none min-h-[20px] max-h-[120px] leading-5 disabled:opacity-50"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 rounded-lg p-1.5 text-green-600 hover:bg-green-600/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
