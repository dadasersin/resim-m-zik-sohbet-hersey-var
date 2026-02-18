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
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
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
    <div className="flex-1 flex flex-col bg-slate-950 h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 glass-panel flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <i className="fa-solid fa-robot text-sm"></i>
          </div>
          <h2 className="font-bold text-sm md:text-base">Gemini Sohbet</h2>
        </div>
        <button 
          onClick={() => { if(confirm('Geçmiş silinsin mi?')) { setMessages([]); localStorage.removeItem('chat_history'); } }} 
          className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-red-900/20 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-900/40 transition-all"
        >
          Temizle
        </button>
      </div>

      {/* Mesaj Listesi */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-40 gap-4">
             <i className="fa-solid fa-comments text-6xl"></i>
             <p className="text-xs font-bold uppercase tracking-widest">Sohbeti Başlatın</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-lg ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
              <span className="text-[8px] opacity-40 mt-1 block text-right">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl px-4 py-3 border border-slate-700 flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      {/* Giriş Kutusu - Mobil Menü için pb-24 eklendi */}
      <div className="p-4 pb-24 md:pb-6 glass-panel border-t border-slate-800 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); triggerSend(input); }} className="max-w-4xl mx-auto relative">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Mesajınızı yazın..." 
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-4 pr-14 py-4 text-sm focus:border-indigo-500 outline-none transition-all shadow-inner placeholder:text-slate-600" 
          />
          <button 
            type="submit" 
            disabled={isTyping || !input.trim()} 
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-lg"
          >
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </form>
        <p className="text-center text-[9px] text-slate-600 mt-3 font-medium uppercase tracking-tighter">
          Gemini 3 Flash ile güçlendirilmiştir
        </p>
      </div>
    </div>
  );
};

export default ChatView;