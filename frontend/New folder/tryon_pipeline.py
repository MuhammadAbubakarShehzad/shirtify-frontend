import os
import json
import time
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory, redirect, abort
from flask_cors import CORS
from PIL import Image
import base64
import tempfile
import traceback
import threading
import urllib.request
from skimage import exposure, color

try:
    from gradio_client import Client, handle_file
    GRADIO_CLIENT_AVAILABLE = True
except ImportError:
    GRADIO_CLIENT_AVAILABLE = False
    print("[TryOn] WARNING: gradio_client is not installed. IDM-VTON will be unavailable.")

# MediaPipe Tasks (0.10+): `mediapipe.solutions` is not shipped on current wheels.
try:
    from mediapipe.tasks import python as mp_tasks_python
    from mediapipe.tasks.python import vision as mp_tasks_vision
    from mediapipe import Image as MPImage, ImageFormat as MPImageFormat

    MEDIAPIPE_AVAILABLE = True
    _MEDIAPIPE_LOAD_ERROR = ""
except Exception as _mp_load_err:
    mp_tasks_python = None
    mp_tasks_vision = None
    MPImage = MPImageFormat = None
    MEDIAPIPE_AVAILABLE = False
    _MEDIAPIPE_LOAD_ERROR = str(_mp_load_err)

from google import genai
from google.genai import types

import dotenv
dotenv.load_dotenv()
os.environ["U2NET_HOME"] = r"D:\.u2net"

app = Flask(__name__)
CORS(app)

ROOT = os.path.dirname(os.path.abspath(__file__))
# Keep runtime artifacts out of the frontend workspace to avoid Live Server reloads.
RUNTIME_DIR = os.path.join(tempfile.gettempdir(), "shirtify_tryon")
TEMP_DIR = os.path.join(RUNTIME_DIR, "scratch")
DEBUG_LOG = os.path.join(RUNTIME_DIR, "debug-c27ffe.log")
TRY_ON_SCREEN_DIR = os.path.join(ROOT, "try-on-screen")
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(os.path.dirname(DEBUG_LOG), exist_ok=True)
print("[tryon] NDJSON debug log:", DEBUG_LOG)


def _dbg_agent(hypothesis_id, location, message, data, run_id="pre-fix"):
    try:
        line = {
            "sessionId": "c27ffe",
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data,
            "timestamp": int(time.time() * 1000),
            "runId": run_id,
        }
        with open(DEBUG_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(line, default=str) + "\n")
    except Exception:
        pass

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None
if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except:
        pass

def save_upload(file_obj):
    out = tempfile.mktemp(suffix=".png", dir=TEMP_DIR)
    file_obj.save(out)
    return out

def image_to_base64(path):
    if not path or not os.path.exists(path): return ""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()

def resize_img(path, max_size=1024):
    try:
        img = cv2.imread(path)
        if img is None: return
        h, w = img.shape[:2]
        if max(h, w) > max_size:
            s = max_size / max(h, w)
            cv2.imwrite(path, cv2.resize(img, (int(w*s), int(h*s)), interpolation=cv2.INTER_AREA))
    except: pass

# ════════════════════════════════
# STAGE 2 — POSE DETECTION & TORSO QUAD (MediaPipe Setup)
# ════════════════════════════════

POSE_TASK_FILE = os.getenv("POSE_LANDMARKER_MODEL", "full").strip().lower()
if POSE_TASK_FILE in ("lite", "0", "small"):
    POSE_TASK_FILENAME = "pose_landmarker_lite.task"
    POSE_MODEL_URL = (
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
        "pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
    )
else:
    POSE_TASK_FILENAME = "pose_landmarker_full.task"
    POSE_MODEL_URL = (
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
        "pose_landmarker_full/float16/1/pose_landmarker_full.task"
    )

_pose_landmarker = None
_pose_lm_lock = threading.Lock()
_pose_lm_model_path = None

def _ensure_pose_model_path(run_id="pre-fix"):
    path = os.path.join(ROOT, "scratch", POSE_TASK_FILENAME)
    if os.path.isfile(path) and os.path.getsize(path) > 1_000_000:
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    urllib.request.urlretrieve(POSE_MODEL_URL, path)
    return path

def _get_pose_landmarker(run_id="pre-fix"):
    global _pose_landmarker, _pose_lm_model_path
    if not MEDIAPIPE_AVAILABLE:
        return None
    model_path = _ensure_pose_model_path(run_id)
    with _pose_lm_lock:
        if _pose_landmarker is None or _pose_lm_model_path != model_path:
            if _pose_landmarker is not None:
                try: _pose_landmarker.close()
                except: pass
            BaseOptions = mp_tasks_python.BaseOptions
            PoseLandmarker = mp_tasks_vision.PoseLandmarker
            PoseLandmarkerOptions = mp_tasks_vision.PoseLandmarkerOptions
            RunningMode = mp_tasks_vision.RunningMode
            opts = PoseLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=model_path),
                running_mode=RunningMode.IMAGE,
                num_poses=1,
                min_pose_detection_confidence=0.25,
                min_pose_presence_confidence=0.25,
            )
            _pose_landmarker = PoseLandmarker.create_from_options(opts)
            _pose_lm_model_path = model_path
        return _pose_landmarker

