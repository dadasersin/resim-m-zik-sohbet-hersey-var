import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../types';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('chat_history');
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const triggerSend = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: 'user', parts: [{ text: text }] }],
        config: { systemInstruction: 'Sen yardımcı ve zeki bir asistansın. Her zaman Türkçe cevap ver.' }
      });

      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: response.text || 'Cevap alınamadı.', timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error('Chat hatası:', error);
      let errorMsg = 'Hata: API bağlantısı başarısız oldu.';
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'KOTA DOLDU: API kullanım limitine ulaştınız. Lütfen bekleyin veya faturalandırmalı API anahtarı kullanın.';
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: errorMsg, timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950">
      <div className="p-4 border-b border-slate-800 glass-panel flex justify-between items-center">
        <h2 className="font-bold">Gemini Sohbet</h2>
        <button onClick={() => { if(confirm('Geçmiş silinsin mi?')) { setMessages([]); localStorage.removeItem('chat_history'); } }} className="text-xs px-3 py-1 bg-red-900/20 text-red-400 rounded">Temizle</button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-100 border border-slate-700'}`}>
              <p className="whitespace-pre-wrap text-sm">{m.text}</p>
            </div>
          </div>
        ))}
        {isTyping && <div className="flex justify-start"><div className="bg-slate-800 rounded-2xl px-4 py-3 animate-pulse">...</div></div>}
      </div>
      <div className="p-4 glass-panel border-t border-slate-800">
        <form onSubmit={(e) => { e.preventDefault(); triggerSend(input); }} className="max-w-4xl mx-auto flex gap-3">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Mesaj..." className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none" />
          <button type="submit" disabled={isTyping} className="bg-indigo-600 px-6 py-3 rounded-xl"><i className="fa-solid fa-paper-plane"></i></button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;