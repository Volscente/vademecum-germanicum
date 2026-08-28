// Runtime Validation
import { z } from "zod";

export const resourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  resource_type: z.enum(["youtube", "blog", "newspaper"]),
  url: z.string().min(1, "URL is required").url("Must be a valid URL"),
  description: z.string().optional(),
  category: z.enum(["news", "politics", "science", "culture_lifestyle"]),
});

export type ResourceFormValues = z.infer<typeof resourceSchema>;

export const topicSchema = z.object({
  label: z.string().min(1, "Label is required"),
});

export type TopicFormValues = z.infer<typeof topicSchema>;