def _clip_torso_quad_to_image(quad, w, h):
    mx = max(2, min(w, h) // 200)
    wm, hm = max(w - 1, 1), max(h - 1, 1)
    out = []
    for pt in quad:
        x = float(np.clip(pt[0], mx, wm - mx))
        y = float(np.clip(pt[1], mx, hm - mx))
        out.append(np.array([x, y], dtype=np.float64))
    return out

# ════════════════════════════════
# STAGE 2 — POSE DETECTION & TORSO QUAD (Execution)
# ════════════════════════════════
def get_pose_torso_quad(person_bgr, run_id="pre-fix"):
    """Detects pose and builds a precision torso quad."""
    start_t = time.time()
    if person_bgr is None:
        return None, {"reason": "no_image"}
    h, w = person_bgr.shape[:2]

    if not MEDIAPIPE_AVAILABLE:
        return None, {"reason": "mediapipe_import", "detail": _MEDIAPIPE_LOAD_ERROR}

    idx_Ls, idx_Rs, idx_Lh, idx_Rh = 11, 12, 23, 24

    try:
        landmarker = _get_pose_landmarker(run_id)
        if landmarker is None:
            return None, {"reason": "landmarker_none"}
        rgb = np.ascontiguousarray(cv2.cvtColor(person_bgr, cv2.COLOR_BGR2RGB))
        mp_image = MPImage(image_format=MPImageFormat.SRGB, data=rgb)
        with _pose_lm_lock:
            result = landmarker.detect(mp_image)
    except Exception as e:
        return None, {"reason": "pose_process", "error": str(e)}

    if not result.pose_landmarks or len(result.pose_landmarks) == 0:
        return None, {"reason": "no_landmarks"}
    lm_list = result.pose_landmarks[0]
    if len(lm_list) < 25:
        return None, {"reason": "short_landmarks"}

    def _lm_quality(i):
        lm = lm_list[i]
        vis = float(lm.visibility) if lm.visibility is not None else 0.0
        pres = float(lm.presence) if lm.presence is not None else 0.0
        return max(vis, pres)

    qual = [_lm_quality(idx_Ls), _lm_quality(idx_Rs), _lm_quality(idx_Lh), _lm_quality(idx_Rh)]
    min_vis = min(qual)
    
    # Landmark confidence validation
    if min_vis < 0.55:
        raise ValueError("NO_PERSON_DETECTED: Please stand facing the camera with your full torso visible and try again.")
    elif min_vis < 0.70:
        print("[TryOn] WARNING: Low confidence pose detected")

    s1 = np.array([lm_list[idx_Ls].x * w, lm_list[idx_Ls].y * h], dtype=np.float64)
    s2 = np.array([lm_list[idx_Rs].x * w, lm_list[idx_Rs].y * h], dtype=np.float64)
    h1 = np.array([lm_list[idx_Lh].x * w, lm_list[idx_Lh].y * h], dtype=np.float64)
    h2 = np.array([lm_list[idx_Rh].x * w, lm_list[idx_Rh].y * h], dtype=np.float64)

    if s1[0] < s2[0]:
        Ls, Rs = s1, s2
    else:
        Ls, Rs = s2, s1
    if h1[0] < h2[0]:
        Lh, Rh = h1, h2
    else:
        Lh, Rh = h2, h1

    # Raw shoulder width
    raw_shoulder_width = np.linalg.norm(Rs - Ls)
    if raw_shoulder_width < 1e-3:
        return None, {"reason": "degenerate_shoulder"}
        
    u = (Rs - Ls) / raw_shoulder_width
    
    # Expand by 5% to completely cover underlying clothing
    effective_shoulder_width = raw_shoulder_width * 1.05
    # Clamp for very wide or very narrow builds
    effective_shoulder_width = max(0.15 * w, min(0.75 * w, effective_shoulder_width))
    
    # Top edge (collar line)
    shoulder_midpoint = (Ls + Rs) * 0.5
    v_up = np.array([-u[1], u[0]], dtype=np.float64) # perpendicular upward
    anchor = shoulder_midpoint + v_up * (0.08 * raw_shoulder_width)
    
    top_left = anchor - u * (effective_shoulder_width / 2.0)
    top_right = anchor + u * (effective_shoulder_width / 2.0)
    
    # Bottom edge (shirt hem)
    hip_midpoint = (Lh + Rh) * 0.5
    torso_vector = hip_midpoint - shoulder_midpoint
    
    # Standard T-shirt covers ~72% of the torso length to the hips
    hem_center = shoulder_midpoint + torso_vector * 0.72
    
    # Perspective Simulation - expanded bottom to cover loose shirts
    bottom_width = effective_shoulder_width * 1.02
    bottom_left = hem_center - u * (bottom_width / 2.0)
    bottom_right = hem_center + u * (bottom_width / 2.0)

    quad = _clip_torso_quad_to_image([top_left, top_right, bottom_right, bottom_left], w, h)
    shoulder_angle_deg = float(np.degrees(np.arctan2(Rs[1] - Ls[1], Rs[0] - Ls[0])))

    arm_landmarks = {}
    def _dist(p1, p2): return np.linalg.norm(p1-p2)

    for e_idx, w_idx in [(13, 15), (14, 16)]:
        e_pt = np.array([lm_list[e_idx].x * w, lm_list[e_idx].y * h])
        w_pt = np.array([lm_list[w_idx].x * w, lm_list[w_idx].y * h])
        if _dist(e_pt, Ls) < _dist(e_pt, Rs):
            arm_landmarks["L_elbow"], arm_landmarks["L_wrist"] = e_pt, w_pt
        else:
            arm_landmarks["R_elbow"], arm_landmarks["R_wrist"] = e_pt, w_pt

    print(f"[TryOn] pose_detection   | {int((time.time() - start_t)*1000)}ms  OK")
    return quad, {
        "shoulder_angle_deg": shoulder_angle_deg,
        "quality": qual,
        "source": "mediapipe_tasks",
        "arm_landmarks": arm_landmarks,
        "shoulder_pts": {"Ls": Ls.tolist(), "Rs": Rs.tolist(),
                         "Lh": Lh.tolist(), "Rh": Rh.tolist()},
        "w": w, "h": h
    }

def detect_torso(person_path):
    """Fallback if MediaPipe fails."""
    img = cv2.imread(person_path)
    if img is None: return None
    h, w = img.shape[:2]
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        for scale in [1.05, 1.1, 1.2]:
            faces = cascade.detectMultiScale(gray, scaleFactor=scale, minNeighbors=3, minSize=(20, 20))
            if len(faces) > 0:
                fx, fy, fw, fh = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)[0]
                cx = fx + fw // 2
                shoulder_y = fy + int(fh * 1.05)
                raw_shoulder_width = fw * 1.9
                effective_shoulder_width = raw_shoulder_width * 0.92
                half = int(effective_shoulder_width / 2)
                
                # 72% torso length equivalent
                bottom_y = min(h, shoulder_y + int(fh * 2.5 * 0.72))
                lx = max(0, cx - half)
                rx = min(w, cx + half)
                print(f"[TryOn] FALLBACK: Face-based torso estimation active")
                return _taper_torso_quad(lx, rx, shoulder_y, bottom_y)
    except Exception as e:
        print(f"Face detection error: {e}")

    print("[TryOn] FALLBACK: Face-based torso estimation active (bottom-portion)")
    top_y = int(h * 0.30)
    bottom_y = int(h * 0.30 + h * 0.55 * 0.72)
    lx = int(w * 0.15)
    rx = int(w * 0.85)
    return _taper_torso_quad(lx, rx, top_y, bottom_y)

