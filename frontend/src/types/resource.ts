/**
 * This interface matches the 'ResourceRead' schema from FastAPI backend.
 */
export interface Resource {
  id: number;
  name: string;
  resource_type: "youtube" | "blog" | "newspaper";
  url: string;
  description?: string | null;
  category: "news" | "politics" | "science" | "culture_lifestyle";
  created_at: string;
}

/**
 * This interface matches the 'TopicRead' schema from FastAPI backend.
 */
export interface Topic {
  id: number;
  label: string;
  created_at: string;
}
