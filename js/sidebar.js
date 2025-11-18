
// js/sidebar.js
// Solo controla la animación y apertura/cierre de la sidebar y el botón de menú

function initSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;
    const toggle = sidebar.querySelector('.sidebar-toggle');
    const nav = sidebar.querySelector('#sidebar-nav');
    if (!toggle || !nav) return;

    // Estado inicial: sidebar colapsada
    sidebar.classList.add('collapsed');
    nav.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    nav.setAttribute('aria-hidden', 'true');

    // Toggle sidebar y animación del botón
    toggle.addEventListener('click', function () {
        const isCollapsed = sidebar.classList.contains('collapsed');
        if (isCollapsed) {
            sidebar.classList.remove('collapsed');
            nav.classList.add('open');
            toggle.classList.add('open');
            toggle.setAttribute('aria-expanded', 'true');
            nav.setAttribute('aria-hidden', 'false');
        } else {
            sidebar.classList.add('collapsed');
            nav.classList.remove('open');
            toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            nav.setAttribute('aria-hidden', 'true');
        }
    });

    // Cerrar sidebar al hacer click fuera
    document.addEventListener('click', function (event) {
        if (!sidebar.classList.contains('collapsed') && !sidebar.contains(event.target) && !toggle.contains(event.target)) {
            sidebar.classList.add('collapsed');
            nav.classList.remove('open');
            toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            nav.setAttribute('aria-hidden', 'true');
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
            nav.classList.remove('open');
            toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            nav.setAttribute('aria-hidden', 'true');
        }
    });

    // Resalta el link activo
    try {
        const links = nav.querySelectorAll('a');
        const current = location.pathname.replace(/\/+$/, '');
        links.forEach(a => {
            const target = a.getAttribute('href');
            if (!target) return;
            const linkPath = new URL(a.href, location.origin).pathname.replace(/\/+$/, '');
            if (linkPath === current) {
                a.classList.add('active');
            }
        });
    } catch (err) { }

    // Logout
    const logout = document.getElementById('sidebar-logout');
    if (logout) {
        logout.addEventListener('click', async function (e) {
            e.preventDefault();
            try {
                await fetch('/php/api/logout.php', { method: 'POST', credentials: 'same-origin' });
            } catch (err) { }
            window.location.href = '/index.html';
        });
    }
}

document.addEventListener('includes:loaded', initSidebar);
