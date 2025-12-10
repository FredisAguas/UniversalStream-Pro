import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client
// Note: In a real production app, ensure API_KEY is set in your environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeVideoTopic = async (videoTitle: string, context?: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following video title/topic and provide a short, engaging summary or suggested tags. 
      
      Video Title: ${videoTitle}
      ${context ? `Context: ${context}` : ''}
      
      Format the response as a JSON object with 'summary' and 'tags' fields.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    return response.text || "{}";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return JSON.stringify({ summary: "Error analyzing content.", tags: [] });
  }
};

export const chatWithAssistant = async (message: string, history: string[]): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an intelligent assistant for a Video Downloader app.
            Previous Context: ${history.join('\n')}
            
            User: ${message}`,
        });
        return response.text || "I couldn't process that request.";
    } catch (e) {
        return "Service unavailable.";
    }
}