const fs = require('fs');
const path = require('path');
const REQUIRED_FIELDS = ['chunk_id','source_document','topic','species_mentioned','ecological_concepts','steward_relevance','season_relevance','action_type','summary','content'];
const VALID_ARCHETYPES = ['Homegrower','Market Gardener','Homesteader','Transitioning Farmer','Rancher','Land Steward','Consultant','Education'];
const VALID_ACTION_TYPES = ['Observation','Harvest','Intervention','Restoration','Planning','Education'];
function validateChunks(filePath) {
  console.log('\n🌿 Regenerative Stewards — Chunk Validator');
  console.log('File: ' + filePath + '\n');
  if (!fs.existsSync(filePath)) {
    console.error('CHECK 1 FAILED: File not found');
    process.exit(1);
  }
  console.log('CHECK 1 PASSED: File exists');
  var chunks;
  try {
    var raw = fs.readFileSync(filePath, 'utf8');
    chunks = JSON.parse(raw);
  } catch (err) {
    console.error('CHECK 2 FAILED: Invalid JSON — ' + err.message);
    process.exit(1);
  }
  console.log('CHECK 2 PASSED: Valid JSON');
  if (!Array.isArray(chunks)) {
    console.error('CHECK 3 FAILED: Must be a JSON array');
    process.exit(1);
  }
  console.log('CHECK 3 PASSED: Is an array with ' + chunks.length + ' chunks');
  if (chunks.length === 0) {
    console.error('CHECK 4 FAILED: Array is empty');
    process.exit(1);
  }
  console.log('CHECK 4 PASSED: Array is not empty');
  var errors = [];
  chunks.forEach(function(chunk, index) {
    var id = chunk.chunk_id || 'chunk_' + index;
    REQUIRED_FIELDS.forEach(function(field) {
      if (chunk[field] === undefined || chunk[field] === null || chunk[field] === '') {
        errors.push('[' + id + '] Missing field: ' + field);
      }
    });
    if (typeof chunk.content !== 'string' || chunk.content.trim().length < 50) {
      errors.push('[' + id + '] Content too short or missing');
    }
    if (Array.isArray(chunk.steward_relevance)) {
      chunk.steward_relevance.forEach(function(a) {
        if (!VALID_ARCHETYPES.includes(a)) {
          errors.push('[' + id + '] Unknown archetype: ' + a);
        }
      });
    } else {
      errors.push('[' + id + '] steward_relevance must be an array');
    }
    if (!VALID_ACTION_TYPES.includes(chunk.action_type)) {
      errors.push('[' + id + '] Invalid action_type: ' + chunk.action_type);
    }
  });
  if (errors.length === 0) {
    console.log('CHECK 5-8 PASSED: All fields valid');
    console.log('\nVALIDATION PASSED — ' + chunks.length + ' chunks ready for ingestion\n');
  } else {
    console.log('\nVALIDATION FAILED — ' + errors.length + ' errors:\n');
    errors.forEach(function(e) { console.log('  -> ' + e); });
    process.exit(1);
  }
}
var filePath = process.argv[2];
if (!filePath) { console.error('Usage: node scripts/validate.js <file>'); process.exit(1); }
validateChunks(path.resolve(filePath));
