"""Fix the get_incidents query in gateway/main.py"""

with open('gateway/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the problematic section
old_code = '''    try:
        # Build query
        stmt = select(Incident)
        
        # Apply filters - case insensitive matching
        if status:
            stmt = stmt.where(Incident.status.ilike(status))
        
        if severity:
            stmt = stmt.where(Incident.severity.ilike(severity))
        
        # Get total count (before pagination)
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering - use received_at (actual column in DB)
        stmt = stmt.order_by(Incident.received_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(stmt)
        incidents = result.scalars().all()'''

new_code = '''    try:
        # Build base conditions
        conditions = []
        if status:
            conditions.append(Incident.status.ilike(status))
        if severity:
            conditions.append(Incident.severity.ilike(severity))
        
        # Simple count query
        if conditions:
            count_stmt = select(func.count(Incident.id)).where(and_(*conditions))
        else:
            count_stmt = select(func.count(Incident.id))
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0
        
        # Build main query with filters
        stmt = select(Incident)
        if conditions:
            for cond in conditions:
                stmt = stmt.where(cond)
        
        # Apply pagination and ordering - use received_at (actual column in DB)
        stmt = stmt.order_by(Incident.received_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(stmt)
        incidents = result.scalars().all()'''

# Try different line endings
if old_code in content:
    content = content.replace(old_code, new_code)
    print("Replaced with LF line endings")
else:
    old_code_crlf = old_code.replace('\n', '\r\n')
    new_code_crlf = new_code.replace('\n', '\r\n')
    if old_code_crlf in content:
        content = content.replace(old_code_crlf, new_code_crlf)
        print("Replaced with CRLF line endings")
    else:
        print("ERROR: Could not find old code pattern")
        # Fallback: try to find the key line
        if "select(func.count()).select_from(stmt.subquery())" in content:
            print("Found the problematic subquery line - replacing it")
            content = content.replace(
                "select(func.count()).select_from(stmt.subquery())",
                "select(func.count(Incident.id))"
            )
        else:
            print("Could not find either pattern!")
            exit(1)

with open('gateway/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
