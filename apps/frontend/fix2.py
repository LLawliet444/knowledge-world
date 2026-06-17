#!/usr/bin/env python3
"""Fix incorrectly escaped quotes in object property strings."""

import re

def fix_line(line):
    # Pattern 1: "xxx\"  -> "xxx" where the \" is at the end of the string value
    # and is followed by , or } (closing of the string, incorrectly escaped)
    # The key insight: inside a string value, \" should NOT appear as the last char
    # because the string delimiter is the closing "

    # Find lines with this pattern: a string field value ending with \"
    # followed by , or }
    # Example: source: "mysteryQuestion\", state: ...
    # We want to fix the \" that's the CLOSING delimiter of the string

    # Strategy: scan the line and track string depth
    result = []
    i = 0
    in_string = False
    string_depth = 0
    modified = False

    while i < len(line):
        c = line[i]

        if c == '\\' and i + 1 < len(line) and line[i+1] == '"':
            # Escaped quote
            if in_string and string_depth == 1:
                # Inside a string, this is an escaped quote (valid)
                result.append('\\"')
                i += 2
            elif not in_string:
                # Outside string, this is a literal \"
                # Check if next char is , or } (indicates this was the closing delimiter)
                next_char = line[i+2] if i+2 < len(line) else ''
                if next_char in (',', '}', ' ', '\n'):
                    # Incorrectly escaped closing delimiter - remove escape
                    result.append('"')
                    modified = True
                    i += 2
                else:
                    # Literal \" inside something - keep as-is
                    result.append('\\"')
                    i += 2
            else:
                # Inside string at depth > 1 (nested), keep escape
                result.append('\\"')
                i += 2
        elif c == '"':
            if not in_string:
                in_string = True
                string_depth = 1
            else:
                # Closing delimiter
                string_depth -= 1
                if string_depth == 0:
                    in_string = False
            result.append('"')
            i += 1
        else:
            result.append(c)
            i += 1

    return ''.join(result), modified

changed_count = 0
for fname in ['src/data/sapiens.ts', 'src/data/economics.ts']:
    with open(fname) as f:
        lines = f.readlines()
    result = []
    for line in lines:
        fixed, modified = fix_line(line)
        result.append(fixed)
        if modified:
            changed_count += 1
    with open(fname, 'w') as f:
        f.writelines(result)
    print(f'Processed: {fname}')

print(f'Total lines modified: {changed_count}')
print('Done')
