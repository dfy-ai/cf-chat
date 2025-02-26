// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { W } from './cf'; // Assuming you have a cf.ts with W and workerAI
import { stream } from 'hono/streaming';
import * as buffer from 'buffer'; // Import buffer

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
