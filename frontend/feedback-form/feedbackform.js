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