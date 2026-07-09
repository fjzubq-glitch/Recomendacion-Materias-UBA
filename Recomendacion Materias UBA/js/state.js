// Global State
export const state = {
    allCommissions: [],
    filteredCommissions: [],
    busySchedule: {}, // { day: { hour: true/false } }
    draftCommissions: [], // Array of commission objects
    showAllByDefault: false, // Toggle to prevent initial card dump overload
    
    // Calendar config
    DAYS: ['LU', 'MA', 'MI', 'JU', 'VI', 'SA'],
    DAY_LABELS: {
        'LU': 'Lunes',
        'MA': 'Martes',
        'MI': 'Miércoles',
        'JU': 'Jueves',
        'VI': 'Viernes',
        'SA': 'Sábado'
    },
    START_HOUR: 7,
    END_HOUR: 22 // 07:00 to 23:00
};

// Load state from LocalStorage
export function loadLocalStorageData() {
    // Load personal busy schedule
    const savedBusy = localStorage.getItem('uba_busy_schedule');
    if (savedBusy) {
        state.busySchedule = JSON.parse(savedBusy);
    } else {
        // Initialize empty schedule
        state.DAYS.forEach(day => {
            state.busySchedule[day] = {};
            for (let h = state.START_HOUR; h <= state.END_HOUR; h++) {
                state.busySchedule[day][h] = false;
            }
        });
    }

    // Load drafted commissions
    const savedDraft = localStorage.getItem('uba_draft_commissions');
    if (savedDraft) {
        state.draftCommissions = JSON.parse(savedDraft);
    }
}

// Save state to LocalStorage
export function saveLocalStorageData() {
    localStorage.setItem('uba_busy_schedule', JSON.stringify(state.busySchedule));
    localStorage.setItem('uba_draft_commissions', JSON.stringify(state.draftCommissions));
}
