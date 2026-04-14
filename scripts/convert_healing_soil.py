#!/usr/bin/env python3
"""
convert_healing_soil.py

Converts Gemini-chunked Healing Soil guide from YAML/markdown format
into the JSON array format that validate.js and ingest.js expect.

Usage:
  python3 convert_healing_soil.py healing-soil-raw.txt > healing-soil-chunks.json

Input:  Raw Gemini output with ===CHUNK BREAK=== separators
Output: JSON array of chunk objects ready for validate.js → ingest.js
"""

import json, re, sys

if len(sys.argv) < 2:
    print("Usage: python3 convert_healing_soil.py <path-to-gemini-output.txt>", file=sys.stderr)
    sys.exit(1)

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    raw = f.read()

# Split on chunk breaks
raw_chunks = [c.strip() for c in re.split(r'={3,}CHUNK BREAK={3,}', raw) if c.strip()]
print(f"Found {len(raw_chunks)} chunks", file=sys.stderr)

ARCHETYPE_MAP = {
    'homegrower': 'Homegrower',
    'market-gardener': 'Market Gardener',
    'homesteader': 'Homesteader',
    'transitioning-farmer': 'Transitioning Farmer',
    'rancher': 'Rancher',
    'land-steward': 'Land Steward',
    'consultant': 'Consultant'
}

CONCEPT_KEYWORDS = [
    'soil restoration', 'chemical fatigue', 'mycorrhizal', 'fungal network',
    'nutrient cycling', 'cover crop', 'compost', 'biochar', 'soil biology',
    'decomposition', 'humus', 'soil structure', 'aggregation', 'water infiltration',
    'mulch', 'no-till', 'crop rotation', 'succession', 'dynamic accumulator',
    'nitrogen fixation', 'chelation', 'remineralization', 'microbial inoculant',
    'soil food web', 'root exudate', 'glomalin', 'geosmin', 'PLFA', 'Haney',
    'active carbon', 'keyline', 'compaction', 'hydrophobic', 'salinity',
    'shikimate pathway', 'fermented plant juice', 'root exudates'
]

SPECIES_PATTERNS = [
    r'\b(comfrey|yarrow|nettle|dandelion|plantain|clover|chickweed|dock|thistle|moss)\b',
    r'\b(daikon|buckwheat|hairy vetch|crimson clover|ryegrass|phacelia|sunflower|calendula)\b',
    r'\b(oats?|rye\b|barley|mustard|turnip|chicory|flax|millet)\b',
    r'\b(oyster mushroom|king stropharia)\b',
    r'\b(purslane|quinoa|beet|garlic|potato|beans?|peas?|squash)\b',
    r'\b(lamb.?s quarter)', 
]

chunks = []
for i, block in enumerate(raw_chunks):
    # --- Parse YAML header ---
    m = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', block, re.DOTALL)
    metadata = {}
    body = block
    if m:
        yaml_text = m.group(1)
        body = m.group(2).strip()
        for line in yaml_text.split('\n'):
            kv = re.match(r'^(\w[\w_]*):\s*(.+)$', line)
            if kv:
                key = kv.group(1).strip()
                val = kv.group(2).strip()
                if val.startswith('[') and val.endswith(']'):
                    inner = val[1:-1]
                    items = [x.strip().strip('"').strip("'") for x in inner.split(',') if x.strip()]
                    metadata[key] = items
                else:
                    metadata[key] = val.strip('"').strip("'")

    # --- Map archetypes ---
    raw_archetypes = metadata.get('archetype_relevance', [])
    if isinstance(raw_archetypes, list):
        archetypes = [ARCHETYPE_MAP.get(a.strip(), a.strip()) for a in raw_archetypes]
    else:
        archetypes = []

    topics = metadata.get('topics', [])
    if not isinstance(topics, list):
        topics = [topics]

    # --- Determine action_type ---
    sec = (metadata.get('section', '') or '').lower()
    sub = (metadata.get('subsection', '') or '').lower()
    action = 'Education'
    if any(k in sec for k in ['restoration', 'phased', 'revival']):
        action = 'Restoration'
    elif 'phase' in sub:
        action = 'Restoration'
    elif 'special protocol' in sec:
        action = 'Restoration'
    elif any(k in sec for k in ['assessment', 'learning to read']):
        action = 'Observation'
    elif any(k in sub for k in ['test', 'reading', 'forensic', 'hands']):
        action = 'Observation'
    elif 'water' in sec and 'forgotten' in sec:
        action = 'Planning'
    elif any(k in sec for k in ['appendix', 'recipe', 'scalable']):
        action = 'Intervention'
    elif 'troubleshoot' in sec:
        action = 'Observation'
    elif 'marker' in sec:
        action = 'Observation'

    # --- Extract species ---
    species = set()
    for pat in SPECIES_PATTERNS:
        for match in re.finditer(pat, body, re.IGNORECASE):
            s = match.group(0).lower().strip()
            # Normalize
            if s == 'oat': s = 'oats'
            if s == 'bean': s = 'beans'
            if s == 'pea': s = 'peas'
            species.add(s)

    # --- Extract ecological concepts ---
    body_lower = body.lower()
    concepts = sorted(set(c for c in CONCEPT_KEYWORDS if c.lower() in body_lower))

    # --- Generate summary ---
    flat = re.sub(r'\s+', ' ', body.replace('\n', ' '))
    # Remove markdown headers for cleaner summary
    flat = re.sub(r'#{1,4}\s+', '', flat)
    # Remove context tags
    flat = re.sub(r'\[Context:.*?\]', '', flat)
    sents = re.findall(r'[^.!?]+[.!?]+', flat)
    summary = ' '.join(sents[:2]).strip()
    if len(summary) > 250:
        summary = summary[:247] + '...'
    if len(summary) < 30 and len(sents) > 2:
        summary = ' '.join(sents[:3]).strip()

    # --- Build chunk object ---
    chunks.append({
        'chunk_id': metadata.get('chunk_id', f'healing-soil-{i+1:02d}'),
        'source_document': metadata.get('source_document', 'Healing Soil: A Guide to Biological Restoration'),
        'document_type': metadata.get('document_type', 'guide'),
        'section': metadata.get('section', ''),
        'subsection': metadata.get('subsection', 'None'),
        'topic': '; '.join(topics),
        'species_mentioned': sorted(list(species)),
        'ecological_concepts': concepts,
        'steward_relevance': archetypes,
        'season_relevance': ['All'],
        'action_type': action,
        'summary': summary,
        'chunk_text': body
    })

# Output
print(json.dumps(chunks, indent=2, ensure_ascii=False))
print(f"\n✅ Converted {len(chunks)} chunks to pipeline JSON", file=sys.stderr)

# Quick validation summary
word_counts = [len(c['chunk_text'].split()) for c in chunks]
print(f"   Word range: {min(word_counts)}-{max(word_counts)}", file=sys.stderr)
print(f"   Avg words/chunk: {sum(word_counts)//len(word_counts)}", file=sys.stderr)
short = [c['chunk_id'] for c in chunks if len(c['chunk_text'].split()) < 100]
long = [c['chunk_id'] for c in chunks if len(c['chunk_text'].split()) > 800]
if short:
    print(f"   ⚠️  Short chunks (<100 words): {', '.join(short)}", file=sys.stderr)
if long:
    print(f"   ⚠️  Long chunks (>800 words): {', '.join(long)}", file=sys.stderr)
