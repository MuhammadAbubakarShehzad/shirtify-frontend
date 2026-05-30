const contactForm = document.getElementById('contactForm');
const contactStatus = document.getElementById('contactStatus');

if (contactForm && contactStatus) {
    contactForm.addEventListener('submit', (event) => {
        event.preventDefault();

        contactStatus.textContent = 'Thanks. Your contact details have been captured and we will respond soon.';
        contactStatus.classList.remove('error');
        contactForm.reset();
    });

    contactForm.addEventListener('reset', () => {
        contactStatus.textContent = '';
        contactStatus.classList.remove('error');
    });
}