# Self-Haul: Full QA Test Runbook

**Purpose:** Run every test below in order. For each one, report PASS or FAIL, and if FAIL, include the exact error, log line, or query result that shows it. Do not skip a test because an earlier one failed — note the failure and continue, since later tests may reveal the same root cause more clearly.

**Before starting:** confirm the following exist and are reachable:
- [ ] `.env` / `.env.local` has `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and ideally `SUPABASE_SERVICE_ROLE_KEY`
- [ ] The app runs locally (`npm run dev` or equivalent) without startup errors
- [ ] You have access to the Supabase SQL editor for this project
- [ ] Two test accounts can be created (Account A and Account B), with two different emails

---

## SECTION 1 — Environment & Config Sanity

### 1.1 Environment variables load correctly
Print (do not log the actual key value) whether each of these is defined and non-empty at runtime: `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **PASS:** all three are present and non-empty
- **FAIL:** any is missing — stop here, nothing downstream will work

### 1.2 Supabase connection works
Run any trivial authenticated query (e.g. `select now();`) through the app's server Supabase client.
- **PASS:** returns a timestamp with no connection error
- **FAIL:** note the exact connection error

### 1.3 Gemini API key is valid
Make a minimal `generateContent` call with a trivial prompt (e.g. "say OK") using the current model name in `src/lib/gemini/client.ts`.
- **PASS:** returns text, no `API key not valid` or 403 error
- **FAIL:** note the exact error message

### 1.4 No secrets committed to git
Run: `git log --all --full-history -- .env .env.local` and `grep -r "GEMINI_API_KEY" --include="*.ts" --include="*.tsx" -l src/` (excluding `process.env.GEMINI_API_KEY` references).
- **PASS:** no commit history for env files, no hardcoded key strings found in source
- **FAIL:** list any file/commit where a real key appears in plain text

---

## SECTION 2 — Authentication

### 2.1 Sign-up creates a session
Sign up as Account A (new email). Confirm the app shows a logged-in state immediately or after email confirmation (whichever your auth method requires).
- **PASS:** logged-in state reached, `auth.users` row exists in Supabase for this email
- **FAIL:** note where the flow breaks

### 2.2 `user_profiles` row auto-created
After Account A signs up, run:
```sql
select * from public.user_profiles where user_id = '<account_a_uuid>';
```
- **PASS:** one row exists, `full_name`/`moniker`/`intent` populated (from the `handle_new_user` trigger)
- **FAIL:** no row, or trigger error in Supabase logs

### 2.3 Session persists across reload
Refresh the page while logged in as Account A.
- **PASS:** still logged in, no forced re-login
- **FAIL:** logged out unexpectedly

### 2.4 Logout works
Log out. Confirm you're returned to the landing/login screen and can no longer reach authenticated screens directly by URL.
- **PASS:** logged out cleanly, protected routes redirect to login
- **FAIL:** still able to access authenticated content after logout

### 2.5 No guest mode exists anywhere
Attempt to reach the dump/answer/reflection flow without ever logging in (fresh incognito session, no account).
- **PASS:** blocked before reaching any screen that would call `/api/extract`, `/api/rephrase`, or `/api/insight`
- **FAIL:** any AI-backed screen is reachable without a session (guest mode should be fully removed per current requirements)

---

## SECTION 3 — Database & RLS Isolation

Do this section with **both** Account A and Account B created and each having dumped at least 2 questions through the normal UI.

### 3.1 Rows are tagged with the correct real user_id
```sql
select user_id, count(*) from public.questions group by user_id;
```
- **PASS:** exactly two distinct real UUIDs (Account A's and Account B's), no `null`, no literal string `'guest'`
- **FAIL:** any row has `user_id` null, `'guest'`, or a value that doesn't match either test account

### 3.2 RLS blocks cross-user reads at the app level
While authenticated as Account B in the running app (not the SQL editor), attempt to fetch Account A's data through the normal client (e.g. via the app's own data-fetching calls, or by manually calling the Supabase client in a browser console with Account B's session active) filtered to Account A's `user_id`.
- **PASS:** zero rows returned, even though the query itself is syntactically valid
- **FAIL:** any of Account A's row data returned while authenticated as Account B

