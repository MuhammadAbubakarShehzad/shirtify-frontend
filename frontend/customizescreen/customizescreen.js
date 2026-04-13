let canvas;
const historyStack = [];
let historyIndex = -1;


// --- Pure Product-Driven Dropdown & Canvas Logic ---
let products = [];
let selectedProductId = null;
const productSelect = document.getElementById('catalog-product');
const startBtn = document.getElementById('start-customizing-btn');
const DEFAULT_PLACEHOLDER = 'https://via.placeholder.com/600x500?text=No+Image';

window.addEventListener('load', () => {
    try {
        productSelect.innerHTML = '<option value="" selected disabled>Loading shirts...</option>';
        fetch('/api/products')
            .then(res => res.json())
            .then(data => {
                products = data;
                if (!products.length) {
                    productSelect.innerHTML = '<option value="" selected disabled>No shirts found</option>';
                    return;
                }
                productSelect.innerHTML = '<option value="" selected disabled>Select a shirt</option>';
                products.forEach(prod => {
                    const opt = document.createElement('option');
                    opt.value = prod._id;
                    opt.textContent = prod.title;
                    productSelect.appendChild(opt);
                });
            })
            .catch(err => {
                productSelect.innerHTML = '<option value="" selected disabled>Error loading products</option>';
                console.error('Product fetch error:', err);
            });
    } catch (err) {
        productSelect.innerHTML = '<option value="" selected disabled>Error loading products</option>';
        console.error('Product fetch error:', err);
    }
});

productSelect.addEventListener('change', function() {
    selectedProductId = this.value;
    startBtn.disabled = !selectedProductId;
});

startBtn.addEventListener('click', () => {
    if (!selectedProductId) return;
    fetch(`/api/products/${selectedProductId}`)
        .then(res => res.json())
        .then(product => {
            showDesignStudio(product);
        })
        .catch(err => {
            alert('Error loading shirt details.');
            console.error('Product details fetch error:', err);
        });
});

function showDesignStudio(product) {
    document.getElementById('customize-stepper').style.display = 'none';
    document.getElementById('design-studio').style.display = 'block';
    document.getElementById('product-selected-display').value = product.title || '';
    // Load image with onload
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        if (!window.canvas) {
            window.canvas = new fabric.Canvas('main-canvas', {
                backgroundColor: 'transparent',
                width: 600,
                height: 500,
                preserveObjectStacking: true
            });
            document.getElementById('font-size-input').addEventListener('change', updateFontSize);
            document.getElementById('fill-color').addEventListener('change', updateColor);
            document.getElementById('color-hex').addEventListener('change', updateColorHex);
            document.getElementById('opacity').addEventListener('input', updateOpacity);
            document.getElementById('pos-x').addEventListener('change', updatePosition);
            document.getElementById('pos-y').addEventListener('change', updatePosition);
            document.getElementById('obj-width').addEventListener('change', updateDimensions);
            document.getElementById('obj-height').addEventListener('change', updateDimensions);
            window.canvas.on('object:modified', saveHistory);
            window.canvas.on('object:added', saveHistory);
            window.canvas.on('selection:created', updateProperties);
            window.canvas.on('selection:updated', updateProperties);
            document.getElementById('image-upload').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    fabric.Image.fromURL(event.target.result, (img) => {
                        img.scaleToWidth(200);
                        window.canvas.add(img);
                        window.canvas.setActiveObject(img);
                        window.canvas.renderAll();
                        saveHistory();
                    }, {}, { crossOrigin: 'anonymous' });
                };
                reader.readAsDataURL(file);
            });
        } else {
            window.canvas.clear();
        }
        fabric.Image.fromURL(product.imageUrl || DEFAULT_PLACEHOLDER, function(fabImg) {
            fabImg.selectable = false;
            fabImg.evented = false;
            window.canvas.setBackgroundImage(fabImg, window.canvas.renderAll.bind(window.canvas));
        }, { crossOrigin: 'anonymous' });
    };
    img.onerror = function() {
        fabric.Image.fromURL(DEFAULT_PLACEHOLDER, function(fabImg) {
            fabImg.selectable = false;
            fabImg.evented = false;
            window.canvas.setBackgroundImage(fabImg, window.canvas.renderAll.bind(window.canvas));
        }, { crossOrigin: 'anonymous' });
        console.error('Failed to load shirt image, using placeholder.');
    };
    img.src = product.imageUrl || DEFAULT_PLACEHOLDER;
}
                        height: 500,
                        preserveObjectStacking: true
                    });
                } else {
                    window.canvas.clear();
                }
                fabImg.selectable = false;
                fabImg.evented = false;
                window.canvas.setBackgroundImage(fabImg, window.canvas.renderAll.bind(window.canvas));
            }, { crossOrigin: 'anonymous' });
            alert('Error loading shirt details.');
            console.error('Product details fetch error:', err);
        });
}

    sizeSelect.addEventListener('change', function() {
        sizeDisplay.value = this.value;
        // Phase 2: Create customization entry
        if (fetchedProduct && this.value) {
            fetch('/api/customizations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': 'Bearer ...' // If using auth
                },
                body: JSON.stringify({
                    original_product_id: fetchedProduct._id,
                    size: this.value,
                    base_image: fetchedProduct.imageUrl || ''
                })
            })
            .then(res => res.json())
            .then(custom => {
                customizationId = custom._id;
                // Load base image into canvas when studio is shown
                // (Handled in studio show logic)
            });
        }
    });

    // Canvas logic (only initialize when studio is shown)
    document.getElementById('start-customizing-btn').addEventListener('click', function() {
        // Initialize Fabric Canvas if not already
        if (!canvas) {
            canvas = new fabric.Canvas('main-canvas', {
                backgroundColor: 'transparent',
                width: 600,
                height: 500,
                preserveObjectStacking: true
            });

            // Event listeners for property updates
            document.getElementById('font-size-input').addEventListener('change', updateFontSize);
            document.getElementById('fill-color').addEventListener('change', updateColor);
            document.getElementById('color-hex').addEventListener('change', updateColorHex);
            document.getElementById('opacity').addEventListener('input', updateOpacity);
            document.getElementById('pos-x').addEventListener('change', updatePosition);
            document.getElementById('pos-y').addEventListener('change', updatePosition);
            document.getElementById('obj-width').addEventListener('change', updateDimensions);
            document.getElementById('obj-height').addEventListener('change', updateDimensions);

            // Canvas events
            canvas.on('object:modified', saveHistory);
            canvas.on('object:added', saveHistory);
            canvas.on('selection:created', updateProperties);
            canvas.on('selection:updated', updateProperties);

            // Image upload listener
            document.getElementById('image-upload').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    fabric.Image.fromURL(event.target.result, (img) => {
                        img.scaleToWidth(200);
                        canvas.add(img);
                        canvas.setActiveObject(img);
                        canvas.renderAll();
                        saveHistory();
                        updateCustomizationDoc();
                    }, {}, { crossOrigin: 'anonymous' });
                };
                reader.readAsDataURL(file);
            });
        }
        // Load base image if present
        if (fetchedProduct && fetchedProduct.imageUrl) {
            fabric.Image.fromURL(fetchedProduct.imageUrl, (img) => {
                img.selectable = false;
                img.evented = false;
                img.sendToBack && img.sendToBack();
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            }, { crossOrigin: 'anonymous' });
        }
    });
});

