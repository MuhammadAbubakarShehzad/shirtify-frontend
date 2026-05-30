const API_BASE = (() => {
    const params = new URLSearchParams(window.location.search);
    const urlApiBase = params.get('apiBase');
    if (urlApiBase) {
        localStorage.setItem('shirtifyApiBase', urlApiBase);
    }

    const savedApiBase = localStorage.getItem('shirtifyApiBase');
    if (savedApiBase) {
        return savedApiBase;
    }

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }

    return `${window.location.origin}/api`;
})();

document.getElementById('forgotPasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const submitButton = document.querySelector('.btn-primary');

    if (!email) {
        alert('Please enter your email address.');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    try {
        const response = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || 'Unable to send reset link.');
        }

        alert(data.message || 'Reset link sent successfully.');
        document.getElementById('forgotPasswordForm').reset();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Something went wrong while sending the reset link.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Reset Link';
    }
});

function goBack() {
    window.location.href = '../login/login.html';
}
