// listen-music.js - 一起听音乐（带歌词逐字高亮）
(function () {
    'use strict';

    function getLMKey() { return getStorageKey('listenMusicData_v1'); }

    let data = {
        playlist: [],
        currentIndex: 0,
        chatHistory: [],
        orphanLyrics: []
    };

    let panelEl = null;
    let _persistentAudio = null;

    function getPersistentAudio() {
        if (!_persistentAudio) {
            _persistentAudio = document.createElement('audio');
            _persistentAudio.id = 'lm-audio';
            _persistentAudio.controls = true;
            _persistentAudio.style.cssText = 'width:100%;margin-top:6px;height:32px;';
        }
        return _persistentAudio;
    }

    async function load() {
        try {
             const saved = await localforage.getItem(getLMKey());
            if (saved) {
                data.playlist = (saved.playlist || []).map(s => ({ ...s, url: '' }));
                data.chatHistory = saved.chatHistory || [];
                data.orphanLyrics = saved.orphanLyrics || [];
                data.currentIndex = 0;
            }
        } catch (e) { console.warn('[listen-music] load fail', e); }
    }

    async function save() {
    try {
        const safe = {
            playlist: data.playlist.map(s => ({ id: s.id, title: s.title, lyrics: s.lyrics })),
            chatHistory: data.chatHistory.slice(-200),
            orphanLyrics: data.orphanLyrics.slice(-100)
        };
        await localforage.setItem(getLMKey(), safe);
    } catch (e) { console.warn('[listen-music] save fail', e); }
}

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function parseLrc(text) {
        if (!text) return [];
        var lines = String(text).split(/\r?\n/);
        var result = [];
        var timeRe = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var matches = [];
            var m;
            timeRe.lastIndex = 0;
            while ((m = timeRe.exec(line)) !== null) {
                var min = parseInt(m[1], 10);
                var sec = parseInt(m[2], 10);
                var ms = m[3] ? parseInt((m[3] + '000').slice(0, 3), 10) : 0;
                matches.push(min * 60 + sec + ms / 1000);
            }
            if (matches.length > 0) {
                var content = line.replace(/\[[^\]]+\]/g, '').trim();
                if (content) {
                    for (var k = 0; k < matches.length; k++) {
                        result.push({ time: matches[k], text: content });
                    }
                }
            }
        }
        result.sort(function (a, b) { return a.time - b.time; });
        return result;
    }

    function normalizeName(s) {
        return String(s || '')
            .replace(/\.[^.]+$/, '')
            .replace(/[\s\u3000]+/g, '')
            .replace(/[（）()【】\[\]]/g, '')
            .replace(/歌词|lyrics?|lrc/gi, '')
            .toLowerCase();
    }

    function tryAttachLyric(lrcBaseName, content) {
        var targetNorm = normalizeName(lrcBaseName);
        if (!targetNorm) return false;
        var target = data.playlist.find(function (s) { return normalizeName(s.title) === targetNorm; });
        if (!target) {
            target = data.playlist.find(function (s) {
                var tn = normalizeName(s.title);
                return tn && (tn.indexOf(targetNorm) !== -1 || targetNorm.indexOf(tn) !== -1);
            });
        }
        if (target) { target.lyrics = content; return true; }
        return false;
    }

    window.batchImportMusic = async function (files) {
        if (!files || files.length === 0) return;
        var audioCount = 0, lrcCount = 0, orphanCount = 0;
        var audioFiles = [], lrcFiles = [];
        for (var fi = 0; fi < files.length; fi++) {
            var file = files[fi];
            var name = (file.name || '').toLowerCase();
            if (/\.(mp3|m4a|aac|ogg|wav|flac|opus)$/.test(name)) audioFiles.push(file);
            else if (name.slice(-4) === '.lrc') lrcFiles.push(file);
        }
        for (var ai = 0; ai < audioFiles.length; ai++) {
            var af = audioFiles[ai];
            var url = URL.createObjectURL(af);
            var title = af.name.replace(/\.[^.]+$/, '');
            data.playlist.push({
                id: 'song_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                title: title,
                url: url,
                lyrics: ''
            });
            audioCount++;
        }
        if (data.orphanLyrics.length && audioCount > 0) {
            var stillOrphan = [];
            for (var oi = 0; oi < data.orphanLyrics.length; oi++) {
                var o = data.orphanLyrics[oi];
                if (tryAttachLyric(o.name, o.content)) lrcCount++;
                else stillOrphan.push(o);
            }
            data.orphanLyrics = stillOrphan;
        }
        for (var li = 0; li < lrcFiles.length; li++) {
            try {
                var lf = lrcFiles[li];
                var text = await lf.text();
                var lrcBaseName = lf.name.replace(/\.lrc$/i, '').trim();
                if (tryAttachLyric(lrcBaseName, text)) lrcCount++;
                else { data.orphanLyrics.push({ name: lrcBaseName, content: text }); orphanCount++; }
            } catch (e) { console.warn('歌词读取失败', lrcFiles[li].name, e); }
        }
        await save();
        renderPanel();
        var msg = '已添加 ' + audioCount + ' 首歌曲';
        if (lrcCount > 0) msg += '，' + lrcCount + ' 份歌词已匹配';
        if (orphanCount > 0) msg += '，' + orphanCount + ' 份歌词待匹配';
        if (typeof showNotification === 'function') showNotification(msg, 'success', 4000);
    };

    window.batchImportLyrics = async function (files) {
        if (!files || files.length === 0) return;
        var matched = 0, orphan = 0;
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var name = (file.name || '').toLowerCase();
            if (name.slice(-4) !== '.lrc') continue;
            try {
                var text = await file.text();
                var lrcBaseName = file.name.replace(/\.lrc$/i, '').trim();
                if (tryAttachLyric(lrcBaseName, text)) matched++;
                else { data.orphanLyrics.push({ name: lrcBaseName, content: text }); orphan++; }
            } catch (e) { console.warn('歌词读取失败', file.name, e); }
        }
        await save();
        renderPanel();
        var msg = '';
        if (matched > 0) msg += matched + ' 份歌词已匹配';
        if (orphan > 0) msg += (msg ? '，' : '') + orphan + ' 份歌词待匹配';
        if (!msg) msg = '没有识别到 .lrc 文件';
        if (typeof showNotification === 'function') showNotification(msg, 'success', 4000);
    };

    window.retryMatchLyrics = async function () {
        if (!data.orphanLyrics.length) {
            if (typeof showNotification === 'function') showNotification('没有待匹配的歌词', 'info');
            return;
        }
        var stillOrphan = [], matched = 0;
        for (var i = 0; i < data.orphanLyrics.length; i++) {
            var o = data.orphanLyrics[i];
            if (tryAttachLyric(o.name, o.content)) matched++;
            else stillOrphan.push(o);
        }
        data.orphanLyrics = stillOrphan;
        await save();
        renderPanel();
        if (typeof showNotification === 'function') showNotification(matched > 0 ? '✓ 匹配 ' + matched + ' 份' : '没有新的匹配', matched > 0 ? 'success' : 'info');
    };

    window.sendMusicChat = async function (type, content) {
        data.chatHistory.push({ sender: 'me', type: type, content: content, time: Date.now() });
        if (data.chatHistory.length > 200) data.chatHistory = data.chatHistory.slice(-200);
        await save();
        renderChatOnly();

        setTimeout(async function () {
            var reply = generatePartnerReply();
            if (reply.type === 'text' && typeof window.simulatePartnerTypingProcess === 'function') {
                try { await window.simulatePartnerTypingProcess(reply.content); } catch (e) { console.warn('浮窗失败', e); }
            }
            data.chatHistory.push({ sender: 'partner', type: reply.type, content: reply.content, time: Date.now() });
            await save();
            renderChatOnly();
        }, 1500 + Math.random() * 2000);
    };

    function generatePartnerReply() {
        var rand = Math.random();
        var pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(function (t) { return t && String(t).trim(); })
            : [];
        if (rand < 0.6 && pool.length > 0) {
            return { type: 'text', content: pool[Math.floor(Math.random() * pool.length)] };
        }
        if (rand < 0.8) {
            var emojis = ['🎵','🎶','🎧','🎤','💕','✨','🥺','😊','🎼','💖'];
            return { type: 'emoji', content: emojis[Math.floor(Math.random() * emojis.length)] };
        }
        if (rand < 0.95 && typeof stickerLibrary !== 'undefined' && stickerLibrary.length > 0) {
            return { type: 'sticker', content: stickerLibrary[Math.floor(Math.random() * stickerLibrary.length)] };
        }
        if (typeof window.getRandomPartnerImage === 'function') {
            var img = window.getRandomPartnerImage();
            if (img) return { type: 'image', content: img.url };
        }
        if (pool.length > 0) return { type: 'text', content: pool[Math.floor(Math.random() * pool.length)] };
        return { type: 'text', content: '...' };
    }

    function scrollChatToBottom() {
        var el = document.getElementById('lm-chat-scroll');
        if (el) setTimeout(function () { el.scrollTop = el.scrollHeight; }, 50);
    }

    function buildChatHTML() {
        return data.chatHistory.length === 0
            ? '<div style="text-align:center;padding:16px;color:var(--text-secondary);font-size:11px;">还没有对话</div>'
            : data.chatHistory.map(function (msg) {
                var isMe = msg.sender === 'me';
                var inner = '';
                if (msg.type === 'text') inner = '<span style="font-size:12px;">' + escapeHtml(msg.content) + '</span>';
                else if (msg.type === 'emoji') inner = '<span style="font-size:20px;">' + msg.content + '</span>';
                else if (msg.type === 'sticker') inner = '<img src="' + msg.content + '" style="max-width:90px;max-height:90px;border-radius:8px;display:block;">';
                else if (msg.type === 'image') inner = '<img src="' + msg.content + '" style="max-width:140px;max-height:140px;border-radius:8px;display:block;">';
                return '<div style="display:flex;' + (isMe ? 'justify-content:flex-end;' : '') + ';margin-bottom:6px;">'
                    + '<div style="background:' + (isMe ? 'var(--accent-color)' : 'var(--secondary-bg)') + ';color:' + (isMe ? '#fff' : 'var(--text-primary)') + ';padding:6px 10px;border-radius:12px;max-width:72%;word-break:break-word;">'
                    + inner + '</div></div>';
            }).join('');
    }

    function renderChatOnly() {
        var el = document.getElementById('lm-chat-scroll');
        if (!el) return;
        el.innerHTML = buildChatHTML();
        setTimeout(function () { el.scrollTop = el.scrollHeight; }, 30);
    }

    function renderPanel() {
        var card = document.getElementById('listen-music-card');
        if (!card) return;
        var current = data.playlist[data.currentIndex] || null;

        var listHTML = data.playlist.length === 0
            ? '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:12px;">暂无歌曲，点击右上角"添加歌曲"</div>'
            : data.playlist.map(function (song, i) {
                var active = i === data.currentIndex;
                var hasLyric = !!song.lyrics;
                return '<div data-lm-idx="' + i + '" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;margin-bottom:4px;cursor:pointer;background:' + (active ? 'rgba(var(--accent-color-rgb),0.1)' : 'transparent') + ';">'
                    + '<div style="width:26px;height:26px;border-radius:8px;background:' + (active ? 'var(--accent-color)' : 'var(--border-color)') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
                    + '<i class="fas fa-music" style="font-size:10px;color:' + (active ? '#fff' : 'var(--text-secondary)') + ';"></i></div>'
                    + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-size:12px;font-weight:' + (active ? '700' : '500') + ';color:' + (active ? 'var(--accent-color)' : 'var(--text-primary)') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(song.title) + '</div>'
                    + (hasLyric ? '<div style="font-size:10px;color:var(--accent-color);opacity:0.7;">🎵 已配歌词</div>' : '')
                    + '</div>'
                    + '<button data-del-lm="' + i + '" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:11px;padding:4px 6px;opacity:0.6;">✕</button>'
                    + '</div>';
            }).join('');

        var chatHTML = buildChatHTML();

        var orphanHint = data.orphanLyrics.length > 0
            ? '<div style="margin-top:8px;padding:8px 10px;background:rgba(var(--accent-color-rgb),0.06);border-radius:8px;font-size:11px;color:var(--text-secondary);display:flex;align-items:center;gap:8px;">'
                + '<span style="flex:1;">📄 有 ' + data.orphanLyrics.length + ' 份歌词未匹配</span>'
                + '<button id="lm-retry-match" style="padding:3px 8px;border:1px solid var(--border-color);border-radius:6px;background:none;color:var(--accent-color);font-size:11px;cursor:pointer;font-family:var(--font-family);">重新匹配</button>'
              + '</div>'
            : '';

        var lyricsBlock = '';
        if (current) {
            if (current.lyrics) {
                lyricsBlock = '<div id="lm-lyrics" style="max-height:130px;overflow-y:auto;padding:4px 16px 10px;border-bottom:1px solid var(--border-color);flex-shrink:0;">'
                    + '<div style="text-align:center;padding:20px 0;font-size:11px;color:var(--text-secondary);opacity:0.5;">歌词加载中…</div>'
                    + '</div>';
            } else {
                lyricsBlock = '<div id="lm-lyrics" style="padding:10px 16px 14px;border-bottom:1px solid var(--border-color);flex-shrink:0;text-align:center;font-size:11px;color:var(--text-secondary);opacity:0.5;">暂无歌词 · 上传 .lrc 后显示</div>';
            }
        }

        card.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border-color);flex-shrink:0;gap:6px;">'
            + '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
            + '<div style="width:32px;height:32px;border-radius:10px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">'
            + '<i class="fas fa-headphones" style="color:var(--accent-color);font-size:14px;"></i></div>'
            + '<span style="font-size:14px;font-weight:700;color:var(--text-primary);white-space:nowrap;">一起听音乐</span></div>'
            + '<div style="display:flex;align-items:center;gap:5px;flex:1;justify-content:flex-end;">'
            + '<button id="lm-import-audio" style="padding:6px 10px;border:none;border-radius:8px;background:var(--accent-color);color:#fff;font-size:12px;cursor:pointer;font-family:var(--font-family);white-space:nowrap;"><i class="fas fa-music"></i> 加歌曲</button>'
            + '<button id="lm-import-lrc" style="padding:6px 10px;border:1.5px solid var(--accent-color);border-radius:8px;background:none;color:var(--accent-color);font-size:12px;cursor:pointer;font-family:var(--font-family);white-space:nowrap;"><i class="fas fa-paste"></i> 粘贴歌词</button>'
            + '<button id="lm-close-btn" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;padding:0 4px;"><i class="fas fa-times"></i></button>'
            + '</div></div>'

            + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">'

            + '<div style="padding:12px 16px 8px;border-bottom:1px solid var(--border-color);flex-shrink:0;">'
            + (current
                ? '<div style="display:flex;align-items:center;gap:12px;">'
                    + '<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,var(--accent-color),rgba(var(--accent-color-rgb),0.6));display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
                    + '<i class="fas fa-music" style="font-size:18px;color:#fff;"></i></div>'
                    + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(current.title) + '</div>'
                    + (current.url
                        ? '<div id="lm-audio-slot"></div>'
                        : '<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;opacity:0.7;">（请重新添加该歌曲）</div>')
                    + '</div></div>'
                : '<div style="padding:18px;text-align:center;color:var(--text-secondary);font-size:12px;background:var(--primary-bg);border-radius:12px;">请从下方列表选择歌曲</div>')
            + '</div>'

            + lyricsBlock

            + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">'
            + '<div id="lm-chat-scroll" style="flex:1;overflow-y:auto;padding:14px 16px;">' + chatHTML + '</div>'
            + '<div style="display:flex;gap:6px;padding:10px 12px;border-top:1px solid var(--border-color);background:var(--primary-bg);flex-shrink:0;">'
            + '<button id="lm-emoji" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-smile"></i></button>'
            + '<button id="lm-sticker" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-image"></i></button>'
            + '<button id="lm-image" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-camera"></i></button>'
            + '<input id="lm-input" type="text" placeholder="边听边聊…" style="flex:1;min-width:0;padding:8px 14px;border:1px solid var(--border-color);border-radius:20px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);">'
            + '<button id="lm-send" style="padding:8px 14px;border:none;border-radius:20px;background:var(--accent-color);color:#fff;font-size:13px;cursor:pointer;flex-shrink:0;">发送</button>'
            + '</div></div>'

            + '<div style="border-top:1px solid var(--border-color);background:var(--primary-bg);flex-shrink:0;">'
            + '<div id="lm-list-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;cursor:pointer;">'
            + '<span style="font-size:12px;font-weight:600;color:var(--text-secondary);"><i class="fas fa-list" style="margin-right:6px;"></i>歌曲列表 (' + data.playlist.length + ')</span>'
            + '<i id="lm-list-arrow" class="fas fa-chevron-up" style="font-size:11px;color:var(--text-secondary);transition:transform 0.2s;"></i>'
            + '</div>'
            + '<div id="lm-list-body" style="max-height:0;overflow:hidden;transition:max-height 0.3s;border-top:1px solid var(--border-color);">'
            + '<div style="padding:8px 12px;max-height:240px;overflow-y:auto;">' + listHTML + orphanHint + '</div>'
            + '</div></div>'

            + '</div>';

        bindPanelEvents();
    }

    function bindPanelEvents() {
        var card = document.getElementById('listen-music-card');
        if (!card) return;

        // 把持久 audio 挂到占位 div
        var _slot = document.getElementById('lm-audio-slot');
        var _cur = data.playlist[data.currentIndex];
        if (_slot && _cur && _cur.url) {
            var _audio = getPersistentAudio();
            if (_audio.src !== _cur.url) {
                _audio.src = _cur.url;
            }
            if (!_slot.contains(_audio)) {
                _slot.appendChild(_audio);
            }
        }

        document.getElementById('lm-close-btn').onclick = function () { window.closeListenMusicPanel(); };

        document.getElementById('lm-import-audio').onclick = function () {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*';
            input.multiple = true;
            input.onchange = function (ev) {
                var files = Array.from(ev.target.files);
                window.batchImportMusic(files);
            };
            input.click();
        };

        document.getElementById('lm-import-lrc').onclick = function () {
            openLyricPasteDialog();
        };

        document.getElementById('lm-list-toggle').onclick = function () {
            var body = document.getElementById('lm-list-body');
            var arrow = document.getElementById('lm-list-arrow');
            if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
                body.style.maxHeight = '260px';
                arrow.style.transform = 'rotate(180deg)';
            } else {
                body.style.maxHeight = '0px';
                arrow.style.transform = 'rotate(0)';
            }
        };

        card.querySelectorAll('[data-lm-idx]').forEach(function (el) {
            el.onclick = function (e) {
                if (e.target.closest('[data-del-lm]')) return;
                data.currentIndex = parseInt(el.dataset.lmIdx);
                renderPanel();
            };
        });
        card.querySelectorAll('[data-del-lm]').forEach(function (btn) {
            btn.onclick = function (e) {
                e.stopPropagation();
                var idx = parseInt(btn.dataset.delLm);
                data.playlist.splice(idx, 1);
                if (data.currentIndex >= data.playlist.length) data.currentIndex = Math.max(0, data.playlist.length - 1);
                save();
                renderPanel();
                if (typeof showNotification === 'function') showNotification('已删除', 'success');
            };
        });

        var retryBtn = document.getElementById('lm-retry-match');
        if (retryBtn) retryBtn.onclick = function () { window.retryMatchLyrics(); };

        var input = document.getElementById('lm-input');
        var sendBtn = document.getElementById('lm-send');
        var doSend = function () {
            var v = input.value.trim();
            if (!v) return;
            input.value = '';
            window.sendMusicChat('text', v);
        };
        sendBtn.onclick = doSend;
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); doSend(); }
        });

        document.getElementById('lm-emoji').onclick = function () {
            var emojis = ['🎵','🎶','🎧','🎤','💕','✨','🥺','😊','🎼','💖','🎹','🥁'];
            openMusicQuickPicker('选择表情', emojis.map(function (e) { return { type: 'emoji', content: e }; }));
        };
        document.getElementById('lm-sticker').onclick = function () {
            var stickers = (typeof stickerLibrary !== 'undefined' && stickerLibrary.length > 0) ? stickerLibrary : [];
            if (stickers.length === 0) { if (typeof showNotification === 'function') showNotification('对方表情库为空', 'warning'); return; }
            openMusicQuickPicker('选择表情包', stickers.map(function (s) { return { type: 'sticker', content: s }; }));
        };
        document.getElementById('lm-image').onclick = function () {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async function (e) {
                var file = e.target.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { if (typeof showNotification === 'function') showNotification('图片不能超过 2MB', 'error'); return; }
                try {
                    var base64 = await optimizeImage(file, 600, 0.8);
                    window.sendMusicChat('image', base64);
                } catch (err) { if (typeof showNotification === 'function') showNotification('图片处理失败', 'error'); }
            };
            input.click();
        };

        setupLyricsSync();
    }

    function setupLyricsSync() {
        var current = data.playlist[data.currentIndex];
        if (!current || !current.lyrics) return;

        var container = document.getElementById('lm-lyrics');
        if (!container) return;

        var parsed = parseLrc(current.lyrics);
        if (parsed.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:8px 0;font-size:11px;color:var(--text-secondary);opacity:0.6;">歌词格式无法解析</div>';
            return;
        }

        container.style.scrollBehavior = 'auto';

        var LINE_H = 32;
        container.innerHTML = parsed.map(function (item, i) {
            return '<div class="lm-line" data-i="' + i + '" style="text-align:center;padding:0 12px;height:' + LINE_H + 'px;line-height:32px;overflow:hidden;font-family:var(--font-family);">'
                + '<span class="lm-line-txt" style="display:inline-block;color:var(--text-secondary);opacity:0.5;font-size:12px;transition:opacity 0.2s;">' + escapeHtml(item.text) + '</span>'
                + '</div>';
        }).join('');

        var lineEls = container.querySelectorAll('.lm-line');
        var audioEl = getPersistentAudio();
        if (!audioEl) return;

        var lastIdx = -1;
        var rafId = null;
        var scrollTarget = 0;
        var scrollCurrent = 0;

        function computeTargetByIdx(idx) {
            if (idx < 0) return 0;
            var total = container.scrollHeight;
            var viewH = container.clientHeight;
            var centerOffset = viewH / 2 - LINE_H / 2;
            return Math.max(0, Math.min(total - viewH, idx * LINE_H - centerOffset));
        }

        function render(t) {
            var idx = -1;
            for (var i = 0; i < parsed.length; i++) {
                if (parsed[i].time <= t + 0.05) idx = i;
                else break;
            }

            var progress = 0;
            if (idx >= 0) {
                var start = parsed[idx].time;
                var end = (idx + 1 < parsed.length) ? parsed[idx + 1].time : start + 4;
                var dur = Math.max(0.3, end - start);
                progress = Math.max(0, Math.min(1, (t - start) / dur));
            }

            for (var j = 0; j < lineEls.length; j++) {
                var span = lineEls[j].querySelector('.lm-line-txt');
                if (!span) continue;

                if (j === idx) {
                    var pct = (progress * 100).toFixed(2);
                    span.style.background = 'linear-gradient(90deg, var(--accent-color) 0%, var(--accent-color) ' + pct + '%, var(--text-secondary) ' + pct + '%, var(--text-secondary) 100%)';
                    span.style.webkitBackgroundClip = 'text';
                    span.style.backgroundClip = 'text';
                    span.style.webkitTextFillColor = 'transparent';
                    span.style.color = 'transparent';
                    span.style.opacity = '1';
                    span.style.fontWeight = '700';
                } else {
                    span.style.background = 'none';
                    span.style.webkitBackgroundClip = '';
                    span.style.backgroundClip = '';
                    span.style.webkitTextFillColor = '';
                    span.style.color = 'var(--text-secondary)';
                    span.style.opacity = (j < idx) ? '0.5' : '0.4';
                    span.style.fontWeight = '400';
                }
            }

            if (idx !== lastIdx) {
                lastIdx = idx;
                scrollTarget = computeTargetByIdx(idx);
            }
        }

        function tick() {
            var t = audioEl.currentTime || 0;
            render(t);

            var diff = scrollTarget - scrollCurrent;
            if (Math.abs(diff) < 0.6) {
                scrollCurrent = scrollTarget;
            } else {
                scrollCurrent += diff * 0.16;
            }
            container.scrollTop = scrollCurrent;

            if (!audioEl.paused && !audioEl.ended) {
                rafId = requestAnimationFrame(tick);
            } else {
                rafId = null;
            }
        }

        audioEl.addEventListener('play', function () {
            if (!rafId) {
                scrollCurrent = container.scrollTop;
                tick();
            }
        });
        audioEl.addEventListener('seeked', function () {
            lastIdx = -1;
            render(audioEl.currentTime || 0);
            scrollCurrent = scrollTarget;
            container.scrollTop = scrollCurrent;
        });
        audioEl.addEventListener('loadedmetadata', function () {
            lastIdx = -1;
            scrollCurrent = 0;
            scrollTarget = 0;
            container.scrollTop = 0;
            render(0);
        });
        audioEl.addEventListener('timeupdate', function () {
            if (!rafId) {
                render(audioEl.currentTime || 0);
                scrollCurrent = scrollTarget;
                container.scrollTop = scrollCurrent;
            }
        });
        audioEl.addEventListener('pause', function () {
            render(audioEl.currentTime || 0);
            scrollCurrent = scrollTarget;
            container.scrollTop = scrollCurrent;
        });
        audioEl.addEventListener('ended', function () {
            lastIdx = -1;
        });

        setTimeout(function () {
            render(0);
            scrollCurrent = 0;
            scrollTarget = 0;
            container.scrollTop = 0;
        }, 150);
    }

    function openLyricPasteDialog() {
        var old = document.getElementById('lm-lyric-paste');
        if (old) old.remove();
        if (!data.playlist || data.playlist.length === 0) {
            if (typeof showNotification === 'function') showNotification('请先添加歌曲', 'warning');
            return;
        }
        var modal = document.createElement('div');
        modal.id = 'lm-lyric-paste';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;';
        var songOptions = data.playlist.map(function (s, i) {
            return '<option value="' + i + '">' + escapeHtml(s.title) + (s.lyrics ? '（已有歌词）' : '') + '</option>';
        }).join('');
        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px;padding:22px;width:90%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
            + '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-paste" style="color:var(--accent-color);margin-right:8px;"></i>粘贴歌词</span>'
            + '<button id="lm-lp-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">选择歌曲：</div>'
            + '<select id="lm-lp-song" style="width:100%;padding:10px 12px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);margin-bottom:12px;box-sizing:border-box;">' + songOptions + '</select>'
            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">歌词内容（从 lrc 文件里全选复制粘贴进来）：</div>'
            + '<textarea id="lm-lp-text" placeholder="[00:00.00] 第一句歌词&#10;[00:05.00] 第二句歌词&#10;..." style="flex:1;width:100%;min-height:220px;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:12px;font-family:monospace;resize:vertical;outline:none;box-sizing:border-box;line-height:1.6;"></textarea>'
            + '<div style="display:flex;gap:8px;margin-top:14px;">'
            + '<button id="lm-lp-cancel" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            + '<button id="lm-lp-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-check"></i> 保存歌词</button>'
            + '</div>'
            + '</div>';
        document.body.appendChild(modal);
        var close = function () { modal.remove(); };
        document.getElementById('lm-lp-close').onclick = close;
        document.getElementById('lm-lp-cancel').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
        document.getElementById('lm-lp-save').onclick = async function () {
            var idx = parseInt(document.getElementById('lm-lp-song').value, 10);
            var text = document.getElementById('lm-lp-text').value.trim();
            if (isNaN(idx) || !data.playlist[idx]) { if (typeof showNotification === 'function') showNotification('请先选择歌曲', 'warning'); return; }
            if (!text) { if (typeof showNotification === 'function') showNotification('歌词内容不能为空', 'warning'); return; }
            data.playlist[idx].lyrics = text;
            await save();
            renderPanel();
            close();
            if (typeof showNotification === 'function') showNotification('✓ 歌词已保存', 'success');
        };
    }

    function openMusicQuickPicker(title, items) {
        var old = document.getElementById('lm-quick-picker');
        if (old) old.remove();
        var modal = document.createElement('div');
        modal.id = 'lm-quick-picker';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;';
        var gridHTML = items.map(function (it, i) {
            if (it.type === 'emoji') {
                return '<div data-pi="' + i + '" style="display:flex;align-items:center;justify-content:center;font-size:26px;aspect-ratio:1/1;background:var(--primary-bg);border-radius:10px;cursor:pointer;padding:6px;box-sizing:border-box;">' + it.content + '</div>';
            } else {
                return '<div data-pi="' + i + '" style="aspect-ratio:1/1;background:var(--primary-bg);border-radius:10px;cursor:pointer;overflow:hidden;"><img src="' + it.content + '" style="width:100%;height:100%;object-fit:cover;display:block;"></div>';
            }
        }).join('');
        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px 20px 0 0;width:100%;max-width:500px;max-height:60vh;display:flex;flex-direction:column;box-shadow:0 -10px 60px rgba(0,0,0,0.3);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border-color);">'
            + '<span style="font-size:14px;font-weight:600;color:var(--text-primary);">' + title + '</span>'
            + '<button id="lm-picker-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="flex:1;overflow-y:auto;padding:14px 20px 20px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">' + gridHTML + '</div>'
            + '</div>';
        document.body.appendChild(modal);
        document.getElementById('lm-picker-close').onclick = function () { modal.remove(); };
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
        modal.querySelectorAll('[data-pi]').forEach(function (el) {
            el.onclick = function () {
                var it = items[parseInt(el.dataset.pi)];
                modal.remove();
                window.sendMusicChat(it.type, it.content);
            };
        });
    }

    window.openListenMusicPanel = async function () {
    await load(); // ★ 加上这行
        if (panelEl) return;
        panelEl = document.createElement('div');
        panelEl.id = 'listen-music-panel';
        panelEl.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        var card = document.createElement('div');
        card.id = 'listen-music-card';
        card.style.cssText = 'background:var(--secondary-bg);border-radius:20px;width:94%;max-width:460px;height:88vh;max-height:760px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4);';
        panelEl.appendChild(card);
        panelEl.addEventListener('click', function (e) { if (e.target === panelEl) window.closeListenMusicPanel(); });
        document.body.appendChild(panelEl);
        renderPanel();
    };

    window.closeListenMusicPanel = function () {
        if (_persistentAudio) {
            try { _persistentAudio.pause(); } catch (e) {}
        }
        if (panelEl) { panelEl.remove(); panelEl = null; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }
})();
