/* ============================================================
 * anti-empty.js - 终极清理 + 视频封面/转账渲染外挂
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

            // ===== 处理视频消息（包含封面提取） =====
            if (msgData._video) {
                if (msgDiv.dataset.renderedVideo === '1') return;
                
                const src = msgData._video.src;
                const dur = msgData._video.duration || 14;
                const min = Math.floor(dur / 60);
                const sec = String(dur % 60).padStart(2, '0');
                const durStr = min + ':' + sec;
                
                let cover = msgData.image || msgData._video.cover;
                let imgHtml = '';
                
                // 如果有通过 canvas 截到的有效图片，优先用图片
                if (cover && typeof cover === 'string' && cover.length > 10) {
                    imgHtml = '<img src="' + cover + '" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'block\';" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;pointer-events:none;">'
                            + '<video src="' + src + '" preload="metadata" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;pointer-events:none;" muted playsinline webkit-playsinline></video>';
                } else {
                    // ★ 核心绝招：如果没有截到图，直接拿 video 当封面，让浏览器去加载第一帧
                    imgHtml = '<video src="' + src + '" preload="metadata" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;pointer-events:none;" muted playsinline webkit-playsinline></video>';
                }

                msgDiv.innerHTML = '<div class="video-bubble" data-video-type="' + (msgData._video.type || 'local') + '" data-video-src="' + src + '" style="position:relative;width:220px;height:140px;border-radius:12px;overflow:hidden;background:#111;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.1);">'
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

// ===== 处理黑胶唱片 =====
if (msgData.isVinylMusic) {
    if (msgDiv.dataset.renderedVinyl === '1') return;
    const m = msgData.musicData;
    
    msgDiv.innerHTML = `
        <div onclick="window.openVinylPlayer('${msgData.id}')" style="background:linear-gradient(135deg, #2b2b36, #18181f); border-radius:12px; padding:12px; width:240px; cursor:pointer; text-align:left; border:1px solid rgba(255,255,255,0.1); box-shadow:0 4px 12px rgba(0,0,0,0.2); display:flex; align-items:center; gap:12px;">
            <div style="width:44px; height:44px; border-radius:50%; overflow:hidden; border:2px solid #333; flex-shrink:0;">
                <img src="${m.cover}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="flex:1; min-width:0;">
                <div style="font-size:14px; color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.title}</div>
                <div style="font-size:11px; color:#999; margin-top:2px;">${m.artist}</div>
            </div>
            <div style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0;">
                <i class="fas fa-play" style="font-size:10px; margin-left:2px;"></i>
            </div>
        </div>
    `;
    
    msgDiv.style.cssText = 'padding:0 !important; background:transparent !important; box-shadow:none !important; max-width:none !important;';
    msgDiv.dataset.renderedVinyl = '1';
    wrapper.style.display = '';
    wrapper.dataset.antiCleaned = '1'; 
    return;
}
// ===== 处理盲盒消息 =====
if (msgData.isSurpriseBox) {
    // ★ 新增：如果已经拆开，显示灰掉的盒子
    if (msgData.isOpened || msgData.opened) {
        if (msgDiv.dataset.renderedBox === '1') return;
        msgDiv.innerHTML = `
            <div style="background:#f0f0f0; border:1.5px dashed #ccc; border-radius:12px; padding:16px; width:220px; text-align:center; opacity:0.6;">
                <div style="font-size:40px; margin-bottom:8px; filter:grayscale(1);">🎁</div>
                <div style="font-size:13px; color:#999; font-weight:700;">已拆开</div>
            </div>
        `;
        msgDiv.style.cssText = 'padding:0 !important; background:transparent !important; box-shadow:none !important; max-width:none !important;';
        msgDiv.dataset.renderedBox = '1';
        wrapper.style.display = '';
        wrapper.dataset.antiCleaned = '1'; 
        return;
    }

    if (msgDiv.dataset.renderedBox === '1') return;
    
    // 注入晃动动画
    if (!document.getElementById('box-anim-style')) {
        const style = document.createElement('style');
        style.id = 'box-anim-style';
        style.textContent = '@keyframes shakeBox { 0%{transform:rotate(0)} 25%{transform:rotate(-15deg) scale(1.1)} 50%{transform:rotate(15deg) scale(1.1)} 75%{transform:rotate(-10deg) scale(1.05)} 100%{transform:rotate(0)} }';
        document.head.appendChild(style);
    }

    msgDiv.innerHTML = `
        <div onclick="window.openSurpriseBox('${msgData.id}', this)" style="background:linear-gradient(135deg, #FFE5E5, #FFF0F5); border:1.5px dashed #FF6699; border-radius:12px; padding:16px; width:220px; cursor:pointer; text-align:center; box-shadow:0 4px 12px rgba(255,102,153,0.15);">
            <div style="font-size:40px; margin-bottom:8px; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.1));">🎁</div>
            <div style="font-size:13px; color:#FF6699; font-weight:700;">点击拆开盲盒</div>
        </div>
    `;
    
    msgDiv.style.cssText = 'padding:0 !important; background:transparent !important; box-shadow:none !important; max-width:none !important;';
    msgDiv.dataset.renderedBox = '1';
    wrapper.style.display = '';
    wrapper.dataset.antiCleaned = '1'; 
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

            // ===== 处理敲门卡片 =====
            if (msgData.isRoomInvite) {
                if (msgDiv.dataset.renderedRoom === '1') return;
                
                msgDiv.innerHTML = `
                    <div data-action="enter-room" style="background:#f2f2f2; border-radius:12px; padding:12px; width:240px; cursor:pointer; text-align:left; border:1px solid #e0e0e0; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                        <div style="font-size:12px; color:#888; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                            <i class="fas fa-home"></i> 希望可以进你家
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:44px; height:44px; background:#dcdcdc; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0;">🚪</div>
                            <div style="font-size:13px; color:#333; flex:1; line-height:1.5; font-weight:500;">咚咚。我在门口，可以进去吗？</div>
                        </div>
                    </div>
                `;
                
                msgDiv.style.cssText = 'padding:0 !important; background:transparent !important; box-shadow:none !important; max-width:none !important;';
                msgDiv.dataset.renderedRoom = '1';
                wrapper.style.display = '';
                wrapper.dataset.antiCleaned = '1'; 
                return;
            }

            // ===== 处理空气泡 =====
            if (wrapper.dataset.antiCleaned === '1') return;
            
            const text = (msgDiv.innerText || '').replace(/[\s\u200B-\u200D\uFEFF]/g, '');
            const img = msgDiv.querySelector('img');
            const otherContent = msgDiv.querySelector('.voice-bubble, .transfer-card, .survey-message-wrapper, .video-bubble');

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

// ===== 全局监听房间卡片点击 =====
document.addEventListener('click', function(e) {
    if (e.target.closest('[data-action="enter-room"]')) {
        if (typeof window.enterHisRoom === 'function') {
            window.enterHisRoom();
        }
    }
});