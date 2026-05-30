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

function getResetToken() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
}

function setStatus(message, type = '') {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message || '';
    statusMessage.className = `status-message ${type}`.trim();
}

function goToLogin() {
    window.location.href = '../login/login.html';
}

document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = getResetToken();
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitButton = document.querySelector('.btn-primary');

    if (!token) {
        setStatus('Reset token is missing from the link.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        setStatus('Passwords do not match.', 'error');
        return;
    }

    if (password.length < 6) {
        setStatus('Password must be at least 6 characters long.', 'error');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    setStatus('');

    try {
        const response = await fetch(`${API_BASE}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                password,
                confirmPassword
            })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || 'Unable to reset password.');
        }

        if (data.token) {
            localStorage.setItem('shirtifyToken', data.token);
        }

        setStatus(data.message || 'Password reset successful.', 'success');
        alert(data.message || 'Password reset successful.');
        window.location.href = '../login/login.html';
    } catch (error) {
        console.error(error);
        setStatus(error.message || 'Something went wrong while resetting your password.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save New Password';
    }
});

window.goToLogin = goToLogin;
