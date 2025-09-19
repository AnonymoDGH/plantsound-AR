import { GoogleGenAI, Type } from "@google/genai";
import { PlantData, Language } from '../types';

export const analyzePlantImage = async (imageBase64: string, lang: Language): Promise<Omit<PlantData, 'soundUrl'>> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imageMimeType = imageBase64.substring(5, imageBase64.indexOf(';'));
  const pureBase64 = imageBase64.substring(imageBase64.indexOf(',') + 1);

  const imagePart = {
    inlineData: {
      mimeType: imageMimeType,
      data: pureBase64,
    },
  };

  const promptText = lang === 'es' 
  ? `Analiza esta imagen de una planta. Proporciona una respuesta en formato JSON. La respuesta debe estar en español e incluir:
- Un campo 'poeticDescription', que es un array de dos frases cortas y evocadoras sobre la apariencia y esencia de la planta.
- Un campo 'funFacts', que es un array de tres datos interesantes y poco conocidos sobre esta especie de planta.
- Un campo booleano 'isToxic', que indica si la planta es tóxica para mascotas comunes como gatos y perros.
- Un campo 'careGuide', un array de objetos, cada uno con un 'title' (ej., 'Riego', 'Luz Solar', 'Suelo') y una 'description' concisa para su cuidado.
- Un campo 'modelData', un array de objetos para un modelo 3D low-poly. Cada objeto debe tener:
  - 'type': una cadena ('stem', 'leaf', 'petal').
  - 'path': un array de coordenadas {x, y, z}. Todas las coordenadas deben estar en un rango de -1 a 1. La base de la planta debe estar en {x:0, y:-1, z:0}.
  - 'color': una cadena en formato 'rgb(r,g,b)' basada en los colores reales de la planta.
  - 'thickness': un número para el grosor del trazo (ej., 2 para tallos, 1 para hojas).`
  : `Analyze this image of a plant. Provide a response in JSON format. The response must be in English and include:
- A 'poeticDescription' field, which is an array of two short, evocative sentences about the plant's appearance and essence.
- A 'funFacts' field, which is an array of three interesting and little-known facts about this plant species.
- An 'isToxic' boolean field, indicating if the plant is toxic to common household pets like cats and dogs.
- A 'careGuide' field, an array of objects, each with a 'title' (e.g., 'Watering', 'Sunlight', 'Soil') and a concise 'description' for its care.
- A 'modelData' field, an array of objects for a low-poly 3D model. Each object should have:
  - 'type': a string ('stem', 'leaf', 'petal').
  - 'path': an array of {x, y, z} coordinates. All coordinates must be within a -1 to 1 range. The plant's base should be at {x:0, y:-1, z:0}.
  - 'color': a string in 'rgb(r,g,b)' format based on the plant's actual colors.
  - 'thickness': a number for the stroke width (e.g., 2 for stems, 1 for leaves).`;

  const textPart = { text: promptText };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            poeticDescription: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            funFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            isToxic: {
              type: Type.BOOLEAN
            },
            careGuide: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            modelData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  path: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                        z: { type: Type.NUMBER },
                      }
                    }
                  },
                  color: { type: Type.STRING },
                  thickness: { type: Type.NUMBER },
                }
              }
            }
          }
        },
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
    
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to analyze plant. The AI model might be busy. Please try again later.");
  }
};