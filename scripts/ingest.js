const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const { repairJson } = require('json-repair');


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('Missing environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

function cleanJSON(raw) {
  const s = raw.replace(/^\uFEFF/, '');
  return repairJson(s, { returnObjects: true });
}

async function ingestChunks(filePath) {
  console.log('\n🌿 Regenerative Stewards — Chunk Ingestor');
  console.log('File: ' + filePath + '\n');

  var raw = fs.readFileSync(filePath, 'utf8');
  var chunks = cleanJSON(raw);
  console.log('Loaded ' + chunks.length + ' chunks\n');

  var successCount = 0;
  var errorCount = 0;

  for (var i = 0; i < chunks.length; i++) {
    var chunk = chunks[i];
    var id = chunk.chunk_id;

    try {
      process.stdout.write('[' + (i + 1) + '/' + chunks.length + '] Embedding ' + id + '...');

      var textToEmbed = chunk.topic + '\n' + chunk.summary + '\n' + chunk.content;
      var embedding = await generateEmbedding(textToEmbed);

      var result = await supabase.from('plant_knowledge').upsert({
        chunk_id: chunk.chunk_id,
        source_document: chunk.source_document,
        topic: chunk.topic,
        species_mentioned: chunk.species_mentioned,
        ecological_concepts: chunk.ecological_concepts,
        steward_relevance: chunk.steward_relevance,
        season_relevance: chunk.season_relevance,
        action_type: chunk.action_type,
        summary: chunk.summary,
        content: chunk.content,
        embedding: embedding,
      }, { onConflict: 'chunk_id' });

      if (result.error) {
        console.log(' ERROR');
        console.error('   ' + result.error.message);
        errorCount++;
      } else {
        console.log(' OK');
        successCount++;
      }

      await new Promise(function(resolve) { setTimeout(resolve, 200); });

    } catch (err) {
      console.log(' ERROR');
      console.error('   ' + err.message);
      errorCount++;
    }
  }

  console.log('\nINGESTION COMPLETE');
  console.log('Success: ' + successCount);
  console.log('Errors:  ' + errorCount + '\n');
}

var filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/ingest.js <path-to-chunks.json>');
  process.exit(1);
}

ingestChunks(path.resolve(filePath)).catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
