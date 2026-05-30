# 💻 Shirtify Virtual Try-On: Technology Stack

You can use the following detailed breakdown to update the "Technology Stack" or "System Architecture" section of your Final Year Project (FYP) documentation.

---

## 1. Core Backend & API Layer
*   **Language:** Python 3.x
*   **Web Framework:** Flask
    *   **Why we used it:** A lightweight, highly performant WSGI web framework used to expose the REST API endpoint (`/api/tryon`), handle concurrent image uploads, and serve the frontend interface.
*   **Cross-Origin Resource Sharing:** Flask-CORS
    *   **Why we used it:** Ensures secure communication between the frontend client and the backend API.

## 2. Artificial Intelligence & Machine Learning
*   **Body Tracking & Pose Estimation:** Google MediaPipe (Tasks Vision API)
    *   **Model:** `pose_landmarker_full.task`
    *   **Why we used it:** Extracts 33 real-time 3D skeletal landmarks. We specifically utilize the shoulder (11, 12), hip (23, 24), elbow (13, 14), and wrist (15, 16) coordinates to build our dynamic Torso Quad and calculate the arm occlusion polygons.
*   **Background Removal (AI-Powered):** Rembg (U2-Net architecture)
    *   **Why we used it:** A deep learning model used to automatically detect and strip away the solid backgrounds from uploaded T-shirt designs, isolating the garment with a perfectly transparent alpha channel.
*   **Generative AI Realism Polish (Premium Tier):** Google Gemini 2.0 Flash
    *   **SDK:** `google-genai`
    *   **Why we used it:** Used for image-to-image generation. It takes the mathematically warped composite and applies photorealistic fabric wrinkles, natural room lighting, and contact shadows under the collar while preserving the user's identity and the garment's exact print.

## 3. Computer Vision & Image Processing
*   **Core Vision Library:** OpenCV (`cv2`)
    *   **Why we used it:** Powers the entire geometric transformation engine. 
    *   *Specific implementations include:* 
        *   `cv2.getPerspectiveTransform` & `cv2.warpPerspective`: Maps the flat garment onto the 4-point dynamic Torso Quad.
        *   `cv2.GaussianBlur` & `cv2.erode`: Used for "feathered alpha blending" to create smooth, shadow-like transitions where the digital shirt meets the user's skin.
        *   `cv2.fillPoly`: Draws the dynamic arm occlusion masks over the chest.
*   **Fallback Object Detection:** Haar Cascades
    *   **Model:** `haarcascade_frontalface_default.xml`
    *   **Why we used it:** Acts as our "Graceful Degradation" fallback tier. If the user's body is obscured, it detects the face and mathematically estimates the torso placement below the chin.
*   **Matrix Math & Array Manipulation:** NumPy
    *   **Why we used it:** Handles the complex vector mathematics, including calculating perpendicular vectors for neck anchoring, sorting coordinates, and managing image pixel arrays (tensors).
*   **Image Format Handling:** Pillow (PIL)
    *   **Why we used it:** Manages auxiliary file I/O operations and format conversions, particularly when formatting images for the Gemini AI payload.

## 4. Frontend Client
*   **Structure & Styling:** HTML5 & Vanilla CSS3
    *   **Why we used it:** Built a custom, responsive, "Glassmorphism" UI with dynamic state transitions (uploading, loading, error handling, result display) without the overhead of heavy frameworks.
*   **Logic & Integration:** Vanilla JavaScript (ES6+)
    *   **Why we used it:** Uses the modern `Fetch API` to send asynchronous `multipart/form-data` requests to the Flask backend and dynamically renders Base64 encoded image responses back to the DOM.

## 5. Deployment & Environment
*   **Environment Management:** `python-dotenv` (for managing sensitive API keys and configuration flags like `GEMINI_POST_POLISH`).
*   **Temporary File Handling:** Python `tempfile` module (securely manages intermediate image states during the multi-step transformation pipeline within a local `scratch/` directory).
