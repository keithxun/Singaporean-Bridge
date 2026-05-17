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
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  }

  return (
    <div className="bg-panel border-2 border-wood-dark rounded p-3 space-y-2 max-h-48 md:max-h-64 flex flex-col h-full">
      <div className="text-xs text-wood font-semibold">Chat</div>
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {messages.length === 0 ? (
          <div className="text-xs text-ink/50 italic">No messages yet</div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="text-xs">
              <span className="font-semibold text-wood">{msg.name}:</span>{' '}
              <span className="text-ink break-words">{msg.text}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 flex-col md:flex-row flex-shrink-0">
        <input
          className="flex-1 bg-white border-2 border-wood-dark rounded px-3 py-2 text-xs md:py-1 text-ink placeholder-ink/40"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message…"
          maxLength={200}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-felt hover:bg-felt-dark disabled:opacity-40 text-white rounded px-4 py-2 md:px-3 md:py-1 text-xs font-semibold flex-shrink-0 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
