/**
 * Reprocesses all existing photo/image materials through the new Claude Vision extractor.
 * Run with: node scripts/reprocess-images.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const API_BASE = "http://localhost:8080/api";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const baseUrl = new URL(SUPABASE_URL).origin;
const supabase = createClient(baseUrl, SUPABASE_KEY);

// Fetch all photo/image materials joined with their meeting's project_id
const { data: materials, error } = await supabase
  .from("materials")
  .select("id, type, status, original_name, filename, meeting_id, meetings(project_id)")
  .in("type", ["photo", "image"]);

if (error) {
  console.error("Supabase query failed:", error.message);
  process.exit(1);
}

if (!materials || materials.length === 0) {
  console.log("No photo/image materials found.");
  process.exit(0);
}

console.log(`Found ${materials.length} photo/image material(s) to reprocess.\n`);

let success = 0;
let failed = 0;

for (const m of materials) {
  const projectId = m.meetings?.project_id;
  const meetingId = m.meeting_id;
  const materialId = m.id;

  if (!projectId) {
    console.warn(`  [SKIP] Material ${materialId} (${m.original_name}) — could not resolve project_id`);
    failed++;
    continue;
  }

  const url = `${API_BASE}/projects/${projectId}/meetings/${meetingId}/materials/${materialId}/retry`;
  process.stdout.write(`  [${m.status}] ${m.original_name} (id=${materialId}) → retrying... `);

  try {
    const res = await fetch(url, { method: "POST" });
    if (res.ok) {
      console.log("queued ✓");
      success++;
    } else {
      const body = await res.text();
      console.log(`failed (HTTP ${res.status}: ${body})`);
      failed++;
    }
  } catch (err) {
    console.log(`error: ${err.message}`);
    failed++;
  }

  // Small delay to avoid hammering Anthropic rate limits
  await new Promise((r) => setTimeout(r, 500));
}

console.log(`\nDone: ${success} queued, ${failed} skipped/failed.`);
console.log("Extraction runs in the background — check material status in the app.");
