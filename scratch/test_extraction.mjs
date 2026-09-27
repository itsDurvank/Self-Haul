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

async function testExtractionFallback() {
  const models = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
  for (const m of models) {
    try {
      console.log(`Trying extraction with ${m}...`);
      const response = await ai.models.generateContent({
        model: m,
        contents: 'I feel terrified of failing my exam tomorrow and disappointed in myself',
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
      console.log(`SUCCESS with ${m}!`);
      console.log("Output preview:", response.text.slice(0, 150));
      return;
    } catch (err) {
      console.warn(`Model ${m} failed: ${err.message}`);
    }
  }
}

testExtractionFallback();
