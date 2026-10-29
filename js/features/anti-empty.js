/* ============================================================
 * anti-empty.js - 终极清理 + 转账/视频渲染外挂
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

        // 2. 遍历消息，渲染特殊消息，清理空气泡
        const wrappers = document.querySelectorAll('.message-wrapper');
        wrappers.forEach(wrapper => {
            const msgId = wrapper.dataset.msgId || wrapper.dataset.id;
            if (!msgId) return;

            const msgData = (typeof messages !== 'undefined') ? messages.find(m => String(m.id) === String(msgId)) : null;
            if (!msgData) return;

            const msgDiv = wrapper.querySelector('.message');
            if (!msgDiv) return;

            // ===== 处理转账消息 =====
            if (msgData.type === 'transfer') {
                if (msgDiv.dataset.renderedTransfer === '1') return;
                if (typeof window.renderTransferCardHTML === 'function') {
                    msgDiv.innerHTML = window.renderTransferCardHTML(msgData);
                    msgDiv.className = 'transfer-card-wrapper';
                    msgDiv.style.background = 'transparent';
                    msgDiv.style.padding = '0';
                    msgDiv.style.boxShadow = 'none';
                    msgDiv.dataset.renderedTransfer = '1';
                    wrapper.style.display = '';
                }
                return; // 拦截完毕，不再往下走
            }

            // ===== 处理视频消息 =====
            if (msgData._video) {
                if (msgDiv.dataset.renderedVideo === '1') return;
                
                const src = msgData._video.src;
                const dur = msgData._video.duration || 5;
                const durStr = '0:' + String(dur).padStart(2, '0');
                
                // 如果没有封面，用一个默认的 SVG 视频占位图
                const cover = msgData.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="135" viewBox="0 0 240 135"><rect width="240" height="135" fill="%23333"/><circle cx="120" cy="67.5" r="24" fill="rgba(255,255,255,0.2)"/><polygon points="115,55 130,67.5 115,80" fill="white"/></svg>';
                
                msgDiv.innerHTML = '<div class="video-bubble" data-video-type="' + (msgData._video.type || 'local') + '" data-video-src="' + src + '">'
                    + '<img src="' + cover + '" style="width:100%;display:block;max-height:150px;object-fit:cover;">'
                    + '<div class="video-overlay">'
                    + '<div class="video-play-btn"><i class="fas fa-play"></i></div>'
                    + '<div class="video-duration">' + durStr + '</div>'
                    + '</div></div>';
                    
                msgDiv.style.padding = '0';
                msgDiv.style.background = 'transparent';
                msgDiv.style.boxShadow = 'none';
                msgDiv.style.maxWidth = '240px';
                msgDiv.dataset.renderedVideo = '1';
                wrapper.style.display = '';
                return; // 拦截完毕，不再往下走
            }

            // ===== 处理空气泡 =====
            if (wrapper.dataset.antiCleaned === '1') return;
            
            const text = (msgDiv.innerText || '').replace(/[\s\u200B-\u200D\uFEFF]/g, '');
            const img = msgDiv.querySelector('img');
            const otherContent = msgDiv.querySelector('.voice-bubble, .transfer-card, .survey-message-wrapper');

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
    }, 1000);
})();