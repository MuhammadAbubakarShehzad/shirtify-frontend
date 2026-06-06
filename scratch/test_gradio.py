import os
import dotenv
from gradio_client import Client, handle_file

dotenv.load_dotenv(r"d:\shirtify frontend\frontend\New folder\.env")
hf_token = os.getenv("HF_TOKEN", "").strip()

print("HF Token:", hf_token[:10] + "..." if hf_token else "None")

person_path = r"d:\shirtify frontend\frontend\New folder\demo-images\person_male_1.png"
shirt_path = r"d:\shirtify frontend\frontend\New folder\demo-images\shirt_mountain.png"

client_kwargs = {}
if hf_token:
    client_kwargs["token"] = hf_token

print("Connecting to yisol/IDM-VTON...")
client = Client("yisol/IDM-VTON", **client_kwargs)
print("Connected!")

dict_val = {
    "background": handle_file(person_path),
    "layers": [],
    "composite": None
}

print("Running prediction...")
try:
    result = client.predict(
        dict=dict_val,
        garm_img=handle_file(shirt_path),
        garment_des="t-shirt",
        is_checked=True,
        is_checked_crop=False,
        denoise_steps=20,
        seed=42,
        api_name="/tryon"
    )
    print("Success! Output:", result)
except Exception as e:
    print("Error:", e)
