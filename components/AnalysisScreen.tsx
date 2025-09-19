import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlantData, ColorPalette, Language } from '../types';
import PlantInfo from './PlantInfo';
import CareGuide from './CareGuide';
import PlantModel3D from './PlantModel3D';
import { Translations } from '../i18n/locales';

const ResetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 2v6h6"></path><path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path><path d="M21 22v-6h-6"></path><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
    </svg>
);

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M8 5v14l11-7z"></path>
    </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M6 6h12v12H6z"></path>
    </svg>
);

const LoadingIcon = () => (
    <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin" style={{ borderColor: 'var(--color-background) transparent var(--color-background) transparent' }}></div>
);

const ParallaxBackground = ({ scrollY }: { scrollY: number }) => (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div 
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl" 
            style={{ 
                backgroundColor: 'var(--color-primary)',
                transform: `translateY(${scrollY * 0.2}px)`
            }}
        />
        <div 
            className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl" 
            style={{ 
                backgroundColor: 'var(--color-accent)',
                transform: `translateY(${scrollY * 0.1}px)`
            }}
        />
    </div>
);

interface AnalysisScreenProps {
  plantData: PlantData;
  colorPalette: ColorPalette;
  onReset: () => void;
  t: Translations['en'];
  lang: Language;
  onLangToggle: () => void;
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ plantData, colorPalette, onReset, t, lang, onLangToggle }) => {
  type PlaybackState = 'stopped' | 'loading' | 'playing';
  
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [scrollY, setScrollY] = useState(0);
  const [wsSession, setWsSession] = useState<WebSocket | null>(null);
  const [audioData, setAudioData] = useState<number>(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const nextChunkTimeRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            setScrollY(window.scrollY);
        } else if (contentRef.current) {
            setScrollY(contentRef.current.scrollTop);
        }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    contentRef.current?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
        window.removeEventListener('scroll', handleScroll);
        contentRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const context = new AudioContext({ sampleRate: 48000 });
    audioContextRef.current = context;

    const analyser = context.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
    analyserNodeRef.current = analyser;
    
    gainNodeRef.current = context.createGain();
    
    analyserNodeRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(context.destination);
    
    return () => {
      if (wsSession) {
        wsSession.close();
      }
      if (audioContextRef.current?.state !== 'closed') {
         audioContextRef.current?.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const analyse = () => {
        if (playbackState === 'playing' && analyserNodeRef.current) {
            const bufferLength = analyserNodeRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserNodeRef.current.getByteTimeDomainData(dataArray);
            
            let sumSquares = 0.0;
            for (const amplitude of dataArray) {
                const normalized = amplitude / 128.0 - 1.0;
                sumSquares += normalized * normalized;
            }
            const rms = Math.sqrt(sumSquares / bufferLength);
            setAudioData(Math.min(1.0, rms * 3.0));
        } else {
            setAudioData(prev => Math.max(0, prev * 0.95 - 0.01));
        }
        animationFrameId = requestAnimationFrame(analyse);
    };

    analyse();

    return () => cancelAnimationFrame(animationFrameId);
  }, [playbackState]);

  const stopAudio = useCallback(async () => {
    if (wsSession) {
      if(wsSession.readyState === WebSocket.OPEN) {
        wsSession.send(JSON.stringify({
          playback_control: "STOP"
        }));
      }
      wsSession.close();
      setWsSession(null);
    }
    if (audioContextRef.current?.state === 'running') {
      await audioContextRef.current.suspend();
    }
    setPlaybackState('stopped');
    nextChunkTimeRef.current = 0;
  }, [wsSession]);

  const handleToggleAudio = async () => {
    if (playbackState === 'playing' || playbackState === 'loading') {
      await stopAudio();
      return;
    }
    
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    if (audioContext.state === 'suspended') await audioContext.resume();
    
    setPlaybackState('loading');
    nextChunkTimeRef.current = audioContext.currentTime;

    if (!process.env.API_KEY) {
      console.error("API_KEY environment variable not set.");
      alert("Music generation is currently unavailable: API Key is missing.");
      await stopAudio();
      return;
    }

    try {
      const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateMusic?key=${process.env.API_KEY}`);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          setup: {
            model: "models/lyria-realtime-exp"
          }
        }));
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        
        if (message.setupComplete) {
          const descriptionText = (plantData.poeticDescription || []).join(' ');
          const weightedPrompts = [
            { text: `Atmospheric ambient electronic music inspired by: ${descriptionText}`, weight: 1.0 }
          ];

          (plantData.funFacts || []).forEach((fact, index) => {
            if (index < 3) {
              weightedPrompts.push({
                text: `Musical elements from: ${fact}`,
                weight: 0.5 - index * 0.1
              });
            }
          });

          ws.send(JSON.stringify({
            client_content: {
              weighted_prompts: weightedPrompts
            }
          }));

          ws.send(JSON.stringify({
            music_generation_config: {
              bpm: 80,
              temperature: 1.1,
              guidance: 3.5,
              brightness: 0.7,
              density: 0.6
            }
          }));

          ws.send(JSON.stringify({
            playback_control: "PLAY"
          }));
        }

        if (message.server_content?.audio_chunks) {
          setPlaybackState('playing');
          for (const chunk of message.server_content.audio_chunks) {
            try {
              const arrayBuffer = Uint8Array.from(atob(chunk.data), c => c.charCodeAt(0)).buffer;
              const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserNodeRef.current!);
              
              const currentTime = audioContext.currentTime;
              const startTime = Math.max(currentTime, nextChunkTimeRef.current);
              source.start(startTime);
              nextChunkTimeRef.current = startTime + audioBuffer.duration;
            } catch (e) {
              console.error("Audio processing error:", e);
            }
          }
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        alert(t.errorTitle + ": " + t.soundUnavailable);
        stopAudio();
      };

      ws.onclose = () => {
        setPlaybackState('stopped');
      };

      setWsSession(ws);

    } catch (error) {
      console.error("WebSocket setup error:", error);
      await stopAudio();
    }
  };
  
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const renderButtonContent = () => {
    switch (playbackState) {
      case 'loading': return <><LoadingIcon /> {t.generatingSound}</>;
      case 'playing': return <><StopIcon /> {t.stopSound}</>;
      case 'stopped': default: return <><PlayIcon /> {t.listenButton}</>;
    }
  };

  return (
    <div className="w-full min-h-screen relative transition-colors duration-1000 animate-fade-in" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
      <ParallaxBackground scrollY={scrollY} />
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-30 flex gap-2">
        <button onClick={onLangToggle} className="p-3 text-sm font-bold rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50">
            {lang === 'en' ? 'ES' : 'EN'}
        </button>
        <button onClick={onReset} className="p-3 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50">
          <ResetIcon />
        </button>
      </div>
      
      <div className="w-full max-w-7xl mx-auto md:flex md:gap-8 lg:gap-16 relative z-10">
        <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0 md:h-screen md:sticky md:top-0">
           <div className="w-full h-full animate-grow-in">
             <PlantModel3D modelData={plantData.modelData} audioData={audioData} />
           </div>
        </div>

        <div ref={contentRef} className="flex-1 md:h-screen md:overflow-y-auto scrollbar-hide">
            <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left p-6 md:py-24 min-h-[calc(100vh-250px)] md:min-h-screen">
                <div className="w-full max-w-md">
                    <PlantInfo poeticDescription={plantData.poeticDescription} funFacts={plantData.funFacts} isToxic={plantData.isToxic} t={t} />
                    <div className="mt-8 mb-12">
                        <button
                            onClick={handleToggleAudio}
                            disabled={playbackState === 'loading'}
                            className="w-64 px-6 py-4 rounded-full font-bold text-lg shadow-lg transform transition-all duration-300 ease-in-out hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-70 disabled:scale-100 mx-auto md:mx-0"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
                        >
                            {renderButtonContent()}
                        </button>
                    </div>
                </div>
                
                <CareGuide careGuide={plantData.careGuide} t={t} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisScreen;