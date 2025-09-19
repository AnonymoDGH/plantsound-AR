import React, { useState, useEffect } from 'react';
import { Translations } from '../i18n/locales';

interface LoadingScreenProps {
  t: Translations['en'];
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ t }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const loadingMessages = t.loadingMessages;

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-4 bg-gray-900 text-white">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-green-400"></div>
      <div className="mt-6 text-lg text-gray-300 text-center w-64 h-12 flex items-center justify-center">
        {loadingMessages.map((msg, index) => (
          <span
            key={msg}
            className={`absolute transition-opacity duration-500 ${index === messageIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            {msg}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;