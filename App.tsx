import React, { useState, useCallback, useEffect } from 'react';
import { PlantData, AppState, ColorPalette, Language } from './types';
import { analyzePlantImage } from './services/geminiService';
import { extractColorsFromImage } from './utils/colorExtractor';
import UploadScreen from './components/UploadScreen';
import AnalysisScreen from './components/AnalysisScreen';
import LoadingScreen from './components/LoadingScreen';
import { translations } from './i18n/locales';

const getInitialLang = (): Language => {
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'es' ? 'es' : 'en';
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [plantData, setPlantData] = useState<PlantData | null>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>(getInitialLang());

  const t = translations[lang];

  const handleImageUpload = useCallback(async (file: File) => {
    setAppState(AppState.LOADING);
    setError(null);
    try {
      const imageBase64 = await fileToBase64(file);
      const [palette, data] = await Promise.all([
        extractColorsFromImage(imageBase64),
        analyzePlantImage(imageBase64, lang),
      ]);
      
      setColorPalette(palette);
      setPlantData(data);
      setAppState(AppState.READY);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.ERROR);
    }
  }, [lang]);

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setPlantData(null);
    setColorPalette(null);
    setError(null);
  };
  
  const toggleLanguage = () => {
    setLang(current => current === 'en' ? 'es' : 'en');
  }

  useEffect(() => {
    if (colorPalette) {
      document.documentElement.style.setProperty('--color-primary', colorPalette.primary);
      document.documentElement.style.setProperty('--color-secondary', colorPalette.secondary);
      document.documentElement.style.setProperty('--color-accent', colorPalette.accent);
      document.documentElement.style.setProperty('--color-background', colorPalette.background);
      document.documentElement.style.setProperty('--color-text', colorPalette.text);
    }
  }, [colorPalette]);

  const renderContent = () => {
    switch (appState) {
      case AppState.IDLE:
        return <UploadScreen onImageUpload={handleImageUpload} t={t} lang={lang} onLangToggle={toggleLanguage} />;
      case AppState.LOADING:
        return <LoadingScreen t={t} />;
      case AppState.READY:
        if (plantData && colorPalette) {
          return <AnalysisScreen plantData={plantData} colorPalette={colorPalette} onReset={handleReset} t={t} lang={lang} onLangToggle={toggleLanguage} />;
        }
        return <LoadingScreen t={t} />;
      case AppState.ERROR:
        return (
          <div className="w-full h-screen flex flex-col items-center justify-center bg-red-900/50 text-white p-4">
            <h2 className="text-2xl font-bold mb-4">{t.errorTitle}</h2>
            <p className="text-center mb-6">{error}</p>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white text-red-700 font-semibold rounded-full shadow-lg hover:bg-gray-200 transition-colors"
            >
              {t.errorButton}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full min-h-screen antialiased transition-colors duration-1000" style={{ backgroundColor: 'var(--color-background, #111827)' }}>
      {renderContent()}
    </div>
  );
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default App;