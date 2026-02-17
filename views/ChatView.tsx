
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../types';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Başlangıçta yerel depolamadan yükle
  useEffect(() => {
    const saved = localStorage.getItem('chat_history');
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  // Mesajlar değiştikçe yerel depolamaya kaydet
  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Create a new GoogleGenAI instance right before use
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: 'user', parts: [{ text: input }] }],
        config: {
          systemInstruction: 'Sen yardımcı ve zeki bir asistansın. Her zaman Türkçe cevap ver.'
        }
      });

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || 'Üzgünüm, bir cevap oluşturamadım.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat hatası:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: 'Hata: API bağlantısı başarısız oldu.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950">
      <div className="p-4 border-b border-slate-800 glass-panel flex justify-between items-center">
        <div>
          <h2 className="font-bold">Gemini 3 Flash Sohbet</h2>
          <p className="text-xs text-green-500">Oto-Senkronizasyon Aktif</p>
        </div>
        <button 
          onClick={() => {
            if(confirm('Tüm geçmiş silinecek, emin misiniz?')) {
              setMessages([]);
              localStorage.removeItem('chat_history');
            }
          }}
          className="text-xs px-3 py-1 bg-red-900/20 text-red-400 border border-red-500/20 rounded hover:bg-red-900/40 transition"
        >
          Geçmişi Temizle
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <i className="fa-solid fa-comments text-6xl mb-4"></i>
            <p>Sohbete başlayın. Tüm konuşmalar GitHub'a yedeklenecektir.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-100'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
              <p className="text-[10px] mt-1 opacity-40 text-right">
                {new Date(m.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl px-4 py-3 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 glass-panel border-t border-slate-800">
        <form onSubmit={handleSend} className="relative max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mesajınızı yazın..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition shadow-inner"
          />
          <button
            type="submit"
            disabled={isTyping}
            className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl transition font-bold disabled:opacity-50 shadow-lg"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;
