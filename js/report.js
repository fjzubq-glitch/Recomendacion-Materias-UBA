// ==========================================================================
// REPORT GENERATOR (compartido entre index.html y borrador.html)
// Genera el informe de planificacion academica en Markdown y su vista HTML.
// Tambien centraliza la deteccion de solapamientos de horarios.
// ==========================================================================

function timeStrToDecimal(str) {
    if (!str) return 0;
    const parts = str.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parseInt(parts[1], 10) : 0;
    return h + m / 60;
}

// Dos comisiones comparten algun dia y sus horarios se solapan?
export function hasScheduleOverlap(recA, recB) {
    if (!recA || !recB) return false;
    if (!recA.days || !recA.time_start || !recA.time_end) return false;
    if (!recB.days || !recB.time_start || !recB.time_end) return false;

    const aStart = timeStrToDecimal(recA.time_start);
    const aEnd = timeStrToDecimal(recA.time_end);
    const bStart = timeStrToDecimal(recB.time_start);
    const bEnd = timeStrToDecimal(recB.time_end);

    if (aStart >= aEnd || bStart >= bEnd) return false;

    return recA.days.some(d => recB.days.includes(d)) && aStart < bEnd && bStart < aEnd;
}

const CLAVE_KEYWORDS = ['exime', 'exim', 'choice', 'quizz', 'virtual', 'tp', 'promociona', 'nota', 'graba', 'manual'];

