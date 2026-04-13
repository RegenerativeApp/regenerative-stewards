#!/usr/bin/env python3
"""
RTL Part 1 Cleaner
Run: python3 clean_rtl_part1.py <input_file.json>
Outputs: RTL_part1_clean.json
"""
import json, re, sys

if len(sys.argv) < 2:
    print("Usage: python3 clean_rtl_part1.py <input_file.json>")
    sys.exit(1)

with open(sys.argv[1], 'r') as f:
    content = f.read()

# Parse - handle both array and individual objects
try:
    chunks = json.loads(content)
    if not isinstance(chunks, list):
        chunks = [chunks]
except json.JSONDecodeError:
    chunks = []
    decoder = json.JSONDecoder()
    pos = 0
    while pos < len(content):
        while pos < len(content) and content[pos] in ' \t\n\r':
            pos += 1
        if pos >= len(content):
            break
        if content[pos] == '{':
            try:
                obj, end = decoder.raw_decode(content, pos)
                chunks.append(obj)
                pos = end
            except json.JSONDecodeError:
                pos += 1
        else:
            pos += 1

print(f"Loaded {len(chunks)} chunks")

# Remove hallucinated RTL-039 through RTL-044
hallucinated = {'RTL-039', 'RTL-040', 'RTL-041', 'RTL-042', 'RTL-043', 'RTL-044'}
clean = [c for c in chunks if c['chunk_id'] not in hallucinated]
print(f"Removed {len(chunks) - len(clean)} hallucinated chunks")

# Strip [cite: N] artifacts
cite_re = re.compile(r'\[cite:\s*[\d,\s]+\]')
for c in clean:
    t = cite_re.sub('', c['text'])
    t = re.sub(r'  +', ' ', t)
    t = re.sub(r' ,', ',', t)
    t = re.sub(r' \.', '.', t)
    c['text'] = t.strip()

# Check for duplicates
ids = [c['chunk_id'] for c in clean]
dupes = set(x for x in ids if ids.count(x) > 1)
if dupes:
    print(f"Removing duplicates: {dupes}")
    seen = set()
    deduped = []
    for c in clean:
        if c['chunk_id'] not in seen:
            seen.add(c['chunk_id'])
            deduped.append(c)
    clean = deduped

with open('RTL_part1_clean.json', 'w') as f:
    json.dump(clean, f, indent=2, ensure_ascii=False)

print(f"Output: RTL_part1_clean.json ({len(clean)} chunks)")
total_w = sum(len(c['text'].split()) for c in clean)
print(f"Total words: {total_w}, est tokens: ~{int(total_w*1.3)}")