def _taper_torso_quad(lx, rx, top_y, bottom_y, hip_inset=0.04): # 96% of top edge width = 4% inset
    lx, rx = float(lx), float(rx)
    top_y, bottom_y = float(top_y), float(bottom_y)
    width = max(rx - lx, 1.0)
    inset = hip_inset * width
    blx, brx = lx + inset, rx - inset
    return [(lx, top_y), (rx, top_y), (brx, bottom_y), (blx, bottom_y)]

# ════════════════════════════════
# STAGE 1 — GARMENT SEGMENTATION
# ════════════════════════════════
def prepare_garment_rgba(shirt_path, run_id="pre-fix"):
    """Background removal (rembg U2-Net) with morphological post-processing and corner detection."""
    start_time = time.time()
    raw = cv2.imread(shirt_path, cv2.IMREAD_UNCHANGED)
    if os.getenv("SKIP_REMBG", "").strip().lower() in ("1", "true", "yes"):
        img = cv2.imread(shirt_path, cv2.IMREAD_UNCHANGED)
        if img.ndim == 2: img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGRA)
        elif img.shape[2] == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
            img[:, :, 3] = 255
        h, w = img.shape[:2]
        src_quad = np.array([[0,0], [w,0], [w,h], [0,h]], dtype=np.float32)
        out_path = tempfile.mktemp(suffix="_skiprembg.png", dir=TEMP_DIR)
        cv2.imwrite(out_path, img)
        return out_path, src_quad

    try:
        from rembg import remove, new_session
        with open(shirt_path, "rb") as f:
            out_bytes = remove(f.read(), session=new_session("u2net"))
        out_path = tempfile.mktemp(suffix="_rgba.png", dir=TEMP_DIR)
        with open(out_path, "wb") as wf:
            wf.write(out_bytes)
        img = cv2.imread(out_path, cv2.IMREAD_UNCHANGED)
        if img is None: raise ValueError("rembg output unreadable")
        if img.ndim == 2 or img.shape[2] == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
            img[:, :, 3] = 255
            
        # Post-process the alpha mask aggressively
        alpha = img[:, :, 3]
        _, binary_mask = cv2.threshold(alpha, 10, 255, cv2.THRESH_BINARY)
        
        kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel_close, iterations=3)
        
        kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel_open, iterations=1)
        
        contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            raise ValueError("No garment contour found")
            
        largest_contour = max(contours, key=cv2.contourArea)
        clean_mask = np.zeros_like(binary_mask)
        cv2.fillPoly(clean_mask, [largest_contour], 255)
        
        # Edge softening
        clean_mask = cv2.GaussianBlur(clean_mask, (5, 5), 0)
        img[:, :, 3] = clean_mask
        
        # Detect actual garment corner points
        epsilon = 0.02 * cv2.arcLength(largest_contour, True)
        approx = cv2.approxPolyDP(largest_contour, epsilon, True)
        pts = approx.reshape(-1, 2)
        
        # We need 4 points. If approx gives more/less, we find extremes
        rect = np.zeros((4, 2), dtype=np.float32)
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)] # tl
        rect[2] = pts[np.argmax(s)] # br
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)] # tr
        rect[3] = pts[np.argmax(diff)] # bl

        cv2.imwrite(out_path, img)
        print(f"[TryOn] segmentation     | {int((time.time() - start_time)*1000)}ms  OK")
        return out_path, rect
    except Exception as e:
        print(f"[TryOn] segmentation fallback | error={e}")
        img = cv2.imread(shirt_path, cv2.IMREAD_COLOR)
        bgra = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        h, w = bgra.shape[:2]
        rect = np.array([[0,0], [w,0], [w,h], [0,h]], dtype=np.float32)
        out_path = tempfile.mktemp(suffix="_opaque.png", dir=TEMP_DIR)
        cv2.imwrite(out_path, bgra)
        return out_path, rect

