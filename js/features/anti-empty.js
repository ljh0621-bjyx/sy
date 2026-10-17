/* ============================================================
 * anti-empty.js - 终极清理外挂
 * 1. 拦截新空气泡
 * 2. 自动隐藏旧的无效图片框
 * 3. 修复卡死的拼音浮窗
 * ============================================================ */
(function () {
    'use strict';

    // ================= 1. 拦截新空气泡 =================
    function installAddMessageHook() {
        if (typeof window.addMessage !== 'function') {
            setTimeout(installAddMessageHook, 500);
            return;
        }
        if (window._antiEmptyHookInstalled) return;
        window._antiEmptyHookInstalled = true;

        const originalAddMessage = window.addMessage;

        window.addMessage = function (message) {
            if (!message) return false;

            const txt = String(message.text || '').trim();
            const img = typeof message.image === 'string' ? message.image.trim() : '';
            const isValidImg = img.length > 10 && (img.startsWith('http') || img.startsWith('data:image'));

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
                console.warn('🚫 [外挂] 成功拦截空气泡', message);
                return false; 
            }

            if (!isValidImg && message.image) {
                message.image = null;
            }

            return originalAddMessage.apply(this, arguments);
        };
    }

    // ================= 2. 修复卡死的拼音浮窗 =================
    function installFloatHook() {
        if (typeof window.simulatePartnerTypingProcess !== 'function') {
            setTimeout(installFloatHook, 500);
            return;
        }
        if (window._fixFloatInstalled) return;
        window._fixFloatInstalled = true;

        const originalSimulate = window.simulatePartnerTypingProcess;
        window.simulatePartnerTypingProcess = function (text) {
            // 如果传进来的是空文本，直接关闭浮窗，不要启动动画
            if (!text || !String(text).trim()) {
                const floatWin = document.getElementById('rt-float-window');
                if (floatWin) floatWin.style.display = 'none';
                return Promise.resolve();
            }
            return originalSimulate.apply(this, arguments);
        };
        console.log('🛡️ [外挂] 拼音浮窗防卡死已启用');
    }

    // ================= 3. 自动清理已经产生的空气泡 =================
    function cleanOldEmptyBubbles() {
        const container = document.getElementById('chat-container');
        if (!container) return;

        // 寻找所有包含图片的消息
        container.querySelectorAll('.message').forEach(msgDiv => {
            const img = msgDiv.querySelector('img.message-image');
            const text = msgDiv.innerText.replace(/[.\s]/g, '').trim(); // 去掉空格和换行
            
            if (img && !text) {
                const src = img.getAttribute('src');
                // 如果图片没有地址，或者是无效地址，直接隐藏整个外框
                if (!src || src === '' || src === 'null' || src === 'undefined') {
                    const wrapper = msgDiv.closest('.message-wrapper');
                    if (wrapper) {
                        wrapper.style.display = 'none';
                    }
                }
            }
        });
    }

    // 监听页面变化，只要出气泡就检查一次
    function setupDOMObserver() {
        const container = document.getElementById('chat-container');
        if (!container) {
            setTimeout(setupDOMObserver, 1000);
            return;
        }
        if (container._antiEmptyObs) return;
        container._antiEmptyObs = true;

        const obs = new MutationObserver(() => {
            requestAnimationFrame(cleanOldEmptyBubbles);
        });
        obs.observe(container, { childList: true, subtree: true });
        
        setTimeout(cleanOldEmptyBubbles, 1000);
    }

    // 启动所有外挂
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(installAddMessageHook, 1000);
            setTimeout(installFloatHook, 1000);
            setTimeout(setupDOMObserver, 1500);
        });
    } else {
        setTimeout(installAddMessageHook, 1000);
        setTimeout(installFloatHook, 1000);
        setTimeout(setupDOMObserver, 1500);
    }
    
    console.log('🛡️ [anti-empty] 终极清理外挂已加载');
})();