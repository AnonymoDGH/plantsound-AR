import React from 'react';
import { Translations } from '../i18n/locales';

interface PlantInfoProps {
  poeticDescription: string[];
  funFacts: string[];
  isToxic: boolean;
  t: Translations['en'];
}

const SkullIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
        <path d="M12 2a2 2 0 0 0-2 2v2H8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2z"></path>
        <path d="M12 12v10"></path>
        <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
        <path d="M9 22h6"></path>
    </svg>
);


const PlantInfo: React.FC<PlantInfoProps> = ({ poeticDescription = [], funFacts = [], isToxic = false, t }) => {
  return (
    <div className="w-full max-w-md mx-auto md:mx-0">
      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        {poeticDescription.map((line, index) => (
          <p key={index} className="text-xl md:text-2xl italic font-light" style={{ color: 'var(--color-text)' }}>"{line}"</p>
        ))}
      </div>
      
      <div className="space-y-2 text-sm md:text-base animate-fade-in-up my-6" style={{ animationDelay: '500ms' }}>
        {funFacts.map((fact, index) => (
          <p key={index} style={{ color: 'var(--color-text)', opacity: 0.8 }}>- {fact}</p>
        ))}
      </div>

      {isToxic && (
        <div
          className="mt-6 inline-flex items-center justify-center p-3 rounded-full animate-fade-in-up"
          style={{ animationDelay: '800ms', backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}
        >
          <SkullIcon />
          <span className="font-bold text-sm">{t.toxicWarning}</span>
        </div>
      )}
    </div>
  );
};

export default PlantInfo;