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

async function findWorkingModel() {
  const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro',
    'gemini-3.8-flash'
  ];

  for (const m of models) {
    try {
      console.log(`Trying ${m}...`);
      const response = await ai.models.generateContent({
        model: m,
        contents: 'Hello, respond with a short message.',
      });
      console.log(`SUCCESS with ${m}! Response: ${response.text?.trim()}`);
    } catch (err) {
      console.log(`Failed ${m}: ${err.message?.slice(0, 100)}`);
    }
  }
}

findWorkingModel();
