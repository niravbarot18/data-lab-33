import sys
from pathlib import Path

# Add project root and backend directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

for p in [str(root_dir), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.main import app

# Expose app for Vercel Serverless Function handler
# Vercel's @vercel/python detects the ASGI app variable automatically