def rotate_rgba_align_shoulders(shirt_bgra, angle_deg, src_quad):
    """Rotate garment & its source quad so its width axis aligns with shoulder line."""
    if shirt_bgra is None: return shirt_bgra, src_quad
    h, w = shirt_bgra.shape[:2]
    center = (w / 2.0, h / 2.0)
    M = cv2.getRotationMatrix2D(center, angle_deg, 1.0)
    cos = abs(M[0, 0])
    sin = abs(M[0, 1])
    nW = int((h * sin) + (w * cos))
    nH = int((h * cos) + (w * sin))
    M[0, 2] += nW / 2.0 - center[0]
    M[1, 2] += nH / 2.0 - center[1]
    rotated_img = cv2.warpAffine(
        shirt_bgra, M, (nW, nH),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )
    
    # Rotate src_quad
    ones = np.ones(shape=(len(src_quad), 1))
    points_ones = np.hstack([src_quad, ones])
    transformed_points = M.dot(points_ones.T).T
    
    return rotated_img, transformed_points[:, :2].astype(np.float32)


# ════════════════════════════════
# STAGE 6 — ARM OCCLUSION MASKS
# ════════════════════════════════
def _arm_occlusion_mask(person_bgr, arm_landmarks, shoulder_pts):
    """Build a feathered binary mask of the arm regions."""
    start_t = time.time()
    if not arm_landmarks or not shoulder_pts: return None
    h, w = person_bgr.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)

    Ls = np.array(shoulder_pts["Ls"], dtype=np.float32)
    Rs = np.array(shoulder_pts["Rs"], dtype=np.float32)

    def _pt(key):
        p = arm_landmarks.get(key)
        return np.array(p, dtype=np.float32) if p is not None else None

    Le, Re = _pt("L_elbow"), _pt("R_elbow")
    Lw, Rw = _pt("L_wrist"), _pt("R_wrist")

    arm_width_px = max(12, int(0.06 * w))

    def _thick_line_poly(p1, p2, half_w):
        if p1 is None or p2 is None: return None
        d = p2 - p1
        length = np.linalg.norm(d)
        if length < 1: return None
        perp = np.array([-d[1], d[0]], dtype=np.float32) / length * half_w
        return np.array([p1 + perp, p1 - perp, p2 - perp, p2 + perp], dtype=np.int32)

    for seg in [
        (Ls, Le, arm_width_px),
        (Le, Lw, int(arm_width_px * 0.85)),
        (Rs, Re, arm_width_px),
        (Re, Rw, int(arm_width_px * 0.85)),
    ]:
        poly = _thick_line_poly(*seg)
        if poly is not None:
            cv2.fillPoly(mask, [poly], 255)

    # Wrist occlusion extension handled implicitly if wrist landmark exists and is drawn to
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=2)
    mask_f = mask.astype(float) / 255.0
    arm_mask_feathered = cv2.GaussianBlur(mask_f, (15, 15), sigmaX=6)
    
    print(f"[TryOn] arm_occlusion    | {int((time.time() - start_t)*1000)}ms  OK")
    return arm_mask_feathered

