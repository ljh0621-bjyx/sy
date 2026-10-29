/* ============================================================
 * fix-surprise-box.js - 修复拆过的盲盒重复拆开
 * ============================================================ */
(function () {
    'use strict';

    function installHook() {
        if (typeof window.openSurpriseBox !== 'function') {
            setTimeout(installHook, 500);
            return;
        }
        if (window._fixSurpriseBoxInstalled) return;
        window._fixSurpriseBoxInstalled = true;

        const originalOpen = window.openSurpriseBox;
        
        window.openSurpriseBox = function (id, el) {
            try {
                if (typeof messages !== 'undefined' && Array.isArray(messages)) {
                    const msg = messages.find(m => String(m.id) === String(id));
                    
                    if (msg && (msg.isOpened || msg.opened)) {
                        if (typeof showNotification === 'function') {
                            showNotification('这个盲盒已经拆过啦', 'info', 1500);
                        }
                        return; 
                    }
                    
                    if (originalOpen) {
                        originalOpen.apply(this, arguments);
                    }
                    
                    if (msg) {
                        msg.isOpened = true;
                        if (typeof throttledSaveData === 'function') {
                            throttledSaveData();
                        }
                    }
                    
                    setTimeout(function() {
                        if (typeof renderMessages === 'function') {
                            renderMessages(true);
                        }
                    }, 500);
                } else {
                    if (originalOpen) originalOpen.apply(this, arguments);
                }
            } catch (e) {
                console.warn('[fix-surprise-box] error', e);
                if (originalOpen) originalOpen.apply(this, arguments);
            }
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(installHook, 1000); });
    } else {
        setTimeout(installHook, 1000);
    }
})();