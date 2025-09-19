import React from 'react';
import { CareTip } from '../types';
import { Translations } from '../i18n/locales';

interface CareGuideProps {
  careGuide: CareTip[];
  t: Translations['en'];
}

const CareGuide: React.FC<CareGuideProps> = ({ careGuide = [], t }) => {
  const handleAddReminder = (tip: CareTip) => {
    // In a real app, this would generate an .ics file or use a native API.
    // For this web-based simulation, we'll log it.
    console.log(`Reminder set for: ${tip.title} - ${tip.description}`);
    alert(`${t.reminderSetAlert} "${tip.title}"`);
  };

  return (
    <div className="w-full mt-auto pt-6">
      <div className="flex md:flex-col space-x-4 md:space-x-0 md:space-y-3 overflow-x-auto md:overflow-y-auto md:max-h-48 md:pr-2 pb-4 scrollbar-hide">
        {careGuide.map((tip, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-60 md:w-full p-4 rounded-xl shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-xl animate-fade-in-up"
            style={{ 
              backgroundColor: 'rgba(0,0,0,0.3)',
              animationDelay: `${900 + index * 100}ms` 
            }}
          >
            <h3 className="font-bold text-md mb-2" style={{ color: 'var(--color-primary)' }}>
              {tip.title}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text)', opacity: 0.9 }}>
              {tip.description}
            </p>
            <button
              onClick={() => handleAddReminder(tip)}
              className="w-full text-center py-2 px-4 rounded-lg text-sm font-semibold transition-opacity duration-300 opacity-80 hover:opacity-100"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
            >
              {t.addReminderButton}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CareGuide;