# ════════════════════════════════
# STAGE 3, 4, 5, 7 — WARP, LIGHTING, SHADOW, COMPOSITING
# ════════════════════════════════
def apply_barrel_distortion(img, k=-0.12):
    h, w = img.shape[:2]
    K = np.array([[w, 0, w/2], [0, w, h/2], [0, 0, 1]], dtype=np.float32)
    D = np.array([k, 0.0, 0.0, 0.0], dtype=np.float32)
    map1, map2 = cv2.initUndistortRectifyMap(K, D, None, K, (w, h), cv2.CV_32FC1)
    return cv2.remap(img, map1, map2, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

def warp_garment_to_quad(shirt_path, person_path, quad, src_quad, run_id="pre-fix", meta=None):
    """Executes stages 3, 4, 5, and 7."""
    shirt = cv2.imread(shirt_path, cv2.IMREAD_UNCHANGED)
    person = cv2.imread(person_path)
    ph, pw = person.shape[:2]
    sh, sw = shirt.shape[:2]
    
    # ── STAGE 3 — GARMENT WARPING (3D Cylindrical) ──
    start_warp = time.time()
    
    # Apply Barrel Distortion to simulate 3D chest bulge BEFORE warping
    shirt_rgb_distorted = apply_barrel_distortion(shirt[:, :, :3], k=-0.12)
    shirt_alpha_distorted = apply_barrel_distortion(shirt[:, :, 3], k=-0.12)
    
    dst = np.float32(quad)
    src = src_quad
    M = cv2.getPerspectiveTransform(src, dst)
    
    warped_rgb = cv2.warpPerspective(shirt_rgb_distorted, M, (pw, ph), flags=cv2.INTER_LANCZOS4)
    warped_alpha = cv2.warpPerspective(shirt_alpha_distorted, M, (pw, ph), flags=cv2.INTER_LANCZOS4)
    
    # Warp quality enhancement - unsharp mask
    blurred = cv2.GaussianBlur(warped_rgb, (0,0), sigmaX=1.2)
    warped_rgb = cv2.addWeighted(warped_rgb, 1.65, blurred, -0.65, 0)
    
    # Check for degenerate warp
    if np.sum(warped_alpha) < 100:
        raise ValueError("PROCESSING_FAILED: stage=warp")
    print(f"[TryOn] warp             | {int((time.time() - start_warp)*1000)}ms  OK")

    # ── STAGE 4 — LIGHTING NORMALIZATION ──
    start_light = time.time()
    torso_mask = np.zeros((ph, pw), dtype=np.uint8)
    cv2.fillPoly(torso_mask, [np.int32(dst)], 255)
    
    person_lab = color.rgb2lab(cv2.cvtColor(person, cv2.COLOR_BGR2RGB))
    warped_lab = color.rgb2lab(cv2.cvtColor(warped_rgb, cv2.COLOR_BGR2RGB))
    
    torso_pixels = person_lab[torso_mask > 0][:, 0]
    garment_pixels = warped_lab[warped_alpha > 0][:, 0]
    
    if len(torso_pixels) > 0 and len(garment_pixels) > 0:
        # Extract high-frequency shading map (wrinkles & folds) from the person's original shirt
        person_l = person_lab[:, :, 0]
        person_l_blur = cv2.GaussianBlur(person_l, (31, 31), 0)
        
        # Prevent division by zero
        person_l_blur_safe = np.where(person_l_blur == 0, 1, person_l_blur)
        
        # Wrinkle multiplier: >1 for highlights, <1 for shadows (folds)
        wrinkle_map = person_l / person_l_blur_safe
        
        # Soften extreme highlights
        wrinkle_map = np.clip(wrinkle_map, 0.4, 1.3)
        
        # Apply the exact physical folds to the new garment
        warped_lab[:, :, 0] = warped_lab[:, :, 0] * wrinkle_map
        warped_lab[:, :, 0] = np.clip(warped_lab[:, :, 0], 0, 100)
        
        warped_rgb = cv2.cvtColor(color.lab2rgb(warped_lab).astype(np.float32), cv2.COLOR_RGB2BGR) * 255.0
        warped_rgb = np.clip(warped_rgb, 0, 255).astype(np.uint8)
            
    print(f"[TryOn] lighting_norm    | {int((time.time() - start_light)*1000)}ms  OK")

    # ── STAGE 5 — CONTACT SHADOW & AMBIENT OCCLUSION ──
    start_shadow = time.time()
    photo_bgr = person.astype(np.float32)
    
    # White background check
    person_gray = cv2.cvtColor(person, cv2.COLOR_BGR2GRAY)
    is_white_bg = np.mean(person_gray) > 240
    
    if not is_white_bg:
        # COLLAR SHADOW (top 12%)
        y_min, y_max = int(np.min(dst[:, 1])), int(np.max(dst[:, 1]))
        collar_h = int((y_max - y_min) * 0.12)
        collar_mask = np.zeros_like(warped_alpha)
        if y_min + collar_h < ph and y_min >= 0:
            collar_mask[y_min:y_min+collar_h, :] = warped_alpha[y_min:y_min+collar_h, :]
        collar_shadow = cv2.GaussianBlur(collar_mask, (21, 9), 0)
        shadow_intensity = 45 / 255.0
        shadow_mask = (collar_shadow / 255.0) * shadow_intensity
        photo_bgr = photo_bgr * (1 - shadow_mask[:, :, np.newaxis])
        
        # ARMPIT SHADOW (side 8%)
        x_min, x_max = int(np.min(dst[:, 0])), int(np.max(dst[:, 0]))
        side_w = int((x_max - x_min) * 0.08)
        side_mask = np.zeros_like(warped_alpha)
        if x_min >= 0 and x_max < pw:
            side_mask[:, x_min:x_min+side_w] = warped_alpha[:, x_min:x_min+side_w]
            side_mask[:, x_max-side_w:x_max] = warped_alpha[:, x_max-side_w:x_max]
        side_shadow = cv2.GaussianBlur(side_mask, (9, 21), 0)
        side_shadow_mask = (side_shadow / 255.0) * 0.25
        photo_bgr = photo_bgr * (1 - side_shadow_mask[:, :, np.newaxis])
        
    print(f"[TryOn] shadow_pass      | {int((time.time() - start_shadow)*1000)}ms  OK")

    # ── STAGE 7 — ALPHA COMPOSITING ──
    start_comp = time.time()
    warped_alpha_float = warped_alpha.astype(np.float32) / 255.0
    kernel_erode = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    eroded_alpha = cv2.erode(warped_alpha_float, kernel_erode, iterations=1)
    warped_alpha_feathered = cv2.GaussianBlur(eroded_alpha, (7, 7), sigmaX=2.5)
    
    alpha_3ch = np.stack([warped_alpha_feathered]*3, axis=-1)
    composite = warped_rgb.astype(np.float32) * alpha_3ch + photo_bgr * (1 - alpha_3ch)
    result = np.clip(composite, 0, 255).astype(np.uint8)
    
    print(f"[TryOn] compositing      | {int((time.time() - start_comp)*1000)}ms  OK")

    # ── STAGE 6 Apply ──
    if meta:
        arm_mask_feathered = _arm_occlusion_mask(
            person,
            meta.get("arm_landmarks", {}),
            meta.get("shoulder_pts", {}),
        )
        if arm_mask_feathered is not None:
            arm_mask_3ch = np.stack([arm_mask_feathered]*3, axis=-1)
            result = result.astype(np.float32) * (1.0 - arm_mask_3ch) + person.astype(np.float32) * arm_mask_3ch
            result = np.clip(result, 0, 255).astype(np.uint8)

    out = tempfile.mktemp(suffix="_warped.png", dir=TEMP_DIR)
    cv2.imwrite(out, result)
    return out


# ════════════════════════════════
# STAGE 8 — GEMINI 2.0 FLASH PHOTOREALISM POLISH
# ════════════════════════════════
def gemini_polish_composite(composite_path, run_id="pre-fix"):
    """Gemini 2.0 Flash photorealism polish with explicit prompt."""
    start_t = time.time()
    if not client: return None
    try:
        comp = Image.open(composite_path)
        prompt = """You are a photorealistic image compositing expert. You will receive an image of a person with a T-shirt digitally overlaid on their body using computer vision warping. Your task is to make this look like a genuine, unaltered photograph of the person physically wearing this exact T-shirt.

Apply ALL of the following corrections:

1. EDGES: Eliminate every hard border, halo, or seam where the shirt meets the person's body or arms. The shirt must appear to be physically touching the body — blend the boundaries naturally into skin and clothing.

2. FABRIC: Add realistic fabric wrinkles, folds, and tension lines consistent with the body shape beneath. The shirt should conform to the chest, shoulders, and torso naturally. Add slight fabric stretch near the shoulders and relaxed drape at the hem.

3. LIGHTING: Match the shirt's lighting, shadows, and highlights exactly to the ambient light in the photo. If light comes from the left, the shirt's right side should be in shadow. Add specular highlights on the fabric surface where the light source hits.

4. COLLAR SHADOW: Add a soft, natural contact shadow beneath the collar where the shirt lays against the neck. This shadow should be subtle — 1 to 3 cm wide, soft edges.

5. UNDER-ARM SHADOW: Add natural shadow in the armpit area where the sleeve meets the body — this is critical for realism.

6. SHIRT DESIGN PRESERVATION: Preserve the shirt's print, logo, text, graphics, and colors with 100% fidelity. Do NOT alter, blur, distort, hallucinate, or add anything to the garment design. The design must be pixel-accurate.

7. IDENTITY PRESERVATION: Do NOT alter the person's face, hair, skin tone, hands, background, or any other element of the photo outside the shirt region.

Output a single corrected image. No text. No explanations. The output must be photographic quality — indistinguishable from a real photograph of this person wearing this shirt."""
        
        # 25-second timeout (Stage 9.6) - GenAI client handles timeouts via config if needed, 
        # but we can enforce it loosely by checking elapsed time if the client blocks, 
        # or passing http_options (if supported). For now, standard call.
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, comp],
            config=types.GenerateContentConfig(response_modalities=["IMAGE"]) # No TEXT required
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                out = tempfile.mktemp(suffix="_polish.png", dir=TEMP_DIR)
                with open(out, "wb") as f:
                    f.write(part.inline_data.data)
                print(f"[TryOn] Gemini polish SUCCESS")
                print(f"[TryOn] gemini_polish    | {int((time.time() - start_t)*1000)}ms  OK")
                return out
        print(f"[TryOn] Gemini polish FAILED — using composite fallback")
        return None
    except Exception as e:
        print(f"[TryOn] Gemini timeout/error — composite fallback used. Error: {e}")
        return None

