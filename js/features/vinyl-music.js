/* ============================================================
 * vinyl-music.js - 黑胶唱片分享（独立渲染完全版）
 * ============================================================ */
(function () {
    'use strict';

    const MUSIC_POOL = [
        {
            title: '水星记',
            artist: '郭顶',
            cover: 'https://picsum.photos/400/400?random=1',
            url: 'https://music.163.com/song/media/outer/url?id=441491828.mp3',
            comment: '还要多远才能进入你的心。其实我早就进去了，只是你没发现。'
        },
        {
            title: '虚拟',
            artist: '陈粒',
            cover: 'https://picsum.photos/400/400?random=2',
            url: 'https://music.163.com/song/media/outer/url?id=421137357.mp3',
            comment: '你是我朝夕相伴，触手可及的虚拟。'
        },
        {
            title: '想见你想见你想见你',
            artist: '八三夭',
            cover: 'https://picsum.photos/400/400?random=3',
            url: 'https://music.163.com/song/media/outer/url?id=1342294345.mp3',
            comment: '穿越了千个万个时间线里，人海里相依。'
        }
    ];

    let currentAudio = null;

    // ========== 发送黑胶卡片 ==========
    window.sendVinylMusic = function () {
        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';
        const music = MUSIC_POOL[Math.floor(Math.random() * MUSIC_POOL.length)];

        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now(), 
                sender: pName, 
                text: '分享了一首歌给你', 
                timestamp: new Date(), 
                status: 'received', 
                type: 'normal',
                isVinylMusic: true, 
                musicData: music
            });
        }
        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(pName, '给你分享了一首歌：' + music.title);
        }
    };

    // ========== 独立监听渲染（不依赖 anti-empty.js） ==========
    setInterval(() => {
        const wrappers = document.querySelectorAll('.message-wrapper');
        wrappers.forEach(wrapper => {
            const msgId = wrapper.dataset.msgId || wrapper.dataset.id;
            if (!msgId) return;
            
            const msgData = (typeof messages !== 'undefined') ? messages.find(m => String(m.id) === String(msgId)) : null;
            if (!msgData || !msgData.isVinylMusic) return;

            const msgDiv = wrapper.querySelector('.message');
            if (!msgDiv || msgDiv.dataset.renderedVinyl === '1') return;

            const m = msgData.musicData;
            
            // 渲染卡片
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
            
            // 强制清除外层气泡样式，并打上防误杀标记
            msgDiv.style.cssText = 'padding:0 !important; background:transparent !important; box-shadow:none !important; max-width:none !important;';
            msgDiv.dataset.renderedVinyl = '1';
            wrapper.style.display = '';
            wrapper.dataset.antiCleaned = '1'; 
        });
    }, 1000);

    // ========== 全屏黑胶播放器 ==========
    window.openVinylPlayer = function (msgId) {
        const msgs = (typeof messages !== 'undefined') ? messages : [];
        const msg = msgs.find(m => String(m.id) === String(msgId));
        if (!msg || !msg.musicData) return;

        const music = msg.musicData;
        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';
        
        const old = document.getElementById('vinyl-player-panel');
        if (old) { old.remove(); }
        if (currentAudio) { currentAudio.pause(); currentAudio = null; }

        if (!document.getElementById('vinyl-style')) {
            const style = document.createElement('style');
            style.id = 'vinyl-style';
            style.textContent = `
                @keyframes rotateVinyl { 100% { transform: rotate(360deg); } }
                .vinyl-disc { animation: rotateVinyl 8s linear infinite; animation-play-state: paused; }
                .vinyl-disc.playing { animation-play-state: running; }
            `;
            document.head.appendChild(style);
        }

        const modal = document.createElement('div');
        modal.id = 'vinyl-player-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(15,15,20,0.95);backdrop-filter:blur(20px);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;overflow:hidden;';
        
        modal.innerHTML = `
            <div style="position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:80vw;height:80vw;max-width:400px;max-height:400px;background:radial-gradient(circle, rgba(255,102,153,0.2) 0%, transparent 70%);filter:blur(40px);pointer-events:none;"></div>

            <button onclick="window.closeVinylPlayer()" style="position:absolute;top:20px;left:20px;background:none;border:none;color:rgba(255,255,255,0.6);font-size:24px;cursor:pointer;z-index:10;"><i class="fas fa-chevron-down"></i></button>

            <div style="position:relative;width:260px;height:260px;margin-bottom:40px;margin-top:20px;">
                <div style="position:absolute;top:-20px;right:20px;width:80px;height:120px;background:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><path d="M20,10 L80,10 L90,60 L30,60 Z" fill="%23d4d4d4"/><circle cx="50" cy="15" r="10" fill="%23a0a0a0"/><path d="M30,60 L80,140 L75,145 L25,65 Z" fill="%23e0e0e0"/><circle cx="77" cy="142" r="5" fill="%23ff6699"/></svg>') no-repeat center/contain;z-index:10;transform-origin:50px 15px;transition:transform 0.5s ease;transform:rotate(-20deg);" id="vinyl-needle"></div>
                
                <div class="vinyl-disc" id="vinyl-disc" style="width:100%;height:100%;border-radius:50%;background:#111;box-shadow:0 10px 40px rgba(0,0,0,0.8), inset 0 0 0 5px #222;display:flex;align-items:center;justify-content:center;position:relative;">
                    <div style="position:absolute;inset:10px;border-radius:50%;border:1px solid rgba(255,255,255,0.05);"></div>
                    <div style="position:absolute;inset:25px;border-radius:50%;border:1px solid rgba(255,255,255,0.05);"></div>
                    <div style="position:absolute;inset:40px;border-radius:50%;border:1px solid rgba(255,255,255,0.05);"></div>
                    <div style="width:140px;height:140px;border-radius:50%;overflow:hidden;border:3px solid #333;z-index:2;">
                        <img src="${music.cover}" style="width:100%;height:100%;object-fit:cover;">
                    </div>
                    <div style="position:absolute;width:16px;height:16px;background:#111;border-radius:50%;z-index:3;box-shadow:inset 0 2px 4px rgba(0,0,0,0.8);"></div>
                </div>
            </div>

            <div style="text-align:center;z-index:10;margin-bottom:20px;">
                <h2 style="font-size:20px;font-weight:700;margin-bottom:6px;letter-spacing:1px;">${music.title}</h2>
                <p style="font-size:13px;color:rgba(255,255,255,0.5);">${music.artist}</p>
            </div>

            <div style="width:80%;max-width:320px;background:rgba(255,255,255,0.05);border-radius:16px;padding:16px;margin-bottom:40px;border:1px solid rgba(255,255,255,0.1);z-index:10;position:relative;">
                <div style="font-size:12px;color:#ff6699;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                    <i class="fas fa-quote-left"></i> ${pName} 的乐评
                </div>
                <div style="font-size:13.5px;color:rgba(255,255,255,0.85);line-height:1.6;">“${music.comment}”</div>
            </div>

            <button id="vinyl-play-btn" style="width:64px;height:64px;border-radius:50%;background:#ff6699;color:#fff;border:none;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(255,102,153,0.4);transition:transform 0.2s;z-index:10;">
                <i class="fas fa-play" style="margin-left:4px;" id="vinyl-icon"></i>
            </button>
        `;

        document.body.appendChild(modal);

        const disc = modal.querySelector('#vinyl-disc');
        const needle = modal.querySelector('#vinyl-needle');
        const playBtn = modal.querySelector('#vinyl-play-btn');
        const playIcon = modal.querySelector('#vinyl-icon');

        currentAudio = new Audio(music.url);
        
        function togglePlay() {
            if (currentAudio.paused) {
                currentAudio.play().catch(e => {
                    if(typeof showNotification === 'function') showNotification('音频加载失败，可能被拦截', 'warning');
                });
                disc.classList.add('playing');
                needle.style.transform = 'rotate(5deg)'; 
                playIcon.className = 'fas fa-pause';
                playIcon.style.marginLeft = '0';
            } else {
                currentAudio.pause();
                disc.classList.remove('playing');
                needle.style.transform = 'rotate(-20deg)'; 
                playIcon.className = 'fas fa-play';
                playIcon.style.marginLeft = '4px';
            }
        }

        playBtn.onclick = togglePlay;

        currentAudio.onended = function() {
            disc.classList.remove('playing');
            needle.style.transform = 'rotate(-20deg)';
            playIcon.className = 'fas fa-play';
            playIcon.style.marginLeft = '4px';
        };

        setTimeout(togglePlay, 300);
    };

    window.closeVinylPlayer = function() {
        const panel = document.getElementById('vinyl-player-panel');
        if (panel) panel.remove();
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
    };

    console.log('[vinyl-music] 黑胶唱片独立版已加载 ✓');
})();