import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../../shared/types';
import { SendIcon } from 'lucide-react';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentPlayerId: string;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, currentPlayerId }) => {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl flex flex-col h-[400px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 border-bottom border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Chat</h3>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex flex-col ${msg.playerId === currentPlayerId ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-tight opacity-50" style={{ color: msg.playerColor }}>
                {msg.playerName}
              </span>
              <span className="text-[10px] opacity-30">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div 
              className={`px-3 py-2 rounded-2xl text-sm max-w-[80%] break-words ${
                msg.playerId === currentPlayerId 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
        <button 
          type="submit"
          className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={!text.trim()}
        >
          <SendIcon size={18} />
        </button>
      </form>
    </div>
  );
};

export default Chat;