def gemini_tryon(person_path, shirt_path):
    if not client: return None
    try:
        person_img = Image.open(person_path)
        shirt_img = Image.open(shirt_path)
        prompt = """You are a virtual try-on system. The first image is a person. The second image is a t-shirt. Generate a photorealistic image of the SAME person wearing that EXACT t-shirt. 

CRITICAL INSTRUCTIONS:
1. COMPLETELY REPLACE the person's original clothing in the chest/torso area. No see-through effect, no original clothes showing underneath.
2. The shirt fabric must show NATURAL FOLDS, creases, and wrinkles that follow the person's body posture and pose.
3. The shirt must have REALISTIC SHADOWS and lighting that match the ambient lighting of the original photo.
4. The shirt sleeves, collar, hem, and buttons must all be realistically rendered.
5. The shirt must conform to the 3D shape of the torso - body-hugging, not flat.
6. The shirt color, logo/print, and design must be accurately preserved from the product image.
7. Keep the person's face, pose, hands, and background 100% identical.

The final image must look like a real product photography shoot — indistinguishable from a human actually wearing the shirt."""
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, person_img, shirt_img],
            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                out = tempfile.mktemp(suffix="_gemini.png", dir=TEMP_DIR)
                with open(out, "wb") as f:
                    f.write(part.inline_data.data)
                return out
        return None
    except Exception as e:
        return None

