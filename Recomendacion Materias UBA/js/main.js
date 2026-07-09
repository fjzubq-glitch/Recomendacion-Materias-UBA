import { state, loadLocalStorageData, saveLocalStorageData } from './state.js';
import { loadCommissionsData } from './api.js';
import { applyFilters } from './filters.js';
import { initCalendarGrid, renderCoursesOnGrid, toggleCellBusy } from './calendar.js';
import { renderCards, renderDraftList, closeDrawer, debounce, showToast } from './ui.js';

// Drag select state
let isMouseDown = false;
let dragMode = true; // true = paint busy, false = erase busy

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    loadLocalStorageData();
    initCalendarGrid();
    setupEventListeners();
    await loadCommissionsData();
});

// ==========================================================================
// EVENT LISTENERS & DRAG PAINT
// ==========================================================================
function setupEventListeners() {
    // Tab buttons
    const tabCalendar = document.getElementById('tab-calendar');
    const tabDraft = document.getElementById('tab-draft');
    
    if (tabCalendar) {
        tabCalendar.addEventListener('click', () => switchTab('calendar'));
    }
    if (tabDraft) {
        tabDraft.addEventListener('click', () => {
            switchTab('draft');
            renderDraftList();
        });
    }

    // Filters are now applied on button click
    const btnApply = document.getElementById('btn-apply-filters');
    if (btnApply) {
        btnApply.addEventListener('click', applyFilters);
    }
    
    // Sort stays immediate as it's outside the filter panel
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);

    // Reset filters
    const btnReset = document.getElementById('btn-reset-filters');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (subjectFilter) subjectFilter.value = '';
            if (sortSelect) sortSelect.value = 'subject';
            if (proStudentFilter) proStudentFilter.checked = false;
            if (hideConflictsFilter) hideConflictsFilter.checked = false;
            
            // Reset modality radio
            const modAll = document.querySelector('input[name="modality"][value="all"]');
            if (modAll) modAll.checked = true;

            // Reset checkboxes
            document.querySelectorAll('input[name="difficulty"]').forEach(el => el.checked = true);
            document.querySelectorAll('input[name="sources"]').forEach(el => el.checked = true);

            applyFilters();
            showToast("Filtros limpiados.", "success");
        });
    }

    // Copy to clipboard
    const btnCopy = document.getElementById('btn-copy-commissions');
    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            const copyText = document.getElementById('copy-commissions-text');
            copyText.select();
            copyText.setSelectionRange(0, 99999); // For mobile devices
            
            navigator.clipboard.writeText(copyText.value)
                .then(() => {
                    const msg = document.getElementById('copy-success-msg');
                    msg.style.display = 'block';
                    showToast("Comisiones copiadas al portapapeles.", "success");
                    setTimeout(() => {
                        msg.style.display = 'none';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Error al copiar: ', err);
                    showToast("Error al copiar al portapapeles.", "error");
                });
        });
    }

    // Drawer Close
    const closeDrawerBtn = document.getElementById('btn-close-drawer');
    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', closeDrawer);
    }
    const drawerOverlay = document.getElementById('review-drawer');
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'review-drawer') closeDrawer();
        });
    }

    // Grid painting drag handlers
    const grid = document.getElementById('weekly-grid');
    if (grid) {
        grid.addEventListener('mousedown', (e) => {
            const cell = e.target.closest('.grid-cell:not(.time-label)');
            if (!cell) return;
            
            isMouseDown = true;
            const day = cell.dataset.day;
            const hour = parseInt(cell.dataset.hour, 10);
            
            // Toggle action based on first clicked cell
            dragMode = !(state.busySchedule[day] && state.busySchedule[day][hour]);
            toggleCellBusy(cell, day, hour, dragMode);
        });

        grid.addEventListener('mouseover', (e) => {
            if (!isMouseDown) return;
            const cell = e.target.closest('.grid-cell:not(.time-label)');
            if (!cell) return;

            const day = cell.dataset.day;
            const hour = parseInt(cell.dataset.hour, 10);
            toggleCellBusy(cell, day, hour, dragMode);
        });
    }

    document.addEventListener('mouseup', () => {
        if (isMouseDown) {
            isMouseDown = false;
            saveLocalStorageData();
            // Re-render courses on grid since conflicts might change
            renderCoursesOnGrid();
            // Re-apply filters if "hide conflicts" filter is enabled
            const hideConflictsFilter = document.getElementById('hide-conflicts-filter');
            if (hideConflictsFilter && hideConflictsFilter.checked) {
                applyFilters();
            } else {
                renderCards(); // Cards might show new warnings
            }
        }
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.planner-panel .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.planner-panel .tab-content-wrapper').forEach(content => content.classList.remove('active'));

    if (tabId === 'calendar') {
        const tab = document.getElementById('tab-calendar');
        const content = document.getElementById('content-calendar');
        if(tab) tab.classList.add('active');
        if(content) content.classList.add('active');
    } else {
        const tab = document.getElementById('tab-draft');
        const content = document.getElementById('content-draft');
        if(tab) tab.classList.add('active');
        if(content) content.classList.add('active');
    }
}
