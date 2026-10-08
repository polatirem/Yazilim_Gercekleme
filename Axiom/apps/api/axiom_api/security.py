import base64, hashlib, hmac, secrets
from datetime import datetime, timedelta, timezone
import jwt
from .config import settings

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return "pbkdf2_sha256$310000$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()

def verify_password(password: str, encoded: str) -> bool:
    try:
        _, rounds, salt, expected = encoded.split("$")
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt), int(rounds))
        return hmac.compare_digest(actual, base64.b64decode(expected))
    except (ValueError, TypeError):
        return False

def create_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=12)}, settings.jwt_secret, algorithm="HS256")

def decode_token(token: str) -> str:
    return str(jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])["sub"])

def hash_api_key(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()

def new_api_key() -> str:
    return "ax_live_" + secrets.token_urlsafe(32)

