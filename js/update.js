// ==========================================================================
// update.js - Acceso oculto para disparar la actualizacion de datos en
// GitHub Actions desde el frontend estatico (GitHub Pages).
//
// El token de GitHub (requiere permiso "Actions: write") se guarda SOLO en
// localStorage de tu navegador; no se commitea nada secreto.
//
// Como usarlo:
//   - Atajo:   Ctrl + Shift + U    (o Ctrl + Shift + A)
// ==========================================================================
const REPO = 'fjzubq-glitch/Recomendacion-Materias-UBA';
const WORKFLOW = 'update-data.yml';
const TOKEN_KEY = 'gh_update_token';

let modal = null;
let statusEl = null;
let pollTimer = null;

function niceDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function tokenExpiryKey() { return 'gh_token_expiry'; }

// Guarda/lee la fecha de vencimiento del token (por defecto a los 90 dias)
function setTokenExpiry(days) {
    const d = new Date();
    d.setDate(d.getDate() + (days ? parseInt(days, 10) : 90));
    localStorage.setItem(tokenExpiryKey(), d.toISOString());
}
function getTokenExpiry() {
    const v = localStorage.getItem(tokenExpiryKey());
    return v ? new Date(v) : null;
}

// Avisa con antelacion cuando el token esta por vencer
function checkTokenExpiry() {
    const tok = (localStorage.getItem(TOKEN_KEY) || '').trim();
    if (!tok) return;
    const exp = getTokenExpiry();
    if (!exp) return;
    const daysLeft = Math.ceil((exp.getTime() - Date.now()) / 86400000);
    const el = document.getElementById('token-expiry-note');
    if (el) {
        el.textContent = 'El token vence el ' + niceDate(exp.toISOString()) +
            (daysLeft <= 10 ? ' (solo quedan ' + daysLeft + ' dias). Renovalos.' : '');
        el.style.color = daysLeft <= 10 ? '#fbbf24' : 'var(--text-secondary)';
    }
    if (daysLeft <= 10) {
        showToast('El token de actualizacion vence en ' + daysLeft + ' dias. Generalo de nuevo pronto.', 'info');
    }
}

// Consulta la fecha del ultimo commit que toco cpo_data.json (API publica, sin auth)
async function getLastDataCommit() {
    try {
        const resp = await fetch('https://api.github.com/repos/' + REPO + '/commits?path=cpo_data.json&per_page=1', {
            headers: { 'Accept': 'application/vnd.github+json' }
        });
        if (!resp.ok) return null;
        const arr = await resp.json();
        if (!arr || !arr.length || !arr[0].commit) return null;
        return arr[0].commit.committer.date;
    } catch (e) {
        return null;
    }
}

async function refreshLastUpdate() {
    const el = document.getElementById('last-update');
    if (!el) return;
    const cached = localStorage.getItem('gh_last_commit');
    const d = await getLastDataCommit() || cached;
    if (d) localStorage.setItem('gh_last_commit', d);
    el.textContent = 'Ultima actualizacion: ' + niceDate(d);
}

// Cuando inicia una actualizacion, sondea la API y avisa cuando hay data mas nueva
function scheduleCompletion() {
    if (pollTimer) return;
    const reqAt = localStorage.getItem('gh_requested_at');
    if (!reqAt) return;
    pollTimer = setInterval(async () => {
        const d = await getLastDataCommit();
        if (d && new Date(d).getTime() >= new Date(reqAt).getTime()) {
            clearInterval(pollTimer);
            pollTimer = null;
            localStorage.removeItem('gh_requested_at');
            localStorage.setItem('gh_last_commit', d);
            const el = document.getElementById('last-update');
            if (el) el.textContent = 'Ultima actualizacion: ' + niceDate(d);
            showToast('Actualizacion completada. Los datos ya estan al dia.', 'success');
        }
    }, 30000);
}

function showToast(msg, type = 'success') {
    const box = document.getElementById('toast-container');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    const icon = type === 'error'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    el.innerHTML = icon + '<span class="toast-message">' + msg + '</span>';
    box.appendChild(el);
    setTimeout(() => el.remove(), 6000);
}

function setStatus(text, color) {
    if (statusEl) {
        statusEl.textContent = text;
        statusEl.style.color = color || 'var(--text-secondary)';
    }
}

