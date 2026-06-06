import requests
import base64
import os

url = "http://127.0.0.1:5001/api/tryon"
person_path = r"d:\shirtify frontend\frontend\New folder\demo-images\person_male_1.png"
shirt_path = r"d:\shirtify frontend\frontend\New folder\demo-images\shirt_mountain.png"

print("Sending request to Virtual Try-On API...")
with open(person_path, "rb") as pf, open(shirt_path, "rb") as sf:
    files = {
        "person_image": ("person.png", pf, "image/png"),
        "shirt_image": ("shirt.png", sf, "image/png"),
    }
    try:
        response = requests.post(url, files=files, timeout=60)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                result_b64 = data.get("result_base64")
                method = data.get("method_used")
                print(f"Success! Method used: {method}")
                
                output_path = r"d:\shirtify frontend\tryon_result.png"
                with open(output_path, "wb") as out_f:
                    out_f.write(base64.b64decode(result_b64))
                print(f"Result image saved to: {output_path}")
            else:
                print(f"API Error: {data.get('error')}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")
