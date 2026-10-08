/* ============================================================
 * fix-reply-save.js
 * 作用：让所有"节流保存"变成"立刻保存"，防止字卡丢失
 * 使用：在 index.html 底部加一行 <script src="js/fix-reply-save.js"></script>
 * ============================================================ */
(function () {
    'use strict';

    // 等页面基本加载完，再劫持
    function installFix() {
        // 如果 throttledSaveData 还不存在，等一会再试
        if (typeof window.throttledSaveData !== 'function') {
            setTimeout(installFix, 300);
            return;
        }

        // 防止重复安装
        if (window._throttleFixInstalled) return;
        window._throttleFixInstalled = true;

        // 保存原始函数（万一以后要恢复）
        var _originalThrottled = window.throttledSaveData;

        // 替换成"立刻保存"
        window.throttledSaveData = function () {
            try {
                if (typeof window.saveData === 'function') {
                    var p = window.saveData();
                    if (p && typeof p.catch === 'function') {
                        p.catch(function (e) {
                            console.error('[fix-reply-save] 保存失败:', e);
                        });
                    }
                } else {
                    // 极端情况：saveData 也没了，退回原函数
                    _originalThrottled.apply(this, arguments);
                }
            } catch (e) {
                console.error('[fix-reply-save] 保存异常:', e);
                try { _originalThrottled.apply(this, arguments); } catch (e2) {}
            }
        };

        console.log('[fix-reply-save] 已安装：throttledSaveData 现在会立刻保存 ✓');
    }

    // 页面加载后再装
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(installFix, 100); });
    } else {
        setTimeout(installFix, 100);
    }
})();