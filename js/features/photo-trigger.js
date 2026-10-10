/* ============================================================
 * photo-trigger.js - 手动触发"对方发照片"
 * 点按钮 → 对方立刻发一张图生图（用专属照片当参考）
 * ============================================================ */
(function () {
    'use strict';

    // ========== 从专属照片里随机抽一张 ==========
    function pickSelfPhoto() {
        try {
            if (typeof window.getRandomSelfPhoto === 'function') {
                const p = window.getRandomSelfPhoto();
                if (p && p.url) return p;
            }
        } catch (e) {}
        return null;
    }

    // ========== 从字卡库随机抽一句当描述 ==========
    function pickPrompt() {
        const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(t => t && String(t).trim())
            : [];
        const motions = [
            '坐在窗边，微微侧头看着镜头',
            '站在阳台，风吹头发，微笑',
            '躺在沙发上，单手托腮',
            '穿着白色衬衫，靠在墙边',
            '拿着咖啡杯，低头轻笑',
            '站在镜子前，看着自己的倒影',
            '坐在床边，双手自然放在膝盖上',
            '站在雨里，撑着伞抬头看',
        ];
        const mood = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : '';
        const motion = motions[Math.floor(Math.random() * motions.length)];
        return {
            motion: motion,
            full: 'A young man with dark hair, ' + motion + ', cinematic lighting, realistic style, high quality, 8k' + (mood ? ', mood: ' + mood : '')
        };
    }

    // ========== 手动触发 ==========
    window.triggerPartnerPhoto = async function () {
        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        // 1. 拿参考图（专属照片）
        const ref = pickSelfPhoto();
        if (!ref) {
            if (typeof showNotification === 'function') {
                showNotification('对方还没有专属照片，请先去"对方图片库"上传', 'warning', 3000);
            }
            return;
        }

        // 2. 拼描述
        const p = pickPrompt();

        // 3. 显示"正在生成"
        const tip = document.createElement('div');
        tip.id = 'photo-generating-tip';
        tip.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;background:rgba(0,0,0,0.85);color:#fff;padding:14px 22px;border-radius:14px;font-size:13px;backdrop-filter:blur(10px);box-shadow:0 8px 30px rgba(0,0,0,0.4);display:flex;align-items:center;gap:10px;';
        tip.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></span>正在生成照片，约 10~30 秒…';
        if (!document.getElementById('photo-tip-style')) {
            const s = document.createElement('style');
            s.id = 'photo-tip-style';
            s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(s);
        }
        document.body.appendChild(tip);

        try {
            // 4. 调图生图
            if (typeof window.generateAIImageWithReference !== 'function') {
                throw new Error('图生图功能未加载');
            }
            const imgUrl = await window.generateAIImageWithReference(p.full, ref.url);

            if (!imgUrl) throw new Error('图生图返回空');

            tip.innerHTML = '✓ 生成成功';
            setTimeout(() => tip.remove(), 1200);

            // 5. 发到聊天
            const msg = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: partnerName,
                text: '',
                image: imgUrl,
                timestamp: new Date(),
                status: 'received',
                type: 'normal'
            };
            addMessage(msg);

            if (typeof playSound === 'function') playSound('message');
            if (typeof window._sendPartnerNotification === 'function') {
                window._sendPartnerNotification(partnerName, '[图片]');
            }
        } catch (err) {
            console.error('[photo-trigger] 失败', err);
            tip.innerHTML = '❌ 生成失败：' + (err.message || '未知错误');
            setTimeout(() => tip.remove(), 4000);

            // 回退：直接发原参考图
            if (typeof showNotification === 'function') {
                showNotification('图生图失败，已用原图兜底', 'warning', 3000);
            }
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: partnerName,
                text: '',
                image: ref.url,
                timestamp: new Date(),
                status: 'received',
                type: 'normal'
            });
            if (typeof playSound === 'function') playSound('message');
        }
    };

    // ========== 随机触发开关（默认关，手动按钮开） ==========
    const RANDOM_KEY = getStorageKey('partnerRandomPhotoEnabled');
    let randomEnabled = localStorage.getItem(RANDOM_KEY) === '1';
    let randomTimer = null;

    function scheduleRandom() {
        if (randomTimer) clearTimeout(randomTimer);
        if (!randomEnabled) return;
        const delay = (30 + Math.random() * 60) * 60 * 1000; // 30~90 分钟
        randomTimer = setTimeout(() => {
            try { window.triggerPartnerPhoto(); } catch (e) {}
            scheduleRandom();
        }, delay);
    }
    scheduleRandom();

    window.setPartnerPhotoRandom = function (on) {
        randomEnabled = !!on;
        localStorage.setItem(RANDOM_KEY, randomEnabled ? '1' : '0');
        scheduleRandom();
        if (typeof showNotification === 'function') {
            showNotification(randomEnabled ? '已开启随机发照片' : '已关闭随机发照片', 'success', 2000);
        }
    };
})();