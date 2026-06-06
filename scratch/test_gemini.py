import dotenv
import os
from google import genai
from google.genai import types
from PIL import Image

dotenv.load_dotenv(r"d:\shirtify frontend\frontend\New folder\.env")
key = os.getenv("GEMINI_API_KEY")
print("Key:", key[:10] + "..." if key else "None")

client = genai.Client(api_key=key)
img = Image.new("RGB", (100, 100))

print("Calling api...")
try:
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=["make this blue", img],
        config=types.GenerateContentConfig(response_modalities=["IMAGE"])
    )
    print("Success!")
    print(response)
except Exception as e:
    print("Error:", e)
