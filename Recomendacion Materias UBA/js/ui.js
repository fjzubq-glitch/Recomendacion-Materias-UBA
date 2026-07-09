import { state, saveLocalStorageData } from './state.js';
import { applyFilters } from './filters.js';
import { renderCoursesOnGrid } from './calendar.js';

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    const icon = type === 'error' 
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;

    toast.innerHTML = `
        ${icon}
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Remove after 3.5s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); // Wait for transition
    }, 3500);
}

// ==========================================================================
// UTILS
// ==========================================================================
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function updateSelectedBadge() {
    document.getElementById('selected-count-badge').textContent = state.draftCommissions.length;
}

// ==========================================================================
// REVIEWS MODAL DIALOG (DRAWER)
// ==========================================================================
export function openReviewsModal(subjectName, commissionNum) {
    const course = state.allCommissions.find(c => c.commission === commissionNum && c.subject === subjectName);
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
            
            const cleanSrc = comment.source.replace('La ', ''); // Campora, Centeno, Recomellas

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

export function closeDrawer() {
    document.getElementById('review-drawer').classList.remove('active');
}

// ==========================================================================
// WELCOME STATE
// ==========================================================================
export function renderWelcomeState() {
    const container = document.getElementById('cards-container');
    container.innerHTML = `
        <div class="welcome-state">
            <div class="welcome-icon">🔍</div>
            <h3>Comienza tu Planificación</h3>
            <p>Selecciona una materia del listado a la izquierda o escribe una palabra clave (nombre de cátedra, comisión o tema) para mostrar las opciones recomendadas.</p>
            <button class="btn-primary" id="btn-show-all-catalog">Ver catálogo completo</button>
        </div>
    `;
    
    document.getElementById('btn-show-all-catalog').addEventListener('click', () => {
        state.showAllByDefault = true;
        applyFilters();
    });
    
    document.getElementById('results-count-text').textContent = 'Filtros inactivos';
}

// ==========================================================================
// CARD RENDERER
// ==========================================================================
export function renderCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    document.getElementById('results-count-text').textContent = `Mostrando ${state.filteredCommissions.length} de ${state.allCommissions.length}`;

    if (state.filteredCommissions.length === 0) {
        container.innerHTML = `
            <div class="empty-state-text" style="padding: 3rem 1rem;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:1rem; opacity:0.4;">
                    <circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <p>No se encontraron comisiones con los filtros actuales.</p>
                <small style="display:block; margin-top:0.5rem; color:var(--text-muted);">Prueba limpiando o flexibilizando los filtros.</small>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment(); // Optimization

    state.filteredCommissions.forEach(rec => {
        const isSelected = state.draftCommissions.some(c => c.commission === rec.commission && c.subject === rec.subject);
        
        // Inline check for personal conflict to avoid circular dependency
        const hasConflict = (() => {
            if (!rec.days || !rec.time_start || !rec.time_end) return false;
            const startVal = timeStrToDecimal(rec.time_start);
            const endVal = timeStrToDecimal(rec.time_end);
            for (const day of rec.days) {
                for (let h = state.START_HOUR; h <= state.END_HOUR; h++) {
                    if (h < endVal && startVal < h + 1) {
                        if (state.busySchedule[day] && state.busySchedule[day][h] === true) return true;
                    }
                }
            }
            return false;
        })();

        const card = document.createElement('div');
        card.className = `course-card${isSelected ? ' selected' : ''}${hasConflict ? ' has-conflict' : ''}`;
        
        const sourcesDots = rec.sources.map(src => {
            const cleanSrc = src.replace('La ', '');
            return `<span class="src-dot ${cleanSrc}" title="Recomendado por ${src}"></span>`;
        }).join('');

        let diffClass = '';
        if (rec.difficulty === 'Baja') diffClass = 'diff-baja';
        else if (rec.difficulty === 'Alta') diffClass = 'diff-alta';
        else diffClass = 'diff-media';

        const diffBadge = `<span class="badge ${diffClass}">${rec.difficulty}</span>`;
        const proBadge = rec.is_pro_student ? `<span class="badge pro-stud">❤️ Pro-Alumno</span>` : '';
        const modalityBadge = `<span class="badge modality">${rec.modality}</span>`;
        const conflictBadge = hasConflict ? `<span class="badge conflict-badge">⚠️ Conflicto horario</span>` : '';

        let commentsSection = '';
        if (rec.comments && rec.comments.length > 0) {
            const firstComment = rec.comments[0];
            commentsSection = `
                <div class="reviews-summary-row">
                    <span class="reviews-count-text">💬 ${rec.comments.length} opinión${rec.comments.length > 1 ? 'es' : ''}</span>
                    <span class="reviews-peek">"${firstComment.text}"</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            `;
        } else {
            commentsSection = `
                <div class="reviews-summary-row" style="cursor: default; background: transparent;">
                    <span class="reviews-count-text" style="color: var(--text-muted);">Sin comentarios registrados</span>
                </div>
            `;
        }

        const actionBtnText = isSelected ? 'Quitar de mi agenda' : 'Agregar a mi agenda';
        const actionBtnClass = isSelected ? 'btn-secondary' : 'btn-primary';

        card.innerHTML = `
            <div class="card-header-row">
                <span class="subject-name">${rec.subject}</span>
                <span class="commission-badge">Comisión ${rec.commission}</span>
            </div>
            
            <div class="professor-name">${rec.professor}</div>
            
            <div class="schedule-row">
                <svg class="schedule-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>${rec.schedule}</span>
            </div>

            <div class="meta-badges-row">
                ${diffBadge}
                ${proBadge}
                ${modalityBadge}
                ${conflictBadge}
                <div class="src-indicator-group">
                    ${sourcesDots}
                </div>
            </div>

            <div class="extra-info-row">
                <div class="extra-info-item">Corte anterior: <span>${rec.corte_puntos || '0'} pts</span></div>
                <div class="extra-info-item">Aula: <span>${rec.aula || 'A designar'}</span></div>
            </div>

            ${commentsSection}

            <div class="card-action-row">
                <button class="${actionBtnClass}" aria-label="${actionBtnText}">${actionBtnText}</button>
            </div>
        `;

        // Bind events programmatically
        // Make the entire card open the drawer
        card.addEventListener('click', () => {
            openReviewsModal(rec.subject, rec.commission);
        });
        card.style.cursor = 'pointer';

        const actionBtn = card.querySelector('.card-action-row button');
        if (actionBtn) {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent opening modal when clicking the button
                toggleDraftSubject(rec.commission, !isSelected);
            });
        }

        fragment.appendChild(card);
    });

    container.appendChild(fragment); // Optimization: append all at once
}

