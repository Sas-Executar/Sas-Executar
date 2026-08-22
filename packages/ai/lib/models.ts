import { createOpenAI } from "@ai-sdk/openai";
import { type EmbeddingModel, gateway, type LanguageModel } from "ai";
import { keys } from "../keys";

const openai = createOpenAI({
  apiKey: keys().OPENAI_API_KEY,
});

export const models: {
  readonly chat: LanguageModel;
  readonly embeddings: EmbeddingModel;
} = {
  chat: gateway("openai/gpt-5.6-luna"),
  embeddings: openai.embeddingModel("text-embedding-3-small"),
};
