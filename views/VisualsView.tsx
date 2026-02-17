
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { VisualAsset } from '../types';

interface ImageAsset {
  data: string;
  mimeType: string;
}

const VisualsView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'image' | 'video' | 'video_edit'>('image');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImageAsset[]>([]);
  const [history, setHistory] = useState<VisualAsset[]>([]);
  const [lastOperation, setLastOperation] = useState<any>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('visual_assets');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('visual_assets', JSON.stringify(history));
  }, [history]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    (Array.from(files) as File[]).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        setSelectedImages(prev => [...prev, { data: base64String, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.src = url;
      hiddenVideoRef.current.onloadeddata = () => {
        const video = hiddenVideoRef.current!;
        const canvas = canvasRef.current!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const frameData = canvas.toDataURL('image/png').split(',')[1];
        
        // Videodan alınan kareyi kaynak olarak kullan
        setSelectedImages([{ data: frameData, mimeType: 'image/png' }]);
        setMode('video_edit');
        setPrompt("Bu videoyu şu sanatsal tarzda yeniden hayal et: ");
      };
    }
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    if (selectedImages.length === 1) setUploadedVideoUrl(null);
  };

  const addToHistory = (url: string, type: 'image' | 'video', assetPrompt: string) => {
    const newAsset: VisualAsset = {
      id: Date.now().toString(),
      type,
      url,
      prompt: assetPrompt,
      timestamp: Date.now()
    };
    setHistory(prev => [newAsset, ...prev].slice(0, 50));
  };

  const handleGenerate = async (extension: boolean = false) => {
    if (!prompt.trim() && selectedImages.length === 0 && !extension) return;
    setLoading(true);
    setResult(null);
    setStatus('Yapay Zeka Hazırlanıyor...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      if (mode === 'image') {
        const parts: any[] = selectedImages.map(img => ({ inlineData: { data: img.data, mimeType: img.mimeType } }));
        parts.push({ text: prompt || "Bir başyapıt oluştur." });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: parts },
          config: { imageConfig: { aspectRatio: '1:1' } }
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const dataUrl = `data:image/png;base64,${part.inlineData.data}`;
              setResult(dataUrl);
              addToHistory(dataUrl, 'image', prompt);
              break;
            }
          }
        }
      } else {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio?.openSelectKey();

        setStatus(extension ? 'Video +7 saniye uzatılıyor...' : 'Video motoru çalıştırılıyor...');
        
        let operation;
        if (extension && lastOperation) {
          // Uzatma işlemi için Veo modelini kullan
          operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: prompt || 'Akıcı bir şekilde devam et',
            video: lastOperation.response?.generatedVideos?.[0]?.video,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
          });
        } else {
          // Yeni video veya düzenleme işlemi (başlangıç karesi kullanarak)
          operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: selectedImages.length > 0 ? {
              imageBytes: selectedImages[0].data,
              mimeType: selectedImages[0].mimeType
            } : undefined,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
          });
        }

        let retryCount = 0;
        while (!operation.done) {
          setStatus(`İşlem devam ediyor... Beklediğiniz için teşekkürler. (${retryCount * 10}sn)`);
          await new Promise(r => setTimeout(r, 10000));
          operation = await ai.operations.getVideosOperation({ operation: operation });
          retryCount++;
          if (retryCount > 60) throw new Error("İşlem zaman aşımına uğradı. Video üretimi normalden uzun sürüyor.");
        }

        setLastOperation(operation);
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          const videoRes = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
          const blob = await videoRes.blob();
          const videoUrl = URL.createObjectURL(blob);
          setResult(videoUrl);
          addToHistory(videoUrl, 'video', prompt);
        }
      }
    } catch (error: any) {
      console.error('Hata:', error);
      setStatus(`Hata: ${error.message || 'Bilinmeyen bir hata oluştu.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-950 overflow-hidden h-full pb-16 md:pb-0">
      <video ref={hiddenVideoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="w-full md:w-96 glass-panel border-b md:border-b-0 md:border-r border-slate-800 p-4 md:p-6 space-y-4 md:space-y-6 flex flex-col overflow-y-auto max-h-[50%] md:max-h-full">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <i className="fa-solid fa-clapperboard text-indigo-500"></i>
            Multimedya Studio
          </h2>
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
        </header>

        <div className="flex p-1 bg-slate-900 rounded-2xl border border-slate-800">
          <button onClick={() => setMode('image')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${mode === 'image' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>RESİM</button>
          <button onClick={() => setMode('video')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${mode === 'video' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>VİDEO ÜRET</button>
          <button onClick={() => videoInputRef.current?.click()} className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${mode === 'video_edit' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>VİDEO DÜZENLE</button>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Medya Yükle</label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-5 border border-slate-800 rounded-3xl hover:bg-slate-900 hover:border-indigo-500/50 transition-all gap-2 group aspect-square">
              <i className="fa-solid fa-images text-slate-600 group-hover:text-indigo-400 text-2xl"></i>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Galeri</span>
            </button>
            <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center justify-center p-5 border border-slate-800 rounded-3xl hover:bg-slate-900 hover:border-amber-500/50 transition-all gap-2 group aspect-square">
              <i className="fa-solid fa-film text-slate-600 group-hover:text-amber-400 text-2xl"></i>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">VİDEO EKLE</span>
            </button>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
          <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoUpload} />

          {selectedImages.length > 0 && (
            <div className="space-y-2 animate-in fade-in">
              <p className="text-[10px] font-bold text-slate-600 uppercase">Seçili Kaynaklar</p>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {selectedImages.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border border-slate-700 group ring-2 ring-indigo-500/20">
                    <img src={`data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" alt="Kaynak" />
                    <button onClick={() => removeSelectedImage(i)} className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <i className="fa-solid fa-trash text-white text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">YZ Komutu (Oynama Yapın)</label>
          <textarea 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)} 
            placeholder={mode === 'video_edit' ? "Videonun sanatsal tarzını değiştirin..." : "Sahneyi tarif edin..."} 
            className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 text-sm h-32 focus:outline-none focus:border-indigo-500 transition-all resize-none shadow-inner leading-relaxed" 
          />
        </div>

        <button 
          onClick={() => handleGenerate()} 
          disabled={loading || (!prompt.trim() && selectedImages.length === 0)} 
          className={`w-full py-4.5 rounded-3xl font-bold transition-all shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 ${mode === 'video_edit' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'}`}
        >
          {loading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
          <span className="tracking-wide uppercase text-xs">{loading ? 'ÜRETİLİYOR...' : mode === 'video_edit' ? 'VİDEOYU BAŞTAN YARAT' : 'ŞİMDİ ÜRET'}</span>
        </button>

        {loading && (
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
            <p className="text-[10px] text-center text-indigo-400 font-bold animate-pulse uppercase tracking-wider">{status}</p>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800">
           <p className="text-[10px] font-bold text-slate-600 uppercase mb-4 tracking-widest">Geçmiş Çalışmalar</p>
           <div className="grid grid-cols-4 gap-2">
              {history.map(asset => (
                <button 
                  key={asset.id} 
                  onClick={() => setResult(asset.url)} 
                  className="w-full aspect-square rounded-xl overflow-hidden border border-slate-800 hover:border-indigo-500 transition-all"
                >
                  <img src={asset.url.includes('video') ? 'https://cdn-icons-png.flaticon.com/512/306/306066.png' : asset.url} className="w-full h-full object-cover" alt="Tarihçe" />
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-12 bg-slate-950 flex flex-col items-center justify-center overflow-auto min-h-[400px]">
        {result ? (
          <div className="w-full max-w-4xl animate-in fade-in zoom-in duration-700">
             <div className="glass-panel p-2.5 rounded-[2.5rem] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] mb-8 overflow-hidden relative group">
                {result.includes('blob') || result.includes('mp4') || result.includes('video') ? (
                  <video src={result} controls autoPlay className="w-full rounded-[2rem] block" />
                ) : (
                  <img src={result} className="w-full rounded-[2rem] block" alt="Sonuç" />
                )}
             </div>
             <div className="flex flex-wrap gap-4 justify-center">
                {result.includes('blob') && (
                  <button 
                    onClick={() => handleGenerate(true)} 
                    disabled={loading} 
                    className="px-8 py-4 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/20 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg"
                  >
                    <i className="fa-solid fa-plus"></i> +7 SANİYE UZAT (VEO)
                  </button>
                )}
                <a 
                  href={result} 
                  download={`ai-studio-${Date.now()}`} 
                  className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 shadow-lg"
                >
                  <i className="fa-solid fa-download"></i> İNDİR
                </a>
                <button 
                  onClick={() => {setResult(null); setLastOperation(null); setUploadedVideoUrl(null);}} 
                  className="px-8 py-4 bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300 rounded-2xl text-xs font-bold transition-all"
                >
                  YENİ ÇALIŞMA
                </button>
             </div>
          </div>
        ) : (
          <div className="text-center">
             {uploadedVideoUrl ? (
               <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8">
                  <div className="glass-panel p-2.5 rounded-[2.5rem] border border-slate-800 shadow-2xl mb-8">
                    <video src={uploadedVideoUrl} controls className="w-full rounded-[2rem] block" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Video yüklendi. Şimdi sol taraftan nasıl bir "oynama" yapmak istediğinizi yazın.</p>
               </div>
             ) : (
               <div className="opacity-20 flex flex-col items-center">
                 <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center mb-8 animate-[spin_10s_linear_infinite]">
                    <i className="fa-solid fa-clapperboard text-5xl"></i>
                 </div>
                 <h3 className="text-2xl font-bold">Laboratuvar Aktif</h3>
                 <p className="text-sm mt-4 max-w-xs mx-auto">Dosya yükleyin, prompt yazın ve YZ ile multimedya dünyasında sınırları zorlayın.</p>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualsView;
