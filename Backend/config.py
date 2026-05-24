import os
from pathlib import Path
from dotenv import load_dotenv

# Load env files from root project directory
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def validate_config():
    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("your_actual"):
        print("WARNING: GEMINI_API_KEY is not configured or uses placeholder value.")
        return False
    return True
