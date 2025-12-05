"""Add debug print to gateway/main.py"""

with open('gateway/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '    try:\n        # Build base conditions'
new_code = '    try:\n        print("DEBUG: get_incidents called")\n        # Build base conditions'

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Added debug print (LF)")
else:
    old_code_crlf = old_code.replace('\n', '\r\n')
    new_code_crlf = new_code.replace('\n', '\r\n')
    if old_code_crlf in content:
        content = content.replace(old_code_crlf, new_code_crlf)
        print("Added debug print (CRLF)")
    else:
        print("Could not find pattern")
        # Try finding just the try block start in get_incidents
        # This is risky if there are multiple try blocks, but get_incidents is unique enough
        # Actually, let's look for the docstring end
        docstring_end = '    Queries real database with filters\n    """'
        if docstring_end in content:
            idx = content.find(docstring_end) + len(docstring_end)
            # Find the next try:
            try_idx = content.find('try:', idx)
            if try_idx != -1:
                content = content[:try_idx+4] + '\n        print("DEBUG: get_incidents called")' + content[try_idx+4:]
                print("Added debug print (fallback)")
            else:
                print("Could not find try block")
                exit(1)
        else:
            print("Could not find docstring")
            exit(1)

with open('gateway/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
