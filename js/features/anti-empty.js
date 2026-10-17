/* ============================================================
 * anti-empty.js - 物理清理巡查兵（定时强杀）
 * ============================================================ */
(function () {
    'use strict';

    // 每 1.5 秒巡查一次页面
    setInterval(function () {
        // 1. 干掉卡死的拼音浮窗
        const floatWin = document.getElementById('rt-float-window');
        if (floatWin && floatWin.style.display !== 'none') {
            if (!floatWin.dataset.startTime) {
                floatWin.dataset.startTime = Date.now(); // 记录出现时间
            } else if (Date.now() - parseInt(floatWin.dataset.startTime) > 12000) {
                // 超过 12 秒还没消失，直接强杀
                console.warn('🔪 [巡查兵] 强杀卡死的拼音浮窗');
                floatWin.style.display = 'none';
                delete floatWin.dataset.startTime;
                // 尝试重置全局变量防止后续卡死
                try { window._isPlaying = false; window._playCancelled = true; } catch(e){}
            }
        } else if (floatWin) {
            delete floatWin.dataset.startTime;
        }

        // 2. 干掉空气泡 / 空图片
        const wrappers = document.querySelectorAll('.message-wrapper');
        wrappers.forEach(wrapper => {
            // 如果已经被处理过，跳过
            if (wrapper.dataset.antiCleaned === '1') return;

            const msg = wrapper.querySelector('.message');
            if (!msg) return;

            // 提取文字（去掉所有空格和换行）
            const text = (msg.innerText || '').replace(/[\s\u200B-\u200D\uFEFF]/g, '');
            
            // 查找是否有图片
            const img = msg.querySelector('img');
            // 查找是否有其他有效元素（语音、转账、视频等）
            const otherContent = msg.querySelector('.voice-bubble, .transfer-card, .video-bubble, .survey-message-wrapper');

            let needHide = false;

            // 判定：如果没有文字，也没有其他内容
            if (!text && !otherContent) {
                if (!img) {
                    // 连图片都没有，绝对是空气泡
                    needHide = true;
                } else {
                    // 有图片，但检查图片是否有效（加载失败或没有src）
                    const src = img.getAttribute('src');
                    if (!src || src.length < 10 || !img.complete || img.naturalWidth === 0) {
                        needHide = true; // 坏图片，把它连同外框一起隐藏
                    }
                }
            }

            if (needHide) {
                console.warn('🧹 [巡查兵] 扫除空气泡/坏图片', wrapper);
                wrapper.style.display = 'none';
                wrapper.dataset.antiCleaned = '1';
            }
        });
    }, 1500);

    console.log('🛡️ [anti-empty] 物理清理巡查兵已启动');
})();