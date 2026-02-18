
import React, { useState, useEffect, useRef } from 'react';

interface VoiceAssistantProps {
  onCommand: (command: string, action: string, payload: string) => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'tr-TR';

      recognitionRef.current.onresult = (event: any) => {
        const command = event.results[0][0].transcript.toLowerCase().trim();
        setTranscript(command);
        processCommand(command);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const processCommand = (text: string) => {
    // Sohbet Komutu
    if (text.startsWith('sohbet') || text.startsWith('mesaj')) {
      const payload = text.replace(/^(sohbet|mesaj|mesaj gönder)\s*(mesajı|gönder)?\s*/i, '');
      onCommand('chat', 'chat', payload);
    } 
    // Görsel Komutu
    else if (text.startsWith('görsel') || text.startsWith('resim')) {
      const payload = text.replace(/^(görsel|resim)\s*(üret|yap|oluştur)?\s*/i, '');
      onCommand('visuals', 'visuals', payload);
    }
    // Video Komutu
    else if (text.startsWith('video')) {
      const payload = text.replace(/^video\s*(üret|yap|oluştur)?\s*/i, '');
      onCommand('visuals', 'visuals', payload);
    }
    // Ses Remix Komutu: "Sesi remixle: lofi tarzında"
    else if (text.includes('remix') || text.startsWith('sesi değiştir')) {
      const payload = text.replace(/^(remix|ses remix|sesi değiştir|audio remix)\s*(yap|et|le)?\s*/i, '');
      onCommand('audio', 'audio-remix', payload);
    }
    // Metinden Sese / TTS Komutu: "Seslendir: Merhaba dünya"
    else if (text.startsWith('ses') || text.startsWith('tts') || text.includes('metinden sese') || text.includes('text to speech')) {
      const payload = text.replace(/^(ses|seslendir|tts|metinden sese|text to speech)\s*(yap|oku)?\s*/i, '');
      onCommand('audio', 'audio-tts', payload);
    }
    // Canlı Komutu
    else if (text.includes('canlı') && (text.includes('başlat') || text.includes('aç'))) {
      onCommand('live', 'live-start', '');
    }
    else if (text.includes('canlı') && (text.includes('durdur') || text.includes('kapat') || text.includes('bitir'))) {
      onCommand('live', 'live-stop', '');
    }
    // Gezinme Komutu
    else if (text.includes('aç') || text.includes('git')) {
      onCommand('nav', 'nav', text);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  if (!recognitionRef.current) return null;

  return (
    <div className="fixed bottom-20 right-6 md:bottom-8 md:right-8 z-[100] flex flex-col items-end gap-3">
      {transcript && (
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-2xl text-xs text-indigo-400 font-medium animate-in slide-in-from-bottom-2 fade-in">
          "{transcript}"
        </div>
      )}
      <button
        onClick={toggleListening}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
          isListening 
            ? 'bg-red-500 scale-110 shadow-red-500/40' 
            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/40'
        }`}
      >
        <div className={`absolute inset-0 rounded-full bg-current opacity-20 ${isListening ? 'animate-ping' : ''}`}></div>
        <i className={`fa-solid ${isListening ? 'fa-stop' : 'fa-microphone'} text-xl text-white`}></i>
      </button>
    </div>
  );
};

export default VoiceAssistant;
