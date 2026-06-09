// --- Per-side design storage ---
window.designStates = [null, null, null, null]; // One for each view
window.handleRotateView = function() {
    if (!window.shirtImages || !window.shirtImages.length) return;
    // Save only user objects (not _shirtObject) before switching
    if (window.fabricCanvas && window.currentView !== undefined) {
        const userObjects = window.fabricCanvas.getObjects().filter(obj => !obj._shirtObject);
        window.designStates[window.currentView] = JSON.stringify(userObjects.map(obj => obj.toObject()));
    }
    window.currentView = (window.currentView + 1) % window.shirtImages.length;
    if (typeof renderShirtView === 'function') renderShirtView();
};

// --- Pen Tool Logic ---
let isPenMode = false;
let penBrush = null;

function activatePenMode() {
    if (!window.fabricCanvas) return;
    isPenMode = true;
    window.fabricCanvas.isDrawingMode = true;
    // Show pen properties
    document.getElementById('pen-properties').style.display = 'block';
    // Hide shape properties
    document.getElementById('shape-fill-color').parentElement.parentElement.style.display = 'none';
    // Set brush color/width
    const color = document.getElementById('pen-color').value;
    const width = parseInt(document.getElementById('pen-width').value);
    window.fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(window.fabricCanvas);
    window.fabricCanvas.freeDrawingBrush.color = color;
    window.fabricCanvas.freeDrawingBrush.width = width;
}

function deactivatePenMode() {
    if (!window.fabricCanvas) return;
    isPenMode = false;
    window.fabricCanvas.isDrawingMode = false;
    document.getElementById('pen-properties').style.display = 'none';
    document.getElementById('shape-fill-color').parentElement.parentElement.style.display = '';
}

function clearCustomizationSelection() {
    if (!window.fabricCanvas) return;

    const active = window.fabricCanvas.getActiveObject();
    if (active && active.isEditing && typeof active.exitEditing === 'function') {
        active.exitEditing();
    }

    if (isPenMode) {
        deactivatePenMode();
    }

    window.fabricCanvas.discardActiveObject();
    window.fabricCanvas.requestRenderAll();
}

window.addEventListener('DOMContentLoaded', function() {
    // Pen tool button
    const penBtn = document.getElementById('pen-tool-btn');
    if (penBtn) {
        penBtn.addEventListener('click', function() {
            if (isPenMode) {
                deactivatePenMode();
            } else {
                activatePenMode();
            }
        });
    }
    // Pen color/width controls
    document.getElementById('pen-color').addEventListener('input', function() {
        if (!window.fabricCanvas) return;
        if (window.fabricCanvas.freeDrawingBrush) {
            window.fabricCanvas.freeDrawingBrush.color = this.value;
        }
    });
    document.getElementById('pen-width').addEventListener('input', function() {
        if (!window.fabricCanvas) return;
        if (window.fabricCanvas.freeDrawingBrush) {
            window.fabricCanvas.freeDrawingBrush.width = parseInt(this.value);
        }
    });
    // Deactivate pen mode when selecting an object
    if (window.fabricCanvas) {
        window.fabricCanvas.on('selection:created', function() {
            if (isPenMode) deactivatePenMode();
        });


        // Save design state on any canvas change (add, modify, remove)
        const saveCurrentViewDesign = function() {
            if (window.currentView !== undefined) {
                const userObjects = window.fabricCanvas.getObjects().filter(obj => !obj._shirtObject);
                window.designStates[window.currentView] = JSON.stringify(userObjects.map(obj => obj.toObject()));
            }
        };
        window.fabricCanvas.on('object:added', saveCurrentViewDesign);
        window.fabricCanvas.on('object:modified', saveCurrentViewDesign);
        window.fabricCanvas.on('object:removed', saveCurrentViewDesign);
    }


});
// Defensive patch: Override textBaseline setter to prevent invalid values
window.addEventListener('DOMContentLoaded', function() {
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        const ctx = origGetContext.call(this, type, ...args);
        if (type === '2d' && ctx && !ctx._patchedTextBaseline) {
            const validBaselines = ['top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom'];
            let _textBaseline = ctx.textBaseline;
            Object.defineProperty(ctx, 'textBaseline', {
                get() { return _textBaseline; },
                set(v) {
                    if (validBaselines.includes(v)) {
                        _textBaseline = v;
                    } else {
                        _textBaseline = 'alphabetic'; // fallback to default
                    }
                },
                configurable: true
            });
            ctx._patchedTextBaseline = true;
        }
        return ctx;
    };
});
// Add shape to canvas when shape button is clicked
// Removed duplicate shape-adding logic. Only use addShapeByName for shape buttons.
// Canva-like Shape Sidebar logic for toolbar area
window.addEventListener('DOMContentLoaded', function() {
    const shapeSidebar = document.getElementById('shape-toolbar-sidebar');
    const shapeBtn = document.getElementById('show-shape-toolbar');
    if (!shapeSidebar || !shapeBtn) return;

    shapeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (shapeSidebar.style.display === 'flex') {
            shapeSidebar.style.display = 'none';
        } else {
            shapeSidebar.style.display = 'flex';
        }
    });

    // Hide sidebar if clicking outside
    document.addEventListener('mousedown', function(e) {
        if (!shapeSidebar.contains(e.target) && e.target !== shapeBtn) {
            shapeSidebar.style.display = 'none';
        }
    });
});
// Canva-like Text Toolbar logic for toolbar area
window.addEventListener('DOMContentLoaded', function() {
    const toolbar = document.getElementById('canva-text-toolbar');
    const showBtn = document.getElementById('show-text-toolbar');
    if (!toolbar || !showBtn) return;
    if (!window.fabricCanvas) {
        window.fabricCanvas = new fabric.Canvas('main-canvas', {
            backgroundColor: 'transparent',
            width: 600,
            height: 500,
            preserveObjectStacking: true
        });
    }
    setupCanvasEvents(window.fabricCanvas);
    canvas = window.fabricCanvas;

    function rgb2hex(rgb) {
        if (!rgb) return '#000000';
        if (rgb.startsWith('#')) return rgb;
        const result = rgb.match(/\d+/g);
        if (!result) return '#000000';
        return '#' + result.map(x => (+x).toString(16).padStart(2, '0')).join('');
    }

    function setActive(id, active) {
        const btn = document.getElementById(id);
        if (btn) {
            if (active) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    }

    function getActiveText() {
        const obj = window.fabricCanvas.getActiveObject();
        if (obj && (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text')) return obj;
        return null;
    }

    function showToolbarForText(obj) {
        if (!toolbar || !obj) return;
        toolbar.style.display = 'flex';
        document.getElementById('font-family').value = (obj.fontFamily || 'Arial').split(',')[0].trim();
        document.getElementById('font-size').value = obj.fontSize || 24;
        document.getElementById('text-color').value = obj.fill ? rgb2hex(obj.fill) : '#000000';
        document.getElementById('highlight-color').value = obj.backgroundColor ? rgb2hex(obj.backgroundColor) : '#ffffff';
        document.getElementById('line-height').value = obj.lineHeight || 1.2;
        document.getElementById('letter-spacing').value = obj.charSpacing ? (obj.charSpacing / 10) : 0;
        document.getElementById('text-opacity').value = (typeof obj.opacity === 'number') ? obj.opacity : 1;
        document.getElementById('text-transform').value = obj.textTransform || 'none';
        setActive('text-bold', obj.fontWeight === 'bold' || obj.fontWeight === 700);
        setActive('text-italic', obj.fontStyle === 'italic');
        setActive('text-underline', obj.underline);
        setActive('text-strikethrough', obj.linethrough);
        setActive('align-left', obj.textAlign === 'left');
        setActive('align-center', obj.textAlign === 'center');
        setActive('align-right', obj.textAlign === 'right');
        setActive('align-justify', obj.textAlign === 'justify');
    }

    function hideToolbar() {
        if (toolbar) toolbar.style.display = 'none';
    }

    // Show/hide toolbar on selection
    window.fabricCanvas.on('selection:created', function(e) {
        const obj = e.selected && e.selected[0];
        if (obj && (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text')) {
            showToolbarForText(obj);
        } else {
            hideToolbar();
        }
        updateProperties(); // <-- Ensure shape sidebar updates
    });
    window.fabricCanvas.on('selection:updated', function(e) {
        const obj = e.selected && e.selected[0];
        if (obj && (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text')) {
            showToolbarForText(obj);
        } else {
            hideToolbar();
        }
        updateProperties(); // <-- Ensure shape sidebar updates
    });
    window.fabricCanvas.on('selection:cleared', function() {
        hideToolbar();
        updateProperties(); // <-- Hide shape sidebar
    });

    // Clear the current selection when clicking outside the canvas/workspace controls
    document.addEventListener('mousedown', function(e) {
        const mainToolbar = document.querySelector('.toolbar');
        const shapeSidebar = document.getElementById('shape-properties-sidebar');
        const shapeToolbar = document.getElementById('shape-toolbar-sidebar');
        const textToolbar = document.getElementById('canva-text-toolbar');
        const isInsideCanvas = window.fabricCanvas.upperCanvasEl.contains(e.target);
        const isInsideMainToolbar = mainToolbar && mainToolbar.contains(e.target);
        const isInsideToolbar = toolbar.contains(e.target) || (textToolbar && textToolbar.contains(e.target));
        const isInsideShapeControls = (shapeSidebar && shapeSidebar.contains(e.target)) || (shapeToolbar && shapeToolbar.contains(e.target));

        if (!isInsideCanvas && !isInsideMainToolbar && !isInsideToolbar && !isInsideShapeControls) {
            clearCustomizationSelection();
        }
    });

    // Show toolbar if text is selected on load
    if (window.fabricCanvas.getActiveObject() && (window.fabricCanvas.getActiveObject().type === 'i-text' || window.fabricCanvas.getActiveObject().type === 'textbox' || window.fabricCanvas.getActiveObject().type === 'text')) {
        showToolbarForText(window.fabricCanvas.getActiveObject());
    } else {
        hideToolbar();
    }

    // --- Toolbar Controls Functionality ---
    function updateTextProperty(prop, value) {
        const obj = getActiveText();
        if (!obj) return;
        obj.set(prop, value);
        window.fabricCanvas.requestRenderAll();
    }

    document.getElementById('font-family').addEventListener('change', function() {
        // Only set the main font name, not a fallback list
        const font = this.value.split(',')[0].trim();
        updateTextProperty('fontFamily', font);
    });
    document.getElementById('font-size').addEventListener('input', function() {
        updateTextProperty('fontSize', parseInt(this.value));
    });
    document.getElementById('font-size-increase').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        obj.set('fontSize', (obj.fontSize || 24) + 2);
        document.getElementById('font-size').value = obj.fontSize;
        canvas.requestRenderAll();
    });
    document.getElementById('font-size-decrease').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        obj.set('fontSize', Math.max(8, (obj.fontSize || 24) - 2));
        document.getElementById('font-size').value = obj.fontSize;
        canvas.requestRenderAll();
    });
    document.getElementById('text-color').addEventListener('input', function() {
        updateTextProperty('fill', this.value);
    });
    document.getElementById('highlight-color').addEventListener('input', function() {
        updateTextProperty('backgroundColor', this.value);
    });
    document.getElementById('line-height').addEventListener('input', function() {
        updateTextProperty('lineHeight', parseFloat(this.value));
    });
    document.getElementById('letter-spacing').addEventListener('input', function() {
        updateTextProperty('charSpacing', parseFloat(this.value) * 10);
    });
    document.getElementById('text-opacity').addEventListener('input', function() {
        updateTextProperty('opacity', parseFloat(this.value));
    });
    document.getElementById('text-transform').addEventListener('change', function() {
        updateTextProperty('textTransform', this.value);
        const obj = getActiveText();
        if (obj) {
            if (this.value === 'uppercase') obj.set('text', obj.text.toUpperCase());
            else if (this.value === 'lowercase') obj.set('text', obj.text.toLowerCase());
            else if (this.value === 'capitalize') obj.set('text', obj.text.replace(/\b\w/g, c => c.toUpperCase()));
            canvas.requestRenderAll();
        }
    });
    document.getElementById('text-bold').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        obj.set('fontWeight', (obj.fontWeight === 'bold' || obj.fontWeight === 700) ? 'normal' : 'bold');
        canvas.requestRenderAll();
        showToolbarForText(obj);
    });
    document.getElementById('text-italic').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
        canvas.requestRenderAll();
        showToolbarForText(obj);
    });
    document.getElementById('text-underline').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        obj.set('underline', !obj.underline);
        canvas.requestRenderAll();
        showToolbarForText(obj);
    });
    document.getElementById('text-strikethrough').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        obj.set('linethrough', !obj.linethrough);
        canvas.requestRenderAll();
        showToolbarForText(obj);
    });
    document.getElementById('align-left').addEventListener('click', function() {
        updateTextProperty('textAlign', 'left');
        showToolbarForText(getActiveText());
    });
    document.getElementById('align-center').addEventListener('click', function() {
        updateTextProperty('textAlign', 'center');
        showToolbarForText(getActiveText());
    });
    document.getElementById('align-right').addEventListener('click', function() {
        updateTextProperty('textAlign', 'right');
        showToolbarForText(getActiveText());
    });
    document.getElementById('align-justify').addEventListener('click', function() {
        updateTextProperty('textAlign', 'justify');
        showToolbarForText(getActiveText());
    });
    // Font weight buttons
    document.getElementById('font-weight-light').addEventListener('click', function() {
        updateTextProperty('fontWeight', 300);
        showToolbarForText(getActiveText());
    });
    document.getElementById('font-weight-regular').addEventListener('click', function() {
        updateTextProperty('fontWeight', 400);
        showToolbarForText(getActiveText());
    });
    document.getElementById('font-weight-bold').addEventListener('click', function() {
        updateTextProperty('fontWeight', 700);
        showToolbarForText(getActiveText());
    });
    // Shadow
    document.getElementById('text-shadow').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        if (obj.shadow) {
            obj.set('shadow', null);
        } else {
            obj.set('shadow', new fabric.Shadow({ color: '#333', blur: 4, offsetX: 2, offsetY: 2 }));
        }
        canvas.requestRenderAll();
    });
    // Outline
    document.getElementById('text-outline').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        if (obj.stroke && obj.strokeWidth > 0) {
            obj.set({ stroke: null, strokeWidth: 0 });
        } else {
            obj.set({ stroke: '#000', strokeWidth: 2 });
        }
        canvas.requestRenderAll();
    });
    // Duplicate
    document.getElementById('duplicate-text').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        obj.clone(function(clone) {
            clone.set({ left: obj.left + 30, top: obj.top + 30 });
            canvas.add(clone);
            canvas.setActiveObject(clone);
            canvas.requestRenderAll();
        });
    });
    // Delete
    document.getElementById('delete-text').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        canvas.remove(obj);
        hideToolbar();
        canvas.requestRenderAll();
    });
    // Layer management
    document.getElementById('bring-forward').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        canvas.bringForward(obj);
        canvas.requestRenderAll();
    });
    document.getElementById('send-backward').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        canvas.sendBackwards(obj);
        canvas.requestRenderAll();
    });
    // Hyperlink (prompt for URL)
    document.getElementById('add-link').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        const url = prompt('Enter hyperlink URL:', obj.hyperlink || '');
        if (url) {
            obj.hyperlink = url;
            obj.set('underline', true);
        } else {
            delete obj.hyperlink;
        }
        canvas.requestRenderAll();
    });
    // Bullet/numbered lists (toggle)
    document.getElementById('bullet-list').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        if (obj.text && obj.text.startsWith('\u2022 ')) {
            obj.set('text', obj.text.replace(/^\u2022 /gm, ''));
        } else {
            obj.set('text', obj.text.replace(/^/gm, '\u2022 '));
        }
        canvas.requestRenderAll();
    });
    document.getElementById('numbered-list').addEventListener('click', function() {
        const obj = getActiveText();
        if (!obj) return;
        if (/^\d+\. /.test(obj.text)) {
            obj.set('text', obj.text.replace(/^\d+\. /gm, ''));
        } else {
            obj.set('text', obj.text.split(/\r?\n/).map((line, i) => (i+1)+'. '+line.replace(/^\d+\. /, '')).join('\n'));
        }
        canvas.requestRenderAll();
    });

    // When Add Text is clicked, select the new text and show toolbar
    const origAddText = window.addText;
    window.addText = function() {
        if (origAddText) origAddText();
        setTimeout(() => {
            const obj = getActiveText();
            if (obj) showToolbarForText(obj);
        }, 50);
    };

    // Patch: Ensure new text uses only a valid font name
    const origFabricIText = fabric.IText;
    fabric.IText = function(text, options) {
        if (options && options.fontFamily) {
            options.fontFamily = options.fontFamily.split(',')[0].trim();
        }
        return new origFabricIText(text, options);
    };

});
// Add shape by name for dropdown or panel
window.addShapeByName = function(name) {
    const shape = SHAPES.find(s => s.name === name);
    if (shape && window.fabricCanvas) {
        shape.create(window.fabricCanvas);
    }
};