def idm_vton_tryon(person_path, shirt_path):
    """Hits the official IDM-VTON huggingface space for perfect photorealism."""
    if not GRADIO_CLIENT_AVAILABLE:
        print("[TryOn] gradio_client not available")
        return None
        
    print("[TryOn] Sending request to IDM-VTON HuggingFace Space...")
    try:
        idm_client = Client("yisol/IDM-VTON")
        dict_val = {
            "background": handle_file(person_path), 
            "layers": [], 
            "composite": None
        }
        result = idm_client.predict(
            dict=dict_val,
            garm_img=handle_file(shirt_path),
            garment_des="t-shirt",
            is_checked=True,
            is_checked_crop=False,
            denoise_steps=30,
            seed=42,
            api_name="/tryon"
        )
        # Result is a tuple: (output_image_path, masked_image_path)
        output_path = result[0]
        
        # Gradio downloads to a temporary folder, let's copy it to our temp dir
        import shutil
        out = tempfile.mktemp(suffix="_idmvton.png", dir=TEMP_DIR)
        shutil.copy2(output_path, out)
        print(f"[TryOn] IDM-VTON SUCCESS: {out}")
        return out
    except Exception as e:
        print(f"[TryOn] IDM-VTON API failed: {e}")
        return None

def _safe_file_under(base_dir, rel_path):
    base_dir = os.path.abspath(base_dir)
    full = os.path.abspath(os.path.join(base_dir, rel_path))
    if not full.startswith(base_dir + os.sep) and full != base_dir:
        return None
    return full if os.path.isfile(full) else None

@app.route("/")
def index():
    return redirect("/try-on-screen/try-on-screen.html")

@app.route("/try-on-screen/<path:filename>")
def try_on_screen_static(filename):
    path = _safe_file_under(TRY_ON_SCREEN_DIR, filename)
    if not path: abort(404)
    return send_from_directory(TRY_ON_SCREEN_DIR, filename)

@app.route("/header.html")
def serve_header_html(): return send_from_directory(ROOT, "header.html")

@app.route("/header.css")
def serve_header_css(): return send_from_directory(ROOT, "header.css")

