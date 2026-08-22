import { createOpenAI } from "@ai-sdk/openai";
import { gateway } from "ai";
import { keys } from "../keys";

const openai = createOpenAI({
  apiKey: keys().OPENAI_API_KEY,
});

export const models = {
  chat: gateway("openai/gpt-5.6-luna"),
  embeddings: openai("text-embedding-3-small"),
};
