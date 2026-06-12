import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../../shared/types';
import { SendIcon, MessageCircleIcon, XIcon } from 'lucide-react';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentPlayerId: string;
}

const MessageFeed: React.FC<{ messages: ChatMessage[]; currentPlayerId: string }> = ({ messages, currentPlayerId }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth">
      {messages.length === 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-600 text-center pt-6">No messages yet — say hi!</p>
      )}
      {messages.map((msg) => {
        const mine = msg.playerId === currentPlayerId;
        return (
          <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2 mb-0.5 px-1">
              <span className="text-[10px] font-bold" style={{ color: msg.playerColor }}>
                {msg.playerName}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-600">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div
              className={`px-3 py-1.5 rounded-2xl text-sm max-w-[85%] break-words ${
                mine
                  ? 'bg-sky-600 text-white rounded-br-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ChatInput: React.FC<{ onSendMessage: (text: string) => void }> = ({ onSendMessage }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-2 border-t border-slate-200 dark:border-slate-800 flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all"
      />
      <button
        type="submit"
        aria-label="Send message"
        className="p-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-40 shrink-0"
        disabled={!text.trim()}
      >
        <SendIcon size={16} />
      </button>
    </form>
  );
};

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, currentPlayerId }) => {
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);

  const closeSheet = () => {
    setSeenCount(messages.length);
    setOpen(false);
  };

  const unread = open ? 0 : Math.max(0, messages.length - seenCount);

  return (
    <>
      {/* Desktop: inline card */}
      <div className="hidden lg:flex bg-white dark:bg-slate-900 rounded-xl flex-col h-[360px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 pt-3 pb-2">
          Chat
        </h3>
        <MessageFeed messages={messages} currentPlayerId={currentPlayerId} />
        <ChatInput onSendMessage={onSendMessage} />
      </div>

      {/* Mobile: floating button + bottom sheet */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 p-3.5 rounded-full bg-sky-600 text-white shadow-lg shadow-sky-600/30 active:scale-95 transition-transform"
        title="Open chat"
        aria-label="Open chat"
      >
        <MessageCircleIcon size={22} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 anim-fade" onClick={closeSheet} />
          <div className="absolute inset-x-0 bottom-0 h-[65dvh] bg-white dark:bg-slate-900 rounded-t-2xl flex flex-col overflow-hidden anim-sheet">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold">Chat</h3>
              <button onClick={closeSheet} aria-label="Close chat" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <XIcon size={18} />
              </button>
            </div>
            <MessageFeed messages={messages} currentPlayerId={currentPlayerId} />
            <ChatInput onSendMessage={onSendMessage} />
          </div>
        </div>
      )}
    </>
  );
};

export default Chat;