# ════════════════════════════════
# STAGE 10 — LOGGING & ERROR RESPONSES
# ════════════════════════════════
@app.route("/api/tryon", methods=["POST"])
def tryon():
    total_start = time.time()
    if "person_image" not in request.files or "shirt_image" not in request.files:
        return jsonify({"success": False, "error": "Please upload both images."}), 400

    p_path = s_path = result_path = None
    method = "unknown"
    extra_cleanup = []
    run_id = os.environ.get("DEBUG_RUN_ID", "pre-fix")
    pose_fit = "estimate"
    pose_reason = None
    fit_hint = ""
    idm_first = os.getenv("IDM_VTON_FIRST", "1").strip().lower() in ("1", "true", "yes")
    # Default to strict IDM-only so local fallback is never used silently.
    idm_only = os.getenv("IDM_VTON_ONLY", "1").strip().lower() in ("1", "true", "yes")

    try:
        p_path = save_upload(request.files["person_image"])
        s_path = save_upload(request.files["shirt_image"])
        resize_img(p_path, max_size=768)
        resize_img(s_path, max_size=768)

        # 1. First Priority: IDM-VTON (enabled by default)
        if idm_first:
            print("[TryOn] Attempting perfect realism with IDM-VTON (diffusion)...")
            hf_token = os.getenv("HF_TOKEN", "").strip()

            try:
                from gradio_client import Client, handle_file
                print("[TryOn] Connecting to IDM-VTON space...")
                client_kwargs = {}
                if hf_token:
                    client_kwargs["token"] = hf_token

                idm_client = Client("yisol/IDM-VTON", **client_kwargs)
                dict_val = {
                    "background": handle_file(p_path),
                    "layers": [],
                    "composite": None
                }
                
                # Set a 10-second timeout for the HuggingFace space prediction to keep UI responsive
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(
                        idm_client.predict,
                        dict=dict_val,
                        garm_img=handle_file(s_path),
                        garment_des="t-shirt",
                        is_checked=True,
                        is_checked_crop=False,
                        denoise_steps=20,
                        seed=42,
                        api_name="/tryon"
                    )
                    try:
                        result = future.result(timeout=10.0)
                    except concurrent.futures.TimeoutError:
                        raise TimeoutError("HuggingFace space request timed out (>10s)")

                output_path = result[0]
                import shutil
                out = tempfile.mktemp(suffix="_idmvton.png", dir=TEMP_DIR)
                shutil.copy2(output_path, out)
                print("[TryOn] IDM-VTON SUCCESS!")

                return jsonify({
                    "success": True,
                    "result_base64": image_to_base64(out),
                    "method_used": "idm_vton_diffusion"
                })

            except Exception as e:
                err_str = str(e)
                is_timeout = "timed out" in err_str.lower()
                is_quota = "zerogpu quota" in err_str.lower()
                
                if is_quota:
                    print("\n[TryOn] ERROR: Hugging Face ZeroGPU quota exceeded!")
                    fit_hint = "Cloud try-on quota reached; used local pipeline fallback."
                else:
                    print(f"[TryOn] IDM-VTON API failed: {e}")

                if idm_only and not is_timeout and not is_quota:
                    return jsonify({
                        "success": False,
                        "error": f"IDM-VTON failed: {err_str}"
                    }), 503

                if is_timeout:
                    fit_hint = "HuggingFace space was busy; automatically fell back to local pipeline."
                print("[TryOn] Falling back to local classic/Gemini methods...")

        if os.getenv("GEMINI_FULL_TRYON", "").strip().lower() in ("1", "true", "yes"):
            ai_result = gemini_tryon(p_path, s_path)
            if ai_result:
                result_path = ai_result
                method = "gemini_ai_full"
                return jsonify({
                    "success": True,
                    "result_base64": image_to_base64(result_path),
                    "method_used": method,
                })

        try:
            shirt_rgba_path, src_quad = prepare_garment_rgba(s_path, run_id)
            extra_cleanup.append(shirt_rgba_path)
        except Exception as e:
            return jsonify({"error": "PROCESSING_FAILED", "message": str(e), "stage": "segmentation"}), 500

        person_bgr = cv2.imread(p_path)
        
        # STAGE 9.1 Dark Photo CLAHE
        mean_brightness = np.mean(cv2.cvtColor(person_bgr, cv2.COLOR_BGR2GRAY))
        if mean_brightness < 60:
            lab = cv2.cvtColor(person_bgr, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            cl = clahe.apply(l)
            limg = cv2.merge((cl,a,b))
            person_bgr = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        try:
            quad, meta = get_pose_torso_quad(person_bgr, run_id)
        except ValueError as e:
            if "NO_PERSON_DETECTED" in str(e):
                return jsonify({"error": "NO_PERSON_DETECTED", "message": str(e).split(":", 1)[1].strip()}), 400
            else:
                return jsonify({"error": "PROCESSING_FAILED", "message": str(e), "stage": "pose_detection"}), 500

        shirt_work_path = shirt_rgba_path
        if quad is not None and meta and meta.get("shoulder_angle_deg") is not None:
            shirt_img = cv2.imread(shirt_rgba_path, cv2.IMREAD_UNCHANGED)
            rotated, rot_src_quad = rotate_rgba_align_shoulders(shirt_img, meta["shoulder_angle_deg"], src_quad)
            rot_path = tempfile.mktemp(suffix="_rot.png", dir=TEMP_DIR)
            cv2.imwrite(rot_path, rotated)
            shirt_work_path = rot_path
            src_quad = rot_src_quad
            extra_cleanup.append(rot_path)

        try:
            if quad is not None:
                result_path = warp_garment_to_quad(shirt_work_path, p_path, quad, src_quad, run_id, meta=meta)
                method = "mediapipe_pose_warp"
                pose_fit = "body_tracked"
            else:
                torso = detect_torso(p_path)
                h, w = cv2.imread(shirt_work_path, cv2.IMREAD_UNCHANGED).shape[:2]
                fallback_src_quad = np.array([[0,0], [w,0], [w,h], [0,h]], dtype=np.float32)
                result_path = warp_garment_to_quad(shirt_work_path, p_path, torso, fallback_src_quad, run_id, meta=None)
                method = "fallback_haar_warp"
        except Exception as e:
            return jsonify({"error": "PROCESSING_FAILED", "message": str(e), "stage": "warp"}), 500

        if client and os.getenv("GEMINI_POST_POLISH", "").strip().lower() in ("1", "true", "yes"):
            polished = gemini_polish_composite(result_path, run_id)
            if polished:
                extra_cleanup.append(result_path)
                result_path = polished
                method = method + "+gemini_polish"

        print(f"[TryOn] TOTAL            | {int((time.time() - total_start)*1000)}ms  OK")

        return jsonify({
            "success": True,
            "result_base64": image_to_base64(result_path),
            "method_used": method,
            "pose_fit": pose_fit,
            "pose_reason": pose_reason,
            "fit_hint": fit_hint,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        for ep in extra_cleanup:
            if ep and os.path.exists(ep):
                try: os.unlink(ep)
                except: pass
        for p in [p_path, s_path, result_path]:
            if p and p not in [p_path, s_path] and os.path.exists(p):
                try: os.unlink(p)
                except: pass
        for p in [p_path, s_path]:
            if p and os.path.exists(p):
                try: os.unlink(p)
                except: pass

@app.route("/api/tryon/health")
def health():
    return jsonify({
        "status": "ok",
        "api_key_set": bool(GEMINI_API_KEY),
        "mediapipe_available": MEDIAPIPE_AVAILABLE,
        "mediapipe_error": _MEDIAPIPE_LOAD_ERROR if not MEDIAPIPE_AVAILABLE else "",
        "pose_landmarker_model": POSE_TASK_FILENAME,
        "gemini_post_polish": os.getenv("GEMINI_POST_POLISH", ""),
        "gemini_full_tryon": os.getenv("GEMINI_FULL_TRYON", ""),
        "idm_vton_first": os.getenv("IDM_VTON_FIRST", "1"),
        "idm_vton_only": os.getenv("IDM_VTON_ONLY", "1"),
        "hf_token_set": bool(os.getenv("HF_TOKEN", "").strip()),
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    host = os.environ.get("FLASK_HOST", "127.0.0.1")
    use_ssl = os.environ.get("FLASK_SSL", "").strip().lower() in ("1", "true", "yes")
    ssl_ctx = "adhoc" if use_ssl else None
    scheme = "https" if ssl_ctx else "http"
    base = f"{scheme}://{host}:{port}"

    print("\n  --- Shirtify try-on (Flask) ---")
    print(f"  Open this exact URL: {base}/")
    if not ssl_ctx:
        print("  If the page fails: use http:// NOT https:// (or set FLASK_SSL=1 for dev HTTPS).")
    print("  Press Ctrl+C to stop.\n")

    app.run(
        host=host,
        port=port,
        debug=True,
        use_reloader=False,
        threaded=True,
        ssl_context=ssl_ctx,
    )
