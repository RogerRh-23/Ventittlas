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

        // Position the fixed navbar so it sits above the banner at the banner's
        // bottom edge initially. As the user scrolls and the banner moves out of
        // view, the navbar will be clamped to `top: 0` and act like a classic
        // sticky header. Also set body padding only when navbar is at the top so
        // it doesn't cover page content.
        function positionNavbar() {
            try {
                var navHeight = navbar.getBoundingClientRect().height || navbar.offsetHeight || 0;
                if (!headerImg) {
                    // No banner: stick to top and reserve space
                    navbar.style.top = '0px';
                    document.body.style.paddingTop = navHeight + 'px';
                    navbar.classList.add('site-navbar--solid');
                    return;
                }

                var bannerRect = headerImg.getBoundingClientRect();
                // compute desired top: place navbar at the top edge of the banner
                // so the navbar appears at the top of the image rather than at its bottom
                var desiredTop = Math.round(bannerRect.top);
                if (desiredTop <= 0) {
                    // banner scrolled out enough: keep navbar at viewport top
                    navbar.style.top = '0px';
                    document.body.style.paddingTop = navHeight + 'px';
                    navbar.classList.add('site-navbar--solid');
                } else {
                    // position navbar overlapping the bottom of the banner
                    // place the navbar at the banner's top position
                    navbar.style.top = desiredTop + 'px';
                    document.body.style.paddingTop = '0px';
                    navbar.classList.remove('site-navbar--solid');
                }
            } catch (e) { /* ignore */ }
        }

        // Run on scroll and on resize (banner dims may change)
        window.addEventListener('scroll', positionNavbar, { passive: true });
        window.addEventListener('resize', function () {
            positionNavbar();
        });

        // Initial placement
        positionNavbar();

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

        // Intercept navbar search form and redirect to products page with query param
        try {
            const searchForm = document.querySelector('.nav-search');
            if (searchForm) {
                searchForm.addEventListener('submit', function (ev) {
                    ev.preventDefault();
                    const input = searchForm.querySelector('input[name="q"]') || searchForm.querySelector('input[type="search"]');
                    if (!input) return;
                    const q = (input.value || '').trim();
                    if (!q) return;
                    // Redirect to products page with query param 'q'
                    window.location.href = '/pages/products.html?q=' + encodeURIComponent(q);
                });
            }
        } catch (e) {
            // ignore
        }
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
