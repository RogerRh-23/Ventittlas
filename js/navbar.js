// navbar.js
// Toggles .site-navbar--solid when the header/banner bottom passes the navbar.

(function () {
    'use strict';

    function onIncludesLoaded() {
        var navbar = document.querySelector('.site-navbar');
        if (!navbar) return;

        var headerImg = document.querySelector('.header-img');
        var isIndexPage = document.querySelector('.site-header'); // Check if we're on index page

        // If no header image/banner exists on the page (not index page), default to solid
        if (!headerImg || !isIndexPage) {
            navbar.classList.add('site-navbar--solid');
            // add a body class so we can add top padding to avoid covering content
            try {
                document.body.classList.add('has-solid-navbar');
                document.body.classList.remove('has-header');
            } catch (e) { }
            return;
        }

        // Mark that we have a header (for CSS targeting)
        try {
            document.body.classList.add('has-header');
            document.body.classList.remove('has-solid-navbar');
        } catch (e) { }

        // Position navbar at top of screen over the banner
        // Always keep navbar at top of viewport, change style when banner scrolls past
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

                // Always keep navbar at the top of the viewport
                navbar.style.top = '0px';
                document.body.style.paddingTop = '0px'; // No padding needed on index

                // Check if banner has scrolled past the navbar to change styling
                if (bannerRect.bottom <= navHeight) {
                    // Banner scrolled past navbar: make navbar solid
                    navbar.classList.add('site-navbar--solid');
                } else {
                    // Banner still visible behind navbar: keep transparent
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
                // use 'include' to ensure cookies are sent even if some pages differ in origin handling
                const res = await fetch('/php/api/session.php', { credentials: 'include' });
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
