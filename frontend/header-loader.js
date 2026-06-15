(function () {
    function ensureHeaderStyles() {
        const hasHeaderCss = Array.from(document.styleSheets).some(sheet => {
            return sheet.href && sheet.href.endsWith('/header.css');
        }) || Boolean(document.querySelector('link[href$="/header.css"], link[href="../header.css"]'));

        if (!hasHeaderCss) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '../header.css';
            document.head.appendChild(link);
        }

        const hasFontAwesome = Boolean(document.querySelector('link[href*="font-awesome"], link[href*="fontawesome"]'));
        if (!hasFontAwesome) {
            const iconLink = document.createElement('link');
            iconLink.rel = 'stylesheet';
            iconLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
            document.head.appendChild(iconLink);
        }
    }

    async function loadHeader() {
        const placeholder = document.getElementById('header-placeholder');
        if (!placeholder) return;

        ensureHeaderStyles();

        try {
            const response = await fetch('../header.html?v=' + Date.now());
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const header = doc.querySelector('header');

            if (header) {
                placeholder.innerHTML = header.outerHTML;
            }
        } catch (error) {
            console.error('Error loading header:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHeader);
    } else {
        loadHeader();
    }
})();
