export enum AppState {
  IDLE,
  LOADING,
  READY,
  ERROR,
}

export type Language = 'en' | 'es';

export interface CareTip {
  title: string;
  description: string;
}

export interface PlantPart {
  type: 'stem' | 'leaf' | 'petal' | 'stamen';
  path: { x: number; y: number; z: number }[];
  color: string;
  thickness: number;
}

export interface PlantData {
  poeticDescription: string[];
  funFacts: string[];
  isToxic: boolean;
  careGuide: CareTip[];
  modelData: PlantPart[];
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}