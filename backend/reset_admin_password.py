import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import get_db
from core.models import User
from core.security import get_password_hash
from sqlalchemy import select

async def reset_admin_password():
    # Get arguments from command line, default to 'admin' / 'admin123' if not provided
    target_username = sys.argv[1] if len(sys.argv) > 1 else "admin"
    new_password = sys.argv[2] if len(sys.argv) > 2 else "admin123"

    print(f"🔄 Resetting password for user '{target_username}'...")
    
    async for session in get_db():
        # Find the user dynamically
        result = await session.execute(select(User).where(User.username == target_username))
        user = result.scalar_one_or_none()
        
        if user:
            # Reset the password using the argument
            new_password_hash = get_password_hash(new_password)
            user.password_hash = new_password_hash
            session.add(user)
            await session.commit()
            print(f"✅ Password reset successfully")
            print(f"📧 Username: {target_username}")
            print(f"🔑 Password: {new_password}")
            print(f"🔐 Password hash updated in database")
            return True
        else:
            print(f"❌ User '{target_username}' not found")
            return False

if __name__ == "__main__":
    asyncio.run(reset_admin_password())