/* ============================================================
 * video-bubble.js - 视频消息（假视频版，真视频接口预留）
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'videoSettings_v1';

    let videoSettings = {
        apiKey: '',           // 智谱 API Key（暂时不用）
        model: 'cogvideox-3',
        enableRealVideo: false // 是否用真视频接口
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

    // ========== 生成假视频封面（Canvas） ==========
    function generateFakeCover() {
        // 优先：从对方图片库随机抽
        if (typeof window.getRandomPartnerImage === 'function') {
            const img = window.getRandomPartnerImage();
            if (img && img.url) return img.url;
        }
        // 兜底：Canvas 画渐变 + 文字
        const W = 640, H = 360;
        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // 随机渐变色
        const palettes = [
            ['#FF9A8B', '#FF6B6B'],
            ['#A8D8EA', '#AA96DA'],
            ['#F4A6B3', '#C5A47E'],
            ['#7FA6CD', '#4A90E2'],
            ['#BB9EC7', '#9C6FD4'],
            ['#7BC8A4', '#3BC8A4']
        ];
        const p = palettes[Math.floor(Math.random() * palettes.length)];
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, p[0]);
        grad.addColorStop(1, p[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // 随机文字
        const texts = ['想你了', '来看看你', '刚刚拍的', '给你看', '想起你了', '在忙吗', '抱抱'];
        const txt = texts[Math.floor(Math.random() * texts.length)];
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 48px -apple-system, "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, W / 2, H / 2);

        return canvas.toDataURL('image/png');
    }

    // ========== 视频气泡 HTML ==========
    function buildVideoBubbleHTML(coverUrl, duration, isLocalVideo, videoSrc) {
        const dur = duration || 5;
        const durStr = '0:' + String(dur).padStart(2, '0');
        if (isLocalVideo && videoSrc) {
            // 真视频（本地）
            return '<div class="video-bubble" data-video-src="' + videoSrc + '" data-video-type="local">'
                +   '<video src="' + videoSrc + '" preload="metadata" style="width:100%;display:block;border-radius:12px;"></video>'
                +   '<div class="video-overlay">'
                +     '<div class="video-play-btn"><i class="fas fa-play"></i></div>'
                +     '<div class="video-duration">' + durStr + '</div>'
                +   '</div>'
                + '</div>';
        }
        // 假视频（封面图）
        return '<div class="video-bubble" data-video-src="' + coverUrl + '" data-video-type="fake">'
            +   '<img src="' + coverUrl + '" style="width:100%;display:block;border-radius:12px;">'
            +   '<div class="video-overlay">'
            +     '<div class="video-play-btn"><i class="fas fa-play"></i></div>'
            +     '<div class="video-duration">' + durStr + '</div>'
            +     '<div class="video-badge"><i class="fas fa-video"></i></div>'
            +   '</div>'
            + '</div>';
    }
    window.buildVideoBubbleHTML = buildVideoBubbleHTML;

    // ========== 发送视频消息（对方发的假视频） ==========
    window.sendPartnerVideoMessage = function (duration) {
        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const cover = generateFakeCover();
        const dur = duration || (3 + Math.floor(Math.random() * 8));

        // 生成消息（用 image 字段，但额外标记 _video）
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

    // ========== 我发视频（本地真视频） ==========
    window.openVideoPicker = function () {
        const old = document.getElementById('video-picker-panel');
        if (old) old.remove();

        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        const modal = document.createElement('div');
        modal.id = 'video-picker-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-video" style="color:var(--accent-color);margin-right:8px;"></i>发送视频</span>'
            +     '<button id="vp-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="display:flex;flex-direction:column;gap:10px;">'
            +     '<button id="vp-upload" style="display:flex;align-items:center;gap:14px;padding:16px;border:1.5px solid var(--border-color);border-radius:14px;background:var(--primary-bg);cursor:pointer;text-align:left;">'
            +       '<div style="width:42px;height:42px;border-radius:12px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;color:var(--accent-color);flex-shrink:0;font-size:18px;"><i class="fas fa-upload"></i></div>'
            +       '<div>'
            +         '<div style="font-size:14px;font-weight:600;color:var(--text-primary);">上传本地视频</div>'
            +         '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">从手机相册选一段视频发出去</div>'
            +       '</div>'
            +     '</button>'
            +     '<button id="vp-ai" style="display:flex;align-items:center;gap:14px;padding:16px;border:1.5px solid var(--border-color);border-radius:14px;background:var(--primary-bg);cursor:pointer;text-align:left;opacity:0.55;">'
            +       '<div style="width:42px;height:42px;border-radius:12px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;color:var(--accent-color);flex-shrink:0;font-size:18px;"><i class="fas fa-magic"></i></div>'
            +       '<div style="flex:1;">'
            +         '<div style="font-size:14px;font-weight:600;color:var(--text-primary);">AI 生成视频</div>'
            +         '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">让 ' + partnerName + ' 发一段视频给你（需先填 API Key）</div>'
            +       '</div>'
            +     '</button>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#vp-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        // 上传本地视频
        modal.querySelector('#vp-upload').onclick = () => {
            close();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 100 * 1024 * 1024) { showNotification('视频不能超过 100MB', 'error'); return; }
                try {
                    const url = URL.createObjectURL(file);
                    // 读时长
                    const dur = await new Promise((resolve) => {
                        const v = document.createElement('video');
                        v.preload = 'metadata';
                        v.onloadedmetadata = () => resolve(Math.round(v.duration));
                        v.onerror = () => resolve(5);
                        v.src = url;
                    });
                    addMessage({
                        id: Date.now(),
                        sender: 'user',
                        text: '',
                        image: null,
                        timestamp: new Date(),
                        status: 'sent',
                        type: 'normal',
                        _video: { duration: dur, type: 'local', src: url }
                    });
                    if (typeof playSound === 'function') playSound('send');
                } catch (err) {
                    showNotification('视频加载失败', 'error');
                }
            };
            input.click();
        };

        // AI 生成（暂未开放）
        modal.querySelector('#vp-ai').onclick = () => {
            if (!videoSettings.apiKey) {
                showNotification('请先在设置里填入智谱 API Key', 'warning');
                return;
            }
            close();
            window.sendPartnerVideoMessage();
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

        if (type === 'local') {
            overlay.innerHTML = closeBtn + '<video src="' + src + '" controls autoplay style="max-width:95vw;max-height:88vh;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.6);"></video>';
        } else {
            // 假视频：显示一张图，加点"播放"的动效
            overlay.innerHTML = closeBtn
                + '<div style="position:relative;max-width:95vw;max-height:88vh;display:flex;align-items:center;justify-content:center;">'
                +   '<img src="' + src + '" style="max-width:95vw;max-height:88vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.6);animation:slowZoom 3s ease-in-out infinite alternate;">'
                + '</div>'
                + '<div style="position:fixed;bottom:40px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.55);font-size:12px;letter-spacing:2px;">— 视频播放中 —</div>';

            // 加动画 CSS
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

    // ========== 对方主动发视频（每 15~40 分钟一次，25% 概率） ==========
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

    // ========== 视频设置面板（API Key 等） ==========
    window.openVideoSettings = function () {
        const old = document.getElementById('video-settings-panel');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'video-settings-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-video" style="color:var(--accent-color);margin-right:8px;"></i>视频设置</span>'
            +     '<button id="vs2-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">智谱 API Key</div>'
            +   '<input id="vs2-key" type="password" placeholder="还没填，先留空" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-family:var(--font-family);outline:none;margin-bottom:12px;">'
            +   '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;opacity:0.75;">还没申请的话，可以去 open.bigmodel.cn 免费注册拿 Key。<br>填了 Key 之后，就能用真视频接口了。</div>'
            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="vs2-cancel" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +     '<button id="vs2-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'
            + '</div>';
        document.body.appendChild(modal);
        modal.querySelector('#vs2-key').value = videoSettings.apiKey || '';
        const close = () => modal.remove();
        modal.querySelector('#vs2-close').onclick = close;
        modal.querySelector('#vs2-cancel').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        modal.querySelector('#vs2-save').onclick = async () => {
            videoSettings.apiKey = modal.querySelector('#vs2-key').value.trim();
            await save();
            close();
            showNotification('✓ 视频设置已保存', 'success');
        };
    };

    // ========== 给视频气泡注入 CSS ==========
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
