
export interface GeneratedContent {
  titles: string[];
  meta_description: string;
  keywords: string[];
  draft_content: string;
  image_prompt: string;
}

export interface GroundingChunkWeb {
  uri?: string; // Made uri optional to match @google/genai type
  title?: string;
}

export interface GroundingChunk {
  web: GroundingChunkWeb;
}
