import os
import bcrypt
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

SECRET = os.getenv("JWT_SECRET")


def hash_password(password):
    return bcrypt.hashpw(
        password.encode(),
        bcrypt.gensalt()
    ).decode()


def verify_password(password, hashed):
    return bcrypt.checkpw(
        password.encode(),
        hashed.encode()
    )


def create_token(user_id, role):
    data = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }

    return jwt.encode(
        data,
        SECRET,
        algorithm="HS256"
    )


def get_user(token):
    try:
        return jwt.decode(
            token,
            SECRET,
            algorithms=["HS256"]
        )
    except:
        return None


