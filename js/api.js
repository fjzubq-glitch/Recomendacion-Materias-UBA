import { state } from './state.js';
import { updateSelectedBadge, showToast } from './ui.js';
import { applyFilters } from './filters.js';

export async function loadCycleData(cycle) {
    const cardsContainer = document.getElementById('cards-container');
    try {
        const filename = cycle === 'cpc' ? 'cpc_data.json' : 'cpo_data.json';
        const response = await fetch(`${filename}?t=${Date.now()}`);
        if (!response.ok) throw new Error(`No se pudo cargar ${filename}`);
        
        state.allCommissions = await response.json();
        
        // Normalize modality
        state.allCommissions.forEach(rec => {
            // Apply fixes to raw fields
            let mod = (rec.modality || '').toLowerCase();
            let isPresencial = mod.includes('presencial') || mod.includes('presencual');
            let isVirtual = mod.includes('virtual') || mod.includes('remota');
            let isMixta = mod.includes('mixta') || mod.includes('remota/presencial') || (isPresencial && isVirtual);

            if (isMixta) rec.modality = 'Remota/Presencial';
            else if (isVirtual) rec.modality = 'Remota';
            else rec.modality = 'Presencial';
        });

        // Populate subject dropdown
        populateSubjectDropdown(cycle);
        
        // Populate source stats panel
        populateSourceData(cycle);

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

// Populate "datos en uso" panel with per-source counts for the loaded cycle.
export function populateSourceData(cycle) {
    const statsContent = document.getElementById('info-data-stats-content');
    if (!statsContent) return;

    // Distinct sources across allCommissions
    const sources = [...new Set(state.allCommissions.flatMap(c => c.sources || []))].sort();

    // Per-source commission counts
    const counts = {};
    state.allCommissions.forEach(rec => {
        (rec.sources || []).forEach(s => {
            counts[s] = (counts[s] || 0) + 1;
        });
    });

    const total = state.allCommissions.length;
    const cycleName = cycle === 'cpc' ? 'CPC' : 'CPO';
    let html = `Ahora estás viendo <strong>${cycleName}</strong> · <strong>${total.toLocaleString()}</strong> comisiones.<br><br><strong>Comisiones por fuente:</strong>`;
    if (sources.length === 0) {
        html += '<br>Sin datos de fuente.';
    } else {
        const lines = sources.map(s =>
            `<span style="color: var(--text-primary);">${s}</span>: ${(counts[s] || 0).toLocaleString()}`
        );
        html += '<ul style="margin: 0.4rem 0 0; padding-left: 1.2rem;">' +
                lines.map(l => `<li>${l}</li>`).join('') + '</ul>';
    }
    statsContent.innerHTML = html;
}

// Helper to categorize subject by department/area (CPO)
export function getSubjectDepartment(subjectName) {
    const sub = (subjectName || '').toUpperCase();
    
    if (sub.includes('(PRI)') || sub.includes('PRIVADO')) return 'Derecho Privado';
    if (sub.includes('(PUB)') || sub.includes('PUBLICO') || sub.includes('PÚBLICO') || sub.includes('INTEGRACIÓN') || sub.includes('INTEGRACION')) return 'Derecho Público / Integración';
    if (sub.includes('(PEN)') || sub.includes('PENAL') || sub.includes('DELITO')) return 'Derecho Penal y Criminología';
    if (sub.includes('(LAB)') || sub.includes('LABORAL') || sub.includes('TRABAJO') || sub.includes('SEGURIDAD SOCIAL')) return 'Derecho del Trabajo y Seguridad Social';
    if (sub.includes('(ECN)') || sub.includes('EMPRESARIAL') || sub.includes('COMERCIAL') || sub.includes('CONCURSOS') || sub.includes('TRIBUTARIO') || sub.includes('NAVEGACIÓN') || sub.includes('NAVEGACION') || sub.includes('SOCIEDADES')) return 'Derecho Económico y Empresarial';
    if (sub.includes('(FIL)') || sub.includes('FILO') || sub.includes('FILOSOFÍA') || sub.includes('FILOSOFIA')) return 'Filosofía del Derecho';
    if (sub.includes('(SOC)') || sub.includes('SOCIALES') || sub.includes('HISTORIA') || sub.includes('SOCIOLOGÍA') || sub.includes('SOCIOLOGIA') || sub.includes('ROMANO')) return 'Ciencias Sociales y Derecho Romano';
    if (sub.includes('(PRC)') || sub.includes('PROCESAL') || sub.includes('MÉTODOS') || sub.includes('METODOS')) return 'Derecho Procesal y Métodos de Resolución de Conflictos';
    
    if (sub.includes('CIVIL') || sub.includes('CONTRATOS') || sub.includes('OBLIGACIONES') || sub.includes('REALES') || sub.includes('FAMILIA') || sub.includes('SUCESIONES')) return 'Derecho Privado';
    if (sub.includes('CONSTITUCIONAL') || sub.includes('ESTADO') || sub.includes('ADMINISTRATIVO') || sub.includes('HUMANOS') || sub.includes('DDHH')) return 'Derecho Público / Integración';
    if (sub.includes('TRADU') || sub.includes('LENGUA')) return 'Traductorado';
    if (sub.includes('INGLES') || sub.includes('LECTO')) return 'Idiomas y Lectorados';
    if (sub.includes('PRACTICO') || sub.includes('PRÁCTICO') || sub.includes('CONSULTORIO')) return 'Práctica Profesional (Práctico)';
    if (sub === 'CPC') return 'Materias Generales / CPC';
    
    return 'Otros Cursos y Seminarios (CPO)';
}

// Populate the subject filter select element (flat for CPC, grouped for CPO)
export function populateSubjectDropdown(cycle) {
    const select = document.getElementById('subject-filter');
    const deptSelect = document.getElementById('dept-filter');
    const deptGroup = document.getElementById('dept-filter-group');
    if (!select) return;
    
    // Clear old options
    select.innerHTML = '<option value="">Todas las materias</option>';
    
    // Get unique subject names
    const subjects = [...new Set(state.allCommissions.map(c => c.subject))].sort();
    
    if (cycle === 'cpc') {
        if (deptGroup) deptGroup.style.display = 'none';
        if (deptSelect) deptSelect.value = ''; // Reset dept filter
        select.disabled = false;
        
        // Populate Materias flat
        subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub;
            select.appendChild(opt);
        });
    } else {
        // Show orientation selector
        if (deptGroup) deptGroup.style.display = 'block';
        
        // Group CPO subjects by department
        const groups = {};
        subjects.forEach(sub => {
            const dept = getSubjectDepartment(sub);
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(sub);
        });
        
        // Define department sorting order (logical sequence)
        const deptOrder = [
            'Derecho Privado',
            'Derecho Público / Integración',
            'Derecho Penal y Criminología',
            'Derecho del Trabajo y Seguridad Social',
            'Derecho Económico y Empresarial',
            'Derecho Procesal y Métodos de Resolución de Conflictos',
            'Ciencias Sociales y Derecho Romano',
            'Filosofía del Derecho',
            'Práctica Profesional (Práctico)',
            'Traductorado',
            'Idiomas y Lectorados',
            'Materias Generales / CPC',
            'Otros Cursos y Seminarios (CPO)'
        ];

        const presentDepts = Object.keys(groups).sort((a, b) => {
            let idxA = deptOrder.indexOf(a);
            let idxB = deptOrder.indexOf(b);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
        });
        
        // Populate Orientación selector
        if (deptSelect) {
            deptSelect.innerHTML = '<option value="">Todas las orientaciones</option>';
            presentDepts.forEach(dept => {
                const opt = document.createElement('option');
                opt.value = dept;
                opt.textContent = dept;
                deptSelect.appendChild(opt);
            });
            
            // Set initial state: Materia dropdown is disabled until orientation is selected
            select.innerHTML = '<option value="">Selecciona una orientación primero...</option>';
            select.disabled = true;
            
            // Listen to department changes to update subjects dropdown dynamically
            deptSelect.onchange = () => {
                const selectedDept = deptSelect.value;
                
                if (selectedDept) {
                    select.innerHTML = '<option value="">Todas las materias de la orientación</option>';
                    select.disabled = false;
                    const filteredSubjects = groups[selectedDept] || [];
                    filteredSubjects.forEach(sub => {
                        const opt = document.createElement('option');
                        opt.value = sub;
                        opt.textContent = sub;
                        select.appendChild(opt);
                    });
                } else {
                    select.innerHTML = '<option value="">Selecciona una orientación primero...</option>';
                    select.disabled = true;
                    select.value = '';
                }
                
                // Triggers search filter apply when department changes
                applyFilters();
            };
        }
    }
}
