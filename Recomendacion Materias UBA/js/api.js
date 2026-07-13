import { state } from './state.js';
import { updateSelectedBadge, showToast } from './ui.js';
import { applyFilters } from './filters.js';

export async function loadCycleData(cycle) {
    const cardsContainer = document.getElementById('cards-container');
    try {
        const filename = cycle === 'cpc' ? 'cpc_data.json' : 'cpo_data.json';
        const response = await fetch(filename);
        if (!response.ok) throw new Error(`No se pudo cargar ${filename}`);
        
        state.allCommissions = await response.json();
        
        // Normalize modality
        state.allCommissions.forEach(rec => {
            let mod = (rec.modality || '').toLowerCase();
            let isPresencial = mod.includes('presencial') || mod.includes('presencual');
            let isVirtual = mod.includes('virtual') || mod.includes('remota');

            if (isPresencial && isVirtual) rec.modality = 'Mixta';
            else if (isVirtual) rec.modality = 'Virtual';
            else rec.modality = 'Presencial';
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
    if (!select) return;
    
    // Clear old options except the first one
    select.innerHTML = '<option value="">Todas las materias</option>';
    
    // Get unique subject names
    const subjects = [...new Set(state.allCommissions.map(c => c.subject))].sort();
    
    subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        select.appendChild(opt);
    });
}
