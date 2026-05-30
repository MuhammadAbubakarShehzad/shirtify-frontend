import os
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def test_model(model_name):
    print(f"Testing {model_name}...")
    try:
        model = genai.GenerativeModel(model_name)
        # Just a simple prompt
        response = model.generate_content("Hello")
        print(f"Success: {response.text[:50]}")
    except Exception as e:
        print(f"Failed: {e}")

models_to_test = [
    "models/gemini-2.0-flash",
    "models/gemini-2.5-flash-image",
    "models/gemini-1.5-flash"
]

for m in models_to_test:
    test_model(m)
