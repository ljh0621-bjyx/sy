/* ============================================================
 * anti-empty.js - 终极清理 + 转账渲染外挂
 * ============================================================ */
(function () {
    'use strict';

    setInterval(function () {
        // 1. 干掉卡死的拼音浮窗
        const floatWin = document.getElementById('rt-float-window');
        if (floatWin && floatWin.style.display !== 'none') {
            if (!floatWin.dataset.startTime) {
                floatWin.dataset.startTime = Date.now();
            } else if (Date.now() - parseInt(floatWin.dataset.startTime) > 12000) {
                floatWin.style.display = 'none';
                delete floatWin.dataset.startTime;
                try { window._isPlaying = false; window._playCancelled = true; } catch(e){}
            }
        } else if (floatWin) {
            delete floatWin.dataset.startTime;
        }

        // 2. 遍历消息，渲染转账，清理空气泡
        const wrappers = document.querySelectorAll('.message-wrapper');
        wrappers.forEach(wrapper => {
            const msgId = wrapper.dataset.msgId || wrapper.dataset.id;
            if (!msgId) return;

            // ★ 关键：查找这条消息的真实数据
            const msgData = (typeof messages !== 'undefined') ? messages.find(m => String(m.id) === String(msgId)) : null;
            if (!msgData) return;

            const msgDiv = wrapper.querySelector('.message');
            if (!msgDiv) return;

            // ===== 处理转账消息 =====
            if (msgData.type === 'transfer') {
                // 如果已经渲染过了，跳过
                if (msgDiv.dataset.renderedTransfer === '1') return;
                
                // 用 transfer.js 里的渲染函数把卡片画出来
                if (typeof window.renderTransferCardHTML === 'function') {
                    msgDiv.innerHTML = window.renderTransferCardHTML(msgData);
                    msgDiv.className = 'transfer-card-wrapper';
                    msgDiv.style.background = 'transparent';
                    msgDiv.style.padding = '0';
                    msgDiv.style.boxShadow = 'none';
                    msgDiv.dataset.renderedTransfer = '1';
                }
                return; // 转账处理完了，千万别去下面被当成空气泡清理掉
            }

            // ===== 处理空气泡 =====
            if (wrapper.dataset.antiCleaned === '1') return;
            
            const text = (msgDiv.innerText || '').replace(/[\s\u200B-\u200D\uFEFF]/g, '');
            const img = msgDiv.querySelector('img');
            const otherContent = msgDiv.querySelector('.voice-bubble, .video-bubble, .survey-message-wrapper');

            let needHide = false;
            if (!text && !otherContent) {
                if (!img) {
                    needHide = true;
                } else {
                    const src = img.getAttribute('src');
                    if (!src || src.length < 10 || !img.complete || img.naturalWidth === 0) {
                        needHide = true;
                    }
                }
            }

            if (needHide) {
                wrapper.style.display = 'none';
                wrapper.dataset.antiCleaned = '1';
            }
        });
    }, 1000); // 每秒检查一次

    console.log('🛡️ [anti-empty] 终极清理 + 转账渲染已启动');
})();