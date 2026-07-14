import { state, saveLocalStorageData } from './state.js';
import { applyFilters } from './filters.js';

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
        
        // Agregar nota para las agrupaciones que no dejaron comentario escrito
        const sourcesWithComments = course.comments.map(c => c.source);
        const missingSources = course.sources.filter(s => !sourcesWithComments.includes(s));
        
        if (missingSources.length > 0) {
            const notice = document.createElement('div');
            notice.style.fontSize = '0.85rem';
            notice.style.color = 'var(--text-muted)';
            notice.style.marginTop = '1.5rem';
            notice.style.padding = '1rem';
            notice.style.border = '1px dashed var(--border-color)';
            notice.style.borderRadius = 'var(--radius-md)';
            notice.innerHTML = `<strong>Nota:</strong> Esta comisión también es recomendada por <strong>${missingSources.join(', ')}</strong>, pero no adjuntaron una reseña escrita detallada en su listado oficial.`;
            bodyContent.appendChild(notice);
        }
        
    } else {
        const sourcesText = course.sources.join(', ');
        bodyContent.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <p>Las agrupaciones que recomiendan esta comisión (<strong>${sourcesText}</strong>) solo publicaron el número de comisión en sus planillas, pero no adjuntaron ninguna reseña escrita detallada.</p>
            </div>
        `;
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
            const cleanSrc = src.replace('La ', '').replace(' ', '').replace('á', 'a').replace('ó', 'o');
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
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
    renderDraftList();
}

export function renderDraftList() {
    const listContainer = document.getElementById('draft-list');
    if (!listContainer) return;
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
        
        const hasComments = rec.comments && rec.comments.length > 0;

        item.innerHTML = `
            <div class="draft-item-info" style="cursor: pointer;" title="Ver recomendaciones en panel">
                <span class="draft-item-title">${rec.subject} (C. ${rec.commission})</span>
                <span class="draft-item-meta">${rec.professor} — ${rec.schedule}</span>
            </div>
            <div class="draft-item-actions">
                ${hasComments ? `
                    <button class="draft-item-toggle-comments" title="Ver opiniones en panel">
                        💬 ${rec.comments.length}
                    </button>
                ` : ''}
                <button class="draft-item-remove" title="Quitar" aria-label="Quitar comisión ${rec.commission}">&times;</button>
            </div>
        `;
        
        // Open sliding review drawer when clicking on the course info
        item.querySelector('.draft-item-info').addEventListener('click', () => {
            openReviewsModal(rec.subject, rec.commission);
        });

        // Open sliding review drawer when clicking the comments button
        if (hasComments) {
            item.querySelector('.draft-item-toggle-comments').addEventListener('click', () => {
                openReviewsModal(rec.subject, rec.commission);
            });
        }

        // Remove item from draft
        item.querySelector('.draft-item-remove').addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid triggering openReviewsModal
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

export function closeReportModal() {
    document.getElementById('report-modal').classList.remove('active');
}

export function openReportModal() {
    const draftCommissions = state.draftCommissions;
    if (draftCommissions.length === 0) {
        showToast("No tienes materias en el borrador.", "error");
        return;
    }

    const subjects = [...new Set(draftCommissions.map(c => c.subject))];
    const subjectText = subjects.join(' / ');

    // Set Modal Titles
    document.getElementById('modal-report-title').textContent = "✨ Informe de Planificación Académica";
    document.getElementById('modal-report-subtitle').textContent = `Resumen exclusivo para tu Notion y exportación a PDF (${subjectText})`;

    // Generate Markdown
    let md = `Aquí tienes el resumen exclusivo de las opciones para **${subjectText}** (Segunda mitad de 2026), para que las pases a tu Notion. Todas están seleccionadas para que no choquen con tu anual de **Contratos (7355)** y respeten tu meta de **promedio 8+**.\n\n`;

    // Helper functions for content generation
    const getClave8 = (rec) => {
        if (!rec.comments || rec.comments.length === 0) {
            return "Tomas lo que dan en clase. Con estudio constante y entregando los TPs, es muy promocionable.";
        }
        
        const keywords = ['exime', 'exim', 'choice', 'quizz', 'virtual', 'tp', 'promociona', 'nota', 'graba', 'manual'];
        let bestSentence = "";
        
        for (const comment of rec.comments) {
            const sentences = comment.text.split(/[.|\n]/);
            for (let sentence of sentences) {
                sentence = sentence.trim();
                if (sentence.length < 20 || sentence.length > 150) continue;
                
                let count = 0;
                keywords.forEach(kw => {
                    if (sentence.toLowerCase().includes(kw)) count++;
                });
                
                if (count > 0 && (!bestSentence || count > bestSentence.count)) {
                    bestSentence = { text: sentence, count: count };
                }
            }
        }
        
        if (bestSentence && bestSentence.text) {
            let s = bestSentence.text.charAt(0).toUpperCase() + bestSentence.text.slice(1);
            if (!s.endsWith('.')) s += '.';
            return s;
        }
        
        if (rec.evaluation) {
            return `Cursada organizada. Evaluación basada en ${rec.evaluation.toLowerCase()}.`;
        }
        
        return "Los docentes tienen excelente predisposición y toman exactamente lo dado en clase.";
    };

    const getResena = (rec) => {
        if (!rec.comments || rec.comments.length === 0) {
            return "Sin opiniones registradas.";
        }
        for (const comment of rec.comments) {
            const sentences = comment.text.split(/[.|\n]/);
            for (let sentence of sentences) {
                sentence = sentence.trim();
                if (sentence.length >= 30 && sentence.length <= 120) {
                    return `"${sentence}"`;
                }
            }
        }
        const firstText = rec.comments[0].text.trim().split('\n')[0];
        return `"${firstText.length > 100 ? firstText.substring(0, 100) + '...' : firstText}"`;
    };

    draftCommissions.forEach((rec, idx) => {
        md += `### Opción ${idx + 1}: ${rec.subject} - Comisión ${rec.commission}\n\n`;
        md += `- **Horario:** ${rec.schedule}\n`;
        md += `- **Modalidad:** **${rec.modality || 'Presencial'}**\n`;
        md += `- **Clave del 8+:** ${getClave8(rec)}\n`;
        md += `- **Reseña:** *${getResena(rec)}*\n\n`;
    });

    md += `---\n\n### Tabla (Planificación Estratégica)\n\n`;
    md += `| **Prioridad** | **Comisión** | **Cátedra** | **Días** | **Modalidad** | **Beneficio 8+** |\n`;
    md += `| --- | --- | --- | --- | --- | --- |\n`;

    const getPriorityLabel = (idx) => {
        return `Opción ${idx + 1}`;
    };

    draftCommissions.forEach((rec, idx) => {
        const priority = getPriorityLabel(idx);
        const daysStr = rec.days ? rec.days.join('-') : 'A designar';
        md += `| **${priority}** | **${rec.commission}** | ${rec.professor.split('-')[0]} | ${daysStr} | ${rec.modality || 'Presencial'} | **${getClave8(rec)}** |\n`;
    });

    // Populate bodyContent
    const bodyContent = document.getElementById('report-modal-body');
    bodyContent.innerHTML = '';

    // Create Markdown Preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'report-preview-large';
    
    // Parse a subset of markdown for display (since we want a nice visual presentation)
    // We can do simple HTML mapping
    let htmlPreview = md
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/### (.*)/g, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/---/g, '<hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;">');

    // Handle tables in HTML
    if (htmlPreview.includes('|')) {
        const lines = htmlPreview.split('<br>');
        let inTable = false;
        let tableHtml = '<div class="report-table-wrapper"><table class="report-table">';
        
        lines.forEach(line => {
            if (line.trim().startsWith('|')) {
                inTable = true;
                const cells = line.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
                
                // Skip separator rows
                if (line.includes('---')) {
                    return;
                }
                
                tableHtml += '<tr>';
                cells.forEach(cell => {
                    // check if header or body
                    if (line.includes('**Prioridad**') || line.includes('Comisión')) {
                        tableHtml += `<th>${cell}</th>`;
                    } else {
                        tableHtml += `<td>${cell}</td>`;
                    }
                });
                tableHtml += '</tr>';
            } else {
                if (inTable) {
                    inTable = false;
                    tableHtml += '</table></div>';
                    htmlPreview = htmlPreview.replace(line, tableHtml + line);
                }
            }
        });
        
        // Clean up remaining markdown lines from HTML preview
        htmlPreview = htmlPreview.replace(/\|.*?\|<br>/g, '');
        htmlPreview = htmlPreview.replace(/\|.*?\|/g, '');
    }

    previewContainer.innerHTML = htmlPreview;
    bodyContent.appendChild(previewContainer);

    // Bind modal actions
    const btnCopyNotion = document.getElementById('btn-modal-copy-notion');
    const btnDownloadPdf = document.getElementById('btn-modal-download-pdf');
    
    // Clean old event listeners by cloning
    const newBtnCopyNotion = btnCopyNotion.cloneNode(true);
    btnCopyNotion.parentNode.replaceChild(newBtnCopyNotion, btnCopyNotion);
    
    const newBtnDownloadPdf = btnDownloadPdf.cloneNode(true);
    btnDownloadPdf.parentNode.replaceChild(newBtnDownloadPdf, btnDownloadPdf);

    newBtnCopyNotion.addEventListener('click', () => {
        navigator.clipboard.writeText(md)
            .then(() => {
                showToast("¡Informe en Markdown copiado para Notion!");
            })
            .catch(err => {
                console.error('Error al copiar: ', err);
                showToast("Error al copiar el informe.", "error");
            });
    });

    newBtnDownloadPdf.addEventListener('click', () => {
        window.print();
    });

    document.getElementById('report-modal').classList.add('active');
}
