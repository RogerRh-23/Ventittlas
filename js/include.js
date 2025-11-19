// Simple HTML include loader: busca elementos con atributo data-include
// y reemplaza su contenido con la respuesta fetch del archivo indicado.

document.addEventListener('DOMContentLoaded', () => {
    const includes = document.querySelectorAll('[data-include]');
    // process includes in sequence and dispatch an event when done
    (async function processIncludes() {
        for (const el of includes) {
            const url = el.getAttribute('data-include');
            try {
                console.debug('[include] loading', url);
                // avoid stale cache during development
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
                const html = await res.text();
                // Parse the fragment and, when possible, replace the placeholder
                // element itself with the loaded top-level node (avoids an extra wrapper).
                const tpl = document.createElement('template');
                tpl.innerHTML = html.trim();
                const firstEl = tpl.content.firstElementChild;
                // If the loaded fragment has a single top-level element, replace the
                // placeholder node with that element to preserve expected structure.
                if (firstEl && tpl.content.children.length === 1) {
                    // move scripts out and re-insert to execute them
                    const scripts = firstEl.querySelectorAll('script');
                    scripts.forEach(oldScript => {
                        const newScript = document.createElement('script');
                        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                        newScript.text = oldScript.textContent;
                        oldScript.parentNode.replaceChild(newScript, oldScript);
                    });
                    el.replaceWith(firstEl);
                } else {
                    // fallback: inject HTML into the placeholder
                    el.innerHTML = html;
                    const scripts = el.querySelectorAll('script');
                    scripts.forEach(oldScript => {
                        const newScript = document.createElement('script');
                        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                        newScript.text = oldScript.textContent;
                        oldScript.parentNode.replaceChild(newScript, oldScript);
                    });
                }
                console.debug('[include] loaded', url);
            } catch (err) {
                console.error('[include] Error loading include', url, err);
                // visible error for easier debugging in the page
                el.innerHTML = `<div class="include-error" style="padding:8px;border:2px dashed #f00;background:#fff;color:#000">Error cargando ${url}: ${err.message}. Revisa la consola (F12)</div>`;
            }
        }
        // dispatch a global event so other scripts know includes finished
        document.dispatchEvent(new CustomEvent('includes:loaded'));
    })();

});
