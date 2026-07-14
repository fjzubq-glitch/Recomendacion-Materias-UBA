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

// Populate the subject filter select element (grouped by department)
function populateSubjectDropdown() {
    const select = document.getElementById('subject-filter');
    if (!select) return;
    
    // Clear old options except the first one
    select.innerHTML = '<option value="">Todas las materias</option>';
    
    // Get unique subject names
    const subjects = [...new Set(state.allCommissions.map(c => c.subject))].sort();
    
    // Helper to categorize subject by department/area
    function getSubjectDepartment(subjectName) {
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

    // Group subjects
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

    // Get all department names present in groups
    const presentDepts = Object.keys(groups).sort((a, b) => {
        let idxA = deptOrder.indexOf(a);
        let idxB = deptOrder.indexOf(b);
        if (idxA === -1) idxA = 999;
        if (idxB === -1) idxB = 999;
        return idxA - idxB;
    });

    presentDepts.forEach(dept => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = dept;
        
        groups[dept].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub;
            optgroup.appendChild(opt);
        });
        
        select.appendChild(optgroup);
    });
}
