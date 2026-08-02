// ==========================================================================
// BORRADOR.HTML LOGIC (borrador de inscripcion)
// ==========================================================================
import { fillReportModal, hasScheduleOverlap } from './report.js';

const DIFF_WEIGHT = { 'Baja': 1, 'Media': 2, 'Alta': 3 };

function timeStrToDecimal(str) {
    if (!str) return 0;
    const parts = str.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parseInt(parts[1], 10) : 0;
    return h + m / 60;
}

function loadDraft() {
    const savedDraft = localStorage.getItem('uba_draft_commissions');
    return savedDraft ? JSON.parse(savedDraft) : [];
}

function saveDraft(draft) {
    localStorage.setItem('uba_draft_commissions', JSON.stringify(draft));
    window.dispatchEvent(new Event('storage'));
}

function renderPage() {
    const draft = loadDraft();
    const listContainer = document.getElementById('selected-list-container');
    const totalCountEl = document.getElementById('total-count');
    const totalDifficultyEl = document.getElementById('total-difficulty');
    const totalModalitiesEl = document.getElementById('total-modalities');
    const copyInput = document.getElementById('copy-commissions-text');
    const btnGenReport = document.getElementById('btn-generate-report');

    if (draft.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <p>No tienes ninguna materia en el borrador aún.</p>
                <p style="font-size: 0.8rem; margin-top: 0.5rem;">Agrega comisiones desde el buscador principal.</p>
            </div>
        `;
        totalDifficultyEl.textContent = '-';
        totalModalitiesEl.textContent = '-';
        copyInput.value = '';
        if (btnGenReport) btnGenReport.style.display = 'none';
        return;
    }

    // Detect conflictos de horario entre las materias del borrador
    const conflictSet = new Set();
    for (let i = 0; i < draft.length; i++) {
        for (let j = i + 1; j < draft.length; j++) {
            if (hasScheduleOverlap(draft[i], draft[j])) {
                conflictSet.add(i);
                conflictSet.add(j);
            }
        }
    }

    listContainer.innerHTML = '';
    draft.forEach((rec, idx) => {
        const item = document.createElement('div');
        item.className = 'selected-item';
        const conflictMark = conflictSet.has(idx) ? '<span style="color:#ef4444; font-size:0.8rem; font-weight:600;">⚠️ Conflicto de horario</span>' : '';
        item.innerHTML = `
            <div class="item-info" style="cursor: pointer;" title="Ver opiniones en detalle">
                <span class="item-subject">${rec.subject} (Comisión ${rec.commission})</span>
                <span class="item-details">${rec.professor} — ${rec.schedule} [${rec.modality}]</span>
                ${conflictMark}
            </div>
            <div class="item-actions">
                <button class="btn-remove-item" data-idx="${idx}">Quitar</button>
            </div>
        `;

        item.querySelector('.item-info').addEventListener('click', () => {
            openReviewsModal(rec.subject, rec.commission);
        });

        item.querySelector('.btn-remove-item').addEventListener('click', (e) => {
            e.stopPropagation();
            const currentDraft = loadDraft();
            currentDraft.splice(idx, 1);
            saveDraft(currentDraft);
            renderPage();
        });

        listContainer.appendChild(item);
    });

    totalCountEl.textContent = draft.length;

    let totalWeight = 0;
    draft.forEach(d => totalWeight += (DIFF_WEIGHT[d.difficulty] || 2));
    const avgWeight = totalWeight / draft.length;
    let finalDiff = 'Media 🟡';
    if (avgWeight < 1.7) finalDiff = 'Baja 🟢';
    else if (avgWeight > 2.3) finalDiff = 'Alta 🔴';
    totalDifficultyEl.textContent = finalDiff;

    const modalities = [...new Set(draft.map(d => d.modality))];
    totalModalitiesEl.textContent = modalities.join(' + ');

    const codes = draft.map(d => d.commission).join(', ');
    copyInput.value = codes;

    if (btnGenReport) {
        btnGenReport.style.display = 'flex';
    }
}

// ==========================================================================
// DRAWER DE OPINIONES
// ==========================================================================
function openReviewsModal(subjectName, commissionNum) {
    const draft = loadDraft();
    const course = draft.find(c => c.commission === commissionNum && c.subject === subjectName);
    if (!course) return;

    document.getElementById('drawer-subject-title').textContent = course.subject;
    document.getElementById('drawer-commission-title').textContent = `Cátedra: ${course.professor} — Comisión ${course.commission}`;

    const bodyContent = document.getElementById('drawer-reviews-content');
    bodyContent.innerHTML = '';

    if (course.comments && course.comments.length > 0) {
        const fragment = document.createDocumentFragment();
        course.comments.forEach(comment => {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'drawer-review-item';

            const cleanSrc = comment.source.replace('La ', '').replace(' ', '').replace('á', 'a').replace('ó', 'o');

            reviewItem.innerHTML = `
                <div class="review-meta">
                    <span class="review-source ${cleanSrc}">${comment.source}</span>
                </div>
                <div class="review-text">${comment.text}</div>
            `;
            fragment.appendChild(reviewItem);
        });
        bodyContent.appendChild(fragment);
    } else {
        bodyContent.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No hay opiniones registradas para esta comisión.</p>`;
    }

    document.getElementById('review-drawer').classList.add('active');
}

function closeDrawer() {
    document.getElementById('review-drawer').classList.remove('active');
}

// ==========================================================================
// EVENT WIRING
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);

    const drawerOverlay = document.getElementById('review-drawer');
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'review-drawer') closeDrawer();
        });
    }

    const btnCopy = document.getElementById('btn-copy-commissions');
    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            const input = document.getElementById('copy-commissions-text');
            input.select();
            navigator.clipboard.writeText(input.value)
                .then(() => alert('Comisiones copiadas al portapapeles.'))
                .catch(err => console.error(err));
        });
    }

    const btnGenReport = document.getElementById('btn-generate-report');
    if (btnGenReport) {
        btnGenReport.addEventListener('click', () => {
            const draft = loadDraft();
            if (draft.length === 0) return;
            fillReportModal(draft, { showToast: (msg) => alert(msg) });
            document.getElementById('report-modal').classList.add('active');
        });
    }

    const btnCloseReportModal = document.getElementById('btn-close-report-modal');
    if (btnCloseReportModal) {
        btnCloseReportModal.addEventListener('click', () => {
            document.getElementById('report-modal').classList.remove('active');
        });
    }
    const reportModalOverlay = document.getElementById('report-modal');
    if (reportModalOverlay) {
        reportModalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'report-modal') {
                document.getElementById('report-modal').classList.remove('active');
            }
        });
    }

    window.addEventListener('storage', () => {
        renderPage();
    });

    renderPage();
});
