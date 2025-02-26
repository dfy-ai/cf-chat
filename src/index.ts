// src/index.ts (Add this to the top of your file)
import { Hono, Context } from 'hono';
import { W } from './cf'; // Assuming you have a cf.ts with W
import * as buffer from 'buffer'; // Import buffer
import * as Handlebars from 'handlebars';

interface Bindings {
  AI: any;
  past_KV: any;
}

interface UserPreferences {
  useEmojis: boolean;
  userName: string;
}

const app = new Hono<{ Bindings: Bindings }>()

const promptTemplates: { [key: string]: string } = {
  bare: "{{! https://huggingface.co/TheBloke/deepseek-coder-6.7B-base-AWQ }}{{#messages}}{{#user}}{{#countUser1}}{{#lastSystem}}{{{lastSystem}}} {{/lastSystem}}{{/countUser1}}{{{content}}}{{/user}}{{#assistant}} {{{content}}} {{/assistant}}{{/messages}}",
  chatml: "{{! https://huggingface.co/TheBloke/OpenHermes-2.5-Mistral-7B-AWQ#prompt-template-chatml }}{{#messages}}{{#system}}<|im_start|>system\n{{{content}}}<|im_end|>\n{{/system}}{{#user}}<|im_start|>user\n{{{content}}}<|im_end|>\n{{/user}}{{#assistant}}<|im_start|>assistant\n{{{content}}}<|im_end|>\n{{/assistant}}{{/messages}}<|im_start|>assistant\n",
  deepseek: "{{! https://huggingface.co/TheBloke/deepseek-coder-6.7B-instruct-AWQ }}{{#messages}}{{#system}}{{{content}}}\n{{/system}}{{#user}}### Instruction:\n{{{content}}}\n{{/user}}{{#assistant}}### Response:\n{{{content}}}\n{{/assistant}}\n{{/messages}}\n### Response:\n",
  falcon: "{{! https://huggingface.co/TheBloke/Falcon-7B-Instruct-GPTQ }}{{#messages}}{{#system}}{{{content}}}\n{{/system}}{{#user}}User: {{{content}}}\n{{/user}}{{#assistant}}Assistant: {{{content}}}\n{{/assistant}}{{/messages}}\nAssistant: \n{{}}",
  gemma: "{{! https://ai.google.dev/gemma/docs/formatting https://huggingface.co/google/gemma-7b-it }}{{#messages}}{{#user}}<start_of_turn>user\n{{{content}}}<end_of_turn>\n{{/user}}{{#assistant}}<start_of_turn>model\n{{{content}}}<end_of_turn>\n{{/assistant}}{{/messages}}<start_of_turn>model\n" ,
  "hermes2-pro": "{{! https://huggingface.co/NousResearch/Hermes-2-Pro-Mistral-7B#prompt-format-for-function-calling }}{{#messages}}{{#system}}<|im_start|>system\n{{{content}}}<|im_end|>\n{{/system}}{{#user}}<|im_start|>user\n{{{content}}}<|im_end|>\n{{/user}}{{#assistant}}<|im_start|>assistant\n<tool_call>\n{{{content}}}</tool_call><|im_end|>\n{{/tool_query}}{{#tool_response}}<|im_start|>tool\n<tool_response>\n{{{content}}}</tool_response>\n<|im_end|>\n{{/tool_response}}{{/messages}}<|im_start|>assistant\n",
  inst: "{{! https://huggingface.co/TheBloke/LlamaGuard-7B-AWQ }}{{#messages}}{{#user}}[INST] {{#countUser1}}{{#lastSystem}}{{{lastSystem}}} {{/lastSystem}}{{/countUser1}}{{{content}}} [/INST]{{/user}}{{#assistant}} {{{content}}} {{/assistant}}{{/messages}}",
  llama2: "{{! https://huggingface.co/TheBloke/Llama-2-13B-chat-AWQ#prompt-template-llama-2-chat }}{{#messages}}{{#system}}[INST] <<SYS>>\n{{{content}}}\n<</SYS>>\n\n{{/system}}{{#user}}{{^beforewasSystem}}<s>[INST] {{/beforewasSystem}}{{{content}}} [/INST]{{/user}}{{#assistant}} {{{content}}}</s>{{/assistant}}{{/messages}}",
  llama3: "{{! https://llama.meta.com/docs/model-cards-and-prompt-formats/meta-llama-3/ }}<|begin_of_text|>{{#messages}}{{#system}}{{#countSystem1}}<|start_header_id|>system<|end_header_id|>\n\n{{{content}}}<|eot_id|>{{/countSystem1}}{{/system}}{{#user}}<|start_header_id|>user<|end_header_id|>\n\n{{{content}}}<|eot_id|>{{/user}}{{#assistant}}<|start_header_id|>assistant<|end_header_id|>\n\n{{{content}}}<|eot_id|>{{/assistant}}{{/messages}}<|start_header_id|>assistant<|end_header_id|>\n\n",
  llava: "{{! https://huggingface.co/llava-hf/llava-1.5-7b-hf }}{{#messages}}{{#user}}{{#countUser1}}USER: {{{content}}}\n{{/countUser1}}{{/user}}{{/messages}}ASSISTANT:",
  "mistral-instruct": "{{! https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-AWQ#prompt-template-mistral }}{{#messages}}{{#system}}<s>[INST] {{{content}}} {{/system}}{{#user}}{{^beforewasSystem}}[INST] {{/beforewasSystem}}{{{content}}} [/INST]{{/user}}{{#assistant}} {{{content}}}</s>{{/assistant}}{{/messages}}",
  "openchat-alt": "{{#messages}}{{#user}}<s>Human: {{#countUser1}}{{#lastSystem}}{{{lastSystem}}} {{/lastSystem}}{{/countUser1}}{{{content}}}<|end_of_turn|>{{/user}}{{#assistant}}Assistant: {{{content}}}<|end_of_turn|>{{/assistant}}{{/messages}}Assistant: {{}}",
  openchat: "{{! https://huggingface.co/TheBloke/openchat_3.5-AWQ#prompt-template-openchat }}{{#messages}}{{#user}}GPT4 User: {{#countUser1}}{{#lastSystem}}{{{lastSystem}}} {{/lastSystem}}{{/countUser1}}{{{content}}}<|end_of_turn|>{{/user}}{{#assistant}}GPT4 Assistant: {{{content}}}<|end_of_turn|>{{/assistant}}{{/messages}}GPT4 Assistant:",
  "orca-hashes": "{{! https://huggingface.co/TheBloke/neural-chat-7B-v3-1-AWQ#prompt-template-orca-hashes }}{{#messages}}{{#system}}### System:\n{{{content}}}\n\n{{/system}}{{#user}}### User:\n{{{content}}}\n\n{{/user}}{{#assistant}}### Assistant:\n{{{content}}}\n\n{{/assistant}}{{/messages}}### Assistant:\n\n",
  "phi-2": "{{! https://www.promptingguide.ai/models/phi-2 }}{{#messages}}{{#user}}User: {{{content}}}\n{{/user}}{{#assistant}}Assistant:{{{content}}}\n{{/assistant}}{{#question}}Instruct: {{{ content }}}\nOutput: {{/question}}{{/messages}}",
  sqlcoder: "### Task\nGenerate a SQL query to answer [QUESTION]{{{lastUser}}}[/QUESTION]\n\n### Database Schema\nThe query will run on a database with the following schema:\n{{{lastSystem}}}\n\n### Answer\nGiven the database schema, here is the SQL query that [QUESTION]{{{lastUser}}}[/QUESTION]\n[SQL]",
  starling: "{{#messages}}{{#user}}GPT4 Correct User: {{#countUser1}}{{#lastSystem}}{{{lastSystem}}} {{/lastSystem}}{{/countUser1}}{{{content}}}<|end_of_turn|>{{/user}}{{#assistant}}GPT4 Correct Assistant: {{{content}}}<|end_of_turn|>{{/assistant}}{{#code_user}}Code User: {{{content}}}<|end_of_turn|>{{/code_user}}{{#code_assistant}}Code Assistant: {{{content}}}<|end_of_turn|>{{/code_assistant}}{{/messages}}GPT4 Correct Assistant:",
  tinyllama: "{{! https://huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0 }}{{#messages}}{{#system}}<|system|>\n{{{content}}}</s>\n{{/system}}{{#user}}<|user|>\n{{{content}}}</s>\n{{/user}}{{#assistant}}<|assistant|>\n{{{content}}}</s>\n{{/assistant}}{{/messages}}<|assistant|>\n",
  zephyr: "{{! https://huggingface.co/TheBloke/zephyr-7B-beta-AWQ#prompt-template-zephyr https://huggingface.co/HuggingFaceH4/zephyr-7b-alpha }}{{#messages}}{{#system}}<s><|system|>\n{{{content}}}</s>\n{{/system}}{{#user}}<|user|>\n{{{content}}}</s>\n{{/user}}{{#assistant}}<|assistant|>\n{{{content}}}</s>\n{{/assistant}}{{/messages}}<|assistant|>\n"
};

