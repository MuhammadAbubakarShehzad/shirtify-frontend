document.addEventListener('DOMContentLoaded', () => {
    const loginTab = document.getElementById('loginTab');
    const signUpTab = document.getElementById('signUpTab');
    const submitBtn = document.querySelector('.submit-btn');
    const signupFields = document.querySelectorAll('.signup-only');
    const fullName = document.getElementById('fullName');
    const confirmPassword = document.getElementById('confirmPassword');
    const emailInput = document.querySelector('#authForm input[type="email"]');
    const passwordInput = document.querySelector('#authForm input[type="password"]:not(#confirmPassword)');
    const loginCard = document.querySelector('.login-card');
    const adminOption = document.querySelector('.admin-option');

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

    // Simple Tab Switching Logic
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signUpTab.classList.remove('active');
        submitBtn.textContent = 'Login';
        signupFields.forEach(f => f.style.display = 'none');
        if (fullName) fullName.required = false;
        if (confirmPassword) confirmPassword.required = false;
        if (loginCard) loginCard.classList.remove('signup-mode');
        if (adminOption) adminOption.style.display = 'block';
    });

    signUpTab.addEventListener('click', () => {
        signUpTab.classList.add('active');
        loginTab.classList.remove('active');
        submitBtn.textContent = 'Sign Up';
        signupFields.forEach(f => f.style.display = 'block');
        if (fullName) fullName.required = true;
        if (confirmPassword) confirmPassword.required = true;
        if (loginCard) loginCard.classList.add('signup-mode');
        if (adminOption) adminOption.style.display = 'none';
    });

    const handleError = (message) => {
        alert(message);
    };

    const goToHome = () => {
        window.location.href = '../homescreen/homescreen.html';
    };

    document.getElementById('authForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const action = submitBtn.textContent;
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            handleError('Email and password are required');
            return;
        }

        try {
            let response;
            if (action === 'Sign Up') {
                if (!fullName || !fullName.value.trim()) {
                    handleError('Please enter your full name');
                    return;
                }
                if (!confirmPassword || (confirmPassword.value !== password)) {
                    handleError('Passwords do not match');
                    return;
                }

                response = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: fullName.value.trim(),
                        email,
                        password
                    })
                });
            } else {
                response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
            }

            const data = await response.json();
            if (!response.ok) {
                handleError(data.message || 'Authentication failed');
                return;
            }

            if (action === 'Sign Up') {
                // We do not auto-login for sign-up, so let user sign in
                alert('Sign up successful! Please log in.');
                // switch to login tab
                loginTab.click();
                document.getElementById('authForm').reset();
                return;
            }

            // store token for later requests
            if (data.token) {
                localStorage.setItem('shirtifyToken', data.token);
            }

            goToHome();

        } catch (err) {
            console.error(err);
            handleError('Network error, try again later.');
        }
    });
});
