#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const scriptsDir = '/Users/sassysquatch/Documents/regenerative-stewards/scripts';

// Get all .json.txt files
const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.json.txt'));

console.log(`Found ${files.length} .json.txt files to process\n`);

let success = 0;
let failed = 0;

for (const file of files) {
  const fullPath = path.join(scriptsDir, file);
  const newPath = path.join(scriptsDir, file.replace('.json.txt', '.json'));

  // Skip if a clean .json version already exists
  if (fs.existsSync(newPath)) {
    console.log(`⏭️  SKIPPED: ${file} — clean .json already exists`);
    continue;
  }

  try {
    let raw = fs.readFileSync(fullPath, 'utf8');

    // Remove BOM if present
    raw = raw.replace(/^\uFEFF/, '');

    // Remove any leading/trailing whitespace
    raw = raw.trim();

    // Attempt to parse
    const parsed = JSON.parse(raw);

    // Write clean version as .json
    fs.writeFileSync(newPath, JSON.stringify(parsed, null, 2), 'utf8');
    console.log(`✅ FIXED: ${file} → ${file.replace('.json.txt', '.json')} (${parsed.length} chunks)`);
    success++;

  } catch (err) {
    console.log(`❌ FAILED: ${file} — ${err.message}`);
    failed++;
  }
}

console.log(`\n═══════════════════════════════`);
console.log(`✅ Fixed:  ${success}`);
console.log(`⏭️  Skipped: ${files.length - success - failed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`═══════════════════════════════`);
