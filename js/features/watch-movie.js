/**
 * watch-movie.js
 * 一起看电影（支持本地视频 + bilibili 内嵌 + 外链平台卡片）
 */
(function () {
    'use strict';

    function getWMKey() { return getStorageKey('watchMovieData_v1'); }

    let data = {
        videos: [],       // [{ id, name, type, url, bvid, cover }]
        currentId: null,
        chatHistory: []
    };

    let panelEl = null;

    // ====== 平台识别 ======
    function detectPlatform(url) {
        if (!url) return null;
        var u = url.trim();
        if (/bilibili\.com|b23\.tv/i.test(u)) return 'bilibili';
        if (/v\.qq\.com/i.test(u)) return 'tencent';
        if (/iqiyi\.com/i.test(u)) return 'iqiyi';
        if (/youku\.com/i.test(u)) return 'youku';
        if (/mgtv\.com/i.test(u)) return 'mango';
        if (/xiaohongshu\.com|xhslink\.com/i.test(u)) return 'xiaohongshu';
        return 'unknown';
    }

    function extractBvid(url) {
        if (!url) return null;
        var m = url.match(/BV[a-zA-Z0-9]{10}/);
        if (m) return m[0];
        var m2 = url.match(/b23\.tv\/([a-zA-Z0-9]+)/);
        if (m2) return m2[1];
        return null;
    }

    function platformLabel(p) {
        return {
            bilibili: '哔哩哔哩',
            tencent: '腾讯视频',
            iqiyi: '爱奇艺',
            youku: '优酷',
            mango: '芒果TV',
            xiaohongshu: '小红书',
            unknown: '外链'
        }[p] || '外链';
    }

    function platformColor(p) {
        return {
            bilibili: '#FB7299',
            tencent: '#FF8B00',
            iqiyi: '#00BE06',
            youku: '#1FA3FF',
            mango: '#FF8200',
            xiaohongshu: '#FF2442',
            unknown: '#888'
        }[p] || '#888';
    }

    async function load() {
    try {
        var saved = await localforage.getItem(getWMKey());
        if (saved) {
            data.videos = (saved.videos || []).map(function (v) {
                if (v.type === 'local') return { id: v.id, name: v.name, type: 'local', url: '' };
                return v;
            });
            data.currentId = null;
            data.chatHistory = saved.chatHistory || [];
        } else {
            // 如果是新会话，初始化空数据
            data.videos = [];
            data.currentId = null;
            data.chatHistory = [];
        }
    } catch (e) { console.warn('[watch-movie] load fail', e); }
}

async function save() {
    try {
        var safe = {
            videos: data.videos.map(function (v) {
                if (v.type === 'local') return { id: v.id, name: v.name, type: 'local' };
                return { id: v.id, name: v.name, type: v.type, url: v.url, bvid: v.bvid };
            }),
            currentId: null,
            chatHistory: data.chatHistory.slice(-200)
        };
        await localforage.setItem(getWMKey(), safe);
    } catch (e) { console.warn('[watch-movie] save fail', e); }
}

    async function save() {
        try {
            var safe = {
                videos: data.videos.map(function (v) {
                    if (v.type === 'local') return { id: v.id, name: v.name, type: 'local' };
                    return { id: v.id, name: v.name, type: v.type, url: v.url, bvid: v.bvid };
                }),
                currentId: null,
                chatHistory: data.chatHistory.slice(-200)
            };
            await localforage.setItem(KEY, safe);
        } catch (e) { console.warn('[watch-movie] save fail', e); }
    }

    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ====== 添加本地视频 ======
    window.addMovieFile = function (file) {
        if (!file) return;
        if (!file.type.startsWith('video/')) {
            if (typeof showNotification === 'function') showNotification('请选择视频文件', 'warning');
            return;
        }
        var url = URL.createObjectURL(file);
        data.videos.push({
            id: 'video_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: file.name,
            type: 'local',
            url: url
        });
        save();
        renderPanel();
        if (typeof showNotification === 'function') showNotification('视频已添加', 'success');
    };

    // ====== 添加链接 ======
    window.addMovieLink = function () {
        var url = prompt('粘贴视频链接（支持 bilibili / 腾讯 / 爱奇艺 / 优酷 / 芒果 / 小红书）：');
        if (!url || !url.trim()) return;
        url = url.trim();
        var platform = detectPlatform(url);
        if (platform === 'unknown') {
            if (typeof showNotification === 'function') showNotification('不支持的平台，仅支持 bilibili / 腾讯 / 爱奇艺 / 优酷 / 芒果 / 小红书', 'warning', 3500);
            return;
        }

        var name = prompt('给这个视频起个名字：', platformLabel(platform) + ' 视频') || (platformLabel(platform) + ' 视频');
        var bvid = null;
        if (platform === 'bilibili') {
            bvid = extractBvid(url);
            if (!bvid) {
                if (typeof showNotification === 'function') showNotification('无法从链接解析 BV 号，请检查链接', 'warning', 3500);
                return;
            }
        }

        data.videos.push({
            id: 'video_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: name.trim(),
            type: platform,
            url: url,
            bvid: bvid
        });
        save();
        renderPanel();
        if (typeof showNotification === 'function') showNotification('✓ 已添加「' + name + '」', 'success');
    };

    window.playMovie = function (id) {
        var v = data.videos.find(function (x) { return x.id === id; });
        if (!v) return;
        data.currentId = id;
        renderPanel();
    };

    window.removeMovie = function (id) {
        var idx = data.videos.findIndex(function (x) { return x.id === id; });
        if (idx === -1) return;
        if (!confirm('删除这个视频？')) return;
        data.videos.splice(idx, 1);
        if (data.currentId === id) data.currentId = null;
        save();
        renderPanel();
    };

    // ====== 聊天 ======
    window.sendMovieChat = async function (type, content) {
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
            var emojis = ['🎬','🍿','🎥','💕','✨','🥺','😊','😆','🎞️','💖'];
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
        var el = document.getElementById('movie-chat-scroll');
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
        var el = document.getElementById('movie-chat-scroll');
        if (!el) return;
        el.innerHTML = buildChatHTML();
        setTimeout(function () { el.scrollTop = el.scrollHeight; }, 30);
    }

    // ====== 播放器渲染 ======
    function buildPlayerHTML(current) {
        if (!current) {
            return '<div style="padding:30px;text-align:center;color:var(--text-secondary);font-size:12px;background:var(--primary-bg);border-radius:12px;">请从下方列表选择视频</div>';
        }

        if (current.type === 'local') {
            if (!current.url) {
                return '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:12px;background:var(--primary-bg);border-radius:12px;">（本地视频刷新后失效，请重新添加）</div>';
            }
            return '<video src="' + current.url + '" controls style="width:100%;max-height:220px;background:#000;border-radius:12px;"></video>';
        }

        if (current.type === 'bilibili' && current.bvid) {
            return '<div style="position:relative;width:100%;padding-top:56.25%;border-radius:12px;overflow:hidden;background:#000;">'
                + '<iframe src="https://player.bilibili.com/player.html?bvid=' + encodeURIComponent(current.bvid) + '&page=1&high_quality=1&danmaku=0&autoplay=0" '
                + 'style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" '
                + 'scrolling="no" frameborder="0" framespacing="0" allowfullscreen="true"></iframe>'
                + '</div>';
        }

        // 外链平台：显示卡片
        var color = platformColor(current.type);
        var label = platformLabel(current.type);
        return '<div style="background:linear-gradient(135deg, ' + color + '22, ' + color + '08);border:1.5px solid ' + color + '44;border-radius:12px;padding:18px;display:flex;flex-direction:column;align-items:center;gap:12px;">'
            + '<div style="width:52px;height:52px;border-radius:14px;background:' + color + ';display:flex;align-items:center;justify-content:center;">'
            + '<i class="fas fa-play" style="color:#fff;font-size:20px;"></i></div>'
            + '<div style="font-size:14px;font-weight:600;color:var(--text-primary);text-align:center;">' + escapeHtml(current.name) + '</div>'
            + '<div style="font-size:11px;color:' + color + ';font-weight:600;">' + label + ' · 外部视频</div>'
            + '<div style="font-size:11px;color:var(--text-secondary);opacity:0.7;text-align:center;line-height:1.6;">该平台不支持页面内嵌播放，点击下方按钮在新窗口打开</div>'
            + '<a href="' + escapeHtml(current.url) + '" target="_blank" rel="noopener" style="padding:10px 24px;border-radius:10px;background:' + color + ';color:#fff;font-size:13px;font-weight:600;text-decoration:none;display:flex;align-items:center;gap:6px;">'
            + '<i class="fas fa-external-link-alt"></i> 前往 ' + label + ' 观看</a>'
            + '</div>';
    }

    // ====== 渲染面板 ======
    function renderPanel() {
        var card = document.getElementById('watch-movie-card');
        if (!card) return;

        var current = data.videos.find(function (v) { return v.id === data.currentId; });

        var listHTML = data.videos.length === 0
            ? '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:12px;">暂无视频，点击下方按钮添加</div>'
            : data.videos.map(function (v) {
                var active = v.id === data.currentId;
                var icon = v.type === 'local' ? 'fa-file-video'
                    : v.type === 'bilibili' ? 'fa-tv'
                    : 'fa-external-link-alt';
                var subLabel = v.type === 'local' ? '' : platformLabel(v.type);
                return '<div data-mv-id="' + v.id + '" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;margin-bottom:4px;cursor:pointer;background:' + (active ? 'rgba(var(--accent-color-rgb),0.1)' : 'transparent') + ';">'
                    + '<div style="width:26px;height:26px;border-radius:8px;background:' + (active ? 'var(--accent-color)' : 'var(--border-color)') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
                    + '<i class="fas ' + icon + '" style="font-size:10px;color:' + (active ? '#fff' : 'var(--text-secondary)') + ';"></i></div>'
                    + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-size:12px;font-weight:' + (active ? '700' : '500') + ';color:' + (active ? 'var(--accent-color)' : 'var(--text-primary)') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(v.name) + '</div>'
                    + (subLabel ? '<div style="font-size:10px;color:var(--text-secondary);opacity:0.7;">' + subLabel + '</div>' : '')
                    + '</div>'
                    + '<button data-del-mv="' + v.id + '" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:11px;padding:4px 6px;opacity:0.6;">✕</button>'
                    + '</div>';
            }).join('');

        var chatHTML = buildChatHTML();

        card.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border-color);flex-shrink:0;gap:6px;">'
            + '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
            + '<div style="width:32px;height:32px;border-radius:10px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">'
            + '<i class="fas fa-film" style="color:var(--accent-color);font-size:14px;"></i></div>'
            + '<span style="font-size:14px;font-weight:700;color:var(--text-primary);white-space:nowrap;">一起看电影</span></div>'
            + '<div style="display:flex;align-items:center;gap:5px;flex:1;justify-content:flex-end;">'
            + '<button id="mv-add-link" style="padding:6px 10px;border:none;border-radius:8px;background:var(--accent-color);color:#fff;font-size:12px;cursor:pointer;font-family:var(--font-family);white-space:nowrap;"><i class="fas fa-link"></i> 加链接</button>'
            + '<button id="mv-add-local" style="padding:6px 10px;border:1.5px solid var(--accent-color);border-radius:8px;background:none;color:var(--accent-color);font-size:12px;cursor:pointer;font-family:var(--font-family);white-space:nowrap;"><i class="fas fa-upload"></i> 本地</button>'
            + '<button id="mv-close-btn" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;padding:0 4px;"><i class="fas fa-times"></i></button>'
            + '</div></div>'

            + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">'

            + '<div style="padding:12px 16px;border-bottom:1px solid var(--border-color);flex-shrink:0;">'
            + buildPlayerHTML(current)
            + '</div>'

            + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">'
            + '<div id="movie-chat-scroll" style="flex:1;overflow-y:auto;padding:14px 16px;">' + chatHTML + '</div>'
            + '<div style="display:flex;gap:6px;padding:10px 12px;border-top:1px solid var(--border-color);background:var(--primary-bg);flex-shrink:0;">'
            + '<button id="mv-emoji" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-smile"></i></button>'
            + '<button id="mv-sticker" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-image"></i></button>'
            + '<button id="mv-image" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-camera"></i></button>'
            + '<input id="mv-input" type="text" placeholder="边看边聊…" style="flex:1;min-width:0;padding:8px 14px;border:1px solid var(--border-color);border-radius:20px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);">'
            + '<button id="mv-send" style="padding:8px 14px;border:none;border-radius:20px;background:var(--accent-color);color:#fff;font-size:13px;cursor:pointer;flex-shrink:0;">发送</button>'
            + '</div></div>'

            + '<div style="border-top:1px solid var(--border-color);background:var(--primary-bg);flex-shrink:0;">'
            + '<div id="mv-list-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;cursor:pointer;">'
            + '<span style="font-size:12px;font-weight:600;color:var(--text-secondary);"><i class="fas fa-list" style="margin-right:6px;"></i>视频列表 (' + data.videos.length + ')</span>'
            + '<i id="mv-list-arrow" class="fas fa-chevron-up" style="font-size:11px;color:var(--text-secondary);transition:transform 0.2s;"></i>'
            + '</div>'
            + '<div id="mv-list-body" style="max-height:0;overflow:hidden;transition:max-height 0.3s;border-top:1px solid var(--border-color);">'
            + '<div style="padding:8px 12px;max-height:240px;overflow-y:auto;">' + listHTML + '</div>'
            + '</div></div>'

            + '</div>';

        bindPanelEvents();
    }

    function bindPanelEvents() {
        var card = document.getElementById('watch-movie-card');
        if (!card) return;

        document.getElementById('mv-close-btn').onclick = function () { window.closeWatchMoviePanel(); };

        document.getElementById('mv-add-link').onclick = function () { window.addMovieLink(); };

        document.getElementById('mv-add-local').onclick = function () {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.onchange = function (ev) {
                var f = ev.target.files[0];
                if (f) window.addMovieFile(f);
            };
            input.click();
        };

        document.getElementById('mv-list-toggle').onclick = function () {
            var body = document.getElementById('mv-list-body');
            var arrow = document.getElementById('mv-list-arrow');
            if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
                body.style.maxHeight = '260px';
                arrow.style.transform = 'rotate(180deg)';
            } else {
                body.style.maxHeight = '0px';
                arrow.style.transform = 'rotate(0)';
            }
        };

        card.querySelectorAll('[data-mv-id]').forEach(function (el) {
            el.onclick = function (e) {
                if (e.target.closest('[data-del-mv]')) return;
                window.playMovie(el.dataset.mvId);
            };
        });
        card.querySelectorAll('[data-del-mv]').forEach(function (btn) {
            btn.onclick = function (e) {
                e.stopPropagation();
                window.removeMovie(btn.dataset.delMv);
            };
        });

        var input = document.getElementById('mv-input');
        var sendBtn = document.getElementById('mv-send');
        var doSend = function () {
            var v = input.value.trim();
            if (!v) return;
            input.value = '';
            window.sendMovieChat('text', v);
        };
        sendBtn.onclick = doSend;
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); doSend(); }
        });

        document.getElementById('mv-emoji').onclick = function () {
            var emojis = ['🎬','🍿','🎥','💕','✨','🥺','😊','😆','🎞️','💖'];
            openMovieQuickPicker('选择表情', emojis.map(function (e) { return { type: 'emoji', content: e }; }));
        };
        document.getElementById('mv-sticker').onclick = function () {
            var stickers = (typeof stickerLibrary !== 'undefined' && stickerLibrary.length > 0) ? stickerLibrary : [];
            if (stickers.length === 0) { if (typeof showNotification === 'function') showNotification('对方表情库为空', 'warning'); return; }
            openMovieQuickPicker('选择表情包', stickers.map(function (s) { return { type: 'sticker', content: s }; }));
        };
        document.getElementById('mv-image').onclick = function () {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async function (e) {
                var file = e.target.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { if (typeof showNotification === 'function') showNotification('图片不能超过 2MB', 'error'); return; }
                try {
                    var base64 = await optimizeImage(file, 600, 0.8);
                    window.sendMovieChat('image', base64);
                } catch (err) { if (typeof showNotification === 'function') showNotification('图片处理失败', 'error'); }
            };
            input.click();
        };
    }

    function openMovieQuickPicker(title, items) {
        var old = document.getElementById('mv-quick-picker');
        if (old) old.remove();
        var modal = document.createElement('div');
        modal.id = 'mv-quick-picker';
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
            + '<button id="mv-picker-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="flex:1;overflow-y:auto;padding:14px 20px 20px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">' + gridHTML + '</div>'
            + '</div>';
        document.body.appendChild(modal);
        document.getElementById('mv-picker-close').onclick = function () { modal.remove(); };
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
        modal.querySelectorAll('[data-pi]').forEach(function (el) {
            el.onclick = function () {
                var it = items[parseInt(el.dataset.pi)];
                modal.remove();
                window.sendMovieChat(it.type, it.content);
            };
        });
    }

    window.openWatchMoviePanel = function () {
        if (panelEl) return;
        panelEl = document.createElement('div');
        panelEl.id = 'watch-movie-panel';
        panelEl.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        var card = document.createElement('div');
        card.id = 'watch-movie-card';
        card.style.cssText = 'background:var(--secondary-bg);border-radius:20px;width:94%;max-width:460px;height:88vh;max-height:760px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4);';
        panelEl.appendChild(card);
        panelEl.addEventListener('click', function (e) { if (e.target === panelEl) window.closeWatchMoviePanel(); });
        document.body.appendChild(panelEl);
        renderPanel();
    };

    window.closeWatchMoviePanel = function () {
        if (panelEl) { panelEl.remove(); panelEl = null; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }
})();
