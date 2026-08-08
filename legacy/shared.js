// Onboarding Check
if (!localStorage.getItem('meus3d_onboarding_done') && !window.location.pathname.endsWith('onboarding.html')) {
    window.location.href = 'onboarding.html';
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDrawer);
} else {
    initDrawer();
}

function initDrawer() {
    const menuToggles = document.querySelectorAll('.menu-toggle, #menuToggle, #openDrawer');
    const drawer = document.getElementById('appDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const closeDrawerBtn = document.getElementById('closeDrawer');

    if (!drawer || !overlay) return;

    function openDrawer() {
        drawer.classList.add('open');
        overlay.classList.add('visible');
    }

    function closeDrawer() {
        drawer.classList.remove('open');
        overlay.classList.remove('visible');
    }

    menuToggles.forEach(btn => btn.addEventListener('click', openDrawer));
    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', closeDrawer);
    }
    overlay.addEventListener('click', closeDrawer);

    // Fechar drawer ao apertar Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
            closeDrawer();
        }
    });
}


// ==========================================
// TOAST NOTIFICATIONS (Globally available)
// ==========================================
window.showToast = function(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        // Add minimal CSS if style.css didn't load properly, else style.css handles it
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 9999;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Some inline styles to ensure it works even if CSS is missing some classes
    toast.style.cssText = 'background: var(--bg-elevated, #1f2937); color: var(--text-primary, #f9fafb); padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 12px; font-size: 14px; animation: slideIn 0.3s ease forwards; transition: opacity 0.3s ease;';
    
    if (type === 'success') toast.style.borderLeft = '3px solid var(--accent-green, #10b981)';
    else if (type === 'error') toast.style.borderLeft = '3px solid var(--accent-red, #ef4444)';
    else toast.style.borderLeft = '3px solid var(--accent-blue, #3b82f6)';

    let icon = '';
    if (type === 'success') {
        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-green, #10b981)" stroke-width="2" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-red, #ef4444)" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue, #3b82f6)" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};
