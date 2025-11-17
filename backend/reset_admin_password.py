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
    print("🔄 Resetting admin password...")
    
    async for session in get_db():
        # Find the admin user
        result = await session.execute(select(User).where(User.username == "admin"))
        user = result.scalar_one_or_none()
        
        if user:
            # Reset the password
            new_password_hash = get_password_hash("admin123")
            user.password_hash = new_password_hash
            session.add(user)
            await session.commit()
            print(f"✅ Admin password reset successfully")
            print(f"📧 Username: admin")
            print(f"🔑 Password: admin123")
            print(f"🔐 Password hash updated in database")
            return True
        else:
            print("❌ Admin user not found")
            return False

if __name__ == "__main__":
    asyncio.run(reset_admin_password())