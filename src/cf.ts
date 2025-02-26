// src/cf.ts
import * as buffer from 'buffer';

const ssePrefix = 'data:';
const sseEnd = `${ssePrefix} [DONE]`;

import { type Context } from 'hono';
import { type Ai } from '@cloudflare/ai';

export class W {
  binding: any;
  options: {};
  logs: any;
  lastRequestId: string;
  constructor(e: any, t = {}) {
    if (!e)
      throw new Error('Ai binding is undefined. Please provide a valid binding.');
    this.binding = e;
    this.options = t;
    this.lastRequestId = '';
  }
  async run(e: any, t: any) {
    console.log(e, t);
    const s = await this.binding.run(e, t, this.options);
    return (
      (this.lastRequestId = this.binding.lastRequestId),
      this.options.debug && (this.logs = this.binding.getLogs()),
      s
    );
  }
  getLogs() {
    return this.logs;
  }
}
/**
 *  Fixes for TypeScript
 */
interface Context extends Context {
  env: {
    AI: Ai;
    PKV: KVNamespace;
  };
  get: <T>(key: string) => T;
  set: <T>(key: string, value: T) => void;
}

