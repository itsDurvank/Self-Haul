import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getEnvVar(key) {
  if (process.env[key]) return process.env[key];
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (match && match[1]) {
      return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return '';
}

const geminiKey = getEnvVar('GEMINI_API_KEY');
const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!geminiKey || !supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables in .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: geminiKey });
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateRealEmbedding(text) {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  });
  const vals = response.embedding?.values || response.embeddings?.[0]?.values;
  if (Array.isArray(vals) && vals.length === 768) {
    return vals;
  }
  throw new Error('Failed to generate 768-dim embedding');
}

async function reembedAll() {
  console.log('Fetching all rows from question_analysis...');
  const { data: rows, error } = await supabase
    .from('question_analysis')
    .select('id, question_id, analysis_json');

  if (error) {
    console.error('Failed to fetch question_analysis:', error.message);
    return;
  }

  console.log(`Found ${rows.length} rows to re-embed.`);

  for (const row of rows) {
    const textToEmbed =
      row.analysis_json?.concern?.stated_concern ||
      row.analysis_json?.input?.raw_text ||
      '';

    if (!textToEmbed) {
      console.log(`Skipping row ${row.id} - no text content.`);
      continue;
    }

    try {
      console.log(`Re-embedding row ${row.id} ("${textToEmbed.slice(0, 40)}...")...`);
      const embedding = await generateRealEmbedding(textToEmbed);
      
      const { error: updateErr } = await supabase
        .from('question_analysis')
        .update({ embedding })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`Failed to update row ${row.id}:`, updateErr.message);
      } else {
        console.log(`Successfully updated row ${row.id}!`);
      }
    } catch (e) {
      console.error(`Error re-embedding row ${row.id}:`, e.message);
    }
  }

  console.log('Re-embedding complete!');
}

reembedAll();
