/* ============================================================
 * favorites-hook.js
 * 钩住 addMessage，让你发消息时立刻触发收藏检测
 * ============================================================ */
(function () {
    'use strict';

    function installHook() {
        if (typeof window.addMessage !== 'function') {
            setTimeout(installHook, 300);
            return;
        }
        if (window._favHookInstalled) return;
        window._favHookInstalled = true;

        const originalAddMessage = window.addMessage;

        window.addMessage = function (message) {
            // 先按原逻辑处理
            const result = originalAddMessage.apply(this, arguments);

            // 再通知收藏模块
            try {
                if (typeof window._checkFavoriteNow === 'function') {
                    window._checkFavoriteNow(message);
                }
            } catch (e) {
                console.warn('[favorites-hook] 触发失败', e);
            }

            return result;
        };

        console.log('[favorites-hook] 已安装，发消息会立刻触发收藏检测 ✓');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(installHook, 500));
    } else {
        setTimeout(installHook, 500);
    }
})();