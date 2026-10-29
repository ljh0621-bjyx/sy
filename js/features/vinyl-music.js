/* ============================================================
 * vinyl-music.js - 黑胶唱片（真实音频直链版）
 * ============================================================ */
(function () {
    'use strict';

    // 这里的 url 换成了直链 MP3，保证能出声
    const MUSIC_POOL = [
        { 
            title: '水星记 (试听版)', 
            artist: '郭顶', 
            cover: 'https://picsum.photos/400/400?random=1', 
            url: 'https://files.catbox.moe/x5n3jq.mp3', // 真实的测试 MP3
            comment: '还要多远才能进入你的心。其实我早就进去了，只是你没发现。' 
        },
        { 
            title: '虚拟 (试听版)', 
            artist: '陈粒', 
            cover: 'https://picsum.photos/400/400?random=2', 
            url: 'https://files.catbox.moe/6s65mp.mp3', // 真实的测试 MP3
            comment: '你是我朝夕相伴，触手可及的虚拟。' 
        },
        { 
            title: '想见你 (试听版)', 
            artist: '八三夭', 
            cover: 'https://picsum.photos/400/400?random=3', 
            url: 'https://files.catbox.moe/co58d7.mp3', // 真实的测试 MP3
            comment: '穿越了千个万个时间线里，人海里相依。' 
        }
    ];

    let currentAudio = null;

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
    };

    // 渲染卡片
    setInterval(function() {
        const wrappers = document.querySelectorAll('.message-wrapper');
        for (let i = 0; i < wrappers.length; i++) {
            const wrapper = wrappers[i];
            const msgId = wrapper.dataset.msgId || wrapper.dataset.id;
            if (!msgId) continue;
            
            const msgData = (typeof messages !== 'undefined') ? messages.find(function(m) { return String(m.id) === String(msgId); }) : null;
            if (!msgData || !msgData.isVinylMusic) continue;

            const msgDiv = wrapper.querySelector('.message');
            if (!msgDiv || msgDiv.dataset.renderedVinyl === '1') continue;

            const m = msgData.musicData;
            
            const html = '<div onclick="window.openVinylPlayer(\'' + msgData.id + '\')" style="background:#2b2b36; border-radius:12px; padding:12px; width:240px; cursor:pointer; display:flex; align-items:center; gap:12px; border:1px solid rgba(255,255,255,0.1); box-shadow:0 4px 12px rgba(0,0,0,0.2);">' +
                '<div style="width:44px; height:44px; border-radius:50%; overflow:hidden; flex-shrink:0; border:2px solid #333;"><img src="' + m.cover + '" style="width:100%; height:100%; object-fit:cover;"></div>' +
                '<div style="flex:1; min-width:0;"><div style="font-size:14px; color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + m.title + '</div><div style="font-size:11px; color:#999;">' + m.artist + '</div></div>' +
                '<div style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; color:#fff;"><i class="fas fa-play" style="font-size:10px; margin-left:2px;"></i></div>' +
                '</div>';
            
            msgDiv.innerHTML = html;
            msgDiv.style.cssText = 'padding:0 !important; background:transparent !important; box-shadow:none !important; max-width:none !important;';
            msgDiv.dataset.renderedVinyl = '1';
            wrapper.style.display = '';
            wrapper.dataset.antiCleaned = '1'; 
        }
    }, 1000);

    // 播放器
    window.openVinylPlayer = function (msgId) {
        const msgs = (typeof messages !== 'undefined') ? messages : [];
        const msg = msgs.find(function(m) { return String(m.id) === String(msgId); });
        if (!msg || !msg.musicData) return;

        const music = msg.musicData;
        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';
        
        const old = document.getElementById('vinyl-player-panel');
        if (old) { old.remove(); }
        if (currentAudio) { currentAudio.pause(); currentAudio = null; }

        if (!document.getElementById('vinyl-style')) {
            const style = document.createElement('style');
            style.id = 'vinyl-style';
            style.textContent = '@keyframes rotateVinyl { 100% { transform: rotate(360deg); } } .vinyl-disc { animation: rotateVinyl 8s linear infinite; animation-play-state: paused; } .vinyl-disc.playing { animation-play-state: running; }';
            document.head.appendChild(style);
        }

        const modal = document.createElement('div');
        modal.id = 'vinyl-player-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(15,15,20,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;';
        
        const html = '<button onclick="window.closeVinylPlayer()" style="position:absolute;top:20px;left:20px;background:none;border:none;color:#fff;font-size:20px;cursor:pointer;z-index:10;"><i class="fas fa-chevron-down"></i></button>' +
            '<div class="vinyl-disc" id="vinyl-disc" style="width:240px;height:240px;border-radius:50%;background:#111;box-shadow:0 10px 40px rgba(0,0,0,0.8), inset 0 0 0 5px #222;display:flex;align-items:center;justify-content:center;position:relative;margin-bottom:30px;">' +
            '<div style="width:140px;height:140px;border-radius:50%;overflow:hidden;border:3px solid #333;z-index:2;"><img src="' + music.cover + '" style="width:100%;height:100%;object-fit:cover;"></div>' +
            '<div style="position:absolute;width:16px;height:16px;background:#111;border-radius:50%;z-index:3;"></div>' +
            '</div>' +
            '<h2 style="font-size:20px;font-weight:700;margin-bottom:6px;">' + music.title + '</h2>' +
            '<p style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:20px;">' + music.artist + '</p>' +
            '<div style="width:80%;max-width:320px;background:rgba(255,255,255,0.05);border-radius:16px;padding:16px;margin-bottom:30px;border:1px solid rgba(255,255,255,0.1);">' +
            '<div style="font-size:12px;color:#ff6699;font-weight:600;margin-bottom:8px;"><i class="fas fa-quote-left"></i> ' + pName + ' 的乐评</div>' +
            '<div style="font-size:13.5px;color:rgba(255,255,255,0.85);line-height:1.6;">“' + music.comment + '”</div>' +
            '</div>' +
            '<button id="vinyl-play-btn" style="width:60px;height:60px;border-radius:50%;background:#ff6699;color:#fff;border:none;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(255,102,153,0.4);">' +
            '<i class="fas fa-play" style="margin-left:4px;" id="vinyl-icon"></i></button>';

        modal.innerHTML = html;
        document.body.appendChild(modal);

        const disc = modal.querySelector('#vinyl-disc');
        const playBtn = modal.querySelector('#vinyl-play-btn');
        const playIcon = modal.querySelector('#vinyl-icon');

        // 加载音频
        currentAudio = new Audio(music.url);
        
        playBtn.onclick = function() {
            if (currentAudio.paused) {
                // 播放
                currentAudio.play().then(function() {
                    disc.classList.add('playing');
                    playIcon.className = 'fas fa-pause';
                    playIcon.style.marginLeft = '0';
                }).catch(function(e) {
                    if(typeof showNotification === 'function') showNotification('播放失败：音频链接可能失效或跨域被拦截', 'error');
                    console.error('播放出错', e);
                });
            } else {
                // 暂停
                currentAudio.pause();
                disc.classList.remove('playing');
                playIcon.className = 'fas fa-play';
                playIcon.style.marginLeft = '4px';
            }
        };

        currentAudio.onended = function() {
            disc.classList.remove('playing');
            playIcon.className = 'fas fa-play';
            playIcon.style.marginLeft = '4px';
        };
    };

    window.closeVinylPlayer = function() {
        const panel = document.getElementById('vinyl-player-panel');
        if (panel) panel.remove();
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
    };
})();