'use client';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@sgb/shared';

export function Chat({
  messages,
  onSendMessage,
}: {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  }

  return (
    <div className="bg-emerald-950/70 rounded p-3 space-y-2 max-h-64 flex flex-col">
      <div className="text-xs text-emerald-300 font-semibold">Chat</div>
      <div className="flex-1 overflow-y-auto space-y-1 min-h-20">
        {messages.length === 0 ? (
          <div className="text-xs text-emerald-500 italic">No messages yet</div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="text-xs">
              <span className="font-semibold text-emerald-300">{msg.name}:</span>{' '}
              <span className="text-emerald-100 break-words">{msg.text}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-1">
        <input
          className="flex-1 bg-emerald-900 border border-emerald-700 rounded px-2 py-1 text-xs"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message…"
          maxLength={200}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded px-2 py-1 text-xs font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
}
