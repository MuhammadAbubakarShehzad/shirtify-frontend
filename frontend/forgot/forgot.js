document.getElementById('forgotPasswordForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    
    // Simulate API call
    alert(`A reset link has been sent to: ${email}`);
});

function goBack() {
    // In a real app, this would redirect to login.html
    console.log("Navigating back to Login...");
    window.history.back();
}