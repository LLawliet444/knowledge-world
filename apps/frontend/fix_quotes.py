#!/usr/bin/env python3
"""Fix two issues in .ts data files:
1. Arrays with incorrectly escaped quotes: ["xxx\" -> ["xxx"
2. sourceExcerpt text content fields with inner unescaped quotes
"""

import re

def fix_arrays(content):
    """Fix arrays where first quote inside [...] was incorrectly escaped."""
    # Pattern: ["xxx\"  -> ["xxx"
    # Pattern: [... \"...]  -> [... "...]
    result = re.sub(r'\["([^"\\]+)\\\"', r'["\1"', content)
    return result

def fix_sourceExcerpt(content):
    """Escape inner quotes in sourceExcerpt string values."""
    lines = content.splitlines(keepends=True)
    result = []

    for line in lines:
        stripped = line.lstrip()
        # Add sourceExcerpt to the list
        if not any(stripped.startswith(f) for f in (
            'text:', 'sourceExcerpt:', 'sceneText:',
            'whatIntro:', 'how:', 'why:', 'system:',
            'finalReturn:', 'guidance:', 'next_question:',
            'mysteryQuestion:', 'title:', 'mentorIntro:'
        )):
            result.append(line)
            continue

        qs = [i for i, c in enumerate(line) if c == '"']
        if len(qs) < 3:
            result.append(line)
            continue

        first_q = qs[0]
        prefix = line[:first_q]

        # Scan from first_q+1
        quote_depth = 1
        i = first_q + 1
        last_q = None

        while i < len(line):
            c = line[i]
            if c == '\\':
                i += 2
                continue
            if c == '"':
                quote_depth += 1
                if quote_depth % 2 == 1:
                    last_q = i
                    break
            i += 1

        if last_q is None:
            result.append(line)
            continue

        content_part = line[first_q + 1:last_q]
        # Escape unescaped double quotes
        fixed = []
        j = 0
        while j < len(content_part):
            if content_part[j] == '\\':
                fixed.append(content_part[j:j+2])
                j += 2
            elif content_part[j] == '"':
                fixed.append('\\"')
                j += 1
            else:
                fixed.append(content_part[j])
                j += 1

        new_line = line[:first_q + 1] + ''.join(fixed) + line[last_q:]
        result.append(new_line)

    return ''.join(result)

for fname in ['src/data/sapiens.ts', 'src/data/economics.ts']:
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()

    # Step 1: Fix arrays
    content = fix_arrays(content)

    # Step 2: Fix sourceExcerpt inner quotes
    content = fix_sourceExcerpt(content)

    with open(fname, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'Fixed: {fname}')

print('Done')
