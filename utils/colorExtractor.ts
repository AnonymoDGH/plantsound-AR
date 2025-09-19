
import { ColorPalette } from '../types';

// Simple helper to calculate color distance
const colorDistance = (c1: number[], c2: number[]): number => {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
};

// Helper to convert RGB to HSL
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
};

export const extractColorsFromImage = (imageBase64: string): Promise<ColorPalette> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageBase64;
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('Canvas context not available'));

      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const colorCounts: { [key: string]: { count: number, rgb: number[] } } = {};
      
      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i+1];
        const b = imageData[i+2];
        const a = imageData[i+3];
        if (a < 128) continue; // Skip transparent pixels
        
        const key = `${r},${g},${b}`;
        if (!colorCounts[key]) {
          colorCounts[key] = { count: 0, rgb: [r, g, b] };
        }
        colorCounts[key].count++;
      }

      const sortedColors = Object.values(colorCounts).sort((a, b) => b.count - a.count);

      if (sortedColors.length === 0) {
        return resolve({
          primary: '#4ade80', secondary: '#22c55e', accent: '#84cc16', background: '#1e293b', text: '#f1f5f9'
        });
      }

      const dominant = sortedColors[0].rgb;
      const [, s, l] = rgbToHsl(dominant[0], dominant[1], dominant[2]);

      const isDark = l < 0.4;
      
      const background = isDark ? `rgb(${dominant[0]}, ${dominant[1]}, ${dominant[2]})` : '#1e293b';
      const text = isDark ? '#f1f5f9' : `rgb(${dominant[0]}, ${dominant[1]}, ${dominant[2]})`;
      
      let primary = sortedColors.find(c => colorDistance(c.rgb, dominant) > 80 && rgbToHsl(c.rgb[0], c.rgb[1], c.rgb[2])[2] > 0.4)?.rgb;
      if (!primary) primary = isDark ? [132, 204, 22] : [34, 197, 94];

      let secondary = sortedColors.find(c => colorDistance(c.rgb, dominant) > 100 && colorDistance(c.rgb, primary!) > 80)?.rgb;
      if (!secondary) secondary = isDark ? [74, 222, 128] : [22, 163, 74];

      const palette: ColorPalette = {
        primary: `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`,
        secondary: `rgb(${secondary[0]}, ${secondary[1]}, ${secondary[2]})`,
        accent: isDark ? '#facc15' : '#a3e635',
        background,
        text,
      };

      resolve(palette);
    };
    img.onerror = () => reject(new Error('Failed to load image for color extraction.'));
  });
};
