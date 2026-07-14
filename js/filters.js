import { state } from './state.js';
import { renderWelcomeState, renderCards } from './ui.js';
import { getSubjectDepartment } from './api.js';

// ==========================================================================
// FILTER AND SORT LOGIC
// ==========================================================================
export function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const deptFilter = document.getElementById('dept-filter');
    const deptVal = deptFilter ? deptFilter.value : '';
    
    const subjectFilter = document.getElementById('subject-filter');
    const subjectVal = subjectFilter ? subjectFilter.value : '';
    
    // Toggle welcome/initial search state if no searches are active
    if (!searchVal && !subjectVal && !deptVal && !state.showAllByDefault) {
        renderWelcomeState();
        return;
    }

    // Modality filter
    const modalityEl = document.querySelector('input[name="modality"]:checked');
    const modalityVal = modalityEl ? modalityEl.value : 'all';

    // Difficulty filter checkbox values
    const diffEls = document.querySelectorAll('input[name="difficulty"]:checked');
    const allowedDiffs = Array.from(diffEls).map(el => el.value);

    // Shifts checkbox values
    const shiftEls = document.querySelectorAll('input[name="shifts"]:checked');
    const allowedShifts = Array.from(shiftEls).map(el => el.value);



    // Toggles
    const proStudentFilter = document.getElementById('pro-student-filter');
    const onlyPro = proStudentFilter ? proStudentFilter.checked : false;

    state.filteredCommissions = state.allCommissions.filter(rec => {
        // 0. Department filter
        if (deptVal) {
            const commissionDept = getSubjectDepartment(rec.subject);
            if (commissionDept !== deptVal) return false;
        }

        // 1. Subject filter
        if (subjectVal && rec.subject !== subjectVal) return false;

        // 2. Modality filter
        if (modalityVal !== 'all') {
            if (rec.modality !== modalityVal) return false;
        }

        // 2.5 Turno filter
        const commShift = getCommissionShift(rec.schedule);
        if (allowedShifts.length > 0 && !allowedShifts.includes(commShift)) return false;

        // 3. Difficulty filter
        if (allowedDiffs.length > 0 && !allowedDiffs.includes(rec.difficulty)) return false;



        // 5. Pro Student filter
        if (onlyPro && !rec.is_pro_student) return false;

        // 6. Text Search (matches subject, commission, professor, comments text)
        if (searchVal) {
            const isNumeric = /^\d+$/.test(searchVal);
            if (isNumeric) {
                // Exact match for commission if search is purely a number
                if (rec.commission !== searchVal) return false;
            } else {
                const commentsText = rec.comments.map(c => c.text).join(' ').toLowerCase();
                const subjectMatch = rec.subject.toLowerCase().includes(searchVal);
                const profMatch = rec.professor.toLowerCase().includes(searchVal);
                const commentMatch = commentsText.includes(searchVal);
                
                if (!subjectMatch && !profMatch && !commentMatch) return false;
            }
        }

        return true;
    });

    // Apply Sorting
    sortCommissions();
    
    // Render
    renderCards();
}

function sortCommissions() {
    const sortSelect = document.getElementById('sort-select');
    const sortVal = sortSelect ? sortSelect.value : 'subject';
    
    state.filteredCommissions.sort((a, b) => {
        if (sortVal === 'subject') {
            const subCompare = (a.subject || "").localeCompare(b.subject || "");
            if (subCompare !== 0) return subCompare;
            return (a.commission || "").localeCompare(b.commission || "");
        }
        if (sortVal === 'professor') {
            return (a.professor || "").localeCompare(b.professor || "");
        }
        if (sortVal === 'difficulty-low') {
            const diffWeight = { 'Baja': 1, 'Media': 2, 'Alta': 3 };
            const wa = diffWeight[a.difficulty] || 2;
            const wb = diffWeight[b.difficulty] || 2;
            if (wa !== wb) return wa - wb;
            return (a.commission || "").localeCompare(b.commission || "");
        }
        if (sortVal === 'comments-count') {
            return (b.comments || []).length - (a.comments || []).length;
        }
        if (sortVal === 'corte') {
            const corteA = parseInt(a.corte_puntos) || 999;
            const corteB = parseInt(b.corte_puntos) || 999;
            return corteA - corteB;
        }
        return 0;
    });
}

// Helper to classify schedule into shifts (Mañana, Tarde, Noche)
function getCommissionShift(scheduleStr) {
    if (!scheduleStr) return 'Mañana';
    
    // Check for HH:MM pattern
    const match = scheduleStr.match(/(\d{2}):(\d{2})/);
    if (match) {
        const hour = parseInt(match[1], 10);
        if (hour < 13) return 'Mañana';
        if (hour >= 13 && hour < 18) return 'Tarde';
        return 'Noche';
    }
    
    // String keyword fallbacks
    const upper = scheduleStr.toUpperCase();
    if (upper.includes('NOCHE') || upper.includes('20:') || upper.includes('21:') || upper.includes('18:30') || upper.includes('19:')) return 'Noche';
    if (upper.includes('TARDE') || upper.includes('14:') || upper.includes('15:') || upper.includes('16:') || upper.includes('17:')) return 'Tarde';
    
    return 'Mañana';
}
