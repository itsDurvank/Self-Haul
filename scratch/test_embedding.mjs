import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

function getApiKey() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
    if (match && match[1]) {
      return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return process.env.GEMINI_API_KEY || '';
}

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

async function testEmbedding(model, config) {
  try {
    console.log(`Testing model: ${model}`);
    const response = await ai.models.embedContent({
      model: model,
      contents: 'I feel anxious about my future career path',
      config: config
    });
    const vals = response.embedding?.values || response.embeddings?.[0]?.values;
    console.log(`Success with ${model}! Vector length: ${vals?.length}`);
    if (vals) {
      console.log(`Sample values: ${vals.slice(0, 5).join(', ')}`);
    }
  } catch (err) {
    console.error(`Error with ${model}:`, err.message);
  }
}

async function run() {
  await testEmbedding('text-embedding-004', {});
  await testEmbedding('gemini-embedding-001', { outputDimensionality: 768 });
  await testEmbedding('embedding-001', {});
}

run();
