/* ============================================================
 * video-bubble.js - 视频消息（MiniMax 图生视频版）
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'videoSettings_v1';

    let videoSettings = {
        apiKey: '',
        groupId: '',
        model: 'MiniMax-Hailuo-2.3',
        useRealVideo: true
    };

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved && typeof saved === 'object') Object.assign(videoSettings, saved);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, videoSettings); } catch (e) {}
    }
    load();

    // ========== 生成假视频封面（兜底） ==========
    function generateFakeCover() {
        if (typeof window.getRandomPartnerImage === 'function') {
            const img = window.getRandomPartnerImage();
            if (img && img.url) return img.url;
        }
        const W = 640, H = 360;
        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr; canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        const palettes = [
            ['#FF9A8B', '#FF6B6B'], ['#A8D8EA', '#AA96DA'], ['#F4A6B3', '#C5A47E'],
            ['#7FA6CD', '#4A90E2'], ['#BB9EC7', '#9C6FD4'], ['#7BC8A4', '#3BC8A4']
        ];
        const p = palettes[Math.floor(Math.random() * palettes.length)];
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, p[0]); grad.addColorStop(1, p[1]);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        const texts = ['想你了', '来看看你', '刚刚拍的', '给你看', '想起你了', '在忙吗', '抱抱'];
        const txt = texts[Math.floor(Math.random() * texts.length)];
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 48px -apple-system, "PingFang SC", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, W / 2, H / 2);
        return canvas.toDataURL('image/png');
    }

    // ========== 发送对方视频（假视频） ==========
    window.sendPartnerVideoMessage = function (duration, coverUrl) {
        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const cover = coverUrl || generateFakeCover();
        const dur = duration || (3 + Math.floor(Math.random() * 8));
        const msg = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            sender: partnerName,
            text: '',
            image: cover,
            timestamp: new Date(),
            status: 'received',
            type: 'normal',
            _video: { duration: dur, type: 'fake', cover: cover }
        };
        addMessage(msg);
        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(partnerName, '[视频]');
        }
        return msg;
    };

    // ========== 拿参考图（用对方头像） ==========
    function getRefImage() {
        try {
            const img = document.querySelector('#partner-avatar img, [id*="partner-avatar"] img, .partner-avatar img');
            return img ? img.src : null;
        } catch (e) { return null; }
    }

    // ========== 调 MiniMax 图生视频 ==========
    async function generateVideoMiniMax(promptText) {
        const refImage = getRefImage();
        if (!refImage) {
            throw new Error('没有找到对方头像，无法作为参考图');
        }

        // 1. 提交任务
        const submitBody = {
            model: videoSettings.model || 'MiniMax-Hailuo-2.3',
            prompt: promptText || 'The character moves gently, subtle smile, natural motion, cinematic look',
            first_frame_image: refImage,
            duration: 6,
            resolution: '768P'
        };

        const submitResp = await fetch('https://api.minimaxi.com/v1/video_generation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + videoSettings.apiKey
            },
            body: JSON.stringify(submitBody)
        });

        if (!submitResp.ok) {
            const errText = await submitResp.text();
            throw new Error('提交失败：' + submitResp.status + ' ' + errText.slice(0, 200));
        }
        const submitJson = await submitResp.json();
        const taskId = submitJson.task_id;
        if (!taskId) throw new Error('没拿到 task_id：' + JSON.stringify(submitJson).slice(0, 200));

        // 2. 轮询
        const maxTry = 60;
        for (let i = 0; i < maxTry; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const qUrl = 'https://api.minimaxi.com/v1/query/video_generation?task_id=' + encodeURIComponent(taskId);
            const qResp = await fetch(qUrl, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + videoSettings.apiKey
                }
            });
            if (!qResp.ok) continue;
            const qJson = await qResp.json();
            const status = qJson.status || qJson.task_status;
            if (status === 'Success' || status === 'success') {
                // 拿文件
                const fileId = qJson.file_id;
                if (!fileId) throw new Error('没拿到 file_id');
                const fResp = await fetch('https://api.minimaxi.com/v1/files/retrieve?file_id=' + encodeURIComponent(fileId), {
                    method: 'GET',
                    headers: { 'Authorization': 'Bearer ' + videoSettings.apiKey }
                });
                if (!fResp.ok) throw new Error('拿视频文件失败：' + fResp.status);
                const fJson = await fResp.json();
                const videoUrl = fJson.file && (fJson.file.download_url || fJson.file.url);
                if (!videoUrl) throw new Error('没拿到视频 URL');
                return videoUrl;
            }
            if (status === 'Fail' || status === 'fail') {
                throw new Error('任务失败：' + (qJson.error || '未知错误'));
            }
            // 否则继续等
        }
        throw new Error('等太久了，生成超时');
    }

    // ========== 视频选择弹窗 ==========
    window.openVideoPicker = function () {
        const old = document.getElementById('video-picker-panel');
        if (old) old.remove();

        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const hasKey = videoSettings.apiKey && videoSettings.groupId;

        const modal = document.createElement('div');
        modal.id = 'video-picker-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-video" style="color:var(--accent-color);margin-right:8px;"></i>发送视频</span>'
            +     '<div style="display:flex;gap:6px;align-items:center;">'
            +       '<button id="vp-settings" title="视频设置" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;padding:4px 8px;"><i class="fas fa-cog"></i></button>'
            +       '<button id="vp-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;padding:4px 8px;"><i class="fas fa-times"></i></button>'
            +     '</div>'
            +   '</div>'
            +   '<div style="display:flex;flex-direction:column;gap:10px;">'
            +     '<button id="vp-upload" style="display:flex;align-items:center;gap:14px;padding:16px;border:1.5px solid var(--border-color);border-radius:14px;background:var(--primary-bg);cursor:pointer;text-align:left;">'
            +       '<div style="width:42px;height:42px;border-radius:12px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;color:var(--accent-color);flex-shrink:0;font-size:18px;"><i class="fas fa-upload"></i></div>'
            +       '<div>'
            +         '<div style="font-size:14px;font-weight:600;color:var(--text-primary);">上传本地视频</div>'
            +         '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">从手机相册选一段视频发出去</div>'
            +       '</div>'
            +     '</button>'
            +     '<button id="vp-ai" style="display:flex;align-items:center;gap:14px;padding:16px;border:1.5px solid var(--border-color);border-radius:14px;background:var(--primary-bg);cursor:pointer;text-align:left;' + (hasKey ? '' : 'opacity:0.55;') + '">'
            +       '<div style="width:42px;height:42px;border-radius:12px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;color:var(--accent-color);flex-shrink:0;font-size:18px;"><i class="fas fa-magic"></i></div>'
            +       '<div style="flex:1;">'
            +         '<div style="font-size:14px;font-weight:600;color:var(--text-primary);">AI 生成视频</div>'
            +         '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + (hasKey ? '让 ' + partnerName + ' 发一段视频给你（约 30~90 秒）' : '请先在右上角设置里填入 API Key 和 Group ID') + '</div>'
            +       '</div>'
            +     '</button>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#vp-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelector('#vp-settings').onclick = () => {
            close();
            window.openVideoSettings();
        };

        // 上传本地视频
        modal.querySelector('#vp-upload').onclick = () => {
            close();
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'video/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 100 * 1024 * 1024) { showNotification('视频不能超过 100MB', 'error'); return; }
                try {
                    const url = URL.createObjectURL(file);
                    const dur = await new Promise((resolve) => {
                        const v = document.createElement('video');
                        v.preload = 'metadata';
                        v.onloadedmetadata = () => resolve(Math.round(v.duration));
                        v.onerror = () => resolve(5);
                        v.src = url;
                    });
                    addMessage({
                        id: Date.now(), sender: 'user', text: '', image: null,
                        timestamp: new Date(), status: 'sent', type: 'normal',
                        _video: { duration: dur, type: 'local', src: url }
                    });
                    if (typeof playSound === 'function') playSound('send');
                } catch (err) { showNotification('视频加载失败', 'error'); }
            };
            input.click();
        };

        // AI 生成（真 MiniMax）
        modal.querySelector('#vp-ai').onclick = async () => {
            if (!videoSettings.apiKey || !videoSettings.groupId) {
                showNotification('请先点右上角 ⚙️ 填 API Key 和 Group ID', 'warning');
                return;
            }
            close();

            // 显示"正在生成"提示
            const tip = document.createElement('div');
            tip.id = 'video-generating-tip';
            tip.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;background:rgba(0,0,0,0.85);color:#fff;padding:14px 22px;border-radius:14px;font-size:13px;backdrop-filter:blur(10px);box-shadow:0 8px 30px rgba(0,0,0,0.4);display:flex;align-items:center;gap:10px;';
            tip.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></span>正在生成视频，约 30~90 秒…';
            if (!document.getElementById('video-tip-style')) {
                const s = document.createElement('style');
                s.id = 'video-tip-style';
                s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
                document.head.appendChild(s);
            }
            document.body.appendChild(tip);

            try {
                // 从字卡库随机抽 1 条当描述
                let promptText = 'The character moves gently, subtle smile, natural motion, cinematic look';
                try {
                    const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies)) ? customReplies.filter(t => t && String(t).trim()) : [];
                    if (pool.length > 0) {
                        const pick = pool[Math.floor(Math.random() * pool.length)];
                        promptText = 'A young man, natural motion, subtle smile, cinematic lighting, realistic style. Mood: ' + pick;
                    }
                } catch (e) {}

                const videoUrl = await generateVideoMiniMax(promptText);
                tip.innerHTML = '✓ 视频生成成功！';
                setTimeout(() => tip.remove(), 1500);

                // 把生成的视频当成"对方发的视频"发出去
                const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
                addMessage({
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    sender: partnerName,
                    text: '',
                    image: null,
                    timestamp: new Date(),
                    status: 'received',
                    type: 'normal',
                    _video: { duration: 6, type: 'local', src: videoUrl }
                });
                if (typeof playSound === 'function') playSound('message');
                if (typeof showNotification === 'function') showNotification('✓ 视频已生成并发给你', 'success', 2500);
            } catch (err) {
                console.error('[video] 生成失败', err);
                tip.innerHTML = '❌ 生成失败：' + (err.message || '未知错误');
                setTimeout(() => tip.remove(), 4000);
                // 回退到假视频
                if (typeof showNotification === 'function') showNotification('真视频生成失败，已用假视频兜底', 'warning', 3000);
                window.sendPartnerVideoMessage();
            }
        };
    };

    // ========== 点视频 → 全屏播放 ==========
    document.addEventListener('click', function (e) {
        const bubble = e.target.closest('.video-bubble');
        if (!bubble) return;
        const type = bubble.getAttribute('data-video-type');
        const src = bubble.getAttribute('data-video-src');
        if (!src) return;
        e.stopPropagation();
        openFullscreenVideo(src, type);
    });

    function openFullscreenVideo(src, type) {
        const old = document.getElementById('video-fullscreen');
        if (old) old.remove();
        const overlay = document.createElement('div');
        overlay.id = 'video-fullscreen';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
        const closeBtn = '<button id="vf-close" style="position:fixed;top:20px;right:20px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;">×</button>';

        if (type === 'local' || /^https?:/.test(src)) {
            overlay.innerHTML = closeBtn + '<video src="' + src + '" controls autoplay style="max-width:95vw;max-height:88vh;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.6);"></video>';
        } else {
            overlay.innerHTML = closeBtn
                + '<div style="position:relative;max-width:95vw;max-height:88vh;display:flex;align-items:center;justify-content:center;">'
                +   '<img src="' + src + '" style="max-width:95vw;max-height:88vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.6);animation:slowZoom 3s ease-in-out infinite alternate;">'
                + '</div>'
                + '<div style="position:fixed;bottom:40px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.55);font-size:12px;letter-spacing:2px;">— 视频播放中 —</div>';
            if (!document.getElementById('vf-anim-style')) {
                const s = document.createElement('style');
                s.id = 'vf-anim-style';
                s.textContent = '@keyframes slowZoom { from { transform: scale(1); } to { transform: scale(1.06); } }';
                document.head.appendChild(s);
            }
        }

        document.body.appendChild(overlay);
        overlay.querySelector('#vf-close').onclick = () => overlay.remove();
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }

    // ========== 对方主动发视频 ==========
    function scheduleRandomVideo() {
        if (window._videoTimer) clearTimeout(window._videoTimer);
        const delay = (15 + Math.random() * 25) * 60 * 1000;
        window._videoTimer = setTimeout(() => {
            try {
                if (Math.random() < 0.25) {
                    window.sendPartnerVideoMessage();
                    if (typeof showNotification === 'function') {
                        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
                        showNotification(pn + ' 给你发了一段视频 📹', 'info', 2500);
                    }
                }
            } catch (e) { console.warn('[video] random fail', e); }
            scheduleRandomVideo();
        }, delay);
    }
    setTimeout(scheduleRandomVideo, 90000);

    // ========== 视频设置面板（MiniMax） ==========
    window.openVideoSettings = function () {
        const old = document.getElementById('video-settings-panel');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'video-settings-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-video" style="color:var(--accent-color);margin-right:8px;"></i>MiniMax 视频设置</span>'
            +     '<button id="vs2-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">API Key</div>'
            +   '<input id="vs2-key" type="password" placeholder="粘贴 MiniMax API Key" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-family:var(--font-family);outline:none;margin-bottom:12px;">'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">Group ID</div>'
            +   '<input id="vs2-group" type="text" placeholder="粘贴 Group ID" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-family:var(--font-family);outline:none;margin-bottom:12px;">'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">模型</div>'
            +   '<select id="vs2-model" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-family:var(--font-family);outline:none;margin-bottom:14px;">'
            +     '<option value="MiniMax-Hailuo-2.3">MiniMax-Hailuo-2.3（推荐）</option>'
            +     '<option value="MiniMax-Hailuo-2.3-Fast">MiniMax-Hailuo-2.3-Fast（更快更便宜）</option>'
            +   '</select>'
            +   '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;opacity:0.75;">没有 Key 可以去 platform.minimaxi.com 注册并充值。</div>'
            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="vs2-cancel" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +     '<button id="vs2-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'
            + '</div>';
        document.body.appendChild(modal);
        modal.querySelector('#vs2-key').value = videoSettings.apiKey || '';
        modal.querySelector('#vs2-group').value = videoSettings.groupId || '';
        modal.querySelector('#vs2-model').value = videoSettings.model || 'MiniMax-Hailuo-2.3';
        const close = () => modal.remove();
        modal.querySelector('#vs2-close').onclick = close;
        modal.querySelector('#vs2-cancel').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        modal.querySelector('#vs2-save').onclick = async () => {
            videoSettings.apiKey = modal.querySelector('#vs2-key').value.trim();
            videoSettings.groupId = modal.querySelector('#vs2-group').value.trim();
            videoSettings.model = modal.querySelector('#vs2-model').value;
            await save();
            close();
            showNotification('✓ 视频设置已保存', 'success');
        };
    };

    // ========== 样式 ==========
    if (!document.getElementById('video-bubble-style')) {
        const s = document.createElement('style');
        s.id = 'video-bubble-style';
        s.textContent = `
            .video-bubble { position:relative;display:inline-block;max-width:240px;border-radius:12px;overflow:hidden;cursor:pointer;background:#000; }
            .video-bubble img { display:block;width:100%; }
            .video-overlay { position:absolute;inset:0;pointer-events:none; }
            .video-play-btn {
                position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                width:48px;height:48px;border-radius:50%;
                background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);
                display:flex;align-items:center;justify-content:center;
                color:#fff;font-size:16px;border:2px solid rgba(255,255,255,0.6);
                transition:transform 0.2s;
            }
            .video-bubble:hover .video-play-btn { transform:translate(-50%,-50%) scale(1.15); }
            .video-duration {
                position:absolute;bottom:8px;right:8px;
                background:rgba(0,0,0,0.6);color:#fff;
                font-size:11px;padding:2px 7px;border-radius:10px;
                font-family:monospace;
            }
            .video-badge {
                position:absolute;top:8px;left:8px;
                background:rgba(0,0,0,0.6);color:#fff;
                font-size:11px;padding:3px 8px;border-radius:10px;
            }
        `;
        document.head.appendChild(s);
    }
})();