// Update customization document in DB after design actions
function updateCustomizationDoc() {
    if (!customizationId && canvas) return;
    fetch(`/api/customizations/${customizationId}`, {
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
        fontFamily: 'Arial, sans-serif',
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

// Update Properties Panel
function updateProperties() {
    if (!canvas) return;
    
    const active = canvas.getActiveObject();
    if (!active) return;

    document.getElementById('font-size-input').value = active.fontSize || 24;
    document.getElementById('fill-color').value = active.fill || '#10B981';
    document.getElementById('color-hex').value = active.fill || '#10B981';
    document.getElementById('opacity').value = active.opacity || 1;
    document.getElementById('pos-x').value = Math.round(active.left) || 0;
    document.getElementById('pos-y').value = Math.round(active.top) || 0;
    document.getElementById('obj-width').value = Math.round(active.getScaledWidth()) || 0;
    document.getElementById('obj-height').value = Math.round(active.getScaledHeight()) || 0;
}

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
    if (!canvas) return;
    const designName = document.getElementById('design-name').value;
    const designData = canvas.toJSON();
    // Save to localStorage (PC)
    localStorage.setItem(`design_${designName}`, JSON.stringify(designData));

    // Save to database if customizationId exists
    if (typeof customizationId !== 'undefined' && customizationId) {
        fetch(`/api/customizations/${customizationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': 'Bearer ...' // If using auth
            },
            body: JSON.stringify({
                design_data: designData
            })
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to save design to database');
            return res.json();
        })
        .then(() => {
            alert(`Design "${designName}" saved to your PC and your account!`);
        })
        .catch(err => {
            alert('Design saved locally, but failed to save to database.');
            console.error(err);
        });
    } else {
        alert(`Design "${designName}" saved locally! (Not stored in database)`);
    }
}

// Add to Cart
// Expose saveDesign and addCustomToCart globally for HTML onclick
window.saveDesign = saveDesign;
window.addCustomToCart = addCustomToCart;
function addCustomToCart() {
    if (!canvas) return;
    
    const designName = document.getElementById('design-name').value;
    const productPrice = document.getElementById('product-select').value;
    const designImage = canvas.toDataURL('image/png');
    
    const customItem = {
        name: designName,
        price: productPrice,
        image: designImage,
        timestamp: new Date().getTime()
    };
    
    let cart = JSON.parse(localStorage.getItem('customCart')) || [];
    cart.push(customItem);
    localStorage.setItem('customCart', JSON.stringify(cart));
    alert(`Custom design added to cart!`);
}