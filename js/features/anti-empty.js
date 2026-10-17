/* ============================================================
 * anti-empty.js - 终极清理外挂（DOM层级暴力拦截）
 * ============================================================ */
(function () {
    'use strict';

    // ================= 1. 暴力清理页面上的空气泡和空图片 =================
    function forceCleanDOM() {
        const container = document.getElementById('chat-container');
        if (!container) return;

        // 获取所有消息外壳
        const wrappers = container.querySelectorAll('.message-wrapper');
        
        wrappers.forEach(wrapper => {
            // 如果已经被隐藏过，跳过
            if (wrapper.dataset.antiCleaned === '1') return;

            const msgDiv = wrapper.querySelector('.message');
            if (!msgDiv) return;

            // 提取消息里的文本内容（去掉空格、换行、零宽字符）
            const text = (msgDiv.innerText || '').replace(/[\s\u200B-\u200D\uFEFF]/g, '');
            
            // 查找里面的图片
            const img = msgDiv.querySelector('img.message-image');
            let isValidImage = false;
            
            if (img) {
                const src = img.getAttribute('src');
                // 只要 src 长度大于 10，并且是 http 或 data:image 开头，就是有效图片
                if (src && src.length > 10 && (src.startsWith('http') || src.startsWith('data:image'))) {
                    // 再加一步：检查图片是否真的加载出来了（宽度大于0）
                    if (img.complete && img.naturalWidth > 0) {
                        isValidImage = true;
                    } else {
                        // 图片加载失败或还在加载，先当作无效处理
                        isValidImage = false;
                    }
                }
            }

            // 检查是否有其他有效内容（语音、视频、转账、系统提示）
            const hasOther = msgDiv.querySelector('.voice-bubble, .video-bubble, .transfer-card') || 
                             msgDiv.classList.contains('system-message') || 
                             msgDiv.classList.contains('call-event-message') ||
                             msgDiv.querySelector('.survey-message-wrapper');

            // ★ 核心判定：如果没有文字、没有有效图片、没有其他内容，直接隐藏！
            if (!text && !isValidImage && !hasOther) {
                console.warn('🚫 [DOM拦截] 发现空气泡，已隐藏', wrapper);
                wrapper.style.display = 'none';
                wrapper.dataset.antiCleaned = '1';
            }
        });
    }

    // ================= 2. 强力干掉卡死的拼音浮窗 =================
    let floatCheckTimer = null;
    function killStuckFloat() {
        const floatWin = document.getElementById('rt-float-window');
        if (!floatWin) {
            clearTimeout(floatCheckTimer);
            floatCheckTimer = null;
            return;
        }

        // 如果浮窗是显示的，且超过 15 秒没有消失，直接强杀！
        if (floatWin.style.display !== 'none') {
            if (!floatWin.dataset.startTime) {
                floatWin.dataset.startTime = Date.now();
            } else {
                const duration = Date.now() - parseInt(floatWin.dataset.startTime);
                if (duration > 15000) { // 15秒
                    console.warn('🔪 [强杀] 拼音浮窗卡死超时，强制隐藏');
                    floatWin.style.display = 'none';
                    delete floatWin.dataset.startTime;
                    
                    // 尝试重置状态变量（如果存在）
                    if (typeof _isPlaying !== 'undefined') _isPlaying = false;
                    if (typeof _playCancelled !== 'undefined') _playCancelled = true;
                }
            }
        } else {
            delete floatWin.dataset.startTime;
        }

        floatCheckTimer = setTimeout(killStuckFloat, 2000); // 每2秒检查一次
    }

    // ================= 3. 监听页面变化，持续清理 =================
    function setupObserver() {
        const container = document.getElementById('chat-container');
        if (!container) {
            setTimeout(setupObserver, 1000);
            return;
        }
        if (container._antiEmptyObs) return;
        container._antiEmptyObs = true;

        // 每次聊天界面更新，就立刻执行一次清理
        const obs = new MutationObserver(() => {
            forceCleanDOM();
        });
        obs.observe(container, { childList: true, subtree: true });
        
        // 初始执行一次
        setTimeout(forceCleanDOM, 1000);
        
        // 启动浮窗监控
        killStuckFloat();
    }

    // ================= 4. 拦截 addMessage (防止生成新气泡) =================
    function hookAddMessage() {
        if (typeof window.addMessage !== 'function') {
            setTimeout(hookAddMessage, 500);
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

            if (message.type !== 'system' && message.type !== 'call-event' && 
                !txt && !isValidImg && !message.voiceUrl && !message._video && 
                !message.transfer && !message.survey) {
                console.warn('🚫 [外挂] 成功拦截空气泡', message);
                return false; 
            }
            return originalAddMessage.apply(this, arguments);
        };
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            hookAddMessage();
            setupObserver();
        });
    } else {
        hookAddMessage();
        setupObserver();
    }
    
    console.log('🛡️ [anti-empty] 终极物理清理外挂已加载');
})();