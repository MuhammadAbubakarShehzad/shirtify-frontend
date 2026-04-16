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
    if (!window.fabricCanvas) window.fabricCanvas = new fabric.Canvas('main-canvas');
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

    // Hide toolbar if clicking outside canvas/toolbar
    document.addEventListener('mousedown', function(e) {
        if (!window.fabricCanvas.upperCanvasEl.contains(e.target) && !toolbar.contains(e.target)) {
            hideToolbar();
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

// UI for rotate and color
window.addEventListener('DOMContentLoaded', function() {
    const studioHeader = document.querySelector('.studio-header .action-buttons');
    if (studioHeader) {
        // Add Rotate button if not present
        if (!document.getElementById('rotate-view-btn')) {
            const rotateBtn = document.createElement('button');
            rotateBtn.id = 'rotate-view-btn';
            rotateBtn.className = 'btn-rotate';
            rotateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Rotate';
            rotateBtn.style.marginRight = '8px';
            studioHeader.insertBefore(rotateBtn, studioHeader.firstChild);
        }
        // Add Color Picker if not present
        if (!document.getElementById('shirt-color-picker')) {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.id = 'shirt-color-picker';
            colorInput.value = baseColor;
            colorInput.title = 'Shirt Base Color';
            colorInput.style.marginRight = '8px';
            studioHeader.insertBefore(colorInput, studioHeader.firstChild);
        }
    }
    // Event listeners
    const rotateBtn = document.getElementById('rotate-view-btn');
    if (rotateBtn) {
        rotateBtn.addEventListener('click', function() {
            handleRotateView();
        });
    }
    const colorInput = document.getElementById('shirt-color-picker');
    if (colorInput) {
        colorInput.addEventListener('input', function(e) {
            baseColor = e.target.value;
            renderShirtView();
        });
    }
});


window.addEventListener('DOMContentLoaded', () => {
    try {
        productSelect.innerHTML = '<option value="" selected disabled>Loading shirts...</option>';
        fetch('http://localhost:5000/api/mockshirts')
            .then(res => res.json())
            .then(data => {
                window.mockShirts = data;
                if (!window.mockShirts.length) {
                    productSelect.innerHTML = '<option value="" selected disabled>No shirts found</option>';
                    return;
                }
                productSelect.innerHTML = '<option value="" selected disabled>Select a shirt</option>';
                window.mockShirts.forEach(shirt => {
                    const opt = document.createElement('option');
                    opt.value = shirt._id;
                    opt.textContent = `${shirt.name} (${shirt.type}) - Rs ${shirt.price}`;
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
    fetch(`http://localhost:5000/api/mockshirts/${selectedMockShirtId}`)
        .then(res => res.json())
        .then(mockShirt => {
            // Expect mockShirt.images: [front, back, left, right]
            window.shirtImages = Array.isArray(mockShirt.images) ? mockShirt.images : [mockShirt.imageUrl || DEFAULT_PLACEHOLDER];
            window.currentView = 0;
            baseColor = '#ffffff';
            showDesignStudio(mockShirt);
            setTimeout(() => renderShirtView(), 100); // Wait for canvas
        })
        .catch(err => {
            alert('Error loading shirt details.');
            console.error('MockShirt details fetch error:', err);
        });
});


function showDesignStudio(mockShirt) {
    document.getElementById('customize-stepper').style.display = 'none';
    document.getElementById('design-studio').style.display = 'block';
    document.getElementById('product-selected-display').value = mockShirt.name || '';
    // Canvas init if needed
    if (!window.fabricCanvas) {
        window.fabricCanvas = new fabric.Canvas('main-canvas', {
            backgroundColor: 'transparent',
            width: 600,
            height: 500,
            preserveObjectStacking: true
        });
        document.getElementById('image-upload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                fabric.Image.fromURL(event.target.result, (img) => {
                    if (img) {
                        img.scaleToWidth(200);
                        window.fabricCanvas.add(img);
                        window.fabricCanvas.setActiveObject(img);
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
    // Shirt image will be rendered by renderShirtView()
}

// --- Shirt View/Color Logic ---
function renderShirtView() {
    if (!window.fabricCanvas) return;
    // Clear canvas
    window.fabricCanvas.clear();
    // Load current shirt image as a selectable object (like a shape)
    const imgUrl = window.shirtImages[window.currentView] || DEFAULT_PLACEHOLDER;
    fabric.Image.fromURL(imgUrl, function(img) {
        if (!img) return;
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
        // Add color overlay as a rect with multiply blend mode, grouped with shirt image
        const colorRect = new fabric.Rect({
            left: 0,
            top: 0,
            width: window.fabricCanvas.width,
            height: window.fabricCanvas.height,
            fill: baseColor,
            selectable: false,
            evented: false,
            globalCompositeOperation: 'multiply',
            _shirtObject: true
        });
        // Group shirt image and color overlay so color can be changed like a shape
        const shirtGroup = new fabric.Group([img, colorRect], {
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
        // Restore user design for this view (if any)
        const state = window.designStates[window.currentView];
        if (state) {
            try {
                const userObjects = JSON.parse(state);
                fabric.util.enlivenObjects(userObjects, function(enlivenedObjects) {
                    enlivenedObjects.forEach(obj => window.fabricCanvas.add(obj));
                    window.fabricCanvas.sendToBack(shirtGroup);
                    window.fabricCanvas.renderAll();
                });
            } catch (e) {
                window.fabricCanvas.renderAll();
            }
        } else {
            window.fabricCanvas.renderAll();
        }
    }, { crossOrigin: 'anonymous' });
}

// Update shirt color from color picker
const colorInput = document.getElementById('shirt-color-picker');
if (colorInput) {
    colorInput.addEventListener('input', function(e) {
        baseColor = e.target.value;
        // If shirt group exists, update its color overlay directly
        const shirtGroup = window.fabricCanvas.getObjects().find(obj => obj._shirtObject);
        if (shirtGroup && shirtGroup.type === 'group') {
            // The color overlay is the second object in the group
            const colorRect = shirtGroup.item(1);
            colorRect.set('fill', baseColor);
            window.fabricCanvas.renderAll();
        } else {
            renderShirtView();
        }
    });
}
// Update customization document in DB after design actions
function updateCustomizationDoc() {
    if (!customizationId && canvas) return;
    fetch(`http://localhost:5000/api/customizations/${customizationId}`, {
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
    if (!canvas) return;
    const sidebar = document.getElementById('shape-properties-sidebar');
    const penProps = document.getElementById('pen-properties');
    if (!sidebar) return;
    const active = canvas.getActiveObject();
    // Show pen properties if pen mode is active
    if (isPenMode) {
        sidebar.style.display = 'flex';
        penProps.style.display = 'block';
    } else if (active && (active.type === 'rect' || active.type === 'circle' || active.type === 'triangle' || active.type === 'polygon' || active.type === 'line' || active.type === 'ellipse')) {
        sidebar.style.display = 'flex';
        penProps.style.display = 'none';
    } else {
        sidebar.style.display = 'none';
        penProps.style.display = 'none';
    }
}

// Event listeners for shape sidebar
window.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('shape-properties-sidebar');
    if (!sidebar) return;
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
    fetch('http://localhost:5000/api/customizations', {
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
