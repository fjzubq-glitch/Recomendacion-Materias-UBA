import { state } from './state.js';
import { renderWelcomeState, renderCards } from './ui.js';

// ==========================================================================
// FILTER AND SORT LOGIC
// ==========================================================================
export function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const subjectFilter = document.getElementById('subject-filter');
    const subjectVal = subjectFilter ? subjectFilter.value : '';
    
    // Toggle welcome/initial search state if no searches are active
    if (!searchVal && !subjectVal && !state.showAllByDefault) {
        renderWelcomeState();
        return;
    }

    // Modality filter
    const modalityEl = document.querySelector('input[name="modality"]:checked');
    const modalityVal = modalityEl ? modalityEl.value : 'all';

    // Difficulty filter checkbox values
    const diffEls = document.querySelectorAll('input[name="difficulty"]:checked');
    const allowedDiffs = Array.from(diffEls).map(el => el.value);

    // Sources checkbox values
    const srcEls = document.querySelectorAll('input[name="sources"]:checked');
    const allowedSources = Array.from(srcEls).map(el => el.value);

    // Toggles
    const proStudentFilter = document.getElementById('pro-student-filter');
    const onlyPro = proStudentFilter ? proStudentFilter.checked : false;

    state.filteredCommissions = state.allCommissions.filter(rec => {
        // 1. Subject filter
        if (subjectVal && rec.subject !== subjectVal) return false;

        // 2. Modality filter
        if (modalityVal !== 'all') {
            if (rec.modality !== modalityVal) return false;
        }

        // 3. Difficulty filter
        if (!allowedDiffs.includes(rec.difficulty)) return false;

        // 4. Sources filter
        const hasCheckedSource = rec.sources.some(src => allowedSources.includes(src));
        if (!hasCheckedSource) return false;

        // 5. Pro Student filter
        if (onlyPro && !rec.is_pro_student) return false;

        // 6. Text Search (matches subject, commission, professor, comments text)
        if (searchVal) {
            const commentsText = rec.comments.map(c => c.text).join(' ').toLowerCase();
            const subjectMatch = rec.subject.toLowerCase().includes(searchVal);
            const profMatch = rec.professor.toLowerCase().includes(searchVal);
            const commMatch = rec.commission.includes(searchVal);
            const commentMatch = commentsText.includes(searchVal);
            
            if (!subjectMatch && !profMatch && !commMatch && !commentMatch) return false;
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
