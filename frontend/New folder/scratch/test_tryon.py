# -*- coding: utf-8 -*-
"""
Test the try-on API with all demo image pairs.
Saves valid results as PNG files for inspection.
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import requests
import base64
import os
import sys

API = "http://127.0.0.1:5001/api/tryon"
DEMO_DIR = r"d:\ffyp\New folder\demo-images"
OUT_DIR  = r"d:\ffyp\New folder\scratch\test_outputs"
os.makedirs(OUT_DIR, exist_ok=True)

PAIRS = [
    ("person_male_1.png",   "shirt_mountain.png",   "male1_mountain"),
    ("person_male_2.png",   "shirt_nasa.png",        "male2_nasa"),
    ("person_female_1.png", "shirt_galaxy.png",      "female1_galaxy"),
    ("person_male_1.png",   "shirt_plain_white.png", "male1_white"),
]

VALID_RESULTS = []

print("=" * 55)
print("  Shirtify Try-On — Demo Test Run")
print("=" * 55)

# Health check first
try:
    h = requests.get("http://127.0.0.1:5001/api/tryon/health", timeout=5).json()
    print(f"\n[HEALTH] status={h.get('status')}  "
          f"mediapipe={h.get('mediapipe_available')}  "
          f"gemini_key={'YES' if h.get('api_key_set') else 'NO'}\n")
except Exception as e:
    print(f"[HEALTH] FAILED: {e}")
    sys.exit(1)

for person_file, shirt_file, tag in PAIRS:
    person_path = os.path.join(DEMO_DIR, person_file)
    shirt_path  = os.path.join(DEMO_DIR, shirt_file)

    if not os.path.exists(person_path):
        print(f"[SKIP] Missing person: {person_file}")
        continue
    if not os.path.exists(shirt_path):
        print(f"[SKIP] Missing shirt: {shirt_file}")
        continue

    print(f"[TEST] {person_file}  +  {shirt_file}")

    try:
        with open(person_path, "rb") as pf, open(shirt_path, "rb") as sf:
            resp = requests.post(API, files={
                "person_image": (person_file, pf, "image/png"),
                "shirt_image":  (shirt_file,  sf, "image/png"),
            }, timeout=180)

        data = resp.json()

        if not data.get("success"):
            print(f"  ✗ FAIL — {data.get('error')}\n")
            continue

        b64 = data.get("result_base64", "")
        method = data.get("method_used", "unknown")
        pose   = data.get("pose_fit", "?")

        if len(b64) < 1000:
            print(f"  ✗ FAIL — result image too small (likely empty)\n")
            continue

        # Decode and save
        img_bytes = base64.b64decode(b64)
        out_path  = os.path.join(OUT_DIR, f"{tag}.png")
        with open(out_path, "wb") as f:
            f.write(img_bytes)

        size_kb = len(img_bytes) // 1024
        print(f"  ✓ OK   method={method}  pose_fit={pose}  size={size_kb} KB")
        print(f"         saved → {out_path}\n")
        VALID_RESULTS.append((tag, out_path, person_file, shirt_file, method))

    except Exception as e:
        print(f"  ✗ ERROR — {e}\n")

print("=" * 55)
print(f"  Results: {len(VALID_RESULTS)}/{len(PAIRS)} passed")
print("=" * 55)

# Write summary for the parent process to read
summary_path = os.path.join(OUT_DIR, "results_summary.txt")
with open(summary_path, "w") as f:
    for tag, path, person, shirt, method in VALID_RESULTS:
        f.write(f"{tag}|{path}|{person}|{shirt}|{method}\n")

print(f"\nSummary written to: {summary_path}")
