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

async function testLiteModels() {
  const models = [
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-flash-latest'
  ];

  for (const m of models) {
    try {
      console.log(`Testing ${m}...`);
      const response = await ai.models.generateContent({
        model: m,
        contents: 'Test message',
      });
      console.log(`SUCCESS with ${m}: ${response.text?.trim()}`);
    } catch (err) {
      console.log(`Failed ${m}: ${err.message?.slice(0, 120)}`);
    }
  }
}

testLiteModels();
