
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

const AudioView: React.FC = () => {
  const [mode, setMode] = useState<'tts' | 'remix'>('remix');
  const [text, setText] = useState('Modüler YZ platformuna hoş geldiniz.');
  const [remixPrompt, setRemixPrompt] = useState('Bu sesi daha enerjik, cyberpunk bir atmosfere dönüştür.');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [selectedAudio, setSelectedAudio] = useState<{data: string, name: string, mimeType: string} | null>(null);
  const [audioResult, setAudioResult] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

  useEffect(() => {
    const handleVoice = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      // Handle both legacy (string) and new (object) detail formats
      const p = typeof detail === 'object' ? detail.prompt : detail;
      const m = typeof detail === 'object' ? detail.mode : 'tts';

      if (p) {
        if (m === 'remix') {
          setRemixPrompt(p);
          setMode('remix');
          // Wait for state to settle
          setTimeout(() => triggerProcess(''), 100);
        } else {
          setText(p);
          setMode('tts');
          // Wait for state to settle
          setTimeout(() => triggerProcess(p), 100);
        }
      }
    };
    window.addEventListener('voice-audio', handleVoice);
    return () => window.removeEventListener('voice-audio', handleVoice);
  }, []);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setSelectedAudio({ 
        data: base64, 
        name: file.name,
        mimeType: file.type || 'audio/mp3'
      });
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          setSelectedAudio({ 
            data: base64, 
            name: `Ses Kaydı-${new Date().toLocaleTimeString()}.mp3`,
            mimeType: 'audio/mp3'
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Mikrofon erişimi sağlanamadı.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const triggerProcess = async (currentText: string) => {
    setIsSynthesizing(true);
    setAudioResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let response;
      // Note: In remix mode, 'mode' check relies on state being updated by the caller's setTimeout
      if (mode === 'tts' || (currentText && currentText.length > 0)) {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: currentText || text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
          },
        });
      } else {
        if (!selectedAudio) {
            alert("Lütfen önce bir ses dosyası yükleyin.");
            return;
        }
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          contents: {
            parts: [
              { inlineData: { mimeType: selectedAudio.mimeType, data: selectedAudio.data } },
              { text: `Bu ses dosyasını şu talimata göre remiksle ve değiştir: ${remixPrompt}. Sonuç olarak sadece yeni ses dosyasını pcm formatında döndür.` }
            ]
          },
          config: { responseModalities: [Modality.AUDIO] }
        });
      }

      const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decodedBytes = decode(base64Audio);
        const buffer = await decodeAudioData(decodedBytes, audioCtx, 24000, 1);
        
        const pcmBlob = new Blob([decodedBytes], { type: 'audio/pcm' });
        setAudioResult(URL.createObjectURL(pcmBlob));

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start();
      }
    } catch (error: any) {
      console.error('Ses Hatası:', error);
      alert(`Hata: ${error.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const processAudio = () => {
    triggerProcess(mode === 'tts' ? text : '');
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-950 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
        <header className="text-center">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-emerald-600/20 ring-1 ring-emerald-400/30">
            <i className="fa-solid fa-music text-3xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Ses & Remix Laboratuvarı</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <p className="text-slate-400">Şarkı yükleyin veya metni sese dönüştürün.</p>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              <i className="fa-solid fa-microphone"></i> Ses Hazır
            </span>
          </div>
        </header>

        <div className="flex p-1.5 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-xl">
          <button onClick={() => setMode('remix')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${mode === 'remix' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ŞARKI REMIX</button>
          <button onClick={() => setMode('tts')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${mode === 'tts' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>METİNDEN SESE (TTS)</button>
        </div>

        <div className="glass-panel p-6 rounded-[2rem] space-y-6 border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full group-hover:bg-purple-500/20 transition-all duration-700"></div>
          
          {mode === 'remix' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => audioInputRef.current?.click()} 
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 rounded-3xl hover:bg-slate-800/50 hover:border-purple-500 transition-all gap-3 group/btn active:scale-95"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-600 group-hover/btn:text-purple-400 transition-all"></i>
                  <div className="text-center">
                    <span className="block text-sm font-bold text-slate-300">TELEFONDAN ŞARKI SEÇ</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Tüm Ses Dosyaları</span>
                  </div>
                </button>
                
                <button 
                  onClick={isRecording ? stopRecording : startRecording} 
                  className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl transition-all gap-3 group/btn active:scale-95 ${isRecording ? 'border-red-500 bg-red-500/10 animate-pulse' : 'border-slate-800 hover:bg-slate-800/50 hover:border-red-500/50'}`}
                >
                  <i className={`fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone'} text-3xl ${isRecording ? 'text-red-500' : 'text-slate-600 group-hover/btn:text-red-400'}`}></i>
                  <div className="text-center">
                    <span className="block text-sm font-bold text-slate-300">{isRecording ? 'KAYDI DURDUR' : 'SESİNİ KAYDET'}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Anlık Mikrofon</span>
                  </div>
                </button>
              </div>
              
              <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleAudioUpload} />

              {selectedAudio && (
                <div className="p-4 bg-purple-600/10 border border-purple-500/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-left-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                      <i className="fa-solid fa-file-audio"></i>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-200 truncate max-w-[180px]">{selectedAudio.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase">Yüklendi</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedAudio(null)} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-wand-sparkles text-purple-400"></i>
                   REMIX TALİMATI
                </label>
                <textarea 
                  value={remixPrompt} 
                  onChange={(e) => setRemixPrompt(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 min-h-[120px] focus:outline-none focus:border-purple-500 transition-all shadow-inner text-sm leading-relaxed" 
                  placeholder="Şarkıda neyi değiştirmek istersiniz? Örn: Bu şarkıyı 80'ler synthwave tarzına çevir." 
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Giriş Metni</label>
                <textarea 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 min-h-[150px] focus:outline-none focus:border-emerald-500 transition-all shadow-inner text-sm leading-relaxed" 
                  placeholder="Seslendirmek istediğiniz metni yazın veya 'Seslendir: ...' diyerek komut verin." 
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ses Karakteri Seçin</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {voices.map(v => (
                    <button 
                      key={v} 
                      onClick={() => setSelectedVoice(v)} 
                      className={`py-3 rounded-2xl text-[10px] font-black border transition-all ${selectedVoice === v ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-600/10' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={processAudio} 
            disabled={isSynthesizing || (mode === 'remix' && !selectedAudio)} 
            className={`w-full py-5 rounded-3xl font-black transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50 active:scale-[0.98] ${mode === 'tts' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'}`}
          >
            {isSynthesizing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-play"></i>}
            <span className="tracking-widest uppercase text-xs">{isSynthesizing ? 'İŞLENİYOR...' : 'YZ ÜRETİMİ BAŞLAT'}</span>
          </button>
        </div>

        {audioResult && (
          <div className="glass-panel p-8 rounded-[2rem] border border-slate-800 animate-in slide-in-from-top-6 duration-700 bg-gradient-to-br from-indigo-500/5 to-transparent">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Sonuç Hazır</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
               <div className="flex-1 w-full bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20" onClick={() => {
                      const audio = new Audio(audioResult);
                      audio.play();
                  }}>
                    <i className="fa-solid fa-play ml-1"></i>
                  </div>
                  <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                     <div className="w-1/3 h-full bg-indigo-500 animate-pulse"></div>
                  </div>
               </div>
               
               <a 
                 href={audioResult} 
                 download={`ai-music-${Date.now()}.pcm`} 
                 className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-indigo-400 rounded-2xl text-center text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700 shadow-xl"
               >
                <i className="fa-solid fa-download"></i> İNDİR (PCM)
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioView;
