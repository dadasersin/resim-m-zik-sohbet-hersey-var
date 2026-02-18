
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { AspectRatio } from '../types';

interface MediaData {
  data: string;
  mimeType: string;
}

const VisualsView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'generate' | 'edit' | 'video'>('generate');
  const [aspectRatio] = useState<AspectRatio>('1:1');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaData | null>(null);
  const [lastOperation, setLastOperation] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setSelectedMedia({ data: base64, mimeType: file.type });
      setMode('edit');
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const triggerProcess = async (isExtension: boolean = false) => {
    if (!prompt.trim() && !selectedMedia && !isExtension) return;
    setLoading(true);
    setResult(null);
    setStatus('İşlem Başlatılıyor...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      if (mode === 'generate') {
        setStatus('Görsel Çiziliyor...');
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt || "Digital art" }] },
          config: { imageConfig: { aspectRatio } }
        });
        
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart?.inlineData) {
          setResult({ url: `data:image/png;base64,${imagePart.inlineData.data}`, type: 'image' });
        }
      } 
      else if (mode === 'edit' && selectedMedia) {
        setStatus('Görsel Düzenleniyor...');
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: selectedMedia.data, mimeType: selectedMedia.mimeType } },
              { text: prompt || "Edit this image" }
            ]
          }
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart?.inlineData) {
          setResult({ url: `data:image/png;base64,${imagePart.inlineData.data}`, type: 'image' });
        }
      } 
      else if (mode === 'video' || isExtension) {
        const aiStudio = (window as any).aistudio;
        if (aiStudio && !(await aiStudio.hasSelectedApiKey())) {
          await aiStudio.openSelectKey();
        }

        let operation;
        if (isExtension && lastOperation) {
          setStatus('Video Uzatılıyor...');
          operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: prompt || 'Continue',
            video: lastOperation.response?.generatedVideos?.[0]?.video,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: (aspectRatio === '9:16' || aspectRatio === '16:9') ? aspectRatio : '16:9' }
          });
        } else {
          setStatus('Video Hazırlanıyor (1-2 dk)...');
          operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: selectedMedia ? { imageBytes: selectedMedia.data, mimeType: selectedMedia.mimeType } : undefined,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: (aspectRatio === '9:16' || aspectRatio === '16:9') ? aspectRatio : '16:9' }
          });
        }

        while (!operation.done) {
          await new Promise(r => setTimeout(r, 10000));
          operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        setLastOperation(operation);
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          const videoRes = await fetch(`${downloadLink}&key=${process.env.API_KEY || ''}`);
          const blob = await videoRes.blob();
          setResult({ url: URL.createObjectURL(blob), type: 'video' });
        }
      }
    } catch (error: any) {
      console.error('Hata:', error);
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        alert("API KOTASI DOLDU: Ücretsiz kullanım sınırına ulaştınız.");
      } else {
        alert(`Bir hata oluştu: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-950 h-full overflow-hidden">
      <div className="w-full md:w-80 glass-panel border-r border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto max-h-[40%] md:max-h-full">
        <h2 className="text-xl font-bold flex items-center gap-3">
          <i className="fa-solid fa-wand-magic-sparkles text-indigo-500"></i>
          Stüdyo
        </h2>
        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
          {(['generate', 'edit', 'video'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ne üretmek veya düzenlemek istersiniz?" className="w-full h-32 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm focus:border-indigo-500 outline-none text-slate-100 placeholder:text-slate-600" />
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => cameraInputRef.current?.click()} 
              className="flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-white transition-all text-xs font-bold"
            >
              <i className="fa-solid fa-camera"></i> KAMERA
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-white transition-all text-xs font-bold"
            >
              <i className="fa-solid fa-upload"></i> YÜKLE
            </button>
          </div>

          <input type="file" ref={cameraInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" capture="environment" />
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,video/*" />

          {selectedMedia && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-400 truncate uppercase tracking-widest">Medya Hazır</span>
              <button onClick={() => setSelectedMedia(null)} className="text-slate-500 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
            </div>
          )}

          <button disabled={loading} onClick={() => triggerProcess()} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-600/20 disabled:opacity-50 transition-all">
            {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'BAŞLAT'}
          </button>
        </div>
      </div>
      <div className="flex-1 p-6 flex items-center justify-center relative bg-slate-950/50">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center text-center p-8 backdrop-blur-sm">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-bold text-indigo-400 animate-pulse">{status}</h2>
          </div>
        )}
        <div className="w-full h-full max-w-4xl rounded-[2rem] border border-slate-800/50 bg-slate-900/50 flex items-center justify-center overflow-hidden">
          {result ? (
            result.type === 'image' ? (
              <img src={result.url} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-500" alt="Result" />
            ) : (
              <video src={result.url} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" />
            )
          ) : (
            <div className="text-slate-800 flex flex-col items-center gap-4 opacity-20">
              <i className="fa-solid fa-mountain-sun text-8xl"></i>
              <p className="text-xs font-black uppercase tracking-widest">Çıktı Bekleniyor</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualsView;