app.get('/', (c: Context<{ Bindings: Bindings }>) => {
    return c.text('Hello Hono!');
});

//  This code is required.
app.post('/api/llm', async (c: Context<{ Bindings: Bindings }>) => {
    const { messages, model, streamData, apiKey, userId } = await c.req.json();

  if (!messages || !model) {
      return c.json({ error: 'Missing messages or model' }, 400);
  }

  // Load user preferences from KV store
  let userPreferences: UserPreferences | null = null;
  if (userId) {
    const preferencesJson = await c.env.past_KV.get(`user-preferences-${userId}`);
    if (preferencesJson) {
      userPreferences = JSON.parse(preferencesJson);
    }
  }

  const modelId = model;   // Assuming the model is the modelId.
  const ai = c.env.AI;

  // Function to generate prompt based on the template
  const generatePrompt = (messages: any, model: string, userPreferences: UserPreferences | null) => {
        const template = promptTemplates[model];
        if (!template) {
            return "";
        }
        const prompt = Handlebars.compile(template)({ messages, userPreferences });
        return prompt;
    };

  const generateResponse = async (messages: any, model: string, userPreferences: UserPreferences | null) => {
        const prompt = generatePrompt(messages, model, userPreferences);
        const response = await ai.run(model, {
            prompt,
            stream: false,
        });

        // Apply user preferences to the response
        let finalResponse = response;
        if (userPreferences) {
          if (userPreferences.useEmojis) {
            finalResponse += " 🙂";
          }
          if (userPreferences.userName) {
            finalResponse = `${userPreferences.userName}, ${finalResponse}`;
          }
        }

        return finalResponse;
   };

  const response = await generateResponse(messages, modelId, userPreferences);

  if (!response) {
      return c.json({ error: 'Failed to generate response' }, 500);
   }

  // Save updated user preferences to KV store
  const requestBody = await c.req.json();
  if (userId && requestBody.updatedUserPreferences) {
    await c.env.past_KV.put(`user-preferences-${userId}`, JSON.stringify(requestBody.updatedUserPreferences));
  }

  return c.json({ response, userPreferences: requestBody.updatedUserPreferences }, 200);
});
export { app };
