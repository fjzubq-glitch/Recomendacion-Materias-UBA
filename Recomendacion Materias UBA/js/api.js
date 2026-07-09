import { state } from './state.js';
import { updateSelectedBadge, showToast } from './ui.js';
import { applyFilters } from './filters.js';

export async function loadCommissionsData() {
    const cardsContainer = document.getElementById('cards-container');
    try {
        const response = await fetch('materias_data.json');
        if (!response.ok) throw new Error('No se pudo cargar materias_data.json');
        
        state.allCommissions = await response.json();
        
        // Fix comments that were incorrectly serialized as strings and normalize modality
        state.allCommissions.forEach(rec => {
            if (rec.comments && Array.isArray(rec.comments)) {
                rec.comments = rec.comments.map(c => {
                    if (typeof c === 'string' && c.startsWith('@{')) {
                        const matchSource = c.match(/source=(.*?);/);
                        const matchText = c.match(/text=(.*)}/);
                        if (matchSource && matchText) {
                            return {
                                source: matchSource[1].trim(),
                                text: matchText[1].trim()
                            };
                        }
                    }
                    return c;
                });
            }

            // Normalize modality
            let mod = (rec.modality || '').toLowerCase();
            let isPresencial = mod.includes('presencial') || mod.includes('presencual');
            let isVirtual = mod.includes('virtual') || mod.includes('remota');

            if (isPresencial && isVirtual) rec.modality = 'Mixta';
            else if (isVirtual) rec.modality = 'Virtual';
            else rec.modality = 'Presencial'; // Default to Presencial if unknown
        });

        // Populate subject dropdown
        populateSubjectDropdown();
        
        // Update stats
        document.getElementById('total-commissions-badge').textContent = state.allCommissions.length;
        updateSelectedBadge();

        // Initial filter & render
        applyFilters();
        
    } catch (error) {
        console.error(error);
        showToast('Error al cargar la base de datos de materias.', 'error');
        cardsContainer.innerHTML = `
            <div class="loading-state" style="color: #ef4444;">
                <p>⚠️ Error al cargar la base de datos de materias.</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// Populate the subject filter select element
function populateSubjectDropdown() {
    const select = document.getElementById('subject-filter');
    // Get unique subject names
    const subjects = [...new Set(state.allCommissions.map(c => c.subject))].sort();
    
    subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        select.appendChild(opt);
    });
}
