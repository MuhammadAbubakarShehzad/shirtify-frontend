# 🎯 Virtual Try-On — Demo Image Kit

All images are saved in: `d:\ffyp\New folder\demo-images\`

---

## 👤 Person Photos (upload as "Your Photo")

| File | Description |
|------|-------------|
| `person_male_1.png` | Young South Asian male, plain white tee, gray background |
| `person_female_1.png` | Young South Asian female, white shirt, gray background |
| `person_male_2.png` | Young Pakistani male, light grey tee, white wall background |

---

## 👕 T-Shirt Designs (upload as "Select T-Shirt Design")

| File | Description |
|------|-------------|
| `shirt_plain_white.png` | Clean plain white t-shirt flat lay |
| `shirt_mountain.png` | Black tee with white mountain graphic |
| `shirt_nasa.png` | Navy tee with retro NASA logo |
| `shirt_galaxy.png` | White tee with full galaxy/nebula print |

---

## 🏆 Recommended Demo Pairings (Best Results)

| Person | Shirt | Expected Output |
|--------|-------|----------------|
| `person_male_1.png` | `shirt_mountain.png` | Dark mountain shirt on male |
| `person_male_2.png` | `shirt_nasa.png` | NASA logo shirt on male |
| `person_female_1.png` | `shirt_galaxy.png` | Galaxy print on female |
| `person_male_1.png` | `shirt_plain_white.png` | Clean plain white overlay |

---

## 💡 Demo Tips for Panel Presentation

1. **Start the server first**: Run `python tryon_pipeline.py` then open `http://localhost:5001`
2. **Use the recommended pairs** above for the cleanest results
3. **Show the method label** at the bottom of the result card — it tells the panel which AI tier ran
4. **Try the chat assistant** — ask it "what file formats do you support?" to show the AI chat feature
5. **Download the result** using the Download button to show the full end-to-end flow
