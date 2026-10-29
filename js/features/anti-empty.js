/* ============================================================
 * anti-empty.js - 终极清理 + 视频/转账渲染外挂（支持全格式封面）
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

        // 2. 遍历消息
        const wrappers = document.querySelectorAll('.message-wrapper');
        wrappers.forEach(wrapper => {
            const msgId = wrapper.dataset.msgId || wrapper.dataset.id;
            if (!msgId) return;

            const msgData = (typeof messages !== 'undefined') ? messages.find(m => String(m.id) === String(msgId)) : null;
            if (!msgData) return;

            const msgDiv = wrapper.querySelector('.message');
            if (!msgDiv) return;

            // ===== 处理视频消息（重点修复封面） =====
            if (msgData._video) {
                if (msgDiv.dataset.renderedVideo === '1') return;
                
                const src = msgData._video.src;
                const dur = msgData._video.duration || 14;
                const min = Math.floor(dur / 60);
                const sec = String(dur % 60).padStart(2, '0');
                const durStr = min + ':' + sec;
                
                // 放宽封面限制：支持 http、data:image、blob 等所有格式
                let cover = msgData.image || msgData._video.cover;
                let imgHtml = '';
                if (cover && typeof cover === 'string' && cover.length > 5) {
                    imgHtml = '<img src="' + cover + '" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;">'
                            + '<div style="display:none;width:100%;height:100%;position:absolute;top:0;left:0;background:linear-gradient(135deg,#2a2a2a,#111);align-items:center;justify-content:center;"><i class="fas fa-video" style="font-size:30px;color:rgba(255,255,255,0.2);"></i></div>';
                } else {
                    // 如果完全没有封面，给个好看的默认黑底
                    imgHtml = '<div style="width:100%;height:100%;position:absolute;top:0;left:0;background:linear-gradient(135deg,#2a2a2a,#111);display:flex;align-items:center;justify-content:center;"><i class="fas fa-video" style="font-size:30px;color:rgba(255,255,255,0.2);"></i></div>';
                }

                msgDiv.innerHTML = '<div class="video-bubble" data-video-type="' + (msgData._video.type || 'local') + '" data-video-src="' + src + '" style="position:relative;width:220px;height:140px;border-radius:12px;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.1);">'
                    +   imgHtml
                    +   '<div style="position:absolute;width:46px;height:46px;border-radius:50%;border:2px solid rgba(255,255,255,0.9);background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2;">'
                    +     '<i class="fas fa-play" style="color:#fff;font-size:16px;margin-left:4px;"></i>'
                    +   '</div>'
                    +   '<div style="position:absolute;bottom:8px;right:10px;color:#fff;font-size:11px;font-family:monospace;z-index:2;text-shadow:0 1px 2px #000;">' + durStr + '</div>'
                    + '</div>';
                    
                msgDiv.style.cssText = 'padding:0 !important;background:transparent !important;box-shadow:none !important;max-width:none !important;overflow:visible !important;';
                msgDiv.dataset.renderedVideo = '1';
                wrapper.style.display = '';
                return; 
            }

            // ===== 处理转账消息 =====
            if (msgData.type === 'transfer') {
                if (msgDiv.dataset.renderedTransfer === '1') return;
                if (typeof window.renderTransferCardHTML === 'function') {
                    msgDiv.innerHTML = window.renderTransferCardHTML(msgData);
                    msgDiv.className = 'transfer-card-wrapper';
                    msgDiv.style.cssText = 'padding:0 !important;background:transparent !important;box-shadow:none !important;max-width:none !important;';
                    msgDiv.dataset.renderedTransfer = '1';
                    wrapper.style.display = '';
                }
                return;
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