### 3.3 Direct RPC call cannot be spoofed
While authenticated as Account B, call `match_question_analysis` directly via the Supabase client, and (if the function signature still accepts it) pass Account A's UUID as `p_user_id`.
```js
await supabase.rpc('match_question_analysis', {
  query_embedding: <any_768_length_array>,
  match_threshold: 0.0,
  match_count: 10,
  p_user_id: '<account_a_uuid>'
});
```
- **PASS:** either the parameter is ignored and only Account B's own rows are returned, or the call errors
- **FAIL:** any of Account A's `analysis_json` is returned

### 3.4 Unauthenticated RPC call is rejected
Using a Supabase client with no active session (anon key only, no login), call `match_question_analysis` with any parameters.
- **PASS:** the call raises `Unauthorized: authentication required` (or fails outright)
- **FAIL:** the call succeeds and returns any rows at all

### 3.5 API routes reject cross-user requests
While authenticated as Account B, send a request to `/api/extract`, `/api/rephrase`, and `/api/insight` with `userId` in the body set to Account A's UUID.
- **PASS:** each route returns `403 Forbidden`
- **FAIL:** any route processes the request or returns data

### 3.6 API routes reject unauthenticated requests
With no session at all, send a request to each of `/api/extract`, `/api/rephrase`, `/api/insight`.
- **PASS:** each returns `401 Unauthorized`
- **FAIL:** any route processes the request

---

## SECTION 4 — Extraction Pipeline

### 4.1 Extraction runs on real model, not fallback
Dump 3 clearly different, detailed questions (one career, one relationship, one health-related). After each, check server logs for `CRITICAL: All Gemini extraction models failed`.
- **PASS:** this log line never appears
- **FAIL:** it appears for any entry — note which model errors preceded it

### 4.2 Extracted JSON reflects actual content
```sql
select analysis_json->'situation'->>'life_domain' as domain,
       analysis_json->'concern'->>'stated_concern' as concern,
       analysis_json->'emotional_state'->'primary_emotions' as emotions
from public.question_analysis
order by created_at desc limit 3;
```
- **PASS:** `life_domain` correctly differs per entry (career/relationship/health), `stated_concern` is a real paraphrase of what was written, not generic boilerplate
- **FAIL:** all three rows look near-identical, or `life_domain` doesn't match what was actually written

