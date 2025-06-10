
import { GoogleGenAI, GenerateContentResponse, GroundingChunk as GenAIGroundingChunk } from "@google/genai";
import { GeneratedContent, GroundingChunk } from '../types'; // Using local GroundingChunk type for return

if (!process.env.API_KEY) {
  // This check is good, but primary error handling for user feedback should be in UI
  console.warn("API_KEY environment variable not set. App may not function correctly.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "MISSING_API_KEY" }); // Provide a fallback for initialization
const contentModel = 'gemini-2.5-flash-preview-04-17'; // Model for content generation
const trendingModel = 'gemini-2.5-flash-preview-04-17'; // Model for trending topics (uses search)


function parseJsonFromText(text: string): any {
  let jsonStr = text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; // Matches ```json ... ``` or ``` ... ```
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON string:", jsonStr);
    // Attempt to provide a more helpful error if parsing fails due to common Gemini issues
    if (jsonStr.toLowerCase().includes("error") || jsonStr.toLowerCase().includes("sorry")) {
        throw new Error(`AI model returned an error message instead of JSON: "${jsonStr.substring(0,150)}..."`);
    }
    throw new Error(`Failed to parse AI response as JSON. Raw text: "${text.substring(0,100)}..."`);
  }
}

export const generateBlogPostContent = async (topic: string): Promise<GeneratedContent> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not configured. Please set the API_KEY environment variable.");
  }
  const systemInstruction = `You are an expert blog content strategist and SEO specialist. Your goal is to help users generate comprehensive and engaging blog post materials based on a given topic.
  The user will provide a topic. You must generate content related to this topic.
  Output STRICTLY in JSON format. Do not include any explanatory text before or after the JSON object.
  The JSON object must have the following keys and value types:
  - "titles": An array of 3 distinct, catchy, and SEO-friendly blog post titles (each title as a string).
  - "meta_description": A concise and compelling SEO-friendly meta description, approximately 150-160 characters long (string).
  - "keywords": An array of 5-7 relevant keywords or tags (each keyword as a string).
  - "draft_content": A blog post draft of approximately 300-400 words. The draft should be well-structured with an introduction, 2-3 body paragraphs, and a conclusion. Ensure the content is engaging, informative, and maintains good readability. Use markdown for basic formatting like paragraphs (use '\\n\\n' for paragraph breaks). (string).
  - "image_prompt": A descriptive and creative prompt suitable for an AI image generator (e.g., Imagen) to create a relevant featured image for this blog post. The prompt should be detailed enough to guide the image generation process effectively (string).
  `;

  const prompt = `Generate blog post materials for the topic: "${topic}"`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: contentModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7, // Slightly creative but still factual for content
      },
    });

    const parsedData = parseJsonFromText(response.text);

    // Validate structure (basic check)
    if (!parsedData.titles || !Array.isArray(parsedData.titles) ||
        !parsedData.meta_description || typeof parsedData.meta_description !== 'string' ||
        !parsedData.keywords || !Array.isArray(parsedData.keywords) ||
        !parsedData.draft_content || typeof parsedData.draft_content !== 'string' ||
        !parsedData.image_prompt || typeof parsedData.image_prompt !== 'string') {
      console.error("Unexpected JSON structure from AI:", parsedData);
      throw new Error("AI response did not match the expected structure. Check the model output or prompt.");
    }
    return parsedData as GeneratedContent;

  } catch (error) {
    console.error("Error generating blog post content:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};


export const generateTrendingTopics = async (): Promise<{ topics: string[], sources: GroundingChunk[] }> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not configured. Please set the API_KEY environment variable.");
  }
  const prompt = `
    List 5 current trending topics suitable for general audience blog posts.
    Focus on areas like technology, lifestyle, general news, or education.
    For each topic, provide a concise title or phrase.
    Output the list of topics as a JSON object with a single key "trending_topics" which is an array of strings.
    Example: { "trending_topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"] }
  `;
  
  const systemInstructionForSearch = "You are an assistant that identifies trending topics based on Google Search results and presents them in a structured JSON format as requested by the user. Only return the JSON object.";

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: trendingModel, 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3, // More factual for trending topics
        systemInstruction: systemInstructionForSearch, 
      },
    });

    const rawText = response.text;
    let parsedData;
    try {
        parsedData = parseJsonFromText(rawText);
    } catch (e) {
        console.warn("Failed to parse trending topics as JSON from primary attempt, attempting fallback extraction:", e);
        const lines = rawText.split('\\n').map(line => line.replace(/^[\d.\-\*]\s*/, '').trim()).filter(line => line.length > 5 && line.length < 150);
        if (lines.length > 0 && lines.length <= 7) { 
             parsedData = { trending_topics: lines.slice(0,5) };
        } else {
            // If fallback also fails, try a direct extraction if text looks like a list
            if (rawText.includes('\n') && !rawText.includes('{')) { // Simple heuristic for a list
                const simpleTopics = rawText.split('\n')
                                     .map(s => s.replace(/^[-\*\d\.\s]+/, '').trim()) // Remove list markers
                                     .filter(s => s.length > 3 && s.length < 150); // Filter out empty or too short/long strings
                if (simpleTopics.length > 0) {
                    parsedData = { trending_topics: simpleTopics.slice(0, 5) };
                } else {
                     throw new Error(`Could not reliably extract trending topics from response: ${rawText.substring(0,100)}...`);
                }
            } else {
                 throw new Error(`Could not reliably extract trending topics from response: ${rawText.substring(0,100)}...`);
            }
        }
    }
    
    const topics = parsedData.trending_topics || [];
    // The GenAIGroundingChunk needs to be cast or mapped to local GroundingChunk if types differ significantly.
    // Given the types.ts change making uri optional, this direct cast is now more acceptable.
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter(chunk => chunk.web && chunk.web.uri) as GroundingChunk[]) || [];


    if (!Array.isArray(topics) || !topics.every(t => typeof t === 'string')) {
        console.error("Trending topics from AI is not an array of strings:", topics);
        // If topics are empty but sources exist, it might be an issue with JSON parsing of topics but search worked.
        if (sources.length > 0 && topics.length === 0) {
             return { topics: ["Could not extract topic titles, but sources were found."], sources };
        }
        throw new Error("AI returned trending topics in an unexpected format.");
    }
     if (topics.length === 0 && sources.length === 0 && !rawText.trim()) {
        throw new Error("AI returned an empty response for trending topics.");
    }


    return { topics, sources };

  } catch (error) {
    console.error("Error generating trending topics:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error (Trending Topics): ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching trending topics.");
  }
};
