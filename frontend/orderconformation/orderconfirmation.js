document.addEventListener('DOMContentLoaded', () => {
    const feedbackBtn = document.getElementById('feedbackToggle');

    feedbackBtn.addEventListener('click', () => {
        // Toggle text or reveal a hidden feedback section
        if (feedbackBtn.innerText.includes('∨')) {
            feedbackBtn.innerText = 'Feedback ∧';
            console.log("Feedback form opened");
            // You could show a hidden modal here
        } else {
            feedbackBtn.innerText = 'Feedback ∨';
        }
    });
    
    // Simple log to verify order status
    console.log("Order A717DA7D loaded successfully.");
});
const feedbackForm = document.getElementById('feedbackForm');
const successModal = document.getElementById('successModal');
const closeModal = document.getElementById('closeModal');

// Handle Form Submission
feedbackForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Stop page reload
    
    // In a real scenario, you would send data to a server here
    
    successModal.classList.remove('hidden');
});

// Close Modal
closeModal.addEventListener('click', () => {
    successModal.classList.add('hidden');
    feedbackForm.reset(); // Reset form after closing
});
document.getElementById("openBtn").addEventListener("click", () => {
    document.getElementById("myForm").hidden = false;
});s
function showForm() {
    document.getElementById("myForm").style.display = "block";
}



