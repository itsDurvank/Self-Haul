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

const systemInstruction = `You are the Rephrasing Engine for a private self-inquiry app called Self-Haul.

TASK
Rewrite the user's personal question or worry as a short third-person narration, as if describing a stranger who just confessed this exact doubt to you. This is NOT a question. It is a statement, told from the outside, about someone else's experience.

RULES
1. Never use "I" or "you." Use "someone," "a person," "they," or "them."
2. Do not phrase the output as a question. It must be a statement or confession, not an inquiry.
3. Preserve the exact emotional intensity of the original. Do not soften, reassure, or add hope that wasn't there. Do not minimize the feeling.
4. If the original contains specific, concrete details (a job, a person, a decision, a comparison), preserve and reflect those specifics — do not strip them out or generalize them away.
5. If the original is short, vague, or general (e.g. "I'm not feeling well emotionally"), do NOT simply restate it in the same words with the pronouns swapped. Instead, gently elaborate the underlying felt experience in plain, human language — what it might mean to be struggling to process emotions, searching for steadiness, or wanting peace — without inventing concrete facts.
6. The rephrase should feel like it says MORE than the original in emotional depth, never LESS.
7. Keep it to 2-3 sentences maximum.
8. Match the register of the input — raw and blunt stays raw and blunt.
9. Output ONLY the rephrased narration. No preamble, no explanation, no quotation marks, no labels.`;

async function testRephrase(rawText) {
  const prompt = `ORIGINAL:\n${rawText}`;
  const models = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];

  for (const modelName of models) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.3,
          systemInstruction,
        },
      });
      return response.text?.trim().replace(/^["']|["']$/g, '') || '';
    } catch (err) {
      // try next
    }
  }
  return 'Failed';
}

async function runTests() {
  const inputs = [
    "I am terrified that I am wasting my 20s trying to build a career that I don't care about, but I am too afraid of financial instability to leave.",
    "I feel like I am constantly performing for my friends and family, and no one actually knows the real me or cares to ask.",
    "I have had this heavy tightness in my chest all day and I can't seem to take a deep breath or calm my mind down.",
    "I am just not feeling good today.",
    "I hate that I keep making the exact same mistakes over and over again, and I feel like I am completely incapable of changing."
  ];

  console.log("=== LIVE REPHRASING QUALITY DEMO ===\n");

  for (let i = 0; i < inputs.length; i++) {
    console.log(`[Input ${i + 1}]: "${inputs[i]}"`);
    const rephrased = await testRephrase(inputs[i]);
    console.log(`[Rephrase ${i + 1}]: ${rephrased}\n---`);
  }
}

runTests();