// --- Shapes Panel Event Listeners ---
window.addEventListener('DOMContentLoaded', function() {
    const shapeBtns = document.querySelectorAll('.shape-btn');
    shapeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const shapeName = this.getAttribute('data-shape');
            if (shapeName && window.addShapeByName) {
                window.addShapeByName(shapeName);
            }
        });
    });
});
// --- Shape Definitions ---
const SHAPES = [
    { name: 'Rectangle', icon: '▭', create: (canvas) => {
            const rect = new fabric.Rect({ left: 100, top: 100, fill: '#10B981', width: 100, height: 60, rx: 8, ry: 8 });
            canvas.add(rect).setActiveObject(rect);
        }
    },
    { name: 'Circle', icon: '●', create: (canvas) => {
            const circ = new fabric.Circle({ left: 150, top: 150, fill: '#6366F1', radius: 40 });
            canvas.add(circ).setActiveObject(circ);
        }
    },
    { name: 'Triangle', icon: '▲', create: (canvas) => {
            const tri = new fabric.Triangle({ left: 200, top: 200, fill: '#F59E42', width: 80, height: 80 });
            canvas.add(tri).setActiveObject(tri);
        }
    },
    { name: 'Line', icon: '／', create: (canvas) => {
            const line = new fabric.Line([50, 50, 200, 50], { left: 120, top: 120, stroke: '#222', strokeWidth: 4 });
            canvas.add(line).setActiveObject(line);
        }
    },
    { name: 'Arrow', icon: '➔', create: (canvas) => {
            const arrow = new fabric.Polyline([
                { x: 0, y: 10 }, { x: 60, y: 10 }, { x: 60, y: 0 }, { x: 80, y: 20 },
                { x: 60, y: 40 }, { x: 60, y: 30 }, { x: 0, y: 30 }
            ], { left: 180, top: 180, fill: '#EF4444', stroke: '#EF4444', strokeWidth: 2 });
            canvas.add(arrow).setActiveObject(arrow);
        }
    },
    { name: 'Polygon', icon: '⬟', create: (canvas) => {
            const poly = new fabric.Polygon([
                { x: 50, y: 0 }, { x: 100, y: 38 }, { x: 81, y: 100 },
                { x: 19, y: 100 }, { x: 0, y: 38 }
            ], { left: 220, top: 220, fill: '#FBBF24' });
            canvas.add(poly).setActiveObject(poly);
        }
    },
    { name: 'Star', icon: '★', create: (canvas) => {
            // Simple 5-point star
            const points = [];
            const cx = 40, cy = 40, spikes = 5, outerRadius = 40, innerRadius = 18;
            let rot = Math.PI / 2 * 3, x = cx, y = cy, step = Math.PI / spikes;
            for (let i = 0; i < spikes; i++) {
                points.push({ x: cx + Math.cos(rot) * outerRadius, y: cy + Math.sin(rot) * outerRadius });
                rot += step;
                points.push({ x: cx + Math.cos(rot) * innerRadius, y: cy + Math.sin(rot) * innerRadius });
                rot += step;
            }
            points.push({ x: cx, y: cy - outerRadius });
            const star = new fabric.Polygon(points, { left: 260, top: 260, fill: '#F472B6' });
            canvas.add(star).setActiveObject(star);
        }
    },
    { name: 'Heart', icon: '♥', create: (canvas) => {
            const heart = new fabric.Path('M 272 216 C 272 216 272 176 312 176 C 352 176 352 216 352 216 C 352 256 312 296 312 296 C 312 296 272 256 272 216 Z', {
                left: 300, top: 300, fill: '#EC4899', scaleX: 0.3, scaleY: 0.3
            });
            canvas.add(heart).setActiveObject(heart);
        }
    },
    { name: 'Speech Bubble', icon: '💬', create: (canvas) => {
            const bubble = new fabric.Rect({ left: 340, top: 340, fill: '#60A5FA', width: 100, height: 60, rx: 20, ry: 20 });
            canvas.add(bubble).setActiveObject(bubble);
        }
    }
];


let canvas;
const historyStack = [];
let historyIndex = -1;



// --- Shirt View/Color State Management ---
// Use window globals only (set at top)
let baseColor = '#ffffff';
let selectedMockShirtId = null;
const productSelect = document.getElementById('catalog-product');
const startBtn = document.getElementById('start-customizing-btn');
const DEFAULT_PLACEHOLDER = '../assets/no-image.png';

