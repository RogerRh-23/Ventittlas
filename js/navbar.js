// navbar.js
// Toggles .site-navbar--solid when the header/banner bottom passes the navbar.

(function () {
    'use strict';

    function onIncludesLoaded() {
        var navbar = document.querySelector('.site-navbar');
        if (!navbar) return;

        var headerImg = document.querySelector('.header-img');

        // If no header image/banner exists on the page, default to solid
        if (!headerImg) {
            navbar.classList.add('site-navbar--solid');
            // add a body class so we can add top padding to avoid covering content
            try { document.body.classList.add('has-solid-navbar'); } catch (e) { }
            return;
        }

        // If navbar is inside the header (index), compute an overlay offset so it sits over the banner
        function ensureOverlay() {
            try {
                var navHeight = navbar.getBoundingClientRect().height || navbar.offsetHeight || 0;
                // apply a negative margin so the navbar overlaps the banner while remaining in flow
                navbar.style.marginTop = '-' + navHeight + 'px';
            } catch (e) {
                // ignore
            }
        }

        // Compute the threshold: when the bottom of the header image is <= navbar offsetTop
        function checkScroll() {
            var bannerRect = headerImg.getBoundingClientRect();
            var navRect = navbar.getBoundingClientRect();

            // When bottom of banner is above or equal navbar's top in viewport, make solid
            if (bannerRect.bottom <= navRect.top) {
                if (!navbar.classList.contains('site-navbar--solid')) {
                    navbar.classList.add('site-navbar--solid');
                }
            } else {
                if (navbar.classList.contains('site-navbar--solid')) {
                    navbar.classList.remove('site-navbar--solid');
                }
            }
        }

        // Run on scroll and on resize (banner dims may change)
        window.addEventListener('scroll', checkScroll, { passive: true });
        window.addEventListener('resize', function () {
            ensureOverlay();
            checkScroll();
        });

        // Ensure overlay initially
        ensureOverlay();

        // Initial check in case the page loads scrolled
        checkScroll();

        // ---- User session handling: replace login link with user name if logged ----
        (async function updateUserLink() {
            try {
                const res = await fetch('/php/api/session.php', { credentials: 'same-origin' });
                const j = await res.json().catch(() => null);
                if (j && j.ok && j.user) {
                    const user = j.user;
                    const navItem = document.getElementById('nav-login-item');
                    const navLink = document.getElementById('nav-login-link');
                    const navLabel = document.getElementById('nav-login-label');
                    if (navItem && navLink && navLabel) {
                        navLabel.textContent = user.nombre || user.correo || 'Usuario';
                        // set destination based on role
                        if (user.rol === 'administrador' || user.rol === 'vendedor') {
                            navLink.setAttribute('href', '/pages/admin.html');
                        } else {
                            navLink.setAttribute('href', '/index.html');
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        })();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            // include.js dispatches 'includes:loaded' after loading components; listen for that
            document.addEventListener('includes:loaded', onIncludesLoaded, { once: true });
        });
    } else {
        document.addEventListener('includes:loaded', onIncludesLoaded, { once: true });
    }
})();
