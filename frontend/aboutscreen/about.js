// This file is intentionally left empty as the "About" page 
// in the provided image does not require any specific JavaScript functionality.
console.log("About page script loaded.");
function initFooter() {
    // Ensure Lucide icons are rendered
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Load if script is already present
document.addEventListener('DOMContentLoaded', initFooter);
