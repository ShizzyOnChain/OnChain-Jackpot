
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Generates lucky lottery numbers using Gemini AI.
 * Uses gemini-3-flash-preview for quick and cost-effective text generation.
 */
export const getLuckyNumbers = async (): Promise<{ numbers: number[]; reason: string }> => {
  // Initialize the AI client using the provided environment variable
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Suggest 4 unique lucky lottery numbers between 1 and 9. Provide a short, fun reason for the selection.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            numbers: {
              type: Type.ARRAY,
              items: {
                type: Type.INTEGER,
              },
              description: "An array containing exactly 4 unique integers between 1 and 9.",
            },
            reason: {
              type: Type.STRING,
              description: "A fun and engaging reason for picking these numbers.",
            },
          },
          required: ["numbers", "reason"],
        },
      },
    });

    // Directly access the text property as per @google/genai guidelines
    const jsonStr = response.text;
    if (!jsonStr) {
      throw new Error("No text returned from Gemini API");
    }

    const data = JSON.parse(jsonStr.trim());
    
    // Validate and return data in the format expected by App.tsx
    return {
      numbers: Array.isArray(data.numbers) ? data.numbers.slice(0, 4).map(Number) : [1, 2, 3, 4],
      reason: typeof data.reason === "string" ? data.reason : "The numbers were aligned by the stars!"
    };
  } catch (error) {
    console.error("Gemini Service Error:", error);
    // Graceful fallback in case of API failure or quota limits
    return {
      numbers: [7, 8, 9, 1],
      reason: "The universe is currently realigning; these numbers felt lucky today!"
    };
  }
};
