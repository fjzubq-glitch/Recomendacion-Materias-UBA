import { state, loadLocalStorageData, saveLocalStorageData } from './state.js';
import { loadCycleData } from './api.js';
import { applyFilters } from './filters.js';
import { renderCards, renderDraftList, closeDrawer, showToast, openReportModal, closeReportModal, updateSelectedBadge } from './ui.js';

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    loadLocalStorageData();
    setupEventListeners();
    setupCycleSelectorListeners();
    updateSelectedBadge(); // Make sure the header badge is updated initially
    
    // Sync draft state in real-time across browser tabs
    window.addEventListener('storage', () => {
        loadLocalStorageData();
        updateSelectedBadge();
        applyFilters(); // Re-render course cards selection state
    });

    await loadCycleData('cpc'); // Load CPC by default
});

// ==========================================================================
// CYCLE SELECTOR
// ==========================================================================
setupCycleSelectorListeners();

function setupCycleSelectorListeners() {
    const btnCPC = document.getElementById('btn-cycle-cpc');
    const btnCPO = document.getElementById('btn-cycle-cpo');
    const subtitle = document.getElementById('app-subtitle');
    
    if (btnCPC && btnCPO) {
        btnCPC.addEventListener('click', async () => {
            if (btnCPC.classList.contains('active')) return;
            btnCPC.classList.add('active');
            btnCPO.classList.remove('active');
            if (subtitle) subtitle.textContent = "Ciclo Profesional Común (CPC) — Recomendaciones";
            
            // Show loading state
            const container = document.getElementById('cards-container');
            if (container) {
                container.innerHTML = `
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Cargando CPC...</p>
                    </div>
                `;
            }
            await loadCycleData('cpc');
        });
        
        btnCPO.addEventListener('click', async () => {
            if (btnCPO.classList.contains('active')) return;
            btnCPO.classList.add('active');
            btnCPC.classList.remove('active');
            if (subtitle) subtitle.textContent = "Ciclo Profesional Orientado (CPO) — Recomendaciones";
            
            // Show loading state
            const container = document.getElementById('cards-container');
            if (container) {
                container.innerHTML = `
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Cargando CPO...</p>
                    </div>
                `;
            }
            await loadCycleData('cpo');
        });
    }
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
    // Open Borrador in new tab
    const btnBorrador = document.getElementById('btn-open-borrador');
    if (btnBorrador) {
        btnBorrador.addEventListener('click', () => {
            window.open('borrador.html', '_blank');
        });
    }

    // Filters are applied on button click
    const btnApply = document.getElementById('btn-apply-filters');
    if (btnApply) {
        btnApply.addEventListener('click', applyFilters);
    }
    
    // Sort stays immediate
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);

    // Reset filters
    const btnReset = document.getElementById('btn-reset-filters');
    const searchInput = document.getElementById('search-input');
    const subjectFilter = document.getElementById('subject-filter');
    const proStudentFilter = document.getElementById('pro-student-filter');

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            const deptFilter = document.getElementById('dept-filter');
            if (deptFilter) {
                deptFilter.value = '';
                deptFilter.dispatchEvent(new Event('change'));
            }
            if (subjectFilter) subjectFilter.value = '';
            if (sortSelect) sortSelect.value = 'subject';
            if (proStudentFilter) proStudentFilter.checked = false;
            
            // Reset modality radio
            const modAll = document.querySelector('input[name="modality"][value="all"]');
            if (modAll) modAll.checked = true;

            // Reset checkboxes
            document.querySelectorAll('input[name="difficulty"]').forEach(el => el.checked = true);
            document.querySelectorAll('input[name="shifts"]').forEach(el => el.checked = true);
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
            copyText.setSelectionRange(0, 99999);
            
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

    // Generate report button
    const btnReport = document.getElementById('btn-generate-report');
    if (btnReport) {
        btnReport.addEventListener('click', () => {
            openReportModal();
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

    // Report Modal Close
    const closeReportModalBtn = document.getElementById('btn-close-report-modal');
    if (closeReportModalBtn) {
        closeReportModalBtn.addEventListener('click', closeReportModal);
    }
    const reportModalOverlay = document.getElementById('report-modal');
    if (reportModalOverlay) {
        reportModalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'report-modal') closeReportModal();
        });
    }
}
