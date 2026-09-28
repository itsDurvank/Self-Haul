import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkAndApplyMigration() {
  console.log('Checking database columns for answers table and user_area_snapshots...');

  // Test selecting answer_analysis and deltas from answers table
  const { data, error } = await supabase.from('answers').select('id, answer_analysis, deltas').limit(1);

  if (error) {
    console.log('Notice on answers columns query:', error.message);
  } else {
    console.log('Successfully queried answers table with answer_analysis and deltas columns!');
  }

  // Test selecting from user_area_snapshots table
  const { data: areaData, error: areaErr } = await supabase.from('user_area_snapshots').select('user_id, life_domain, snapshot_text').limit(1);

  if (areaErr) {
    console.log('Notice on user_area_snapshots table query:', areaErr.message);
  } else {
    console.log('Successfully queried user_area_snapshots table!');
  }
}

checkAndApplyMigration();
