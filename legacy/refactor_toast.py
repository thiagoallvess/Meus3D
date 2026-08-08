import os
import re

TOAST_FN = """
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
"""

def main():
    # 1. Append showToast to shared.js
    with open('shared.js', 'a', encoding='utf-8') as f:
        f.write('\n' + TOAST_FN)

    # 2. Remove showToast from all other JS files
    js_files = [f for f in os.listdir('.') if f.endswith('.js') and f != 'shared.js']
    
    for fname in js_files:
        with open(fname, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Regex to find function showToast(...) { ... } handling nested braces
        pattern = re.compile(r'function\s+showToast\s*\([^)]*\)\s*\{', re.MULTILINE)
        
        while True:
            match = pattern.search(content)
            if not match:
                break
            
            start_idx = match.start()
            block_start_idx = match.end() - 1
            brace_count = 0
            end_idx = -1
            
            for i in range(block_start_idx, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i + 1
                        break
                        
            if end_idx != -1:
                content = content[:start_idx] + "/* showToast removed -> using shared.js */" + content[end_idx:]
            else:
                break
                
        with open(fname, 'w', encoding='utf-8') as f:
            f.write(content)

    print("Toasts refactored successfully.")

if __name__ == '__main__':
    main()
