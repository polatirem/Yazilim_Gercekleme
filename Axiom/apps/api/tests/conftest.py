import os
os.environ["DATABASE_URL"]="sqlite+aiosqlite://"
os.environ["GEMINI_API_KEY"]=""  # tests never call the real model
os.environ["JWT_SECRET"]="test-secret-only-at-least-thirty-two-bytes"
