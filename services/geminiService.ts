import { GoogleGenAI, Type } from "@google/genai";

/**
 * Service to fetch AI-generated lucky numbers.
 * Initializes GoogleGenAI right before use to ensure correct API key access.
 */
export async function getLuckyNumbers() {
  try {
    // Always initialize GoogleGenAI inside the function scope
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate 4 'lucky' numbers between 1 and 9 for an onchain lottery. Provide a short, cryptic reason why these numbers were chosen based on 'onchain cosmic alignment'.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            numbers: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description: "Array of exactly 4 numbers from 1 to 9",
            },
            reason: {
              type: Type.STRING,
              description: "A short cosmic reason for these numbers",
            }
          },
          required: ["numbers", "reason"]
        }
      }
    });

    // Directly access .text property from GenerateContentResponse
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    // Fallback numbers in case of API failure
    return {
      numbers: [1, 3, 7, 9],
      reason: "The stars are currently obscured, but these constants resonate with the chain."
    };
  }
}