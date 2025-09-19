import React, { useRef } from 'react';
import { Language } from '../types';
import { Translations } from '../i18n/locales';

interface UploadScreenProps {
  onImageUpload: (file: File) => void;
  t: Translations['en'];
  lang: Language;
  onLangToggle: () => void;
}

const LeafIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-green-400">
        <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8a13 13 0 0 1 13.95 20M2 4a17 17 0 0 1 17.95 20M12.55 6.34a1 1 0 0 0-1.1 1.1l.65 2.55a1 1 0 0 0 1.1 1.1l2.55.65a1 1 0 0 0 1.1-1.1L15.7 7.44a1 1 0 0 0-1.1-1.1Z"></path>
    </svg>
);

const LanguageToggle: React.FC<{lang: Language, onLangToggle: () => void}> = ({ lang, onLangToggle }) => (
    <button onClick={onLangToggle} className="absolute top-4 right-4 z-20 px-4 py-2 text-sm font-semibold text-white bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition-colors">
        {lang === 'en' ? 'Español' : 'English'}
    </button>
);


const UploadScreen: React.FC<UploadScreenProps> = ({ onImageUpload, t, lang, onLangToggle }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-6 bg-gray-900 text-white relative overflow-hidden">
      <LanguageToggle lang={lang} onLangToggle={onLangToggle} />
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-gray-900 to-gray-900"></div>
      <div className="text-center z-10 animate-fade-in-up">
        <div className="mb-8 flex justify-center">
            <LeafIcon />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-lime-400 mb-4">
          {t.title}
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
          {t.subtitle}
        </p>
        <button
          onClick={handleButtonClick}
          className="px-8 py-4 bg-gradient-to-r from-lime-400 to-green-500 text-gray-900 font-bold text-lg rounded-full shadow-lg hover:scale-105 transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-lime-300"
        >
          {t.uploadButton}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default UploadScreen;