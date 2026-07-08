'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { Meeting, ChatMessage } from '@/utils/db';

interface ChatInterfaceProps {
  meeting: Meeting;
  onUpdateMeeting: (updatedMeeting: Meeting) => void;
}

const SUGGESTED_PROMPTS = [
  'Summarize the key decisions',
  'What are the unresolved items?',
  'Draft a follow-up email to the team',
  'List all action items with their deadlines'
];

export default function ChatInterface({ meeting, onUpdateMeeting }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(meeting.messages || []);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync messages if meeting changes
  useEffect(() => {
    setMessages(meeting.messages || []);
  }, [meeting.id]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    // 1. Add User Message optimistically
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      // 2. Fetch response from Gemini chat route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          message: text
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to chat with AI.');
      }

      // 3. Update messages with final database-saved version
      setMessages(data.messages);
      
      // Update parent component's meeting state
      onUpdateMeeting({
        ...meeting,
        messages: data.messages
      });

    } catch (err) {
      console.error('Error during AI chat:', err);
      // Fallback error message
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: 'Error: Failed to fetch reply from Gemini assistant. Please verify your internet connection and API key.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  return (
    <div className="chat-tab-container fade-in">
      {/* Conversation Log */}
      <div className="glass-card chat-history">
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
            <MessageSquare size={42} style={{ opacity: 0.5 }} />
            <div>
              <h3>Ask anything about "{meeting.title}"</h3>
              <p className="paragraph-text" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Gemini has analyzed the transcript. Ask questions like: "Why did we schedule the launch?" or "Who is working on the design?"
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.role}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              <span className="chat-timestamp">{msg.timestamp}</span>
            </div>
          ))
        )}

        {isTyping && (
          <div className="chat-bubble assistant typing-bubble">
            <div className="typing-indicator">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="quick-prompts">
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button 
            key={idx} 
            className="prompt-chip" 
            onClick={() => handleSendMessage(prompt)}
            disabled={isTyping}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="chat-input-row">
        <textarea
          className="chat-text-area"
          placeholder="Ask a question about the meeting..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
        />
        <button
          className="chat-send-btn"
          onClick={() => handleSendMessage(inputValue)}
          disabled={!inputValue.trim() || isTyping}
        >
          {isTyping ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