function resolveAssetUrl(url) {
    if (!url || typeof url !== 'string') return '';

    const value = url.trim();
    if (!value) return '';

    // Convert absolute URLs that point to frontend assets into local relative paths.
    const frontendAssetMatch = value.match(/\/frontend\/assets\/([^/?#]+)$/i);
    if (frontendAssetMatch) {
        return `../assets/${frontendAssetMatch[1]}`;
    }

    const assetMatch = value.match(/\/assets\/([^/?#]+)$/i);
    if (assetMatch) {
        return `../assets/${assetMatch[1]}`;
    }

    return value;
}

function normalizeMockShirt(shirt) {
    if (!shirt || typeof shirt !== 'object') return shirt;

    const normalizedImages = Array.isArray(shirt.images)
        ? shirt.images.map(resolveAssetUrl).filter(Boolean)
        : [];

    return {
        ...shirt,
        imageUrl: resolveAssetUrl(shirt.imageUrl),
        images: normalizedImages
    };
}

const SAME_ORIGIN_API_BASE = (window.location.protocol.startsWith('http') && window.location.host)
    ? `${window.location.protocol}//${window.location.host}/api`
    : null;
const LOCAL_API_BASE = 'http://localhost:5000/api';

const API_BASE_CANDIDATES = Array.from(new Set(
    ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port && window.location.port !== '5000')
        ? [LOCAL_API_BASE, SAME_ORIGIN_API_BASE]
        : [SAME_ORIGIN_API_BASE, LOCAL_API_BASE]
)).filter(Boolean);

let resolvedApiBase = null;
window.printArea = null;
window.shirtImageData = null;

function isPixelOnShirt(x, y) {
    if (!window.shirtImageData) return true;
    x = Math.round(x);
    y = Math.round(y);
    const cw = window.fabricCanvas ? window.fabricCanvas.getWidth() : 600;
    const ch = window.fabricCanvas ? window.fabricCanvas.getHeight() : 500;
    if (x < 0 || x >= cw || y < 0 || y >= ch) return false;
    const index = (y * cw + x) * 4;
    return window.shirtImageData.data[index + 3] > 10;
}

function findNearestShirtPixel(targetX, targetY) {
    targetX = Math.round(targetX);
    targetY = Math.round(targetY);
    
    if (isPixelOnShirt(targetX, targetY)) {
        return { x: targetX, y: targetY };
    }
    
    const cw = window.fabricCanvas ? window.fabricCanvas.getWidth() : 600;
    const ch = window.fabricCanvas ? window.fabricCanvas.getHeight() : 500;
    const maxRadius = Math.max(cw, ch);
    
    for (let r = 1; r < maxRadius; r++) {
        for (let i = -r; i <= r; i++) {
            if (isPixelOnShirt(targetX + i, targetY - r)) return { x: targetX + i, y: targetY - r };
            if (isPixelOnShirt(targetX + i, targetY + r)) return { x: targetX + i, y: targetY + r };
        }
        for (let i = -r + 1; i < r; i++) {
            if (isPixelOnShirt(targetX - r, targetY + i)) return { x: targetX - r, y: targetY + i };
            if (isPixelOnShirt(targetX + r, targetY + i)) return { x: targetX + r, y: targetY + i };
        }
    }
    
    return { x: cw / 2, y: ch / 2 };
}

function analyzeShirtImage(imgElement) {
    if (!window.fabricCanvas) return;
    const cw = window.fabricCanvas.getWidth();
    const ch = window.fabricCanvas.getHeight();
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cw;
    tempCanvas.height = ch;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.drawImage(imgElement, 0, 0, cw, ch);
    
    window.shirtImageData = tempCtx.getImageData(0, 0, cw, ch);
    
    let minX = cw;
    let maxX = 0;
    let minY = ch;
    let maxY = 0;
    
    const data = window.shirtImageData.data;
    for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
            const alpha = data[(y * cw + x) * 4 + 3];
            if (alpha > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    
    if (minX <= maxX && minY <= maxY) {
        window.printArea = {
            left: minX,
            top: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    } else {
        window.printArea = {
            left: 0,
            top: 0,
            width: cw,
            height: ch
        };
    }
    console.log('Calculated dynamic shirt print area:', window.printArea);
}

function getDefaultPrintArea() {
    const cw = window.fabricCanvas ? window.fabricCanvas.getWidth() : 600;
    const ch = window.fabricCanvas ? window.fabricCanvas.getHeight() : 500;
    return window.printArea || {
        left: 0,
        top: 0,
        width: cw,
        height: ch
    };
}

function keepObjectInsidePrintArea(obj) {
    if (!obj || obj._shirtObject || !window.printArea) return;
    obj.setCoords();
    const bounds = obj.getBoundingRect(true, true);
    let dx = 0;
    let dy = 0;
    const maxX = window.printArea.left + window.printArea.width;
    const maxY = window.printArea.top + window.printArea.height;

    if (bounds.left < window.printArea.left) dx = window.printArea.left - bounds.left;
    if (bounds.top < window.printArea.top) dy = window.printArea.top - bounds.top;
    if (bounds.left + bounds.width > maxX) dx = maxX - (bounds.left + bounds.width);
    if (bounds.top + bounds.height > maxY) dy = maxY - (bounds.top + bounds.height);

    if (dx || dy) {
        obj.left += dx;
        obj.top += dy;
        obj.setCoords();
    }
    
    if (window.shirtImageData) {
        const currentBounds = obj.getBoundingRect(true, true);
        const cx = currentBounds.left + currentBounds.width / 2;
        const cy = currentBounds.top + currentBounds.height / 2;
        
        if (!isPixelOnShirt(cx, cy)) {
            const nearest = findNearestShirtPixel(cx, cy);
            obj.left += (nearest.x - cx);
            obj.top += (nearest.y - cy);
            obj.setCoords();
        }
    }
}

function applyPrintStyle(obj) {
    if (!obj) return;
    obj.set({
        // Render artwork with true colors; fabric realism is handled by light overlays.
        globalCompositeOperation: 'source-atop',
        opacity: 0.96,
        shadow: new fabric.Shadow({
            color: 'rgba(0,0,0,0.08)',
            blur: 2,
            offsetX: 0,
            offsetY: 1
        })
    });
}

function createPrintAgingOverlay(area) {
    const overlay = new fabric.Rect({
        left: area.left,
        top: area.top,
        width: area.width,
        height: area.height,
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false,
        rx: 16,
        ry: 16,
        fill: new fabric.Gradient({
            type: 'linear',
            gradientUnits: 'pixels',
            coords: {
                x1: area.left,
                y1: area.top,
                x2: area.left,
                y2: area.top + area.height
            },
            colorStops: [
                { offset: 0, color: 'rgba(255,255,255,0.16)' },
                { offset: 0.45, color: 'rgba(255,255,255,0.04)' },
                { offset: 1, color: 'rgba(0,0,0,0.07)' }
            ]
        }),
        globalCompositeOperation: 'soft-light',
        visible: false,
        _shirtObject: true,
        _printAgingOverlay: true
    });
    return overlay;
}

function bringShirtOverlayToFront() {
    if (!window.fabricCanvas) return;
    const hasDesign = window.fabricCanvas.getObjects().some(obj => !obj._shirtObject);
    const aging = window.fabricCanvas.getObjects().find(obj => obj._printAgingOverlay);
    if (aging) {
        aging.visible = hasDesign;
        if (hasDesign) window.fabricCanvas.bringToFront(aging);
    }
    const overlay = window.fabricCanvas.getObjects().find(obj => obj._shirtOverlay);
    if (overlay) {
        overlay.visible = hasDesign;
        if (hasDesign) window.fabricCanvas.bringToFront(overlay);
    }
}

function makeImageBackgroundTransparent(imageElement) {
    try {
        const w = imageElement.naturalWidth || imageElement.width;
        const h = imageElement.naturalHeight || imageElement.height;
        if (!w || !h) return null;

        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const ctx = off.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(imageElement, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const px = imgData.data;

        // Estimate dominant background color from corners.
        const cornerSamples = [
            [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
            [Math.floor(w * 0.05), Math.floor(h * 0.05)],
            [Math.floor(w * 0.95), Math.floor(h * 0.05)],
            [Math.floor(w * 0.05), Math.floor(h * 0.95)],
            [Math.floor(w * 0.95), Math.floor(h * 0.95)]
        ];

        let br = 0, bg = 0, bb = 0, count = 0;
        for (const [x, y] of cornerSamples) {
            const i = (y * w + x) * 4;
            br += px[i];
            bg += px[i + 1];
            bb += px[i + 2];
            count++;
        }
        br /= count;
        bg /= count;
        bb /= count;

        const threshold = 70;
        for (let i = 0; i < px.length; i += 4) {
            const dr = px[i] - br;
            const dg = px[i + 1] - bg;
            const db = px[i + 2] - bb;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);

            if (dist < threshold) {
                // Soft fade near background color, hard remove near exact background.
                const fade = Math.max(0, Math.min(1, dist / threshold));
                px[i + 3] = Math.round(px[i + 3] * fade * 0.35);
            }
        }

        // Feather outer border slightly to avoid sticker-like hard edges.
        const feather = Math.max(2, Math.round(Math.min(w, h) * 0.015));
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const edgeDist = Math.min(x, y, w - 1 - x, h - 1 - y);
                if (edgeDist < feather) {
                    const i = (y * w + x) * 4;
                    const a = edgeDist / feather;
                    px[i + 3] = Math.round(px[i + 3] * a);
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
        return off.toDataURL('image/png');
    } catch (err) {
        console.warn('Background cleanup skipped:', err);
        return null;
    }
}

function softenImageCornersDataURL(imageElement) {
    try {
        const w = imageElement.naturalWidth || imageElement.width;
        const h = imageElement.naturalHeight || imageElement.height;
        if (!w || !h) return null;

        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const ctx = off.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(imageElement, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const px = imgData.data;

        // Feather all sides, with stronger effect near corners.
        const edgeFeather = Math.max(8, Math.round(Math.min(w, h) * 0.08));
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                const dLeft = x;
                const dTop = y;
                const dRight = w - 1 - x;
                const dBottom = h - 1 - y;
                const edgeDist = Math.min(dLeft, dTop, dRight, dBottom);

                if (edgeDist < edgeFeather) {
                    const t = edgeDist / edgeFeather;
                    // Quadratic easing for softer falloff.
                    const alphaFactor = t * t;
                    px[i + 3] = Math.round(px[i + 3] * alphaFactor);
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
        return off.toDataURL('image/png');
    } catch (err) {
        console.warn('Corner softening skipped:', err);
        return null;
    }
}

function recolorDesignImageFromOriginal(activeImage, hexColor, strength) {
    if (!activeImage || activeImage.type !== 'image') return;
    
    // Save properties on the object so they persist
    activeImage.lastTintColor = hexColor;
    activeImage.lastTintStrength = strength;

    const srcEl = activeImage._originalElement || activeImage._element;
    if (!srcEl) return;

    const origW = activeImage._originalWidth || srcEl.naturalWidth || srcEl.width;
    const origH = activeImage._originalHeight || srcEl.naturalHeight || srcEl.height;
    if (!origW || !origH) return;

    // Compute invariant scale factors relative to original loaded dimensions.
    // This is asynchronous-safe and prevents race conditions from corrupting aspect ratio when dragging color picker.
    const scaleFactorX = (activeImage.width * activeImage.scaleX) / origW;
    const scaleFactorY = (activeImage.height * activeImage.scaleY) / origH;

    let w = origW;
    let h = origH;

    // If it's a vector image or low-resolution image, scale it up to a high resolution (e.g. 1024px max dimension)
    // so that it remains sharp and crisp when recolored and rendered on the t-shirt.
    const targetMax = 1024;
    const currentMax = Math.max(w, h);
    if (currentMax < targetMax) {
        const scale = targetMax / currentMax;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
    }

    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(srcEl, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const px = imgData.data;
    const tr = parseInt(hexColor.slice(1, 3), 16);
    const tg = parseInt(hexColor.slice(3, 5), 16);
    const tb = parseInt(hexColor.slice(5, 7), 16);
    const s = Math.max(0, Math.min(1, strength));

    for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const a = px[i + 3];
        if (a === 0) continue;

        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const mask = 1 - luminance; // recolor dark lines strongly, preserve whites
        const amount = s * mask;

        px[i] = Math.round(r * (1 - amount) + tr * amount);
        px[i + 1] = Math.round(g * (1 - amount) + tg * amount);
        px[i + 2] = Math.round(b * (1 - amount) + tb * amount);
    }

    ctx.putImageData(imgData, 0, 0);
    const recoloredDataUrl = off.toDataURL('image/png');
    activeImage.setSrc(recoloredDataUrl, () => {
        // Adjust scale to maintain the exact same visual size based on closure-captured invariant scale factors
        activeImage.set({
            scaleX: (scaleFactorX * origW) / activeImage.width,
            scaleY: (scaleFactorY * origH) / activeImage.height
        });
        activeImage.dirty = true;
        activeImage.canvas && activeImage.canvas.requestRenderAll();
    }, { crossOrigin: 'anonymous' });
}

async function apiFetch(path, options = {}) {
    const bases = resolvedApiBase
        ? [resolvedApiBase, ...API_BASE_CANDIDATES.filter(base => base !== resolvedApiBase)]
        : API_BASE_CANDIDATES;

    let lastError = null;

    for (const base of bases) {
        try {
            const res = await fetch(`${base}${path}`, options);
            if (res.ok) {
                resolvedApiBase = base;
                return res;
            }

            if (res.status === 404) {
                lastError = new Error(`API endpoint not found at ${base}${path}`);
                continue;
            }

            return res;
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError || new Error('Unable to reach API');
}

// Toolbar bindings for rotate and shirt color
window.addEventListener('DOMContentLoaded', function() {
    const rotateBtn = document.getElementById('rotate-view-btn');
    if (rotateBtn) {
        rotateBtn.addEventListener('click', function() {
            handleRotateView();
        });
    }
    const colorInput = document.getElementById('shirt-color-picker');
    if (colorInput && !colorInput.dataset.bound) {
        colorInput.dataset.bound = '1';
        colorInput.value = baseColor;
        colorInput.addEventListener('input', function(e) {
            baseColor = e.target.value;
            const c = window.fabricCanvas || canvas;
            if (!c) return;
            const shirtGroup = c.getObjects().find(obj => obj._shirtObject && obj.type === 'group');
            if (shirtGroup) {
                const tintImg = shirtGroup.item(1);
                const blendFilter = tintImg && Array.isArray(tintImg.filters)
                    ? tintImg.filters.find(f => f && f.type === 'BlendColor')
                    : null;
                if (blendFilter) {
                    blendFilter.color = baseColor;
                    tintImg.applyFilters();
                    c.requestRenderAll();
                    return;
                }
            }
            renderShirtView();
        });
    }
});


window.addEventListener('DOMContentLoaded', () => {
    try {
        productSelect.innerHTML = '<option value="" selected disabled>Loading shirts...</option>';
        apiFetch('/mockshirts')
            .then(res => res.json())
            .then(payload => {
                const list = Array.isArray(payload)
                    ? payload
                    : (Array.isArray(payload.data) ? payload.data : []);
                window.mockShirts = list.map(normalizeMockShirt);
                if (!window.mockShirts.length) {
                    productSelect.innerHTML = '<option value="" selected disabled>No shirts found</option>';
                    return;
                }
                productSelect.innerHTML = '<option value="" selected disabled>Select a shirt</option>';
                window.mockShirts.forEach(shirt => {
                    const opt = document.createElement('option');
                    opt.value = shirt._id;
                    const shirtName = shirt.name || shirt.title || 'Shirt';
                    const shirtType = shirt.type || shirt.category || 'Custom';
                    opt.textContent = `${shirtName} (${shirtType}) - Rs ${shirt.price}`;
                    productSelect.appendChild(opt);
                });
            })
            .catch(err => {
                productSelect.innerHTML = '<option value="" selected disabled>Error loading shirts</option>';
                console.error('MockShirt fetch error:', err);
            });
    } catch (err) {
        productSelect.innerHTML = '<option value="" selected disabled>Error loading shirts</option>';
        console.error('MockShirt fetch error:', err);
    }
});


productSelect.addEventListener('change', function() {
    selectedMockShirtId = this.value;
    startBtn.disabled = !selectedMockShirtId;
});



startBtn.addEventListener('click', () => {
    if (!selectedMockShirtId) return;
    apiFetch(`/mockshirts/${selectedMockShirtId}`)
        .then(res => res.json())
        .then(payload => {
            const mockShirt = normalizeMockShirt(payload && payload.data ? payload.data : payload);
            // Expect mockShirt.images: [front, back, left, right]
            window.shirtImages = Array.isArray(mockShirt.images) ? mockShirt.images : [mockShirt.imageUrl || DEFAULT_PLACEHOLDER];
            window.currentView = 0;
            baseColor = '#ffffff';
            showDesignStudio(mockShirt);
            renderShirtView();
        })
        .catch(err => {
            alert('Error loading shirt details.');
            console.error('MockShirt details fetch error:', err);
        });
});


function setupCanvasEvents(canvasObj) {
    if (!canvasObj || canvasObj._eventsRegistered) return;
    canvasObj._eventsRegistered = true;
    
    canvasObj.on('object:moving', function(e) {
        keepObjectInsidePrintArea(e.target);
    });
    canvasObj.on('object:scaling', function(e) {
        keepObjectInsidePrintArea(e.target);
    });
    canvasObj.on('object:rotating', function(e) {
        keepObjectInsidePrintArea(e.target);
    });
    canvasObj.on('object:added', function(e) {
        const obj = e.target;
        if (obj && !obj._shirtObject) {
            obj.globalCompositeOperation = 'source-atop';
        }
    });
}

function showDesignStudio(mockShirt) {
    document.getElementById('customize-stepper').style.display = 'none';
    document.getElementById('design-studio').style.display = 'block';
    document.getElementById('product-selected-display').value = mockShirt.name || '';
    
    if (!window.fabricCanvas) {
        window.fabricCanvas = new fabric.Canvas('main-canvas', {
            backgroundColor: 'transparent',
            width: 600,
            height: 500,
            preserveObjectStacking: true
        });
    }
    
    setupCanvasEvents(window.fabricCanvas);
    canvas = window.fabricCanvas;
    
    const imgUpload = document.getElementById('image-upload');
    if (imgUpload && !imgUpload.dataset.bound) {
        imgUpload.dataset.bound = '1';
        imgUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                fabric.Image.fromURL(event.target.result, (img) => {
                    if (img) {
                        img._originalWidth = img.width;
                        img._originalHeight = img.height;
                        img._originalElement = img._element;
                        img._originalSrc = event.target.result;
                        const area = window.printArea || getDefaultPrintArea();
                        const maxW = area.width * 0.85;
                        const maxH = area.height * 0.85;
                        const scale = Math.min(maxW / img.width, maxH / img.height);
                        img.scale(scale);
                        img.set({
                            left: area.left + (area.width - img.getScaledWidth()) / 2,
                            top: area.top + (area.height - img.getScaledHeight()) / 2
                        });
                        applyPrintStyle(img);
                        keepObjectInsidePrintArea(img);
                        window.fabricCanvas.add(img);
                        window.fabricCanvas.setActiveObject(img);
                        bringShirtOverlayToFront();
                        window.fabricCanvas.renderAll();
                        saveHistory();
                    } else {
                        alert('Failed to load uploaded image.');
                    }
                });
            };
            reader.readAsDataURL(file);
        });
    }
}

// --- Shirt View/Color Logic ---
function renderShirtView() {
    if (!window.fabricCanvas) return;
    window.printArea = getDefaultPrintArea();
    // Clear canvas
    window.fabricCanvas.clear();
    // Load current shirt image as a selectable object (like a shape)
    const imgUrl = window.shirtImages[window.currentView] || DEFAULT_PLACEHOLDER;
    fabric.Image.fromURL(imgUrl, function(img) {
        if (!img) return;

        const imgElement = img.getElement();
        if (imgElement.complete) {
            analyzeShirtImage(imgElement);
        } else {
            imgElement.onload = function() {
                analyzeShirtImage(imgElement);
                window.fabricCanvas.renderAll();
            };
        }

        img.set({
            left: 0,
            top: 0,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            scaleX: window.fabricCanvas.width / img.width,
            scaleY: window.fabricCanvas.height / img.height,
            _shirtObject: true,
            globalCompositeOperation: 'source-over'
        });
        // Build shirt-only color tint layer (no full-canvas rectangle).
        img.clone(function(tintImg) {
            tintImg.set({
                left: img.left,
                top: img.top,
                scaleX: img.scaleX,
                scaleY: img.scaleY,
                selectable: false,
                evented: false,
                _shirtObject: true,
                _shirtTint: true
            });

            const BlendColor = fabric?.Image?.filters?.BlendColor;
            if (BlendColor) {
                tintImg.filters = [
                    new BlendColor({
                        color: baseColor,
                        mode: 'tint',
                        alpha: 0.65
                    })
                ];
                tintImg.applyFilters();
            } else {
                tintImg.opacity = 0;
            }

            // Group base shirt + tint image so only shirt pixels are colored.
            const shirtGroup = new fabric.Group([img, tintImg], {
                left: 0,
                top: 0,
                selectable: true,
                evented: true,
                hasControls: true,
                hasBorders: true,
                _shirtObject: true
            });
            window.fabricCanvas.add(shirtGroup);
            window.fabricCanvas.sendToBack(shirtGroup);

            // Top shading layer makes print feel embedded into fabric.
            img.clone(function(overlayImg) {
                overlayImg.set({
                    left: img.left,
                    top: img.top,
                    scaleX: img.scaleX,
                    scaleY: img.scaleY,
                    selectable: false,
                    evented: false,
                    hasControls: false,
                    hasBorders: false,
                    opacity: 0.12,
                    globalCompositeOperation: 'multiply',
                    _shirtObject: true,
                    _shirtOverlay: true
                });
                window.fabricCanvas.add(overlayImg);
                bringShirtOverlayToFront();
                window.fabricCanvas.requestRenderAll();
            });
            // Restore user design for this view (if any)
            const state = window.designStates[window.currentView];
            if (state) {
                try {
                    const userObjects = JSON.parse(state);
                    fabric.util.enlivenObjects(userObjects, function(enlivenedObjects) {
                        enlivenedObjects.forEach(obj => window.fabricCanvas.add(obj));
                        window.fabricCanvas.sendToBack(shirtGroup);
                        bringShirtOverlayToFront();
                        window.fabricCanvas.renderAll();
                    });
                } catch (e) {
                    bringShirtOverlayToFront();
                    window.fabricCanvas.renderAll();
                }
            } else {
                bringShirtOverlayToFront();
                window.fabricCanvas.renderAll();
            }
        });
    }, { crossOrigin: 'anonymous' });
}

// Update shirt color from color picker
const colorInput = document.getElementById('shirt-color-picker');
if (colorInput && !colorInput.dataset.bound) {
    colorInput.dataset.bound = '1';
    colorInput.addEventListener('input', function(e) {
        baseColor = e.target.value;
        // If shirt group exists, update shirt-only tint layer directly
        const shirtGroup = window.fabricCanvas.getObjects().find(obj => obj._shirtObject);
        if (shirtGroup && shirtGroup.type === 'group') {
            const tintImg = shirtGroup.item(1);
            const blendFilter = tintImg && Array.isArray(tintImg.filters)
                ? tintImg.filters.find(f => f && f.type === 'BlendColor')
                : null;
            if (blendFilter) {
                blendFilter.color = baseColor;
                tintImg.applyFilters();
                window.fabricCanvas.requestRenderAll();
            } else {
                renderShirtView();
            }
        } else {
            renderShirtView();
        }
    });
}
// Update customization document in DB after design actions
function updateCustomizationDoc() {
    if (!customizationId && canvas) return;
    apiFetch(`/customizations/${customizationId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': 'Bearer ...' // If using auth
        },
        body: JSON.stringify({
            design_data: canvas.toJSON()
        })
    });
}

// Add Text
function addText() {
    if (!canvas) {
        alert('Canvas not initialized');
        return;
    }

    const text = new fabric.IText('Enter text here', {
        left: 150,
        top: 80,
        fontSize: 24,
        fill: '#000000',
        fontFamily: 'Arial', // Only a valid single font name
        selectable: true,
        editable: true,
        hasControls: true,
        hasBorders: true
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveHistory();
    console.log('Text added:', text);

}
// Add Rectangle
function addRect() {
    if (!canvas) {
        alert('Canvas not initialized');
        return;
    }

    const rect = new fabric.Rect({
        left: 150,
        top: 80,
        width: 150,
        height: 100,
        fill: '#10B981',
        stroke: '#059669',
        strokeWidth: 2,
        selectable: true
    });
    
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    saveHistory();

}
// Add Circle
function addCircle() {
    if (!canvas) {
        alert('Canvas not initialized');
        return;
    }

    const circle = new fabric.Circle({
        left: 200,
        top: 80,
        radius: 50,
        fill: '#10B981',
        stroke: '#059669',
        strokeWidth: 2,
        selectable: true
    });
    
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
    saveHistory();
}

// Upload Image
function triggerUpload() {
    document.getElementById('image-upload').click();
}

// Delete Selected Object
function deleteObject() {
    if (!canvas) return;
    
    const active = canvas.getActiveObject();
    if (active) {
        canvas.remove(active);
        canvas.renderAll();
        saveHistory();
    }
}

// Update Font Size
function updateFontSize() {
    if (!canvas) return;
    
    const active = canvas.getActiveObject();
    if (active && (active.type === 'text' || active.type === 'i-text')) {
        active.fontSize = parseInt(document.getElementById('font-size-input').value);
        canvas.renderAll();
        saveHistory();
    }
}

// Update Color
function updateColor() {
    if (!canvas) return;
    
    const active = canvas.getActiveObject();
    const color = document.getElementById('fill-color').value;
    if (active) {
        active.set({ fill: color });
        document.getElementById('color-hex').value = color;
        canvas.renderAll();
        saveHistory();
    }
}

// Update Color Hex
function updateColorHex() {
    if (!canvas) return;
    
    const active = canvas.getActiveObject();
    const color = document.getElementById('color-hex').value;
    if (active) {
        active.set({ fill: color });
        document.getElementById('fill-color').value = color;
        canvas.renderAll();
        saveHistory();
    }
}

// Update Opacity
function updateOpacity() {
    if (!canvas) return;
    
    const active = canvas.getActiveObject();
    if (active) {
        active.set({ opacity: parseFloat(document.getElementById('opacity').value) });
        canvas.renderAll();
        saveHistory();
    }
}

// Update Position
function updatePosition() {
    if (!canvas) return;
    
    const active = canvas.getActiveObject();
    if (active) {
        active.set({
            left: parseInt(document.getElementById('pos-x').value) || 0,
            top: parseInt(document.getElementById('pos-y').value) || 0
        });
        canvas.renderAll();
        saveHistory();
    }
}

// Update Dimensions
function updateDimensions() {
    if (!canvas) return;
    
    const active = canvas.getActiveObject();
    if (active) {
        if (active.type === 'circle') {
            active.set({ radius: parseInt(document.getElementById('obj-width').value) / 2 });
        } else {
            active.set({
                width: parseInt(document.getElementById('obj-width').value) || active.width,
                height: parseInt(document.getElementById('obj-height').value) || active.height
            });
        }
        canvas.renderAll();
        saveHistory();
    }
}

// Floating Shape Properties Sidebar logic
function updateProperties() {
    const c = window.fabricCanvas || canvas;
    if (!c) return;
    const sidebar = document.getElementById('shape-properties-sidebar');
    const penProps = document.getElementById('pen-properties');
    const designTintGroup = document.getElementById('design-tint-group');
    if (!sidebar) return;
    const active = c.getActiveObject();
    const isShape = !!(active && (active.type === 'rect' || active.type === 'circle' || active.type === 'triangle' || active.type === 'polygon' || active.type === 'line' || active.type === 'ellipse'));
    const isDesignImage = !!(active && active.type === 'image' && !active._shirtObject);
    const shapeGroups = [
        document.getElementById('shape-fill-color')?.closest('.prop-group'),
        document.getElementById('shape-width')?.closest('.prop-group'),
        document.getElementById('shape-height')?.closest('.prop-group'),
        document.getElementById('shape-shadow-enable')?.closest('.prop-group'),
        document.getElementById('shape-blend-mode')?.closest('.prop-group'),
        document.getElementById('shape-gradient-enable')?.closest('.prop-group')
    ].filter(Boolean);
    // Show pen properties if pen mode is active
    if (isPenMode) {
        sidebar.style.display = 'flex';
        penProps.style.display = 'block';
        shapeGroups.forEach(group => { group.style.display = 'none'; });
        if (designTintGroup) designTintGroup.style.display = 'none';
    } else if (isShape || isDesignImage) {
        sidebar.style.display = 'flex';
        penProps.style.display = 'none';
        shapeGroups.forEach(group => { group.style.display = isShape ? '' : 'none'; });
        if (designTintGroup) designTintGroup.style.display = isDesignImage ? '' : 'none';
        if (isDesignImage) {
            const tintColorInput = document.getElementById('design-tint-color');
            const tintStrengthInput = document.getElementById('design-tint-strength');
            if (tintColorInput) tintColorInput.value = active.lastTintColor || '#ffffff';
            if (tintStrengthInput) tintStrengthInput.value = typeof active.lastTintStrength === 'number' ? active.lastTintStrength : 0.6;
        }
    } else {
        sidebar.style.display = 'none';
        penProps.style.display = 'none';
    }
}

// Event listeners for shape sidebar
window.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('shape-properties-sidebar');
    if (!sidebar) return;
    const tintColorInput = document.getElementById('design-tint-color');
    const tintStrengthInput = document.getElementById('design-tint-strength');

    function applyImageTintFromControls() {
        const c = window.fabricCanvas || canvas;
        if (!c) return;
        const active = c.getActiveObject();
        if (!active || active.type !== 'image' || active._shirtObject) return;
        const color = tintColorInput ? tintColorInput.value : '#ffffff';
        const alpha = tintStrengthInput ? parseFloat(tintStrengthInput.value) : 0;
        recolorDesignImageFromOriginal(active, color, alpha);
    }

    if (tintColorInput) {
        tintColorInput.addEventListener('input', applyImageTintFromControls);
        tintColorInput.addEventListener('change', applyImageTintFromControls);
    }
    if (tintStrengthInput) {
        tintStrengthInput.addEventListener('input', applyImageTintFromControls);
        tintStrengthInput.addEventListener('change', applyImageTintFromControls);
    }

    document.getElementById('shape-fill-color').addEventListener('input', function() {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (active) {
            if ('fill' in active) active.set({ fill: this.value });
            if ('stroke' in active) active.set({ stroke: this.value });
            canvas.renderAll();
        }
    });

    // Shadow controls
    const shadowEnable = document.getElementById('shape-shadow-enable');
    const shadowControls = document.getElementById('shape-shadow-controls');
    shadowEnable.addEventListener('change', function() {
        shadowControls.style.display = this.checked ? 'block' : 'none';
        applyShadow();
    });
    ['shape-shadow-color','shape-shadow-blur','shape-shadow-offset-x','shape-shadow-offset-y'].forEach(id => {
        document.getElementById(id).addEventListener('input', applyShadow);
    });
    function applyShadow() {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active) return;
        if (shadowEnable.checked) {
            active.set('shadow', {
                color: document.getElementById('shape-shadow-color').value,
                blur: parseInt(document.getElementById('shape-shadow-blur').value),
                offsetX: parseInt(document.getElementById('shape-shadow-offset-x').value),
                offsetY: parseInt(document.getElementById('shape-shadow-offset-y').value)
            });
        } else {
            active.set('shadow', null);
        }
        canvas.renderAll();
    }

    // Blend mode
    document.getElementById('shape-blend-mode').addEventListener('change', function() {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (active) {
            active.set('globalCompositeOperation', this.value);
            canvas.renderAll();
        }
    });

    // Gradient controls
    const gradientEnable = document.getElementById('shape-gradient-enable');
    const gradientControls = document.getElementById('shape-gradient-controls');
    gradientEnable.addEventListener('change', function() {
        gradientControls.style.display = this.checked ? 'block' : 'none';
        applyGradient();
    });
    ['shape-gradient-start','shape-gradient-end','shape-gradient-angle'].forEach(id => {
        document.getElementById(id).addEventListener('input', applyGradient);
    });
    function applyGradient() {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active) return;
        if (gradientEnable.checked) {
            const angle = parseInt(document.getElementById('shape-gradient-angle').value) || 0;
            const startColor = document.getElementById('shape-gradient-start').value;
            const endColor = document.getElementById('shape-gradient-end').value;
            const radians = angle * Math.PI / 180;
            const x1 = 0.5 + 0.5 * Math.cos(radians);
            const y1 = 0.5 + 0.5 * Math.sin(radians);
            const x2 = 0.5 - 0.5 * Math.cos(radians);
            const y2 = 0.5 - 0.5 * Math.sin(radians);
            active.set('fill', new fabric.Gradient({
                type: 'linear',
                coords: {
                    x1: x1 * active.width,
                    y1: y1 * active.height,
                    x2: x2 * active.width,
                    y2: y2 * active.height
                },
                colorStops: [
                    { offset: 0, color: startColor },
                    { offset: 1, color: endColor }
                ]
            }));
        } else {
            // Restore to solid fill
            document.getElementById('shape-fill-color').dispatchEvent(new Event('input'));
        }
        canvas.renderAll();
    }
    document.getElementById('shape-width').addEventListener('change', function() {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (active) {
            if (active.type === 'circle') {
                active.set({ radius: parseInt(this.value) / 2 });
            } else {
                active.set({ width: parseInt(this.value) });
            }
            canvas.renderAll();
        }
    });
    document.getElementById('shape-height').addEventListener('change', function() {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (active) {
            if (active.type === 'circle') {
                active.set({ radius: parseInt(this.value) / 2 });
            } else {
                active.set({ height: parseInt(this.value) });
            }
            canvas.renderAll();
        }
    });
    document.getElementById('close-shape-sidebar').addEventListener('click', function() {
        sidebar.style.display = 'none';
        canvas.discardActiveObject();
        canvas.renderAll();
    });
});

// History Management
function saveHistory() {
    if (!canvas) return;
    
    historyIndex++;
    historyStack[historyIndex] = JSON.stringify(canvas.toJSON());
    historyStack.length = historyIndex + 1;
}

function undo() {
    if (!canvas || historyIndex <= 0) return;
    
    historyIndex--;
    canvas.loadFromJSON(historyStack[historyIndex], () => {
        canvas.renderAll();
    });
}

// --- Toggle Design Panel Visibility ---
function toggleDesignPanel() {
    const panel = document.getElementById('design-recommendations');
    if (panel) {
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }
}

function redo() {
    if (!canvas || historyIndex >= historyStack.length - 1) return;
    
    historyIndex++;
    canvas.loadFromJSON(historyStack[historyIndex], () => {
        canvas.renderAll();
    });
}

// Save Design
function saveDesign() {
    if (!window.fabricCanvas) return;
    const designName = document.getElementById('design-name').value || 'shirtify-design';
    const designData = window.fabricCanvas.toJSON();
    // Save to localStorage (PC)
    localStorage.setItem(`design_${designName}`, JSON.stringify(designData));

    // Add watermark text
    const watermark = new fabric.Text('Shirtify', {
        fontSize: 36,
        fill: 'rgba(0,0,0,0.2)',
        fontWeight: 'bold',
        left: window.fabricCanvas.width / 2,
        top: window.fabricCanvas.height - 50,
        originX: 'center',
        selectable: false,
        evented: false,
        angle: -20
    });
    window.fabricCanvas.add(watermark);
    window.fabricCanvas.bringToFront(watermark);
    window.fabricCanvas.renderAll();

    // Export as PNG
    const dataURL = window.fabricCanvas.toDataURL({ format: 'png', quality: 1 });
    // Remove watermark after export
    window.fabricCanvas.remove(watermark);
    window.fabricCanvas.renderAll();

    // Trigger download (save to PC)
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `${designName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // --- Save to database (POST to /api/customizations) ---
    // Get selected shirt ID and size from UI
    const original_product_id = window.selectedMockShirtId || (typeof selectedMockShirtId !== 'undefined' ? selectedMockShirtId : null);
    const size = document.getElementById('size-selected-display') ? document.getElementById('size-selected-display').value : '';
    if (!original_product_id) {
        alert('No shirt selected. Please select a shirt before saving to your account.');
        return;
    }
    // Get JWT token from localStorage
    const token = localStorage.getItem('shirtifyToken');
    if (!token) {
        alert('You must be logged in to save your design to your account.');
        return;
    }
    apiFetch('/customizations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            original_product_id,
            size,
            design_data: designData
            // base_image is intentionally omitted to avoid large payloads
        })
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to save design to database');
        return res.json();
    })
    .then(() => {
        alert(`Design \"${designName}\" saved to your PC and your account!`);
    })
    .catch(err => {
        alert('Design saved locally, but failed to save to database.');
        console.error(err);
    });
}

// Add to Cart
// Expose saveDesign and addCustomToCart globally for HTML onclick
window.saveDesign = saveDesign;
window.addCustomToCart = addCustomToCart;
window.toggleDesignPanel = toggleDesignPanel;
function addCustomToCart() {
    console.log('addCustomToCart called');
    const canvasInstance = window.canvas || window.fabricCanvas;
    if (!canvasInstance) {
        console.warn('Canvas not initialized');
        alert('Canvas not initialized. Please start customizing first.');
        return;
    }
    const designName = document.getElementById('design-name').value;
    const shirtName = document.getElementById('product-selected-display').value;
    const size = document.getElementById('size-selected-display').value;
    const designImage = canvasInstance.toDataURL('image/png');
    const designData = canvasInstance.toJSON();
    // You can add price logic if needed, for now set to 0
    const productPrice = 0;

    const customItem = {
        name: designName,
        shirt: shirtName,
        size: size,
        price: productPrice,
        image: designImage,
        designData: designData,
        timestamp: new Date().getTime()
    };

    let cart = JSON.parse(localStorage.getItem('customCart')) || [];
    cart.push(customItem);
    localStorage.setItem('customCart', JSON.stringify(cart));
    alert('Custom design added to cart!');
}

// --- Design Inspiration / Unsplash Integration ---

/**
 * Fetch design inspirations from reliable image service
 * @param {string} query - Search query (e.g., "anime hoodie")
 * @param {number} count - Number of images to fetch (default: 6)
 * @returns {Promise<Array>} Array of design objects with image URLs
 */
async function fetchUnsplashDesigns(query = 'design', count = 6) {
    const safeQuery = (query || 'design').trim();

    // Helper to generate Base64 SVG Data URLs safely in the browser
    function getSvgDataUrl(svgMarkup) {
        try {
            return 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgMarkup)));
        } catch (e) {
            console.error('Failed to encode SVG:', e);
            return '';
        }
    }

    const isDefaultQuery = safeQuery.toLowerCase() === 'shirt design' || safeQuery.toLowerCase() === 'design' || !safeQuery;

    const defaultDesigns = [
        {
            id: 'local-design-rocket',
            title: 'Neon Rocket',
            imageUrl: getSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,15 C50,15 65,35 65,55 C65,65 58,70 50,70 C42,70 35,65 35,55 C35,35 50,15 50,15 Z" fill="none" stroke="#10b981" stroke-width="4"/><path d="M35,60 C25,65 20,75 20,85 C35,85 40,75 42,70" fill="none" stroke="#10b981" stroke-width="3"/><path d="M65,60 C75,65 80,75 80,85 C65,85 60,75 58,70" fill="none" stroke="#10b981" stroke-width="3"/><circle cx="50" cy="45" r="5" fill="none" stroke="#f59e0b" stroke-width="3"/><path d="M50,72 V85 M45,75 V80 M55,75 V80" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/></svg>`),
            source: 'local-svg'
        },
        {
            id: 'local-design-gamepad',
            title: 'Retro Gamer',
            imageUrl: getSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,90 C25,80 15,50 15,30 L50,15 L85,30 C85,50 75,80 50,90 Z" fill="none" stroke="#3b82f6" stroke-width="4"/><rect x="35" y="40" width="30" height="20" rx="5" fill="none" stroke="#10b981" stroke-width="3"/><path d="M42,50 H48 M45,47 V53" stroke="#10b981" stroke-width="2" stroke-linecap="round"/><circle cx="58" cy="47" r="2" fill="#ef4444"/><circle cx="58" cy="53" r="2" fill="#f59e0b"/></svg>`),
            source: 'local-svg'
        },
        {
            id: 'local-design-mountain',
            title: 'Peak Adventure',
            imageUrl: getSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" stroke-width="4"/><path d="M20,65 L38,40 L52,55 L68,30 L80,65 Z" fill="none" stroke="#ec4899" stroke-width="3" stroke-linejoin="round"/><path d="M15,72 C30,68 45,76 60,72 C75,68 85,72 85,72" fill="none" stroke="#06b6d4" stroke-width="3"/></svg>`),
            source: 'local-svg'
        },
        {
            id: 'local-design-crown',
            title: 'Royal Crest',
            imageUrl: getSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="m15 25 10 40h50l10-40-20 23-15-23-15 23-20-23z" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linejoin="round"/><path d="M20 78h60" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/></svg>`),
            source: 'local-svg'
        },
        {
            id: 'local-design-skull',
            title: 'Cyber Skull',
            imageUrl: getSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M30,50 C30,30 70,30 70,50 C70,60 65,65 65,75 L60,75 L60,82 L40,82 L40,75 L35,75 C35,65 30,60 30,50 Z" fill="none" stroke="#ef4444" stroke-width="4" stroke-linejoin="round"/><circle cx="42" cy="50" r="6" fill="none" stroke="#ef4444" stroke-width="3"/><circle cx="58" cy="50" r="6" fill="none" stroke="#ef4444" stroke-width="3"/><path d="M48,62 L50,58 L52,62 Z" fill="none" stroke="#ef4444" stroke-width="2"/><path d="M46,75 V82 M50,75 V82 M54,75 V82" stroke="#ef4444" stroke-width="2"/></svg>`),
            source: 'local-svg'
        },
        {
            id: 'local-design-mandala',
            title: 'Sacred Geometry',
            imageUrl: getSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="none" stroke="#06b6d4" stroke-width="3"/><circle cx="50" cy="50" r="25" fill="none" stroke="#06b6d4" stroke-width="2"/><path d="M50,10 V90 M10,50 H90" stroke="#06b6d4" stroke-width="2"/><path d="M22,22 L78,78 M22,78 L78,22" stroke="#06b6d4" stroke-width="2"/><polygon points="50,25 75,50 50,75 25,50" fill="none" stroke="#f59e0b" stroke-width="2"/></svg>`),
            source: 'local-svg'
        }
    ];

    if (isDefaultQuery) {
        return defaultDesigns.slice(0, count);
    }

    try {
        const cleanQuery = safeQuery.replace(/[^a-zA-Z0-9 ]/g, '').trim();

        // 1) Search Iconify for clean vector icons/logos/illustrations
        async function queryIconify(searchString) {
            try {
                const url = `https://api.iconify.design/search?query=${encodeURIComponent(searchString)}&limit=${Math.max(50, count * 2)}`;
                const response = await fetch(url);
                if (!response.ok) return [];
                const data = await response.json();
                const icons = data?.icons || [];
                
                return icons.map((icon, idx) => {
                    const parts = icon.split(':');
                    const prefix = parts[0];
                    const name = parts[1];
                    // Clean up title
                    let title = name.replace(/[_-]/g, ' ');
                    title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    
                    return {
                        id: `design-iconify-${prefix}-${name}-${Date.now()}-${idx}`,
                        title: `${title} (${prefix})`,
                        imageUrl: `https://api.iconify.design/${prefix}/${name}.svg`,
                        source: 'iconify'
                    };
                });
            } catch (e) {
                console.error('Iconify search error:', e);
                return [];
            }
        }

        // 2) Search Wikipedia for PNG/SVG files
        async function queryWikimedia(searchString) {
            try {
                const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchString)}&gsrnamespace=6&gsrlimit=50&prop=pageimages|imageinfo&iiprop=url&pithumbsize=600&format=json&origin=*`;
                const response = await fetch(wikiUrl);
                if (!response.ok) return [];
                const data = await response.json();
                const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
                
                return pages.filter(page => {
                    if (!page || !page.thumbnail || !page.thumbnail.source) return false;
                    const title = (page.title || '').toLowerCase();
                    return title.endsWith('.png') || title.endsWith('.svg');
                }).map((page, idx) => {
                    let title = page.title || '';
                    if (title.toLowerCase().startsWith('file:')) {
                        title = title.substring(5);
                    }
                    const dotIdx = title.lastIndexOf('.');
                    if (dotIdx > 0) {
                        title = title.substring(0, dotIdx);
                    }
                    title = title.replace(/[_-]/g, ' ');
                    
                    return {
                        id: `design-wiki-${page.pageid || Date.now()}-${idx}`,
                        title: title || `${safeQuery} inspiration ${idx + 1}`,
                        imageUrl: page.thumbnail.source,
                        source: 'wikimedia'
                    };
                });
            } catch (e) {
                console.error('Wikimedia search error:', e);
                return [];
            }
        }

        // Run both searches in parallel
        const [iconifyResults, wikiResults] = await Promise.all([
            queryIconify(cleanQuery),
            queryWikimedia(`${cleanQuery} (logo OR clipart OR svg OR png OR icon)`)
        ]);

        // Merge results: Iconify (clean vector icons) first, then Wikipedia (PNG/SVG logos)
        let mergedResults = [...iconifyResults, ...wikiResults];

        // If no results, try broader Wikipedia query
        if (!mergedResults.length) {
            mergedResults = await queryWikimedia(cleanQuery);
        }

        if (mergedResults.length) {
            return mergedResults.slice(0, count);
        }
    } catch (err) {
        console.error('Unified design search error:', err);
    }

    // Fallback: if all fails, return default designs
    return defaultDesigns.slice(0, count);
}

/**
 * Render design recommendations in the design list
 * @param {Array} items - Array of design objects
 */
function renderDesignRecommendations(items) {
    const designList = document.getElementById('design-list');
    if (!designList) return;
    
    designList.innerHTML = '';
    if (!items || !items.length) return;
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'design-item';
        div.style.cursor = 'pointer';
        div.style.borderRadius = '6px';
        div.style.overflow = 'hidden';
        div.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.06)';
        div.style.transition = 'transform 0.2s, box-shadow 0.2s';
        div.style.backgroundColor = '#f9f9f9';
        
        // Add hover effect
        div.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });
        div.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.06)';
        });
        
        // Image container
        const imgContainer = document.createElement('div');
        imgContainer.style.width = '100%';
        imgContainer.style.height = '100px';
        imgContainer.style.backgroundColor = '#e5e7eb';
        imgContainer.style.display = 'flex';
        imgContainer.style.alignItems = 'center';
        imgContainer.style.justifyContent = 'center';
        imgContainer.style.position = 'relative';
        imgContainer.style.overflow = 'hidden';
        
        // Loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.textContent = '⏳ Loading...';
        loadingDiv.style.fontSize = '12px';
        loadingDiv.style.color = '#999';
        imgContainer.appendChild(loadingDiv);
        
        // Actual image
        const img = document.createElement('img');
        img.src = item.imageUrl;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'none';
        img.style.backgroundColor = '#e5e7eb';
        img.alt = item.title;
        img.crossOrigin = 'anonymous';
        
        // Handle image load success
        img.onload = function() {
            loadingDiv.style.display = 'none';
            img.style.display = 'block';

            // For non-PNG fallback items, create a print-usable processed preview.
            if (item.autoProcess) {
                const processed = makeImageBackgroundTransparent(img);
                if (processed) {
                    item.processedImageUrl = processed;
                    img.src = processed;
                }
            }
        };
        
        // Handle image load error
        img.onerror = function() {
            loadingDiv.textContent = '❌ Failed to load';
            loadingDiv.style.color = '#d97706';
        };
        
        imgContainer.appendChild(img);
        div.appendChild(imgContainer);
        
        // Title
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.style.fontSize = '0.75rem';
        meta.style.color = '#4b5563';
        meta.style.padding = '6px 4px';
        meta.style.textAlign = 'center';
        meta.style.whiteSpace = 'nowrap';
        meta.style.overflow = 'hidden';
        meta.style.textOverflow = 'ellipsis';
        meta.style.backgroundColor = '#fafafa';
        meta.textContent = item.title;
        div.appendChild(meta);
        
        // Click handler
        div.addEventListener('click', function() {
            const designUrl = item.processedImageUrl || item.imageUrl;
            console.log('Design clicked:', item.title, designUrl);
            applyDesign(designUrl, item.title);
        });
        
        designList.appendChild(div);
    });
}

/**
 * Apply a design image to the canvas
 * @param {string} imageUrl - URL of the image to apply
 * @param {string} title - Title of the design (optional)
 */
function applyDesign(imageUrl, title = 'Design Image') {
    if (!window.fabricCanvas) {
        console.error('Canvas not initialized');
        alert('Please open the design studio first');
        return;
    }
    
    fabric.Image.fromURL(imageUrl, function(img) {
        if (!img) {
            alert('Failed to load image');
            return;
        }
        const placeImage = function(finalImg) {
            const area = window.printArea || getDefaultPrintArea();
            const maxWidth = area.width * 0.85;
            const maxHeight = area.height * 0.85;
            const scale = Math.min(maxWidth / finalImg.width, maxHeight / finalImg.height);

            finalImg.set({
                left: area.left + (area.width - (finalImg.width * scale)) / 2,
                top: area.top + (area.height - (finalImg.height * scale)) / 2,
                scaleX: scale,
                scaleY: scale,
                selectable: true,
                evented: true,
                name: title,
                skewX: -2
            });
            finalImg._originalWidth = finalImg.width;
            finalImg._originalHeight = finalImg.height;
            finalImg._originalElement = finalImg._element;
            finalImg._originalSrc = imageUrl;

            applyPrintStyle(finalImg);
            keepObjectInsidePrintArea(finalImg);
            window.fabricCanvas.add(finalImg);
            window.fabricCanvas.setActiveObject(finalImg);
            bringShirtOverlayToFront();
            window.fabricCanvas.renderAll();
            console.log('Design applied:', title);
        };

        // Keep the exact original design image (no pixel modification),
        // so the preview card and shirt print look the same.
        placeImage(img);
    }, {
        crossOrigin: 'anonymous'
    });
}

// --- Wire up Design Search UI ---
window.addEventListener('DOMContentLoaded', async function() {
    console.log('Design panel initializing...');
    
    // Load initial designs immediately 
    try {
        const initialDesigns = await fetchUnsplashDesigns('shirt design', 6);
        renderDesignRecommendations(initialDesigns);
        console.log('Initial designs loaded:', initialDesigns.length);
    } catch (err) {
        console.error('Failed to load initial designs:', err);
    }
    
    // Design search button
    const searchBtn = document.getElementById('design-search-btn');
    const searchInput = document.getElementById('design-search-input');
    const loadMoreBtn = document.getElementById('load-more-designs');
    
    let currentDesignQuery = '';
    let currentDesignLimit = 16;

    async function executeSearch(query) {
        if (!query) return;
        currentDesignQuery = query;
        
        try {
            const designs = await fetchUnsplashDesigns(query, currentDesignLimit);
            renderDesignRecommendations(designs);
        } catch (err) {
            console.error('Search failed:', err);
            alert('Failed to load designs');
        }
    }

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', async function() {
            const query = searchInput.value.trim() || 'design';
            currentDesignLimit = 16; // Reset limit on new search
            
            searchBtn.disabled = true;
            searchBtn.textContent = 'Searching...';
            await executeSearch(query);
            searchBtn.disabled = false;
            searchBtn.textContent = 'Search';
        });
        
        // Allow Enter key to search
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchBtn.click();
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async function() {
            currentDesignLimit += 16; // Increase limit
            const query = currentDesignQuery || (searchInput ? searchInput.value.trim() : '') || 'design';
            
            loadMoreBtn.disabled = true;
            loadMoreBtn.textContent = 'Loading...';
            await executeSearch(query);
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = 'Load more';
        });
    }
    
    // Reload designs when design studio opens
    const startBtn = document.getElementById('start-customizing-btn');
    if (startBtn) {
        startBtn.addEventListener('click', async function() {
            console.log('Design studio opened, refreshing designs');
            setTimeout(async function() {
                try {
                    const refreshedDesigns = await fetchUnsplashDesigns('shirt design', 6);
                    renderDesignRecommendations(refreshedDesigns);
                } catch (err) {
                    console.error('Failed to refresh designs:', err);
                }
            }, 300);
        });
    }
});

// --- AI Image Generator Logic ---
function toggleAiPanel() {
    const aiPanel = document.getElementById('ai-generator-panel');
    const designRecommendations = document.getElementById('design-recommendations');
    if (aiPanel) {
        if (aiPanel.style.display === 'none' || !aiPanel.style.display) {
            aiPanel.style.display = 'block';
            if (designRecommendations) designRecommendations.style.display = 'none';
        } else {
            aiPanel.style.display = 'none';
        }
    }
}
window.toggleAiPanel = toggleAiPanel;

// Update toggleDesignPanel to close AI panel
const originalToggleDesignPanel = window.toggleDesignPanel;
window.toggleDesignPanel = function() {
    const aiPanel = document.getElementById('ai-generator-panel');
    if (aiPanel) aiPanel.style.display = 'none';
    if (typeof originalToggleDesignPanel === 'function') {
        originalToggleDesignPanel();
    } else {
        const panel = document.getElementById('design-recommendations');
        if (panel) {
            if (panel.style.display === 'none' || !panel.style.display) {
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
            }
        }
    }
};

// Helper to authenticate with Puter.js in a user interaction tick (resolves popup block issues)
async function ensurePuterAuthenticated() {
    if (typeof puter === 'undefined') return false;
    try {
        if (puter.auth.isSignedIn()) {
            return true;
        }
        console.log("User not signed in to Puter. Initializing automatic temp-user sign in...");
        const result = await puter.auth.signIn({ attempt_temp_user_creation: true });
        console.log("Puter temp-user sign-in result:", result);
        return puter.auth.isSignedIn();
    } catch (err) {
        console.warn("Puter authentication failed:", err);
        return false;
    }
}

// AI Image Generation Event Listeners
window.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('ai-generate-btn');
    const promptInput = document.getElementById('ai-prompt-input');
    const resultContainer = document.getElementById('ai-result-container');
    const loader = document.getElementById('ai-loader');
    const resultImg = document.getElementById('ai-result-img');
    const applyBtn = document.getElementById('ai-apply-btn');
    const removeBgCheckbox = document.getElementById('ai-remove-bg');

    if (generateBtn && promptInput) {
        generateBtn.addEventListener('click', function() {
            const prompt = promptInput.value.trim();
            if (!prompt) {
                alert('Please enter a description for the AI to generate.');
                return;
            }

            // Client-side safety filter to block explicit words
            const inappropriateWords = ['fuck', 'bitch', 'porn', 'sex', 'nude', 'naked', 'cunt', 'pussy', 'dick', 'boob', 'asshole'];
            const containsInappropriate = inappropriateWords.some(word => prompt.toLowerCase().includes(word));
            if (containsInappropriate) {
                alert('Your prompt contains words that are blocked by the AI content and safety filters. Please modify your description and try again.');
                return;
            }

            // Synchronous Puter.js authentication check to preserve user gesture context
            if (typeof puter !== 'undefined' && !puter.auth.isSignedIn()) {
                console.log("User not signed in to Puter. Initializing user sign-in in gesture tick...");
                puter.auth.signIn({ attempt_temp_user_creation: true })
                    .then(() => {
                        console.log("Puter authentication successful.");
                        startGeneration(prompt);
                    })
                    .catch((err) => {
                        console.warn("Puter sign-in failed, trying fallback options:", err);
                        startGeneration(prompt);
                    });
            } else {
                startGeneration(prompt);
            }
        });

        function startGeneration(prompt) {
            console.log('Generating AI image for prompt:', prompt);
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
            resultContainer.style.display = 'flex';
            loader.style.display = 'block';
            resultImg.style.display = 'none';
            applyBtn.style.display = 'none';

            // Enhance prompt for clean vector logo styling if background removal is active
            let enhancedPrompt = prompt;
            if (removeBgCheckbox && removeBgCheckbox.checked && !prompt.toLowerCase().includes('transparent')) {
                enhancedPrompt = `${prompt}, isolated on plain white background, vector logo style, clean borders`;
            }

            const seed = Math.floor(Math.random() * 1000000);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=512&height=512&nologo=true&seed=${seed}`;

            // Set up a timeout to prevent the loader from spinning forever
            let timeoutId = setTimeout(() => {
                alert('AI Image generation timed out. The server might be busy. Please try again or simplify your prompt.');
                loader.style.display = 'none';
                resultContainer.style.display = 'none';
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Image';
            }, 60000);

            // 1. Try Backend Hugging Face API first (if configured with token)
            apiFetch('/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: enhancedPrompt })
            })
            .then(async (res) => {
                if (res.status === 412) {
                    throw new Error('HF_TOKEN not configured on backend');
                }
                if (!res.ok) {
                    const errPayload = await res.json().catch(() => ({}));
                    throw new Error(errPayload.message || `Backend generation error ${res.status}`);
                }
                
                const blob = await res.blob();
                const localUrl = URL.createObjectURL(blob);
                
                const tempImg = new Image();
                tempImg.crossOrigin = 'anonymous';
                tempImg.onload = function() {
                    clearTimeout(timeoutId);
                    
                    if (removeBgCheckbox && removeBgCheckbox.checked) {
                        const processedUrl = makeImageBackgroundTransparent(tempImg);
                        if (processedUrl) {
                            resultImg.src = processedUrl;
                            window.generatedAiImageUrl = processedUrl;
                        } else {
                            resultImg.src = localUrl;
                            window.generatedAiImageUrl = localUrl;
                        }
                    } else {
                        resultImg.src = localUrl;
                        window.generatedAiImageUrl = localUrl;
                    }
                    
                    loader.style.display = 'none';
                    resultImg.style.display = 'block';
                    applyBtn.style.display = 'block';
                    generateBtn.disabled = false;
                    generateBtn.textContent = 'Generate Image';
                };
                
                tempImg.onerror = function() {
                    triggerFinalFailure();
                };
                
                tempImg.src = localUrl;
            })
            .catch((err) => {
                console.log('[AI Gen] Backend HF API bypassed or failed:', err.message);
                
                // 2. Try Puter.js
                if (typeof puter !== 'undefined' && puter.auth.isSignedIn()) {
                    puter.ai.txt2img(enhancedPrompt)
                        .then(function(imageElement) {
                            clearTimeout(timeoutId); // Clear timeout on success
                            
                            if (removeBgCheckbox && removeBgCheckbox.checked) {
                                const processedUrl = makeImageBackgroundTransparent(imageElement);
                                if (processedUrl) {
                                    resultImg.src = processedUrl;
                                    window.generatedAiImageUrl = processedUrl;
                                } else {
                                    resultImg.src = imageElement.src;
                                    window.generatedAiImageUrl = imageElement.src;
                                }
                            } else {
                                resultImg.src = imageElement.src;
                                window.generatedAiImageUrl = imageElement.src;
                            }
                            
                            loader.style.display = 'none';
                            resultImg.style.display = 'block';
                            applyBtn.style.display = 'block';
                            generateBtn.disabled = false;
                            generateBtn.textContent = 'Generate Image';
                        })
                        .catch(function(puterErr) {
                            console.warn('Puter AI generation failed, falling back to legacy API:', puterErr);
                            fallbackToLegacyAPI(0);
                        });
                } else {
                    fallbackToLegacyAPI(0);
                }
            });

            async function fallbackToLegacyAPI(retryCount = 0) {
                const maxRetries = 2;
                
                // Try direct Pollinations AI with a different seed to bypass cache/rate limits
                let url = imageUrl;
                if (retryCount > 0) {
                    const newSeed = Math.floor(Math.random() * 1000000);
                    url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=512&height=512&nologo=true&seed=${newSeed}`;
                    console.log(`[AI Gen] Retrying with alternative seed ${newSeed}...`);
                }

                console.log(`[AI Gen] Attempting Pollinations AI (Attempt ${retryCount + 1})...`);
                const tempImg = new Image();
                tempImg.crossOrigin = 'anonymous';
                
                tempImg.onload = function() {
                    clearTimeout(timeoutId); // Clear timeout on success
                    
                    if (removeBgCheckbox && removeBgCheckbox.checked) {
                        const processedUrl = makeImageBackgroundTransparent(tempImg);
                        if (processedUrl) {
                            resultImg.src = processedUrl;
                            window.generatedAiImageUrl = processedUrl;
                        } else {
                            resultImg.src = url;
                            window.generatedAiImageUrl = url;
                        }
                    } else {
                        resultImg.src = url;
                        window.generatedAiImageUrl = url;
                    }
                    
                    loader.style.display = 'none';
                    resultImg.style.display = 'block';
                    applyBtn.style.display = 'block';
                    generateBtn.disabled = false;
                    generateBtn.textContent = 'Generate Image';
                };

                tempImg.onerror = async function() {
                    if (retryCount < maxRetries) {
                        console.warn(`[AI Gen] Attempt ${retryCount + 1} failed. Retrying in 2 seconds...`);
                        setTimeout(() => {
                            fallbackToLegacyAPI(retryCount + 1);
                        }, 2000);
                    } else {
                        // Pollinations AI failed all retries, fall back to AI Horde!
                        console.warn('[AI Gen] Pollinations AI failed all attempts. Falling back to AI Horde...');
                        clearTimeout(timeoutId);
                        
                        // Set up a longer timeout for AI Horde
                        timeoutId = setTimeout(() => {
                            triggerFinalFailure();
                        }, 180000); // 3 minutes timeout for Horde queue
                        
                        try {
                            const hordeImgUrl = await generateImageViaHorde(enhancedPrompt);
                            console.log('[AI Gen] AI Horde generated image URL:', hordeImgUrl);
                            
                            const hordeImg = new Image();
                            hordeImg.crossOrigin = 'anonymous';
                            hordeImg.onload = function() {
                                clearTimeout(timeoutId);
                                if (removeBgCheckbox && removeBgCheckbox.checked) {
                                    const processedUrl = makeImageBackgroundTransparent(hordeImg);
                                    if (processedUrl) {
                                        resultImg.src = processedUrl;
                                        window.generatedAiImageUrl = processedUrl;
                                    } else {
                                        resultImg.src = hordeImgUrl;
                                        window.generatedAiImageUrl = hordeImgUrl;
                                    }
                                } else {
                                    resultImg.src = hordeImgUrl;
                                    window.generatedAiImageUrl = hordeImgUrl;
                                }
                                loader.style.display = 'none';
                                resultImg.style.display = 'block';
                                applyBtn.style.display = 'block';
                                generateBtn.disabled = false;
                                generateBtn.textContent = 'Generate Image';
                            };
                            hordeImg.onerror = function() {
                                triggerFinalFailure();
                            };
                            hordeImg.src = hordeImgUrl;
                        } catch (hordeErr) {
                            console.error('[AI Gen] AI Horde fallback failed:', hordeErr);
                            triggerFinalFailure();
                        }
                    }
                };

                tempImg.src = url;
            }

            function triggerFinalFailure() {
                clearTimeout(timeoutId);
                alert('AI Image generation failed. The generation queues are currently busy. Please wait a few seconds and try again.');
                
                // Reset loader HTML to default
                if (loader) {
                    loader.innerHTML = `🤖 Generating design...<br><span style="font-size:0.75rem; color:#9ca3af;">(usually takes 3-5 seconds)</span>`;
                }
                loader.style.display = 'none';
                resultContainer.style.display = 'none';
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Image';
            }

            async function generateImageViaHorde(promptText) {
                const response = await fetch('https://aihorde.net/api/v2/generate/async', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Client-Agent': 'shirtify:1.0:info@shirtify.pk',
                        'apikey': '0000000000'
                    },
                    body: JSON.stringify({
                        prompt: promptText,
                        params: {
                            width: 512,
                            height: 512,
                            steps: 20,
                            n: 1
                        }
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`AI Horde submit failed: ${response.status}`);
                }
                
                const submitResult = await response.json();
                const jobId = submitResult.id;
                console.log('[AI Gen] AI Horde Job ID:', jobId);
                
                const startPollTime = Date.now();
                const maxPollTime = 170000;
                
                while (Date.now() - startPollTime < maxPollTime) {
                    const checkRes = await fetch(`https://aihorde.net/api/v2/generate/check/${jobId}`, {
                        headers: { 'Client-Agent': 'shirtify:1.0:info@shirtify.pk' }
                    });
                    if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        
                        // Update loader status text with queue position
                        if (loader) {
                            const queuePos = checkData.queue_position || 0;
                            loader.innerHTML = `🤖 Queueing design via backup servers...<br><span style="font-size:0.75rem; color:#a855f7;">Position: ${queuePos} in queue (usually takes 30-90s)</span>`;
                        }
                        
                        if (checkData.finished) {
                            break;
                        }
                    }
                    await new Promise(r => setTimeout(r, 3000));
                }
                
                const statusRes = await fetch(`https://aihorde.net/api/v2/generate/status/${jobId}`, {
                    headers: { 'Client-Agent': 'shirtify:1.0:info@shirtify.pk' }
                });
                if (!statusRes.ok) {
                    throw new Error(`AI Horde status fetch failed: ${statusRes.status}`);
                }
                
                const statusData = await statusRes.json();
                
                // Reset loader HTML to default
                if (loader) {
                    loader.innerHTML = `🤖 Generating design...<br><span style="font-size:0.75rem; color:#9ca3af;">(usually takes 3-5 seconds)</span>`;
                }
                
                if (statusData.generations && statusData.generations.length > 0) {
                    return statusData.generations[0].img;
                } else {
                    throw new Error('AI Horde returned no generations.');
                }
            }
        }

        // Allow Enter key to trigger generation
        promptInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                generateBtn.click();
            }
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            if (window.generatedAiImageUrl) {
                console.log('Applying AI design...');
                applyDesign(window.generatedAiImageUrl, 'AI Generated design');
                
                // Hide panel after applying
                const aiPanel = document.getElementById('ai-generator-panel');
                if (aiPanel) aiPanel.style.display = 'none';
            }
        });
    }
});
