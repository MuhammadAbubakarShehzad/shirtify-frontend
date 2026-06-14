/**
 * Shirtify – Try-On Screen Logic
 * ─────────────────────────────────────────────────────────────
 * Connects the try-on UI to the Flask backend (tryon_pipeline.py)
 * running on port 5001.
 *
 * Flow:
 *  1. User uploads their photo  → personFileInput
 *  2. User uploads shirt design → shirtFileInput
 *  3. User clicks "Generate Try-On"
 *  4. JS sends multipart POST to http://localhost:5001/api/tryon
 *  5. Response (base64 image) is displayed in the result section
 */

// Resolve the Flask backend base URL by probing common ports (5001, 5000).
let API_BASE = null;

async function _probeHealth(host, port, timeoutMs = 1500) {
    const scheme = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const url = `${scheme}//${host}:${port}/api/tryon/health`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { method: 'GET', signal: controller.signal });
        clearTimeout(id);
        return res.ok;
    } catch (e) {
        clearTimeout(id);
        return false;
    }
}

async function resolveApiBase() {
    const host = window.location.hostname || 'localhost';
    const scheme = window.location.protocol === 'https:' ? 'https:' : 'http:';
    
    // Allow custom override via localStorage
    const savedTryonBase = localStorage.getItem('shirtifyTryonApiBase');
    if (savedTryonBase) {
        API_BASE = savedTryonBase;
        console.log('[TryOn] using configured API_BASE =', API_BASE);
        return;
    }

    const isProduction = host !== 'localhost' && host !== '127.0.0.1';

    // If we are on production (like Vercel), prioritize the cloud try-on service
    if (isProduction) {
        const prodTryonUrl = 'https://tryon-pipeline-production.up.railway.app';
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`${prodTryonUrl}/api/tryon/health`, { method: 'GET', signal: controller.signal });
            clearTimeout(id);
            if (res.ok) {
                API_BASE = prodTryonUrl;
                console.log('[TryOn] using production API_BASE =', API_BASE);
                return;
            }
        } catch (e) {
            console.warn('[TryOn] Production API probe failed', e);
        }
    }

    // Prioritize 5001 (the python try-on port) first to avoid 404 errors from probing other active ports (like Live Server 5500 or Node.js 5000)
    const candidates = ['5001'];
    if (window.location.port && window.location.port !== '5001' && window.location.port !== '5500') {
        candidates.push(window.location.port);
    }
    candidates.push('5000');

    // If we are on production HTTPS, probing local ports via HTTPS scheme will fail due to SSL.
    // We should directly test localhost on HTTP since browsers allow local HTTP connections from HTTPS sites.
    const probeHost = isProduction ? '127.0.0.1' : host;
    const probeScheme = isProduction ? 'http:' : scheme;

    for (const p of candidates) {
        if (!p) continue;
        try {
            // short probe to keep UI responsive
            if (await _probeHealth(probeHost, p, 1200)) {
                API_BASE = `${probeScheme}//${probeHost}:${p}`;
                console.log('[TryOn] using API_BASE =', API_BASE);
                return;
            }
        } catch (e) {
            // ignore and try next
        }
    }

    // Fallback
    API_BASE = isProduction ? 'https://tryon-pipeline-production.up.railway.app' : 'http://127.0.0.1:5001';
    console.warn('[TryOn] API probe failed — falling back to', API_BASE);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure we resolve which backend port is available before wiring up requests.
    try {
        await resolveApiBase();
    } catch (e) {
        console.warn('[TryOn] resolveApiBase error', e);
        // leave API_BASE as fallback set in resolveApiBase
    }
    // Guard against accidental form submissions from injected header markup.
    document.addEventListener('submit', (e) => {
        e.preventDefault();
    });

    // ── Element references ──────────────────────────────────────
    const sendBtn          = document.getElementById('sendBtn');
    const userInput        = document.getElementById('userInput');
    const chatBox          = document.getElementById('chatBox');

    const dropZone         = document.getElementById('dropZone');
    const choosePersonBtn  = document.getElementById('choosePersonBtn');
    const personFileInput  = document.getElementById('personFileInput');
    const personFileName   = document.getElementById('personFileName');

    const selectshirt      = document.getElementById('selectshirt');
    const shirtFileInput   = document.getElementById('shirtFileInput');
    const shirtFileName    = document.getElementById('shirtFileName');

    const generateBtn      = document.getElementById('generateBtn');

    const resultSection    = document.getElementById('resultSection');
    const loaderWrapper    = document.getElementById('loaderWrapper');
    const methodBadge      = document.getElementById('methodBadge');

    const resultCard       = document.getElementById('resultCard');
    const resultImg        = document.getElementById('resultImg');
    const downloadBtn      = document.getElementById('downloadBtn');
    const methodLabel      = document.getElementById('methodLabel');
    const retryBtn         = document.getElementById('retryBtn');

    const errorCard        = document.getElementById('errorCard');
    const errorMsg         = document.getElementById('errorMsg');
    const errorRetryBtn    = document.getElementById('errorRetryBtn');

    // ── Stored file references ──────────────────────────────────
    let personFile = null;
    let shirtFile  = null;

    // ── Helper: show a bot message in the chat ──────────────────
    function botSay(text) {
        const msg = document.createElement('div');
        msg.className = 'message bot-message';
        msg.innerHTML = text;
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // ── Helper: reset result area ───────────────────────────────
    function hideResults() {
        resultSection.style.display = 'none';
        loaderWrapper.style.display = 'none';
        resultCard.style.display    = 'none';
        errorCard.style.display     = 'none';
    }

    function showLoader(message = '') {
        resultSection.style.display = 'block';
        loaderWrapper.style.display = 'flex';
        resultCard.style.display    = 'none';
        errorCard.style.display     = 'none';
        methodBadge.textContent     = message;
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function showResult(base64Image, method) {
        loaderWrapper.style.display = 'none';
        errorCard.style.display     = 'none';
        resultCard.style.display    = 'flex';

        const src = 'data:image/png;base64,' + base64Image;
        resultImg.src    = src;
        downloadBtn.href = src;

        const methodMap = {
            'mediapipe_pose_warp':           '🎯 Method: MediaPipe pose + perspective warp + alpha blend',
            'mediapipe_pose_warp+gemini_polish': '✨ Method: Pose warp + Gemini polish',
            'fallback_haar_warp':            '🔧 Method: Face-estimate torso (pose not detected)',
            'fallback_haar_warp+gemini_polish': '✨ Method: Face torso + Gemini polish',
            'gemini_ai_full':                '🤖 Method: Full Gemini try-on',
            'warp+gemini_polish':            '✨ Method: MediaPipe warp + Gemini AI polish',
            'warp_only':                     '🔧 Method: MediaPipe warp (Gemini polish disabled)',
            'gemini_only_fallback':          '🤖 Method: Gemini AI direct compositing (pose fallback)',
        };
        methodLabel.textContent = methodMap[method] || `Method: ${method}`;
    }

    function showError(message) {
        loaderWrapper.style.display = 'none';
        resultCard.style.display    = 'none';
        errorCard.style.display     = 'flex';
        errorMsg.textContent        = message || 'An unexpected error occurred. Please try again.';
    }

    // ── Person photo upload ─────────────────────────────────────
    // Clicking the drop zone or the "Choose Photo" button opens file picker
    dropZone.addEventListener('click', (e) => {
        // Don't double-fire if the button itself was clicked
        if (e.target !== choosePersonBtn && !choosePersonBtn.contains(e.target)) {
            personFileInput.click();
        }
    });
    choosePersonBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        personFileInput.click();
    });

    personFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            personFile = e.target.files[0];
            personFileName.textContent = `✔ ${personFile.name}`;
            personFileName.style.color = '#27ae60';

            // Show a thumbnail preview inside the drop zone
            const reader = new FileReader();
            reader.onload = (ev) => {
                let thumb = dropZone.querySelector('.thumb-preview');
                if (!thumb) {
                    thumb = document.createElement('img');
                    thumb.className = 'thumb-preview';
                    dropZone.appendChild(thumb);
                }
                thumb.src = ev.target.result;
            };
            reader.readAsDataURL(personFile);

            botSay('📸 Photo uploaded! Now select a shirt design and click Generate.');
            hideResults();
        }
    });

    // Drag-and-drop support for person photo
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('active');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('active');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            personFile = files[0];
            personFileInput.files = files; // sync the input
            personFileName.textContent = `✔ ${personFile.name}`;
            personFileName.style.color = '#27ae60';
            botSay('📸 Photo uploaded via drag & drop! Now select a shirt design.');
            hideResults();
        }
    });

    // ── Shirt design upload ─────────────────────────────────────
    selectshirt.addEventListener('click', (e) => {
        e.preventDefault();
        shirtFileInput.click();
    });

    shirtFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            shirtFile = e.target.files[0];
            shirtFileName.textContent = `✔ ${shirtFile.name}`;
            botSay('👕 Shirt design selected! Click <strong>Generate Try-On</strong> when ready.');
            hideResults();
        }
    });

    // ── Generate Try-On ─────────────────────────────────────────
    generateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        // Validation
        if (!personFile) {
            botSay('⚠️ Please upload <strong>your photo</strong> first.');
            dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (!shirtFile) {
            botSay('⚠️ Please select a <strong>shirt design</strong> first.');
            return;
        }

        // Build form data
        const formData = new FormData();
        formData.append('person_image', personFile);
        formData.append('shirt_image',  shirtFile);

        // Update UI to loading state
        generateBtn.disabled    = true;
        generateBtn.innerHTML   = '<i class="fa fa-spinner fa-spin"></i> Generating…';
        showLoader('Step 1 of 3: Detecting body pose…');
        botSay('🔄 Generating your try-on… this usually takes 5–10 seconds.');

        try {
            const response = await fetch(`${API_BASE}/api/tryon`, {
                method: 'POST',
                body:   formData,
            });

            const data = await response.json();

            if (data.success) {
                showResult(data.result_base64, data.method_used);
                let doneMsg = '✅ Done! Your try-on result is ready below. You can download it or try again with a different design.';
                if (data.pose_fit === 'estimate' && data.fit_hint) {
                    doneMsg += ' <br><small>ℹ️ ' + data.fit_hint + '</small>';
                }
                botSay(doneMsg);
            } else {
                showError(data.error);
                botSay(`❌ Try-On failed: ${data.error}`);
                // Ensure UI is interactive again
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fa fa-magic"></i> Generate Try-On';
            }

        } catch (err) {
            // Network / server not running
            const apiUrl = API_BASE ? `${API_BASE}/api/tryon` : 'http://localhost:5001/api/tryon';
            const msg = `Could not connect to the try-on server at ${apiUrl}. Make sure the Python backend (tryon_pipeline.py) is running and accessible.`;
            showError(msg);
            botSay(`❌ ${msg}`);
        } finally {
            generateBtn.disabled  = false;
            generateBtn.innerHTML = '<i class="fa fa-magic"></i> Generate Try-On';
        }
    });

    // ── Retry buttons ───────────────────────────────────────────
    function resetAll() {
        hideResults();
        personFile = null;
        shirtFile  = null;
        personFileName.textContent = 'JPG or PNG, clear front-facing photo';
        personFileName.style.color = '';
        shirtFileName.textContent  = '';
        const thumb = dropZone.querySelector('.thumb-preview');
        if (thumb) thumb.remove();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        botSay('🔁 Reset! Upload a new photo and shirt design to try again.');
    }
    retryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetAll();
    });
    errorRetryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetAll();
    });

    // ── Chat assistant ──────────────────────────────────────────
    sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sendChat();
    });
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendChat();
        }
    });

    function sendChat() {
        const text = userInput.value.trim();
        if (!text) return;

        // Display user message
        const userMsg = document.createElement('div');
        userMsg.className = 'message user-message';
        userMsg.textContent = text;
        chatBox.appendChild(userMsg);
        userInput.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;

        // Simple keyword-based bot replies
        setTimeout(() => {
            const lower = text.toLowerCase();
            if (lower.includes('format') || lower.includes('type') || lower.includes('file')) {
                botSay('📁 We accept <strong>JPG and PNG</strong> files for both your photo and shirt design. PNG with transparent background works best for shirts.');
            } else if (lower.includes('time') || lower.includes('long') || lower.includes('slow')) {
                botSay('⏱ Generation usually takes <strong>5–10 seconds</strong>. Gemini AI polishing adds a few extra seconds but makes the result look much more realistic.');
            } else if (lower.includes('design') || lower.includes('custom') || lower.includes('shirt')) {
                botSay('👕 You can upload any shirt PNG — including designs you created in our <strong>Design Studio</strong>. Export it from the canvas and upload it here!');
            } else if (lower.includes('download') || lower.includes('save')) {
                botSay('💾 After generating, click the <strong>Download Image</strong> button to save your try-on result to your device.');
            } else if (lower.includes('pose') || lower.includes('photo') || lower.includes('body')) {
                botSay('📸 For best results, use a clear <strong>front-facing photo</strong> where your torso is fully visible and your arms are not completely blocking your body.');
            } else {
                botSay('🤔 I\'m not sure about that, but I\'m here to help with your virtual try-on! Try uploading your photo and shirt design to get started.');
            }
        }, 600);
    }

    // ── Health check on load ────────────────────────────────────
    fetch(`${API_BASE}/api/tryon/health`)
        .then(r => r.json())
        .then(data => {
            if (data.status === 'ok') {
                const mp = data.mediapipe_available !== false;
                const poseModel = data.pose_landmarker_model || '';
                botSay(`🟢 Try-On server is online! Pose: ${mp ? 'MediaPipe ready' : 'MediaPipe unavailable'}${poseModel ? ' (' + poseModel + ')' : ''}.`);
            }
        })
        .catch(() => {
            botSay('🔴 <strong>Try-On server is offline.</strong> Please start <code>tryon_pipeline.py</code> and refresh this page.');
        });

});