async function runUpdate() {
    const token = (localStorage.getItem(TOKEN_KEY) || '').trim();
    if (!token) {
        setStatus('Primero guarda un token con permiso "Actions: write".', '#f87171');
        return;
    }
    setStatus('Disparando actualizacion en GitHub Actions...');
    try {
        const resp = await fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/dispatches', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ref: 'main' })
        });
        const link = modal ? modal.querySelector('#update-status-link') : null;
        if (resp.ok) {
            setStatus('Actualizacion iniciada correctamente. Tarda ~4-5 min.', '#34d399');
            showToast('Actualizacion de datos iniciada', 'success');
            if (link) link.style.display = 'block';
            localStorage.setItem('gh_requested_at', new Date().toISOString());
            scheduleCompletion();
            refreshLastUpdate();
        } else {
            setStatus('Error ' + resp.status +
                (resp.status === 401 ? ': token invalido/vencido.' :
                 resp.status === 403 ? ': token sin permiso "Actions: write".' :
                 resp.status === 404 ? ': workflow no encontrado.' : ''),
                '#f87171');
            showToast('No se pudo iniciar la actualizacion (' + resp.status + ')', 'error');
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
    modal.innerHTML = [
        '<div class="modal-container" style="max-width:480px;">',
        '  <div class="modal-header">',
        '    <div class="modal-titles"><h2>Actualizar catalogo</h2></div>',
        '    <button class="btn-close" id="btn-close-update-modal" aria-label="Cerrar">&times;</button>',
        '  </div>',
        '  <div class="modal-body" style="padding:1.5rem; color:var(--text-secondary); line-height:1.5;">',
        '    <p style="margin-bottom:1rem;">Dispara el workflow de GitHub Actions que descarga las planillas',
        '      de las agrupaciones, recompila <code>cpc_data.json</code>/<code>cpo_data.json</code>',
        '      y publica la nueva version del sitio (tarda ~4-5 min).</p>',
        '    <label style="display:block; margin-bottom:0.3rem; font-weight:600; color:var(--text-primary);">Token de GitHub</label>',
        '    <input type="password" id="update-token-input" placeholder="github_pat_... o ghp_..." autocomplete="off"',
        '           style="width:100%; padding:0.6rem 0.8rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary); margin-bottom:0.5rem;"/>',
        '    <p style="font-size:0.75rem; margin-bottom:0.8rem;">Se guarda solo en tu navegador (localStorage).',
        '      Requiere permisos: <code>Actions: read and write</code> y <code>Contents: read and write</code>.</p>',
        '    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.8rem;">',
        '      <label for="token-expiry-input" style="font-weight:600; color:var(--text-primary);">Vence en (dias):</label>',
        '      <input type="number" id="token-expiry-input" value="90" min="1" max="365"',
        '             style="width:90px; padding:0.5rem 0.6rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary);"/>',
        '    </div>',
        '    <p id="token-expiry-note" style="font-size:0.75rem; margin-bottom:1rem;"></p>',
        '    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">',
        '      <button class="btn-primary btn-inverse" id="btn-save-token">Guardar token</button>',
        '      <button class="btn-primary" id="btn-run-update" style="background:linear-gradient(135deg,#6366f1,#4f46e5);">Ejecutar actualizacion</button>',
        '    </div>',
        '    <p id="update-status" style="margin-top:1rem; font-size:0.85rem; font-weight:600;"></p>',
        '    <a href="https://github.com/' + REPO + '/actions/workflows/' + WORKFLOW + '" target="_blank" rel="noopener"',
        '       id="update-status-link" style="display:none; margin-top:0.8rem; font-size:0.9rem; color:var(--accent-color); font-weight:700;">Ver progreso en GitHub Actions</a>',
        '  </div>',
        '</div>'
    ].join('');
    document.body.appendChild(modal);

    const input = modal.querySelector('#update-token-input');
    if (input) input.value = localStorage.getItem(TOKEN_KEY) || '';

    modal.querySelector('#btn-close-update-modal').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    modal.querySelector('#btn-save-token').addEventListener('click', () => {
        localStorage.setItem(TOKEN_KEY, input.value.trim());
        const daysInput = modal.querySelector('#token-expiry-input');
        setTokenExpiry(daysInput ? daysInput.value : 90);
        checkTokenExpiry();
        showToast('Token guardado.');
    });

    modal.querySelector('#btn-run-update').addEventListener('click', () => {
        localStorage.setItem(TOKEN_KEY, input.value.trim());
        runUpdate();
    });

    statusEl = modal.querySelector('#update-status');
    checkTokenExpiry();
}

function openModal() {
    buildModal();
    modal.classList.add('active');
}

function onKey(e) {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!(e.ctrlKey && e.shiftKey)) return;
    const k = (e.key || '').toUpperCase();
    if (e.altKey && k === 'U') { e.preventDefault(); openModal(); }
    else if (k === 'U' || k === 'A') { e.preventDefault(); openModal(); }
}

document.addEventListener('DOMContentLoaded', () => {
    buildModal();
    document.addEventListener('keydown', onKey);
    refreshLastUpdate();
    scheduleCompletion();
    checkTokenExpiry();
});