### 4.3 Schema completeness
Pick one row and confirm every top-level key from the extraction schema is present: `emotional_state`, `situation`, `trigger`, `concern`, `cognitive_state`, `behavioral_state`, `self_relation`, `gap_indicators`, `clinical_pattern_flags`, `expression`, `recurrence`, `evidence`, `overall_confidence`.
- **PASS:** all keys present (values may be null where evidence is lacking, that's correct behavior)
- **FAIL:** any top-level key missing entirely

### 4.4 Null-when-uncertain behavior
Dump a very short, ambiguous entry (e.g. "hmm").
- **PASS:** fields with no textual evidence (e.g. `trigger_type`, `cognitive_distortions`) come back `null` or empty, not fabricated specific values
- **FAIL:** the model invents specific details (a job, a person, an event) not present in "hmm"

---

## SECTION 5 — Embeddings & Vector Search

### 5.1 Real embeddings, not fallback hash vectors
After dumping several entries, check server logs for `CRITICAL: Gemini embedding API failed on all models`.
- **PASS:** this never appears
- **FAIL:** it appears — note it, and treat all vectors generated during that window as suspect

### 5.2 Embedding dimension matches column
```sql
select vector_dims(embedding) from public.question_analysis order by created_at desc limit 1;
```
- **PASS:** returns `768`
- **FAIL:** returns anything else, or null

### 5.3 Similarity search reflects actual meaning
Dump two clearly related entries (e.g. two career-anxiety entries) and one unrelated entry (e.g. about a sibling conflict). Get their ids, then:
```sql
select 1 - (a.embedding <=> b.embedding) as similarity
from public.question_analysis a, public.question_analysis b
where a.id = '<career_entry_1_id>' and b.id = '<career_entry_2_id>';
```
Repeat comparing a career entry against the unrelated entry.
- **PASS:** the two career entries score noticeably higher similarity than career-vs-unrelated
- **FAIL:** similarity scores are roughly equal regardless of content (indicates fake/broken vectors)

### 5.4 Old pre-fix data has been re-embedded (if applicable)
If any entries existed before the embedding model was fixed, confirm `scripts/reembed_all.mjs` has been run.
```sql
select count(*) from public.question_analysis where embedding is null;
```
- **PASS:** zero, or only rows with genuinely empty source text
- **FAIL:** rows exist with null embeddings and real text content — re-run the script

---

## SECTION 6 — RAG Retrieval (Rephrasing Context)

### 6.1 Retrieval actually returns matches when history exists
With at least 3 related entries already stored, dump a new related question. Temporarily log the `matches` result from the `match_question_analysis` RPC call inside `/api/rephrase`.
- **PASS:** returns 1-3 relevant past entries
- **FAIL:** always returns empty even when clearly relevant history exists (check `match_threshold` — 0.5 may be too strict depending on real embedding score distributions; try lowering to test)

### 6.2 Cold start doesn't break
As a brand-new account with zero history, dump a first question.
- **PASS:** rephrasing still succeeds, with `similarPastTexts` empty and `profileSummary` empty, no error thrown
- **FAIL:** any error or crash when history/profile is empty

### 6.3 Retrieval is scoped to the correct user only
With Account A and Account B both having similar-themed entries, confirm Account B's rephrase calls never retrieve Account A's entries (covered technically by 3.3, but verify here in the actual rephrase flow specifically).
- **PASS:** matches returned are always from the requesting user's own history
- **FAIL:** any cross-user match appears

---

## SECTION 7 — Rephrasing Quality

For each of these, dump the exact input given and record the actual output.

### 7.1 Third-person form, never a question
Input: `"I am afraid whether I will get a job or not"`
- **PASS:** output uses "someone/they", is a statement not a question, no "I"/"you"
- **FAIL:** any first/second person pronoun, or output ends in "?"

### 7.2 No generic pronoun-swap on vague input
Input: `"I am not feeling very well emotionally"`
- **PASS:** output adds real elaboration (e.g. references steadiness, processing, peace) beyond a literal pronoun swap
- **FAIL:** output is just "They are not feeling very well emotionally" or similarly thin

### 7.3 Specific details preserved on detailed input
Input: `"I am very afraid of my career I don't know where to go... I compare path of others and wonder if mine is right"`
- **PASS:** output retains the comparison-to-others detail and the career-plan detail
- **FAIL:** output generalizes away the specifics into something vague

### 7.4 No fabricated facts
Input: `"I feel heavy in my chest"`
- **PASS:** output does not invent a cause (no fake job, fake person, fake event) not present in the input
- **FAIL:** output adds a specific fabricated cause

### 7.5 No prompt leakage / labels in output
- **PASS:** output never begins with "Someone is carrying this doubt:" or similar meta-labels, and never includes quotation marks around the whole output
- **FAIL:** any such prefix or wrapping appears

### 7.6 Intensity preserved, not softened
Input something with strong language (e.g. "I hate that I keep failing at this").
- **PASS:** output intensity matches, no added reassurance like "but it will be okay"
- **FAIL:** output softens or reassures

---

## SECTION 8 — On-Demand AI Insight (gating)

### 8.1 No automatic insight generation
Complete a full ritual (dump → portal → answer → reflection) without pressing any Insight button. Check server logs / network tab for any call to `/api/insight`.
- **PASS:** zero calls to `/api/insight` made automatically
- **FAIL:** insight is generated without the button being pressed

### 8.2 Insight button produces real output
Press the Insight button.
- **PASS:** a specific, data-grounded gap analysis appears (references an actual pattern from the entries, not generic advice)
- **FAIL:** generic/boilerplate text unrelated to actual entries, or an error

### 8.3 Insight updates tracking state
```sql
select insight_ever_requested, last_insight_generated_at from public.user_ai_state where user_id = '<test_user_id>';
```
- **PASS:** `insight_ever_requested = true`, `last_insight_generated_at` is recent
- **FAIL:** either field not updated

### 8.4 Profile snapshot is created/updated
```sql
select summary_text, updated_at from public.user_summary_snapshots where user_id = '<test_user_id>';
```
- **PASS:** non-empty `summary_text`, recent `updated_at`
- **FAIL:** empty or missing row

### 8.5 Moving watermark advances correctly
Note the `last_insight_generated_at` value from 8.3. Dump and answer 2-3 more questions. Press Insight again. Temporarily log which `question_analysis` rows are pulled for this second call (via their `created_at`).
- **PASS:** only entries created after the previous `last_insight_generated_at` are included in the "new entries" portion of the prompt (plus the existing summary text)
- **FAIL:** the same old entries are reprocessed, or new entries are skipped entirely

### 8.6 Confrontational tone only when data supports it
Create a session where entries show clear repeated external blame + zero actions taken. Press Insight.
- **PASS:** output directly names the gap (e.g. insight without action, external blame)
- **FAIL:** output is vague or purely sympathetic despite clear data

### 8.7 Supportive tone override on high distress
Create entries with consistently high emotional intensity and hopelessness language. Press Insight.
- **PASS:** tone shifts to supportive/stabilizing rather than confrontational, and gently suggests professional support
- **FAIL:** confrontational tone persists despite high-distress signals

### 8.8 Clinical pattern flag never surfaces as a label
Create entries describing a repetitive intrusive thought paired with a checking/reassurance behavior, across 3+ entries.
- **PASS:** if flagged, output only gently suggests professional conversation, never states a diagnostic term (e.g. never says "OCD")
- **FAIL:** any clinical/diagnostic label appears in user-facing text

---

## SECTION 9 — Data Handling & Lifecycle

### 9.1 "Burn It All" behavior matches intended design
Trigger Burn It All. Check whether this clears only local state or also deletes Supabase rows.
- **PASS:** behavior matches whatever was explicitly decided (confirm with product owner if unclear — flag this as a decision point if not yet decided)
- **FAIL:** partial deletion (e.g. local cleared but Supabase rows remain, or vice versa) without this being the intended design

### 9.2 Export functions produce accurate data
Use the .txt/.md export or copy-to-clipboard feature after a completed session.
- **PASS:** exported content matches exactly what's stored (raw questions, rephrased text, answers)
- **FAIL:** missing entries, mismatched text, or broken formatting

### 9.3 Account deletion cascades correctly (if implemented)
If an account deletion feature exists, delete a test account and confirm:
```sql
select count(*) from public.questions where user_id = '<deleted_user_id>';
select count(*) from public.question_analysis where user_id = '<deleted_user_id>';
-- repeat for all tables with user_id
```
- **PASS:** all counts are zero (cascading delete worked via `ON DELETE CASCADE`)
- **FAIL:** any orphaned rows remain

---

## SECTION 10 — Full End-to-End Run

### 10.1 Complete fresh-user journey
As a brand-new account: sign up → dump 5-6 varied real questions → enter portal → answer each rephrased question → reach reflection → press Insight → read result.
- **PASS:** entire flow completes with no errors, no fallback warnings in logs, and the Insight output feels specific to what was actually written
- **FAIL:** note the exact step where something breaks or feels wrong

### 10.2 Returning-user journey
Log back in as that same account a day (or session) later, dump a few more related questions, press Insight again.
- **PASS:** the new insight references the accumulated history sensibly (via the moving watermark + profile summary), doesn't repeat identical text from the first insight
- **FAIL:** insight is identical to before, or ignores prior sessions entirely

---

## Reporting Format

For each numbered test, report in this format:

```
[SECTION.TEST_NUMBER] — PASS / FAIL
If FAIL: exact error / log line / query output that shows the failure
If FAIL: suspected file or function responsible
```

Group all FAILs at the end into a prioritized list: anything under Section 3 (isolation/security) is highest priority, followed by Section 4-6 (core AI pipeline correctness), then Section 7-8 (quality/UX), then Section 9-10 (lifecycle/full flow).