import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    GoogleGenAI,
    type LiveMusicSession,
    type LiveMusicServerMessage
} from '@google/genai';
import { PlantData, ColorPalette, Language } from '../types';
import PlantInfo from './PlantInfo';
import CareGuide from './CareGuide';
import PlantModel3D from './PlantModel3D';
import { decode, decodeAudioData } from '../utils/audioUtils';
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

// Type for a single weighted prompt for Lyria
interface WeightedPrompt {
  text: string;
  weight: number;
}


const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ plantData, colorPalette, onReset, t, lang, onLangToggle }) => {
  type PlaybackState = 'stopped' | 'loading' | 'playing';
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [isMusicApiAvailable, setIsMusicApiAvailable] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sessionRef = useRef<LiveMusicSession | null>(null);
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
    if (!process.env.API_KEY) {
      console.error("API_KEY environment variable not set.");
      return;
    }
    aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY, apiVersion: 'v1alpha' });

    if ((aiRef.current as any)?.live?.music?.connect) {
        setIsMusicApiAvailable(true);
    } else {
        console.warn("The 'ai.live.music.connect' API is not available. Real-time audio generation will be disabled.");
    }

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    // Lyria docs recommend 48kHz for output.
    const context = new AudioContext({ sampleRate: 48000 });
    audioContextRef.current = context;
    gainNodeRef.current = context.createGain();
    gainNodeRef.current.connect(context.destination);
    
    return () => {
      if (sessionRef.current) {
        (sessionRef.current as any).stop();
      }
      if (audioContextRef.current?.state !== 'closed') {
         audioContextRef.current?.close();
      }
    };
  }, []);

  const stopAudio = useCallback(async () => {
    if (sessionRef.current) {
      await (sessionRef.current as any).stop();
      sessionRef.current = null;
    }
    if (audioContextRef.current?.state === 'running') {
      await audioContextRef.current.suspend();
    }
    setPlaybackState('stopped');
    nextChunkTimeRef.current = 0;
  }, []);

  const handleToggleAudio = async () => {
    if (!isMusicApiAvailable) return;
    if (playbackState === 'playing' || playbackState === 'loading') {
      await stopAudio();
      return;
    }
    
    const audioContext = audioContextRef.current;
    if (!audioContext || !aiRef.current) return;

    if (audioContext.state === 'suspended') await audioContext.resume();
    
    setPlaybackState('loading');
    nextChunkTimeRef.current = audioContext.currentTime;

    try {
      const session = await (aiRef.current as any).live.music.connect({
        model: "models/lyria-realtime-exp",
        callbacks: {
          onmessage: async (message: LiveMusicServerMessage) => {
            if (playbackState === 'stopped') return;
            if (message.serverContent?.audioChunks) {
              setPlaybackState(current => current === 'loading' ? 'playing' : current);
              for (const chunk of message.serverContent.audioChunks) {
                try {
                  const arrayBuffer = decode(chunk.data);
                  const audioBuffer = await decodeAudioData(audioContext, arrayBuffer);
                  const source = audioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(gainNodeRef.current!);
                  
                  const currentTime = audioContext.currentTime;
                  const startTime = Math.max(currentTime, nextChunkTimeRef.current);
                  source.start(startTime);
                  nextChunkTimeRef.current = startTime + audioBuffer.duration;
                } catch (e) {
                  console.error("Error processing audio chunk:", e);
                }
              }
            }
          },
          onerror: (error: Error) => {
            console.error("Music session error:", error);
            stopAudio();
          },
          onclose: () => {
            console.log("Lyria RealTime stream closed.");
            setPlaybackState('stopped');
          },
        },
      });

      sessionRef.current = session;

      const prompts: WeightedPrompt[] = [];
      const descriptionText = (plantData.poeticDescription || []).join(' ');
      prompts.push({
          text: `An atmospheric, humid, and crystalline sound that evokes: ${descriptionText}. Electronic, ambient.`,
          weight: 1.0,
      });

      const factWeights = [0.5, 0.4, 0.3];
      (plantData.funFacts || []).forEach((fact, index) => {
          if(index < factWeights.length) {
              prompts.push({
                  text: `Subtle musical elements inspired by: ${fact}`,
                  weight: factWeights[index],
              });
          }
      });
      
      await session.setWeightedPrompts({ weightedPrompts: prompts });

      await session.setMusicGenerationConfig({
        musicGenerationConfig: {
          bpm: 80,
          audioFormat: "pcm16",
          sampleRateHz: 48000,
        },
      });
      
      await session.play();

    } catch (error) {
      console.error("Error creating music session:", error);
      await stopAudio();
    }
  };
  
  useEffect(() => {
    // Cleanup function to stop audio when component unmounts
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const renderButtonContent = () => {
    if (!isMusicApiAvailable) return t.soundUnavailable;
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
             <PlantModel3D modelData={plantData.modelData} />
           </div>
        </div>

        <div ref={contentRef} className="flex-1 md:h-screen md:overflow-y-auto scrollbar-hide">
            <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left p-6 md:py-24 min-h-[calc(100vh-250px)] md:min-h-screen">
                <div className="w-full max-w-md">
                    <PlantInfo poeticDescription={plantData.poeticDescription} funFacts={plantData.funFacts} isToxic={plantData.isToxic} t={t} />
                    <div className="mt-8 mb-12">
                        <button
                            onClick={handleToggleAudio}
                            disabled={playbackState === 'loading' || !isMusicApiAvailable}
                            title={!isMusicApiAvailable ? t.soundUnavailable : ""}
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