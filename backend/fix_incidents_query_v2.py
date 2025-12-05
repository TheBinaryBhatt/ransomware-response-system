"""Fix the get_incidents query in gateway/main.py - V2"""

with open('gateway/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# The code to find
old_code_snippet = 'count_stmt = select(func.count(Incident.id))'

# The replacement
new_code_snippet = 'count_stmt = select(func.count()).select_from(Incident)'

if old_code_snippet in content:
    content = content.replace(old_code_snippet, new_code_snippet)
    print("Replaced count query (simple)")
else:
    # Try finding the one with conditions
    old_code_cond = 'count_stmt = select(func.count(Incident.id)).where(and_(*conditions))'
    new_code_cond = 'count_stmt = select(func.count()).select_from(Incident).where(and_(*conditions))'
    
    if old_code_cond in content:
        content = content.replace(old_code_cond, new_code_cond)
        # Also replace the simple one if present
        content = content.replace(old_code_snippet, new_code_snippet)
        print("Replaced count query (with conditions)")
    else:
        print("Could not find count query pattern!")
        # Debug: print what we have around that area
        idx = content.find("Simple count query")
        if idx != -1:
            print("Found 'Simple count query' comment. Context:")
            print(content[idx:idx+200])
        else:
            print("Could not find 'Simple count query' comment")
        exit(1)

with open('gateway/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
