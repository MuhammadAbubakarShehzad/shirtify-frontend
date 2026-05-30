# Changelog

## 2026-05-25

- **Stage 1 (Segmentation):** Explicitly used Rembg U2-Net. Added morphological post-processing to clean alpha mask. Detected 4 physical garment corners for warp source quad instead of bounding box.
- **Stage 2 (Pose & Quad):** Added MediaPipe landmark visibility validation (abort if < 0.55). Shrunk shoulders 4% inwardly, lifted collar 8%, extended hem 72% down torso with 4% perspective taper. Added size bounds to prevent degenerate quads.
- **Stage 3 (Garment Warping):** Updated perspective transform to use the exact fabric 4 corners. Used Lanczos4 interpolation. Added Unsharp Mask post-warp pass to restore printed details.
- **Stage 4 (Lighting Normalization):** Matched LAB luminance between target torso and warped garment to normalize lighting. Added auto-gamma darkening if background is extremely dark.
- **Stage 5 (Contact Shadows):** Added collar drop shadow (Gaussian blur 21x9, 45 opacity) and side/armpit shadow (Gaussian blur 9x21, 25 opacity) based on warped alpha edges. Skipped shadows if the photo background is white.
- **Stage 6 (Arm Occlusion):** Kept existing fillPoly approach but added 15x15 Gaussian feathering to the arm mask to softly blend arm overlaps on top of the garment.
- **Stage 7 (Alpha Compositing):** Eroded warped alpha by 1px, feathered by 7x7 sigma 2.5, and performed vectorized NumPy alpha blending to eliminate hard clipping.
- **Stage 8 (Gemini Polish):** Replaced the generic prompt with a 7-point constraint-based photorealism system prompt. Enforced pure IMAGE response. Kept existing SDK integration and post-polish feature flags.
- **Stage 9 (Edge Cases):** Implemented CLAHE brightness boost for dark photos prior to landmark detection. Bounded extreme widths. Ignored shadow passes on white backgrounds.
- **Stage 10 (Logging & Error Responses):** Added timer metrics per stage. Structured NO_PERSON_DETECTED and PROCESSING_FAILED json outputs explicitly matched to frontend handlers.
- **Dependencies:** Confirmed `scikit-image` is present in `requirements.txt` for LAB color normalization. No new libraries needed.