function getClaveAprobacion(rec) {
    if (!rec.comments || rec.comments.length === 0) {
        return 'Se toma lo dado en clase. Con estudio constante y entregando los TPs es muy promocionable.';
    }

    let bestSentence = '';

    for (const comment of rec.comments) {
        const sentences = comment.text.split(/[.|\n]/);
        for (let sentence of sentences) {
            sentence = sentence.trim();
            if (sentence.length < 20 || sentence.length > 150) continue;

            let count = 0;
            CLAVE_KEYWORDS.forEach(kw => {
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
        return 'Cursada organizada. Evaluacion basada en ' + rec.evaluation.toLowerCase() + '.';
    }

    return 'Los docentes tienen excelente predisposicion y toman exactamente lo dado en clase.';
}

function getResena(rec) {
    if (!rec.comments || rec.comments.length === 0) {
        return 'Sin opiniones registradas.';
    }
    for (const comment of rec.comments) {
        const sentences = comment.text.split(/[.|\n]/);
        for (let sentence of sentences) {
            sentence = sentence.trim();
            if (sentence.length >= 30 && sentence.length <= 120) {
                return '"' + sentence + '"';
            }
        }
    }
    const firstText = rec.comments[0].text.trim().split('\n')[0];
    return '"' + (firstText.length > 100 ? firstText.substring(0, 100) + '...' : firstText) + '"';
}

export function buildReportMarkdown(draft) {
    const subjects = [...new Set(draft.map(c => c.subject))];
    const subjectText = subjects.join(' / ');

    let md = 'Resumen de las comisiones seleccionadas para tu planificacion academica (2C 2026), elaborado a partir de las recomendaciones de las agrupaciones estudiantiles (La Campora, La Centeno, Nexo, Recomellas, Franja Morada y Nuevo Derecho). Puedes copiarlo directamente a tu Notion o exportarlo a PDF.\n\n';

    md += '### Materias planificadas: **' + subjectText + '**\n\n';

    draft.forEach((rec, idx) => {
        md += '### Opcion ' + (idx + 1) + ': ' + rec.subject + ' - Comision ' + rec.commission + '\n\n';
        md += '- **Horario:** ' + rec.schedule + '\n';
        md += '- **Modalidad:** **' + (rec.modality || 'Presencial') + '**\n';
        md += '- **Clave de aprobacion:** ' + getClaveAprobacion(rec) + '\n';
        md += '- **Resena:** *' + getResena(rec) + '*\n\n';
    });

    md += '---\n\n### Tabla (Planificacion Estrategica)\n\n';
    md += '| **Prioridad** | **Comision** | **Catedra** | **Dias** | **Modalidad** | **Clave de aprobacion** |\n';
    md += '| --- | --- | --- | --- | --- | --- |\n';

    draft.forEach((rec, idx) => {
        const daysStr = rec.days ? rec.days.join('-') : 'A designar';
        const prof = rec.professor ? rec.professor.split('-')[0] : 'A designar';
        md += '| **Opcion ' + (idx + 1) + '** | **' + rec.commission + '** | ' + prof + ' | ' + daysStr + ' | ' + (rec.modality || 'Presencial') + ' | **' + getClaveAprobacion(rec) + '** |\n';
    });

    return md;
}

export function buildReportHtml(md) {
    let htmlPreview = md
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/### (.*)/g, '<h3 style="font-family: \'Outfit\', sans-serif; font-size: 1.25rem; font-weight: 700; color: #a5b4fc; margin-top: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/---/g, '<hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;">');

    if (htmlPreview.includes('|')) {
        const lines = htmlPreview.split('<br>');
        let inTable = false;
        let tableHtml = '<div class="report-table-wrapper" style="margin-top: 1.5rem; overflow-x: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md);"><table class="report-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">';

        lines.forEach(line => {
            if (line.trim().startsWith('|')) {
                inTable = true;
                const cells = line.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
                if (line.includes('---')) return;

                tableHtml += '<tr>';
                cells.forEach(cell => {
                    if (line.includes('**Prioridad**') || line.includes('**Comision**')) {
                        tableHtml += '<th style="background: rgba(255,255,255,0.03); padding: 0.75rem 1rem; font-weight: 700; border-bottom: 1px solid var(--border-color);">' + cell + '</th>';
                    } else {
                        tableHtml += '<td style="padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05);">' + cell + '</td>';
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

        htmlPreview = htmlPreview.replace(/\|.*?\|<br>/g, '');
        htmlPreview = htmlPreview.replace(/\|.*?\|/g, '');
    }

    return htmlPreview;
}

// Llena el modal de informe y conecta los botones Copiar / PDF.
export function fillReportModal(draft, opts) {
    const showToast = (opts && opts.showToast) || function () {};
    const md = buildReportMarkdown(draft);
    const subjects = [...new Set(draft.map(c => c.subject))];

    const titleEl = document.getElementById('modal-report-title');
    const subtitleEl = document.getElementById('modal-report-subtitle');
    if (titleEl) titleEl.textContent = 'Informe de Planificacion Academica';
    if (subtitleEl) subtitleEl.textContent = 'Resumen para tu Notion y exportacion a PDF (' + subjects.join(' / ') + ')';

    const bodyContent = document.getElementById('report-modal-body');
    bodyContent.innerHTML = '';

    const previewContainer = document.createElement('div');
    previewContainer.className = 'report-preview-large';
    previewContainer.innerHTML = buildReportHtml(md);
    bodyContent.appendChild(previewContainer);

    const btnCopy = document.getElementById('btn-modal-copy-notion');
    if (btnCopy) {
        const newBtnCopy = btnCopy.cloneNode(true);
        btnCopy.parentNode.replaceChild(newBtnCopy, btnCopy);
        newBtnCopy.addEventListener('click', () => {
            navigator.clipboard.writeText(md)
                .then(() => showToast('Informe en Markdown copiado para Notion.'))
                .catch(() => showToast('Error al copiar el informe.', 'error'));
        });
    }

    const btnPdf = document.getElementById('btn-modal-download-pdf');
    if (btnPdf) {
        const newBtnPdf = btnPdf.cloneNode(true);
        btnPdf.parentNode.replaceChild(newBtnPdf, btnPdf);
        newBtnPdf.addEventListener('click', () => window.print());
    }
}
