import { state } from './state.js';

// ==========================================================================
// INTERACTIVE CALENDAR GRID
// ==========================================================================
export function initCalendarGrid() {
    const grid = document.getElementById('weekly-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Render header row
    const timeHeader = document.createElement('div');
    timeHeader.className = 'grid-header time-col';
    timeHeader.textContent = 'Hora';
    grid.appendChild(timeHeader);

    state.DAYS.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'grid-header';
        dayHeader.textContent = state.DAY_LABELS[day];
        grid.appendChild(dayHeader);
    });

    // Render hour rows
    for (let h = state.START_HOUR; h <= state.END_HOUR; h++) {
        // Hour label
        const hourLabel = document.createElement('div');
        hourLabel.className = 'grid-cell time-label';
        hourLabel.textContent = `${h.toString().padStart(2, '0')}:00`;
        grid.appendChild(hourLabel);

        // Day cells
        state.DAYS.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.day = day;
            cell.dataset.hour = h;
            
            // Set initial state
            if (state.busySchedule[day] && state.busySchedule[day][h]) {
                cell.classList.add('cell-busy');
            }

            grid.appendChild(cell);
        });
    }

    renderCoursesOnGrid();
}

// Highlight selected courses on the grid, detecting overlaps
export function renderCoursesOnGrid() {
    // Clear previous course highlights/labels
    document.querySelectorAll('.weekly-grid .grid-cell').forEach(cell => {
        cell.classList.remove('cell-course', 'cell-conflict');
        // remove floating label if any
        const existingLabel = cell.querySelector('.grid-cell-label');
        if (existingLabel) existingLabel.remove();
    });

    // Check overlaps among drafted courses
    const overlaps = detectDraftConflicts();

    state.draftCommissions.forEach(rec => {
        const days = rec.days || [];
        if (!rec.time_start || !rec.time_end) return;

        const startVal = timeStrToDecimal(rec.time_start);
        const endVal = timeStrToDecimal(rec.time_end);

        days.forEach(day => {
            // Find which cells this course covers
            for (let h = state.START_HOUR; h <= state.END_HOUR; h++) {
                const cellStart = h;
                const cellEnd = h + 1;

                // Check overlap between course interval and 1-hour cell interval
                if (cellStart < endVal && startVal < cellEnd) {
                    const cell = document.querySelector(`.weekly-grid .grid-cell[data-day="${day}"][data-hour="${h}"]`);
                    if (cell) {
                        const isPersonalBusy = state.busySchedule[day] && state.busySchedule[day][h] === true;
                        const hasConflict = isPersonalBusy || overlaps.has(rec.commission);

                        if (hasConflict) {
                            cell.classList.add('cell-conflict');
                            // Add conflict label on the first hour cell of the course
                            if (h === Math.floor(startVal)) {
                                addCellLabel(cell, `⚠️ ${rec.commission}`, true);
                            }
                        } else {
                            cell.classList.add('cell-course');
                            if (h === Math.floor(startVal)) {
                                const abbr = getSubjectAbbr(rec.subject);
                                addCellLabel(cell, `${abbr} (${rec.commission})`, false);
                            }
                        }
                    }
                }
            }
        });
    });
}

function addCellLabel(cell, text, isConflict) {
    const label = document.createElement('div');
    label.className = `grid-cell-label${isConflict ? ' conflict-label' : ''}`;
    label.textContent = text;
    cell.appendChild(label);
}

// Helper to abbreviate subject names on calendar
function getSubjectAbbr(subjectName) {
    if (!subjectName) return '';
    const words = subjectName.split(' ');
    // Exclude prepositions
    const filtered = words.filter(w => w.length > 2 && !['del', 'los', 'las', 'por', 'con'].includes(w.toLowerCase()));
    if (filtered.length >= 2) {
        return filtered.map(w => w[0].toUpperCase()).join('');
    }
    return subjectName.slice(0, 4).toUpperCase();
}

// Check if two time slots overlap
function isTimeOverlap(d1, s1, e1, d2, s2, e2) {
    // Check if they share any day
    const commonDays = d1.filter(d => d2.includes(d));
    if (commonDays.length === 0) return false;

    // Convert times to decimal
    const start1 = timeStrToDecimal(s1);
    const end1 = timeStrToDecimal(e1);
    const start2 = timeStrToDecimal(s2);
    const end2 = timeStrToDecimal(e2);

    return start1 < end2 && start2 < end1;
}

// Detect mutual overlaps in selected draft courses
function detectDraftConflicts() {
    const overlappingCommissions = new Set();

    for (let i = 0; i < state.draftCommissions.length; i++) {
        for (let j = i + 1; j < state.draftCommissions.length; j++) {
            const c1 = state.draftCommissions[i];
            const c2 = state.draftCommissions[j];

            if (isTimeOverlap(c1.days || [], c1.time_start, c1.time_end, c2.days || [], c2.time_start, c2.time_end)) {
                overlappingCommissions.add(c1.commission);
                overlappingCommissions.add(c2.commission);
            }
        }
    }
    return overlappingCommissions;
}

// Convert "HH:MM" to float hour
export function timeStrToDecimal(str) {
    if (!str) return 0;
    const parts = str.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parseInt(parts[1], 10) : 0;
    return h + m / 60;
}

// Check if a course conflicts with personal busy slots
export function hasPersonalConflict(rec) {
    if (!rec.days || !rec.time_start || !rec.time_end) return false;

    const startVal = timeStrToDecimal(rec.time_start);
    const endVal = timeStrToDecimal(rec.time_end);

    for (const day of rec.days) {
        for (let h = state.START_HOUR; h <= state.END_HOUR; h++) {
            const cellStart = h;
            const cellEnd = h + 1;

            if (cellStart < endVal && startVal < cellEnd) {
                if (state.busySchedule[day] && state.busySchedule[day][h] === true) {
                    return true;
                }
            }
        }
    }
    return false;
}

export function toggleCellBusy(cell, day, hour, isBusy) {
    if (!state.busySchedule[day]) state.busySchedule[day] = {};
    state.busySchedule[day][hour] = isBusy;
    if (isBusy) {
        cell.classList.add('cell-busy');
    } else {
        cell.classList.remove('cell-busy');
    }
}
