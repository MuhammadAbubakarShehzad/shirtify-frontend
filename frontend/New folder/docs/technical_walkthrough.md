# 🚀 Shirtify Virtual Try-On — EPIC 3 Implementation

This walkthrough explains the technical architecture of the virtual try-on system designed for your Final Year Project demonstration.

---

## 1. The 3-Tier "Graceful Degradation" Pipeline
To ensure the system **never fails** during a demo, we implemented three layers of logic:

*   **Tier 1: MediaPipe Pose (Primary)**
    *   **How:** Detects 33 skeletal landmarks. We focus on shoulders (11, 12) and hips (23, 24).
    *   **Why:** Provides the most accurate "perfect wrap" by tracking body orientation and tilt.
*   **Tier 2: Haar Cascade Face Detection (Fallback)**
    *   **How:** If the body is obscured, it finds the face and "estimates" the torso position below the chin.
    *   **Why:** Ensures a result even if the user is sitting down or in a tight crop.
*   **Tier 3: Centroid Estimation (Safety Net)**
    *   **How:** If all detection fails, it places the shirt in the center of the frame.

---

## 2. Advanced Geometric Warping
We moved beyond simple "pasting" to mathematical **Perspective Transformation**.

*   **Neck Anchoring:** We calculate a `v_up` vector from the shoulders to "lift" the shirt collar by 18% of the shoulder width. This prevents the shirt from starting too low on the chest.
*   **Vertical Rectangle Mapping:** We project the shoulder width straight down to the hips.
    *   *Correction:* Previously, shirts warped into "inverted trapezoids" because hips are naturally narrower than shoulders in many photos. We fixed this to ensure the shirt stays a clean, professional rectangle.
*   **Dynamic Shoulder Alignment:** The system calculates the angle between your shoulders and rotates the shirt image *before* warping to match your pose perfectly.

---

## 3. Arm Occlusion Masking (The "Realism" Secret)
The biggest challenge in 2D try-on is that the shirt usually covers the person's arms, making it look like a sticker.

*   **How it works:** We use the Elbow and Wrist landmarks to draw invisible polygons over your arms.
*   **The Layering:**
    1.  Base: Your original photo.
    2.  Middle: The warped shirt.
    3.  Top: A "mask" that cuts out your original arms and pastes them *over* the shirt.
*   **Result:** You can see your arms, watch, and skin over the shirt, making it look like you are actually wearing it.

---

## 4. Feathered Alpha Blending
To prevent "jagged" or "sharp" digital edges:
*   We apply a **Gaussian Blur** to the shirt's transparency (alpha channel).
*   We **Erode** (shrink) the shirt edges by 2 pixels before blurring.
*   **Why:** This creates a soft shadow-like transition where the fabric meets the skin.

---

## 5. Gemini AI Polish Mode
We integrated the `google-genai` SDK to add a "Pro" layer.
*   **Function:** Once the OpenCV warp is done, we send the result to Gemini 2.0 Flash.
*   **Task:** The AI analyzes the scene and adds realistic **fabric wrinkles**, **shadows under the collar**, and **lighting highlights** that match the room.

---

## 🛠️ How to Test for the Demo

1.  **Start the Server:** Run `python tryon_pipeline.py`.
2.  **Open the UI:** Go to `http://localhost:5001`.
3.  **Use the Demo Kit:** Use the images I saved in `C:\Users\TECHNIFI\Desktop\workflow diagrams`.
    *   `person_male_1.jpg` + `shirt_mountain.jpg` is the best starting combo.
4.  **Observe the Label:** Look at the bottom of the result. It will say `method: mediapipe_pose_warp` — this confirms the high-tier AI is working.
