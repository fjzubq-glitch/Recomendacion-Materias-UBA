// ==========================================================================
// update.js - BotÃ³n oculto + atajo para disparar la actualizaciÃ³n de datos en
// GitHub Actions desde el frontend estÃ¡tico (GitHub Pages).
//
// El token de GitHub (requiere scope "workflow") se guarda SOLO en localStorage
// de tu navegador; no se commitea nada secreto.
//
// CÃ³mo usarlo:
//   - Atajo:   Ctrl + Shift + U    (o Ctrl + Shift + A)
//   - O tocando el pequeÃ±o botÃ³n flotante escondido (abajo a la izquierda)
// ==========================================================================
const REPO = 'fjzubq-glitch/Recomendacion-Materias-UBA';
const WORKFLOW = 'update-data.yml';
const TOKEN_KEY = 'gh_update_token';

let modal = null;
let statusEl = null;

function showToast(msg, type = 'success') {
    const box = document.getElementById('toast-container');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    const icon = type === 'error'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    el.innerHTML = icon + `<span class="toast-message">${msg}</span>`;
    box.appendChild(el);
    setTimeout(() => el.remove(), 6000);
}

function setStatus(text, color = 'var(--text-secondary)') {
    if (statusEl) {
        statusEl.textContent = text;
        statusEl.style.color = color;
    }
}

async function runUpdate() {
    const token = (localStorage.getItem(TOKEN_KEY) || '').trim();
    if (!token) {
        setStatus('Primero guardÃ¡ un token con permiso "workflow".', '#f87171');
        return;
    }
    setStatus('Disparando actualizaciÃ³n en GitHub Actions...', 'var(--text-secondary)');
    try {
        const resp = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ref: 'main' })
        });
        if (resp.ok) {
            setStatus('ActualizaciÃ³n iniciada âœ” (tarda ~4-5 min).', '#34d399');
            showToast('ActualizaciÃ³n de datos iniciada', 'success');
        } else {
            const txt = await resp.text().then(() => resp.status).catch(() => resp.status);
            setStatus(`Error ${resp.status}` + (resp.status === 401 ? ' â€” token sin permiso "workflow".' : resp.status === 404 ? ' â€” workflow no encontrado.' : ''), '#f87171');
            showToast('No se pudo iniciar la actualizaciÃ³n (' + resp.status + ')', 'error');
        }
    } catch (e) {
        setStatus('Error de red: ' + e.message, '#f87171');
    }
}

function buildModal() {
    if (modal) return;
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.classList.remove('active');
    modal.id = 'update-modal';
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 480px;">
            <div class="modal-header">
                <div class="modal-titles"><h2>ðŸ”„ Actualizar catÃ¡logo</h2></div>
                <button class="btn-close" id="btn-close-update-modal" aria-label="Cerrar">&times;</button>
            </div>
            <div class="modal-body" style="padding:1.5rem; color:var(--text-secondary); line-height:1.5;">
                <p style="margin-bottom:1rem;">
                    Dispara el workflow de GitHub Actions que descarga las planillas de las
                    agrupaciones, recompila <code>cpc_data.json</code>/<code>cpo_data.json</code>
                    y publica la nueva versiÃ³n del sitio (<b>tarda ~4-5 min</b>).
                </p>
                <label style="display:block; margin-bottom:0.3rem; font-weight:600; color:var(--text-primary);">Token de GitHub (solo se guarda en tu navegador)</label>
                <input type="password" id="update-token-input" placeholder="gho_..." autocomplete="off"
                       style="width:100%; padding:0.6rem 0.8rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary); margin-bottom:0.5rem;"/>
                <p style="font-size:0.75rem; margin-bottom:1rem;">Para <em>no</em> perder el token por sesiÃ³n,
                    guardalo con el botÃ³n de abajo. Requiere el scope <code>workflow</code>.</p>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <button class="btn-primary btn-inverse" id="btn-save-token">Guardar token</button>
                    <button class="btn-primary" id="btn-run-update" style="background:linear-gradient(135deg,#6366f1,#4f46e5);">Ejecutar actualizaciÃ³n</button>
                </div>
                <p id="update-status" style="margin-top:1rem; font-size:0.85rem;"></p>
                <a href="https://github.com/${REPO}/actions/workflows/${WORKFLOW}" target="_blank" rel="noopener"
                   style="font-size:0.8rem; color:var(--accent-color);">Ver progreso en GitHub Actions â†’</a>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector('#update-token-input');
    if (input) input.value = localStorage.getItem(TOKEN_KEY) || '';

    modal.querySelector('#btn-close-update-modal').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    const saveBtn = modal.querySelector('#btn-save-token');
    saveBtn.addEventListener('click', () => {
        localStorage.setItem(TOKEN_KEY, input.value.trim());
        showToast('Token guardado.');
    });

    modal.querySelector('#btn-run-update').addEventListener('click', () => {
        localStorage.setItem(TOKEN_KEY, input.value.trim());
        runUpdate();
    });

    statusEl = modal.querySelector('#update-status');
}

function onKey(e) {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!(e.ctrlKey && e.shiftKey)) return;
    const k = (e.key || '').toUpperCase();
    if (e.altKey && (k === 'U')) { e.preventDefault(); buildModal(); modal.classList.add('active'); }
    else if (k === 'U' || k === 'A') { e.preventDefault(); buildModal(); modal.classList.add('active'); }
}

document.addEventListener('DOMContentLoaded', () => {
    buildModal();
    document.addEventListener('keydown', onKey);
});