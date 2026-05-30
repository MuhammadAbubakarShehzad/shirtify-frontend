# -*- coding: utf-8 -*-
import sys, io, requests, base64, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

API  = "http://127.0.0.1:5001/api/tryon"
DEMO = r"d:\ffyp\New folder\demo-images"
OUT  = r"d:\ffyp\New folder\scratch\test_outputs"
os.makedirs(OUT, exist_ok=True)

p = os.path.join(DEMO, "person_male_1.png")
s = os.path.join(DEMO, "shirt_mountain.png")
print("[TEST] male1 + mountain ...")

with open(p, "rb") as pf, open(s, "rb") as sf:
    r = requests.post(API, files={
        "person_image": (os.path.basename(p), pf, "image/png"),
        "shirt_image":  (os.path.basename(s), sf, "image/png"),
    }, timeout=180)

d = r.json()
if d.get("success"):
    img  = base64.b64decode(d["result_base64"])
    out  = os.path.join(OUT, "male1_mountain.png")
    with open(out, "wb") as f:
        f.write(img)
    method = d["method_used"]
    size   = len(img) // 1024
    print(f"  OK  method={method}  size={size}KB")
    print(f"  saved: {out}")
else:
    print("  FAIL:", d.get("error"))
