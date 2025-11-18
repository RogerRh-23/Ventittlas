// Simple HTML include loader: busca elementos con atributo data-include
// y reemplaza su contenido con la respuesta fetch del archivo indicado.

document.addEventListener('DOMContentLoaded', () => {
    const includes = document.querySelectorAll('[data-include]');
    // process includes in sequence and dispatch an event when done
    (async function processIncludes() {
        for (const el of includes) {
            const url = el.getAttribute('data-include');
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
                const html = await res.text();
                el.innerHTML = html;
                // execute inline scripts
                const scripts = el.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                    newScript.text = oldScript.textContent;
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                });
            } catch (err) {
                console.error('Error loading include', url, err);
                el.innerHTML = `<!-- Error cargando ${url}: ${err.message} -->`;
            }
        }
        // dispatch a global event so other scripts know includes finished
        document.dispatchEvent(new CustomEvent('includes:loaded'));
    })();

});
