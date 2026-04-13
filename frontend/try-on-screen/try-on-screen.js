document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    const chatBox = document.getElementById('chatBox');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const selectshirt = document.getElementById('selectshirt');

    // Chat functionality
    sendBtn.addEventListener('click', () => {
        const text = userInput.value;
        if (text.trim() !== "") {
            // Add user message
            const userMsg = document.createElement('div');
            userMsg.className = 'message user-message'; // You can style this in CSS
            userMsg.style.alignSelf = 'flex-end';
            userMsg.style.background = '#e1f5fe';
            userMsg.style.padding = '10px';
            userMsg.style.borderRadius = '10px';
            userMsg.style.marginTop = '10px';
            userMsg.textContent = text;
            
            chatBox.appendChild(userMsg);
            userInput.value = "";
            
            // Auto-scroll
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    });

    // File Upload Trigger
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            alert(`File "${e.target.files[0].name}" selected!`);
        }
    });

    // Generate Button Simulation
    document.getElementById('generateBtn').addEventListener('click', () => {
        alert("Processing your AI Try-On... Please wait.");
    });
    // File Upload Trigger
    selectshirt.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            alert(`File "${e.target.files[0].name}" selected!`);
        }
    });

});