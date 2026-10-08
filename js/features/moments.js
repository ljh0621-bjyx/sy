/**
 * moments.js
 * 朋友圈：双方都能发 / 点赞 / 评论，对方内容从字卡库取
 */
(function () {
    'use strict';

    var KEY = 'momentsData_v1';

    var CHANCE_KEYS = {
    like: 'momentsChanceLike',
    comment: 'momentsChanceComment',
    reply: 'momentsChanceReply'
};
var CHANCE_DEFAULTS = { like: 40, comment: 40, reply: 50 };

function getChance(key) {
    var v = parseInt(localStorage.getItem(CHANCE_KEYS[key]), 10);
    if (isNaN(v)) v = CHANCE_DEFAULTS[key];
    return Math.max(0, Math.min(100, v)) / 100;
}
function setChance(key, val) {
    try { localStorage.setItem(CHANCE_KEYS[key], String(val)); } catch (e) {}
}
var data = {
    posts: []
};

    var panelEl = null;

    async function load() {
        try {
            var saved = await localforage.getItem(KEY);
            if (saved && Array.isArray(saved.posts)) data.posts = saved.posts;
        } catch (e) { console.warn('[moments] load fail', e); }
    }
    async function save() {
        try {
            await localforage.setItem(KEY, { posts: data.posts.slice(-200) });
        } catch (e) { console.warn('[moments] save fail', e); }
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function fmtTime(ts) {
        var d = new Date(ts);
        var now = new Date();
        var diff = (now - d) / 1000;
        if (diff < 60) return '刚刚';
        if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
        if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
        if (diff < 86400 * 7) return Math.floor(diff / 86400) + '天前';
        return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function avatarHtml(author) {
        var el = author === 'me'
            ? (typeof DOMElements !== 'undefined' ? DOMElements.me.avatar : null)
            : (typeof DOMElements !== 'undefined' ? DOMElements.partner.avatar : null);
        var img = el ? el.querySelector('img') : null;
        if (img) return '<img src="' + img.src + '" style="width:38px;height:38px;border-radius:8px;object-fit:cover;">';
        return '<div style="width:38px;height:38px;border-radius:8px;background:rgba(var(--accent-color-rgb),0.15);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="color:var(--accent-color);font-size:16px;"></i></div>';
    }

    function nameOf(author) {
        if (author === 'me') return (typeof settings !== 'undefined' && settings.myName) || '我';
        return (typeof settings !== 'undefined' && settings.partnerName) || '对方';
    }

    function randomCardText() {
        var pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(function (t) { return t && String(t).trim(); })
            : [];
        if (pool.length === 0) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function renderPanel() {
        if (!panelEl) return;

        var listHTML = '';
        if (data.posts.length === 0) {
            listHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-secondary);font-size:13px;">'
                + '<i class="fas fa-camera-retro" style="font-size:36px;opacity:0.3;display:block;margin-bottom:12px;"></i>'
                + '还没有动态，发一条试试～</div>';
        } else {
            var sorted = data.posts.slice().sort(function (a, b) { return b.timestamp - a.timestamp; });
            listHTML = sorted.map(function (p) {
                var name = nameOf(p.author);
                var textHTML = p.text ? '<div style="font-size:13.5px;color:var(--text-primary);line-height:1.7;margin-bottom:8px;white-space:pre-wrap;word-break:break-word;">' + esc(p.text) + '</div>' : '';
                var imgHTML = p.image ? '<img src="' + p.image + '" style="max-width:100%;max-height:220px;border-radius:10px;display:block;margin-bottom:8px;cursor:pointer;" onclick="if(typeof viewImage===\'function\')viewImage(\'' + p.image.replace(/'/g, "\\'") + '\')" loading="lazy">' : '';
                var musicHTML = p.music ? '<div style="background:var(--primary-bg);border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;border:1px solid var(--border-color);">'
                    + '<div style="width:34px;height:34px;border-radius:8px;background:var(--accent-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
                    + '<i class="fas fa-music" style="color:#fff;font-size:14px;"></i></div>'
                    + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-size:12.5px;color:var(--text-primary);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(p.music.title || '未知歌曲') + '</div>'
                    + (p.music.sub ? '<div style="font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(p.music.sub) + '</div>' : '')
                    + '</div>'
                    + '<button onclick="window._momentsPlayMusic(' + p.id + ')" style="width:30px;height:30px;border-radius:50%;border:none;background:var(--accent-color);color:#fff;cursor:pointer;flex-shrink:0;"><i class="fas fa-play" style="font-size:11px;"></i></button>'
                    + '</div>' : '';

                var likedByMe = p.likes && p.likes.indexOf('me') !== -1;
                var likedByPartner = p.likes && p.likes.indexOf('partner') !== -1;
                var totalLikes = (p.likes ? p.likes.length : 0);
                var likeLabel = '';
                if (totalLikes > 0) {
                    var likers = [];
                    if (likedByMe) likers.push('我');
                    if (likedByPartner) likers.push(nameOf('partner'));
                    likeLabel = likers.join('、');
                }
                var likeHtml = '<button onclick="window._momentsToggleLike(' + p.id + ')" style="background:none;border:none;cursor:pointer;font-size:12px;color:' + (likedByMe ? 'var(--accent-color)' : 'var(--text-secondary)') + ';padding:4px 6px;display:flex;align-items:center;gap:4px;">'
                    + '<i class="' + (likedByMe ? 'fas' : 'far') + ' fa-heart"></i> '
                    + (totalLikes ? totalLikes : '')
                    + '</button>';

                var likesDisplay = likeLabel
                    ? '<div style="background:var(--primary-bg);border-radius:8px;padding:6px 10px;margin-top:6px;font-size:12px;color:var(--text-secondary);"><i class="fas fa-heart" style="color:var(--accent-color);font-size:11px;margin-right:4px;"></i>' + esc(likeLabel) + '</div>'
                    : '';

                var commentsHtml = '';
                if (p.comments && p.comments.length > 0) {
                    commentsHtml = '<div style="background:var(--primary-bg);border-radius:8px;padding:8px 10px;margin-top:6px;">'
                        + p.comments.map(function (c) {
                            return '<div style="font-size:12px;color:var(--text-primary);line-height:1.6;margin-bottom:3px;"><b style="color:var(--accent-color);">' + esc(nameOf(c.from)) + '：</b>' + esc(c.text) + '</div>';
                        }).join('')
                        + '</div>';
                }

                var delBtn = p.author === 'me'
                    ? '<button onclick="window._momentsDelete(' + p.id + ')" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:11px;padding:4px 6px;opacity:0.6;"><i class="fas fa-trash"></i></button>'
                    : '';

                return '<div style="background:var(--secondary-bg);border-radius:14px;padding:14px;margin-bottom:12px;border:1px solid var(--border-color);">'
                    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
                    + avatarHtml(p.author)
                    + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-size:13px;font-weight:700;color:var(--text-primary);">' + esc(name) + '</div>'
                    + '<div style="font-size:11px;color:var(--text-secondary);">' + fmtTime(p.timestamp) + '</div>'
                    + '</div>'
                    + delBtn
                    + '</div>'
                    + textHTML + imgHTML + musicHTML
                    + '<div style="display:flex;align-items:center;gap:6px;padding-top:6px;border-top:1px dashed var(--border-color);">'
                    + likeHtml
                    + '<button onclick="window._momentsComment(' + p.id + ')" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-secondary);padding:4px 6px;display:flex;align-items:center;gap:4px;"><i class="far fa-comment"></i> 评论</button>'
                    + '</div>'
                    + likesDisplay
                    + commentsHtml
                    + '</div>';
            }).join('');
        }

        var content = panelEl.querySelector('#moments-list');
        if (content) content.innerHTML = listHTML;
    }

    window.openMomentsPanel = async function () {
        if (panelEl) { panelEl.remove(); panelEl = null; }
        await load();

        panelEl = document.createElement('div');
        panelEl.id = 'moments-panel';
        panelEl.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        panelEl.innerHTML =

    // 最外层卡片容器
    '<div style="background:var(--primary-bg);border-radius:20px;width:94%;max-width:460px;height:88vh;max-height:760px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'

    // 头部
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border-color);background:var(--secondary-bg);flex-shrink:0;">'
    +   '<div style="display:flex;align-items:center;gap:10px;">'
    +     '<div style="width:34px;height:34px;border-radius:10px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">'
    +       '<i class="fas fa-camera-retro" style="color:var(--accent-color);font-size:14px;"></i>'
    +     '</div>'
    +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">朋友圈</span>'
    +   '</div>'
    +   '<div style="display:flex;gap:6px;align-items:center;">'
    +     '<button id="moments-post-btn" style="padding:7px 14px;border:none;border-radius:10px;background:var(--accent-color);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-plus"></i> 发动态</button>'
    +     '<button id="moments-settings-btn" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;padding:0 6px;" title="互动概率设置"><i class="fas fa-sliders-h"></i></button>'
    +     '<button id="moments-close-btn" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;padding:0 6px;"><i class="fas fa-times"></i></button>'
    +   '</div>'
    + '</div>'

    // 动态列表（★ 加了 display:block 强制竖直排列）
    + '<div id="moments-list" style="flex:1;overflow-y:auto;padding:14px;background:var(--primary-bg);display:block;"></div>'

    + '</div>';

        document.body.appendChild(panelEl);

        panelEl.querySelector('#moments-close-btn').onclick = function () { panelEl.remove(); panelEl = null; };
        panelEl.addEventListener('click', function (e) {
            if (e.target === panelEl) { panelEl.remove(); panelEl = null; }
        });
        panelEl.querySelector('#moments-post-btn').onclick = function () { openPostEditor(); };
        panelEl.querySelector('#moments-settings-btn').onclick = function () { openSettingsPanel(); };

        renderPanel();
    };

    function openPostEditor() {
        var old = document.getElementById('moments-editor');
        if (old) old.remove();

        var editor = document.createElement('div');
        editor.id = 'moments-editor';
        editor.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;';

        editor.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px;padding:22px;width:92%;max-width:440px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +   '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">发一条动态</span>'
            +   '<button id="me-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="flex:1;overflow-y:auto;padding-right:2px;">'
            + '<textarea id="me-text" placeholder="这一刻的想法…" rows="3" style="width:100%;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-family:var(--font-family);resize:vertical;outline:none;box-sizing:border-box;line-height:1.6;margin-bottom:12px;"></textarea>'

            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;font-weight:600;">图片（可选）</div>'
            + '<div style="display:flex;gap:8px;margin-bottom:14px;">'
            +   '<button id="me-img-upload" style="flex:1;padding:9px;border:1.5px dashed var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-upload"></i> 本地上传</button>'
            +   '<button id="me-img-partner" style="flex:1;padding:9px;border:1.5px dashed var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-images"></i> 对方图片库</button>'
            + '</div>'
            + '<div id="me-img-preview" style="display:none;margin-bottom:12px;position:relative;">'
            +   '<img id="me-img-preview-img" style="width:100%;max-height:180px;border-radius:10px;object-fit:cover;display:block;">'
            +   '<button id="me-img-clear" style="position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;border:none;background:rgba(0,0,0,0.5);color:#fff;cursor:pointer;font-size:12px;"><i class="fas fa-times"></i></button>'
            + '</div>'

            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;font-weight:600;">音乐（可选）</div>'
            + '<div style="display:flex;gap:8px;margin-bottom:12px;">'
            +   '<button id="me-music-playlist" style="flex:1;padding:9px;border:1.5px dashed var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-list"></i> 歌单选</button>'
            +   '<button id="me-music-url" style="flex:1;padding:9px;border:1.5px dashed var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-link"></i> 粘贴链接</button>'
            + '</div>'
            + '<div id="me-music-preview" style="display:none;background:var(--primary-bg);border-radius:10px;padding:10px 12px;margin-bottom:12px;align-items:center;gap:10px;">'
            +   '<i class="fas fa-music" style="color:var(--accent-color);"></i>'
            +   '<div style="flex:1;min-width:0;font-size:12px;color:var(--text-primary);" id="me-music-preview-text"></div>'
            +   '<button id="me-music-clear" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '</div>'

            + '<div style="display:flex;gap:10px;margin-top:14px;flex-shrink:0;">'
            +   '<button id="me-cancel" style="flex:1;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +   '<button id="me-publish" style="flex:2;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-paper-plane"></i> 发布</button>'
            + '</div>'
            + '</div>';

        document.body.appendChild(editor);

        var state = { image: null, music: null };

        editor.querySelector('#me-close').onclick = function () { editor.remove(); };
        editor.querySelector('#me-cancel').onclick = function () { editor.remove(); };
        editor.addEventListener('click', function (e) { if (e.target === editor) editor.remove(); });

        editor.querySelector('#me-img-upload').onclick = function () {
            var inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = 'image/*';
            inp.onchange = async function (e) {
                var f = e.target.files[0];
                if (!f) return;
                if (f.size > 5 * 1024 * 1024) { if (typeof showNotification === 'function') showNotification('图片不能超过 5MB', 'error'); return; }
                try {
                    var b64 = await (typeof optimizeImage === 'function' ? optimizeImage(f, 800, 0.8) : Promise.reject('no'));
                    state.image = b64;
                    var prev = editor.querySelector('#me-img-preview');
                    var img = editor.querySelector('#me-img-preview-img');
                    img.src = b64;
                    prev.style.display = 'block';
                } catch (err) { if (typeof showNotification === 'function') showNotification('图片处理失败', 'error'); }
            };
            inp.click();
        };

        editor.querySelector('#me-img-partner').onclick = function () {
            if (typeof window.getRandomPartnerImage !== 'function') {
                if (typeof showNotification === 'function') showNotification('对方图片库未加载', 'warning');
                return;
            }
            var img = window.getRandomPartnerImage();
            if (!img) { if (typeof showNotification === 'function') showNotification('对方图片库为空', 'warning'); return; }
            state.image = img.url;
            var prev = editor.querySelector('#me-img-preview');
            var imgEl = editor.querySelector('#me-img-preview-img');
            imgEl.src = img.url;
            prev.style.display = 'block';
        };

        editor.querySelector('#me-img-clear').onclick = function () {
            state.image = null;
            editor.querySelector('#me-img-preview').style.display = 'none';
        };

        editor.querySelector('#me-music-playlist').onclick = function () {
            var songs = getSongsFromPlayer();
            if (songs.length === 0) { if (typeof showNotification === 'function') showNotification('歌单为空', 'warning'); return; }
            showSongPicker(songs, function (song) {
                state.music = { title: song.title, sub: song.sub || '', url: song.url };
                var prev = editor.querySelector('#me-music-preview');
                prev.style.display = 'flex';
                editor.querySelector('#me-music-preview-text').textContent = song.title + (song.sub ? ' - ' + song.sub : '');
            });
        };

        editor.querySelector('#me-music-url').onclick = function () {
            var url = prompt('粘贴音乐链接：');
            if (!url || !url.trim()) return;
            var title = prompt('歌曲名称：', '未知歌曲') || '未知歌曲';
            state.music = { title: title.trim(), sub: '', url: url.trim() };
            var prev = editor.querySelector('#me-music-preview');
            prev.style.display = 'flex';
            editor.querySelector('#me-music-preview-text').textContent = title;
        };

        editor.querySelector('#me-music-clear').onclick = function () {
            state.music = null;
            editor.querySelector('#me-music-preview').style.display = 'none';
        };

        editor.querySelector('#me-publish').onclick = async function () {
            var text = editor.querySelector('#me-text').value.trim();
            if (!text && !state.image && !state.music) {
                if (typeof showNotification === 'function') showNotification('至少发点内容吧～', 'warning');
                return;
            }
            await addPost({
                author: 'me',
                text: text,
                image: state.image,
                music: state.music,
                timestamp: Date.now(),
                likes: [],
                comments: []
            });
            editor.remove();
            renderPanel();
            if (typeof showNotification === 'function') showNotification('✓ 已发布', 'success');
            // 对方可能立刻点赞/评论
            schedulePartnerReact(data.posts[data.posts.length - 1].id);
        };
    }

    function getSongsFromPlayer() {
        try {
            if (window.songs && Array.isArray(window.songs)) return window.songs;
            if (typeof songs !== 'undefined' && Array.isArray(songs)) return songs;
        } catch (e) {}
        return [];
    }

    function showSongPicker(songs, onPick) {
        var old = document.getElementById('moments-song-picker');
        if (old) old.remove();
        var picker = document.createElement('div');
        picker.id = 'moments-song-picker';
        picker.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;';

        var listHtml = songs.map(function (s, i) {
            return '<div data-si="' + i + '" style="padding:12px 16px;border-bottom:1px solid var(--border-color);cursor:pointer;">'
                + '<div style="font-size:13px;color:var(--text-primary);font-weight:500;">' + esc(s.title) + '</div>'
                + (s.sub ? '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + esc(s.sub) + '</div>' : '')
                + '</div>';
        }).join('');

        picker.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px 20px 0 0;width:100%;max-width:500px;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 -10px 60px rgba(0,0,0,0.3);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border-color);">'
            +   '<span style="font-size:14px;font-weight:600;color:var(--text-primary);">选择歌曲</span>'
            +   '<button id="msp-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="flex:1;overflow-y:auto;">' + listHtml + '</div>'
            + '</div>';

        document.body.appendChild(picker);

        picker.querySelector('#msp-close').onclick = function () { picker.remove(); };
        picker.addEventListener('click', function (e) { if (e.target === picker) picker.remove(); });
        picker.querySelectorAll('[data-si]').forEach(function (el) {
            el.onclick = function () {
                var s = songs[parseInt(el.dataset.si)];
                picker.remove();
                onPick(s);
            };
        });
    }

    async function addPost(post) {
        post.id = Date.now() + Math.floor(Math.random() * 1000);
        data.posts.push(post);
        await save();
    }

    // 播放朋友圈音乐
    window._momentsPlayMusic = function (postId) {
        var p = data.posts.find(function (x) { return x.id === postId; });
        if (!p || !p.music || !p.music.url) return;
        try {
            var a = new Audio(p.music.url);
            a.volume = 0.6;
            a.play();
        } catch (e) { if (typeof showNotification === 'function') showNotification('播放失败', 'error'); }
    };

    // 点赞（我）
    window._momentsToggleLike = async function (postId) {
        var p = data.posts.find(function (x) { return x.id === postId; });
        if (!p) return;
        if (!p.likes) p.likes = [];
        var idx = p.likes.indexOf('me');
        if (idx === -1) p.likes.push('me');
        else p.likes.splice(idx, 1);
        await save();
        renderPanel();
        // 我点赞对方的动态后，对方有概率也点赞我的动态
        if (p.author === 'partner' && idx === -1) schedulePartnerBackLike();
    };

    // 评论（我）
    window._momentsComment = async function (postId) {
        var p = data.posts.find(function (x) { return x.id === postId; });
        if (!p) return;
        var text = prompt('评论：');
        if (!text || !text.trim()) return;
        if (!p.comments) p.comments = [];
        p.comments.push({ from: 'me', text: text.trim(), time: Date.now() });
        await save();
        renderPanel();
        // 我给对方评论了 → 他可能回复我
        if (p.author === 'partner') schedulePartnerReplyComment(postId);
        // 他动态下的我评论 → 对方也可能点赞我的动态
        if (p.author === 'partner') schedulePartnerBackLike();
    };

    // 我评论自己动态后，对方有概率评论（字卡内容）
    window._momentsDelete = async function (postId) {
        if (!confirm('删除这条动态？')) return;
        data.posts = data.posts.filter(function (x) { return x.id !== postId; });
        await save();
        renderPanel();
    };
// ===== 互动概率设置面板 =====
function openSettingsPanel() {
    var old = document.getElementById('moments-settings');
    if (old) old.remove();

    var cur = {
        like: parseInt(localStorage.getItem(CHANCE_KEYS.like) || CHANCE_DEFAULTS.like, 10),
        comment: parseInt(localStorage.getItem(CHANCE_KEYS.comment) || CHANCE_DEFAULTS.comment, 10),
        reply: parseInt(localStorage.getItem(CHANCE_KEYS.reply) || CHANCE_DEFAULTS.reply, 10)
    };

    var panel = document.createElement('div');
    panel.id = 'moments-settings';
    panel.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;';

    panel.innerHTML =
        '<div style="background:var(--secondary-bg);border-radius:20px;padding:22px;width:92%;max-width:400px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
        +   '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-sliders-h" style="color:var(--accent-color);margin-right:8px;"></i>互动概率设置</span>'
        +   '<button id="ms-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
        + '</div>'

        + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">调整他回应你动态的概率</div>'

        + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">'
        +   '<span style="font-size:13px;color:var(--text-primary);flex:1;">自动点赞</span>'
        +   '<input type="range" id="ms-like" min="0" max="100" value="' + cur.like + '" style="flex:2;accent-color:var(--accent-color);">'
        +   '<span id="ms-like-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:44px;text-align:right;">' + cur.like + '%</span>'
        + '</div>'

        + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">'
        +   '<span style="font-size:13px;color:var(--text-primary);flex:1;">自动评论</span>'
        +   '<input type="range" id="ms-comment" min="0" max="100" value="' + cur.comment + '" style="flex:2;accent-color:var(--accent-color);">'
        +   '<span id="ms-comment-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:44px;text-align:right;">' + cur.comment + '%</span>'
        + '</div>'

        + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">'
        +   '<span style="font-size:13px;color:var(--text-primary);flex:1;">回复我的评论</span>'
        +   '<input type="range" id="ms-reply" min="0" max="100" value="' + cur.reply + '" style="flex:2;accent-color:var(--accent-color);">'
        +   '<span id="ms-reply-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:44px;text-align:right;">' + cur.reply + '%</span>'
        + '</div>'

        + '<div style="display:flex;gap:10px;">'
        +   '<button id="ms-reset" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">恢复默认</button>'
        +   '<button id="ms-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">保存</button>'
        + '</div>'
        + '</div>';

    document.body.appendChild(panel);

    var likeEl = panel.querySelector('#ms-like');
    var commentEl = panel.querySelector('#ms-comment');
    var replyEl = panel.querySelector('#ms-reply');

    likeEl.oninput = function () { panel.querySelector('#ms-like-val').textContent = likeEl.value + '%'; };
    commentEl.oninput = function () { panel.querySelector('#ms-comment-val').textContent = commentEl.value + '%'; };
    replyEl.oninput = function () { panel.querySelector('#ms-reply-val').textContent = replyEl.value + '%'; };

    var close = function () { panel.remove(); };
    panel.querySelector('#ms-close').onclick = close;
    panel.addEventListener('click', function (e) { if (e.target === panel) close(); });

    panel.querySelector('#ms-reset').onclick = function () {
        likeEl.value = CHANCE_DEFAULTS.like;
        commentEl.value = CHANCE_DEFAULTS.comment;
        replyEl.value = CHANCE_DEFAULTS.reply;
        panel.querySelector('#ms-like-val').textContent = CHANCE_DEFAULTS.like + '%';
        panel.querySelector('#ms-comment-val').textContent = CHANCE_DEFAULTS.comment + '%';
        panel.querySelector('#ms-reply-val').textContent = CHANCE_DEFAULTS.reply + '%';
    };

    panel.querySelector('#ms-save').onclick = function () {
        setChance('like', likeEl.value);
        setChance('comment', commentEl.value);
        setChance('reply', replyEl.value);
        close();
        if (typeof showNotification === 'function') showNotification('✓ 已保存', 'success', 1500);
    };
}

    // ===== 对方行为逻辑 =====

    // 1) 我发动态后，对方可能点赞/评论
function schedulePartnerReact(postId) {
    var delay = 30000 + Math.random() * 90000;
    setTimeout(async function () {
        var p = data.posts.find(function (x) { return x.id === postId; });
        if (!p) return;
        if (!p.likes) p.likes = [];
        if (Math.random() < getChance('like') && p.likes.indexOf('partner') === -1) {
            p.likes.push('partner');
        }
        if (Math.random() < getChance('comment')) {
            var cardText = randomCardText();
            if (cardText) {
                if (!p.comments) p.comments = [];
                p.comments.push({ from: 'partner', text: cardText, time: Date.now() });
            }
        }
         await save();
    renderPanel();
    var pn = (typeof settings !== 'undefined' && settings.partnerName) || '对方';

    // ★ 分别推送"点赞"和"评论"到聊天记录
    if (typeof addMessage === 'function') {
        if (p.likes && p.likes.indexOf('partner') !== -1) {
            try {
                addMessage({
                    id: Date.now() + Math.random(),
                    sender: null,
                    text: '📱 ' + pn + ' 点赞了你的朋友圈',
                    timestamp: new Date(),
                    status: 'received',
                    type: 'system'
                });
            } catch (e) {}
        }
        if (p.comments && p.comments.length > 0) {
            var lastComment = p.comments[p.comments.length - 1];
            if (lastComment && lastComment.from === 'partner') {
                try {
                    addMessage({
                        id: Date.now() + Math.random() + 1,
                        sender: null,
                        text: '📱 ' + pn + ' 评论了你的朋友圈：' + lastComment.text,
                        timestamp: new Date(),
                        status: 'received',
                        type: 'system'
                    });
                } catch (e) {}
            }
        }
    }

    if (typeof showNotification === 'function') showNotification(pn + ' 回应了你的动态', 'info', 2500);
}, delay);   
}

    // 2) 我点赞了对方动态 → 对方也可能点赞我的动态
    function schedulePartnerBackLike() {
        var delay = 5000 + Math.random() * 15000;
        setTimeout(async function () {
            var myPosts = data.posts.filter(function (x) { return x.author === 'me'; });
            if (myPosts.length === 0) return;
            var target = myPosts[Math.floor(Math.random() * myPosts.length)];
            if (!target.likes) target.likes = [];
            if (target.likes.indexOf('partner') === -1) {
                target.likes.push('partner');
                await save();
                renderPanel();
            }
        }, delay);
    }

    // 3) 我评论对方动态 → 对方回复我的评论（从字卡库取）
   function schedulePartnerReplyComment(postId) {
    var delay = 30000 + Math.random() * 150000;
    setTimeout(async function () {
        if (Math.random() > getChance('reply')) return;
        var p = data.posts.find(function (x) { return x.id === postId; });
        if (!p) return;
        var cardText = randomCardText();
        if (!cardText) return;
        if (!p.comments) p.comments = [];
        p.comments.push({ from: 'partner', text: cardText, time: Date.now() });
        await save();
        renderPanel();
        var pn = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
        if (typeof showNotification === 'function') showNotification(pn + ' 回复了你的评论', 'info', 2500);
    }, delay);
}

    // 4) 定时自动发动态
    async function partnerAutoPost() {
        await load();
        var post = { author: 'partner', timestamp: Date.now(), likes: [], comments: [] };

        var hasText = Math.random() < 0.85;
        var hasImage = Math.random() < 0.4;
        var hasMusic = Math.random() < 0.4;

        if (hasText) {
            var cardText = randomCardText();
            if (cardText) post.text = cardText;
        }
        if (hasImage && typeof window.getRandomPartnerImage === 'function') {
            var img = window.getRandomPartnerImage();
            if (img) post.image = img.url;
        }
        if (hasMusic) {
            var songs = getSongsFromPlayer();
            if (songs.length > 0) {
                var s = songs[Math.floor(Math.random() * songs.length)];
                post.music = { title: s.title, sub: s.sub || '', url: s.url };
            }
        }
        if (!post.text && !post.image && !post.music) post.text = '今天也要好好的～';

        // 自动给自己点赞（80%）
        if (Math.random() < 0.8) post.likes.push('partner');

        await addPost(post);
        if (typeof showNotification === 'function') {
            var pn = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
            showNotification(pn + ' 发了一条动态', 'info', 3000);
        }
        if (panelEl) renderPanel();
    }

    function schedulePartnerPosts() {
        if (window._momentsTimer) clearTimeout(window._momentsTimer);
        var delay = (60 + Math.random() * 120) * 60 * 1000;
        window._momentsTimer = setTimeout(async function () {
            try { await partnerAutoPost(); } catch (e) { console.warn(e); }
            schedulePartnerPosts();
        }, delay);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { load(); schedulePartnerPosts(); });
    } else {
        load();
        schedulePartnerPosts();
    }
})();
// === moments.js 新增入口 ===
window.initMomentsPanel = function() {
    var btn = document.getElementById('moments-function'); // 对应 HTML 里的 ID
    if (btn && !btn.dataset.initialized) {
        btn.dataset.initialized = 'true';
        btn.addEventListener('click', function() {
            var advancedModal = document.getElementById('advanced-modal');
            if (advancedModal && typeof hideModal === 'function') hideModal(advancedModal);
            if (typeof window.openMomentsPanel === 'function') {
                window.openMomentsPanel();
            }
        });
    }
};
window.initMomentsPanel = function() {
    console.log('[moments] 朋友圈 已就绪');
};