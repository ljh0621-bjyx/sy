/* ============================================================
 * anti-empty.js - 空气泡终极拦截器
 * 不需要修改 core.js，直接在外部拦截无效消息
 * ============================================================ */
(function () {
    'use strict';

    function installHook() {
        if (typeof window.addMessage !== 'function') {
            setTimeout(installHook, 500);
            return;
        }
        if (window._antiEmptyHookInstalled) return;
        window._antiEmptyHookInstalled = true;

        const originalAddMessage = window.addMessage;

        window.addMessage = function (message) {
            if (!message) return false;

            // 1. 获取清理后的文字
            const txt = String(message.text || '').trim();

            // 2. 判断图片是否有效（长度必须大于10，且是合法的 http 或 base64 链接）
            const img = typeof message.image === 'string' ? message.image.trim() : '';
            const isValidImg = img.length > 10 && (img.startsWith('http') || img.startsWith('data:image'));

            // 3. 终极判定：如果是普通消息，但啥内容都没有，直接拦截！
            if (
                message.type !== 'system' &&
                message.type !== 'call-event' &&
                !txt &&
                !isValidImg &&
                !message.voiceUrl &&
                !message._video &&
                !message.transfer &&
                !message.survey
            ) {
                console.warn('🚫 [拦截器] 成功拦截了一条空气泡', message);
                return false; // 直接掐断，不往下执行
            }

            // 4. 容错处理：如果带了无效图片，强制把 image 删掉，防止出空框
            if (!isValidImg && message.image) {
                message.image = null;
            }

            // 放行合法的消息
            return originalAddMessage.apply(this, arguments);
        };

        console.log('🛡️ [anti-empty] 空气泡终极拦截器已加载');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(installHook, 1500));
    } else {
        setTimeout(installHook, 1500);
    }
})();