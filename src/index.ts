// src/index.ts (Add this to the top of your file)
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { W } from './cf'; // Assuming you have a cf.ts with W and workerAI
import { stream } from 'hono/streaming';
import * as buffer from 'buffer'; // Import buffer


const f = {
  bare: "{{! https://huggingface.co/TheBloke/deepseek-coder-6.7B-base-AWQ }}{{#messages}}{{#user}}{{#countUser1}}{{#lastSystem}}{{{lastSystem}}} {{/lastSystem}}{{/countUser1}}{{{content}}}{{/user}}{{#assistant}} {{{content}}} {{/assistant}}{{/messages}}",
  chatml: "{{! https://huggingface.co/TheBloke/OpenHermes-2.5-Mistral-7B-AWQ#prompt-template-chatml }}{{#messages}}{{#system}}<|im_start|>system\n{{{content}}}<|im_end|>\n{{/system}}{{#user}}<|im_start|>user\n{{{content}}}<|im_end|>\n{{/user}}{{#assistant}}<|im_start|>assistant\n{{{content}}}<|im_end|>\n{{/assistant}}{{/messages}}<|im_start|>assistant\n",
  deepseek: "{{! https://huggingface.co/TheBloke/deepseek-coder-6.7B-instruct-AWQ }}{{#messages}}{{#system}}{{{content}}}\n{{/system}}{{#user}}### Instruction:\n{{{content}}}\n{{/user}}{{#assistant}}### Response:\n{{{content}}}\n{{/assistant}}\n{{/messages}}\n### Response:\n",
  falcon: "{{! https://huggingface.co/TheBloke/Falcon-7B-Instruct-GPTQ }}{{#messages}}{{#system}}{{{content}}}\n{{/system}}{{#user}}User: {{{content}}}\n{{/user}}{{#assistant}}Assistant: {{{content}}}\n{{/assistant}}{{/messages}}\nAssistant: \n{{}}",
  gemma: "{{! https://ai.google.dev/gemma/docs/formatting https://huggingface.co/google/gemma-7b-it }}{{#messages}}{{#user}}<start_of_turn>user\n{{{content}}}<end_of_turn>\n{{/user}}{{#assistant}}<start_of_turn>model\n{{{content}}}<end_of_turn>\n{{/assistant}}{{/messages}}<start_of_turn>model\n" ,
  "hermes2-pro": "{{! https://huggingface.co/NousResearch/Hermes-2-Pro-Mistral-7B#prompt-format-for-function-calling }}{{#messages}}{{#system}}<|im_start|>system\n{{{content}}}<|im_end|>\n{{/system}}{{#user}}<|im_start|>user\n{{{content}}}<|im_end|>\n{{/user}}{{#assistant}}<|im_start|>assistant\n{{{content}}}<|im_end|>\n{{/assistant}}{{#tool_query}}<|im_start|>assistant\n<tool_call>\n{{{content}}}</tool_call><|im_end|>\n{{/tool_query}}{{#tool_response}}<|im_start|>tool\n<tool_response>\n{{{content}}}</tool_response>\n<|im_end|>\n{{/tool_response}}{{/messages}}<|im_start|>assistant\n",
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
const MODELS = [
  ...F['text-generation'].models,
];

const app = new Hono();

app.use('*', cors());

// Constants for user preferences
const USER_PREFERENCES_KEY_PREFIX = 'user_prefs:'; // Key prefix for user preferences
const CLEVER_EMOJI = '✨'; // Or any other emoji

// Helper function to add clever emoji
function addCleverEmoji(text: string): string {
  //  This can be customized to add an emoji to the end of a response.
  return `${text} ${CLEVER_EMOJI}`;
}

async function workerAI(c: Context, model: string, messages: any[]) {
  console.log(c.env.AI);
  const ai = new W(c.env.AI);
  const response = await ai.run(model, {
    messages,
    stream: true,
  });

  return stream(c, async (stream) => {
    for await (const chunk of response) {
      const str = buffer.Buffer.from(chunk).toString('utf-8'); // Use buffer.Buffer
      if (str !== sseEnd) {
        const jsonstring = str.substring(ssePrefix.length);
        const resObj = JSON.parse(jsonstring);
        // Apply post-processing to add the emoji at the end
        let responseText = resObj.response;
        responseText = addCleverEmoji(responseText);
        await stream.write(responseText); // Stream the modified response
      } else {
        //  Handle the end of stream message.
        await stream.write(sseEnd);
      }
    }
  });
}

// Middleware to load user preferences before each request
app.use('*', async (c, next) => {
  const userId = c.req.header('cf-connecting-ip') || 'default'; // Or a more persistent user identifier.
  c.set('userId', userId); // Store the user ID in context.
  const prefsKey = `${USER_PREFERENCES_KEY_PREFIX}${userId}`;
  const userPrefs = await c.env.PKV.get(prefsKey, 'json'); // Try to get user prefs from KV
  c.set('userPrefs', userPrefs || {}); // Store the preferences including the default values in the context
  await next();
});

// Function to construct the prompt, considering user preferences
function constructPrompt(prompt: string, context: Context): string {
  const userPrefs = context.get('userPrefs');
  const userId = context.get('userId');
  // Apply User Preferences
  let finalPrompt = prompt
  if (userPrefs && userPrefs.name) {
    finalPrompt = `My name is ${userPrefs.name}, and  ${finalPrompt}`
  }

  if (userPrefs && userPrefs.occupation) {
    finalPrompt = `As a ${userPrefs.occupation}  ${finalPrompt}`
  }

  return finalPrompt
}

app.get('/', async (c) => {
  const modelIndex = Number(c.req.query('model'));
  const prompt = c.req.query('prompt') || 'Hello!';

  const messages = [{ role: 'user', content: constructPrompt(prompt, c) }];
  return workerAI(c, MODELS[modelIndex] || MODELS[2], messages);
});

app.post('/preferences', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Could not determine user id' }, 400);
  }

  const prefsKey = `${USER_PREFERENCES_KEY_PREFIX}${userId}`;
  const newPreferences = await c.req.json<{ name?: string; occupation?: string }>();
  // Validate the new preferences if needed.
  if (!Object.keys(newPreferences).length) {
      return c.json({ error: 'No preferences provided' }, 400);
  }
  // Save the preferences in KV store.  Merge with existing preferences
  const existingPrefs = c.get('userPrefs') || {};
  const mergedPrefs = { ...existingPrefs, ...newPreferences };
  await c.env.PKV.put(prefsKey, JSON.stringify(mergedPrefs));
  c.set('userPrefs', mergedPrefs); // Update in-memory preferences.

  return c.json({ status: 'success', preferences: mergedPrefs });
});


app.post('/', async (c) => {
  const body = await c.req.json();
  const messages = body['messages'];
  const modelIndex = Number(body['modelIndex']) || 0;

  // Construct all messages with context for the given prompt
  const finalMessages = messages.map(message => {
    return {
      role: message.role,
      content: constructPrompt(message.content, c)
    }
  })

  return handleMessagesWithIndex(c, finalMessages, modelIndex);
});


const handleMessagesWithIndex = async (
  c: Context,
  messages: any[],
  modelIndex: number
) => {
  return workerAI(c, MODELS[modelIndex], messages);
};


app.onError((e, c) => {
  console.error(e);
  return c.json(
    {
      status: 'error',
      error: e.message,
    },
    500
  );
});

export default app;