// Convert "HH:MM" to float hour
function timeStrToDecimal(str) {
    if (!str) return 0;
    const parts = str.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parseInt(parts[1], 10) : 0;
    return h + m / 60;
}

// ==========================================================================
// DRAFT / BORRADOR LOGIC
// ==========================================================================
export function toggleDraftSubject(commissionNum, shouldAdd) {
    if (shouldAdd) {
        const course = state.allCommissions.find(c => c.commission === commissionNum);
        if (course && !state.draftCommissions.some(d => d.commission === commissionNum)) {
            if (state.draftCommissions.length >= 6) {
                showToast("Has seleccionado demasiadas materias. Trata de limitar tu plan.", "error");
            }
            state.draftCommissions.push(course);
            showToast(`Se agregó la comisión ${commissionNum} a tu agenda.`);
        }
    } else {
        state.draftCommissions = state.draftCommissions.filter(d => d.commission !== commissionNum);
        showToast(`Se eliminó la comisión ${commissionNum} de tu agenda.`);
    }

    saveLocalStorageData();
    updateSelectedBadge();
    applyFilters(); 
    renderCoursesOnGrid();
    renderDraftList();
}

export function renderDraftList() {
    const listContainer = document.getElementById('draft-list');
    const totalsBox = document.getElementById('draft-totals-box');
    listContainer.innerHTML = '';

    if (state.draftCommissions.length === 0) {
        listContainer.innerHTML = `<p class="empty-state-text">No has seleccionado ninguna materia aún. Haz clic en "Agregar a mi agenda" en las comisiones de interés.</p>`;
        totalsBox.style.display = 'none';
        return;
    }

    totalsBox.style.display = 'flex';
    const fragment = document.createDocumentFragment();

    state.draftCommissions.forEach(rec => {
        const item = document.createElement('div');
        item.className = 'draft-item';
        item.innerHTML = `
            <div class="draft-item-info">
                <span class="draft-item-title">${rec.subject} (C. ${rec.commission})</span>
                <span class="draft-item-meta">${rec.professor} — ${rec.schedule}</span>
            </div>
            <button class="draft-item-remove" title="Quitar" aria-label="Quitar comisión ${rec.commission}">&times;</button>
        `;
        
        item.querySelector('.draft-item-remove').addEventListener('click', () => {
            toggleDraftSubject(rec.commission, false);
        });

        fragment.appendChild(item);
    });

    listContainer.appendChild(fragment);

    // Update Totals
    document.getElementById('draft-total-count').textContent = state.draftCommissions.length;
    
    // Average Difficulty
    const diffWeights = { 'Baja': 1, 'Media': 2, 'Alta': 3 };
    let sumDiff = 0;
    state.draftCommissions.forEach(c => {
        sumDiff += diffWeights[c.difficulty] || 2;
    });
    const avg = sumDiff / state.draftCommissions.length;
    let avgLabel = 'Media';
    let avgColor = 'var(--diff-media)';
    if (avg < 1.7) { avgLabel = 'Baja'; avgColor = 'var(--diff-baja)'; }
    else if (avg > 2.3) { avgLabel = 'Alta'; avgColor = 'var(--diff-alta)'; }
    
    const diffValEl = document.getElementById('draft-total-difficulty');
    diffValEl.textContent = avgLabel;
    diffValEl.style.color = avgColor;

    // Modalities summary
    const modalities = [...new Set(state.draftCommissions.map(c => c.modality))];
    document.getElementById('draft-total-modalities').textContent = modalities.join(' / ');

    // Copy string
    const commNumbers = state.draftCommissions.map(c => c.commission).join(', ');
    document.getElementById('copy-commissions-text').value = commNumbers;
}
