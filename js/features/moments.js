/* ============================================================
 * moments.js - 朋友圈（分类版）
 * 打开先看到分类页，可选"我的"或"他的"
 * ============================================================ */
(function () {
    'use strict';

    var KEY = getStorageKey('momentsData_v1');
    var HIS_KEY = getStorageKey('hisMoments_v1');

    var CHANCE_KEYS = {
        like: getStorageKey('momentsChanceLike'),
        comment: getStorageKey('momentsChanceComment'),
        reply: getStorageKey('momentsChanceReply')
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

    var data = { posts: [] };
    var hisData = { posts: [], lastPostTs: 0 };

    var HIS_POSTS = [
        '今天天气挺好的。', '刚下班，有点累。', '中午吃了碗面，还不错。',
        '路过一家花店，拍了一张。', '安静的一天。', '在听一首老歌。',
        '今晚上要早点睡。', '想起了一些事。', '新买的杯子到了，挺喜欢。',
        '很久没打球了。', '刚刚下楼买水，风很大。', '早上起来雾很大。',
        '看到一只猫，蹲在我脚边。', '今天有一点点好。', '开会开了一下午，头有点疼。',
        '煮了碗粥，吃完舒服多了。', '想出去走走，但不知道去哪。', '新学了一个菜，还行。',
        '手机相册翻到以前的照片了。', '今天没什么特别的事，但也挺好。'
    ];

    var HIS_REPLIES = [
        '嗯。', '谢谢。', '是呀。', '哈哈，被你说中。',
        '你也这么觉得吗。', '难得有人懂。', '嗯……你也注意身体。',
        '好，我知道。', '你也是。', '差不多就这些吧。',
        '看到你的评论我笑了一下。', '你怎么什么都知道。'
    ];

    var panelEl = null;
    var currentView = 'home'; // home | mine | his

    async function load() {
        try {
            var saved = await localforage.getItem(KEY);
            if (saved && Array.isArray(saved.posts)) data.posts = saved.posts;
            var hisSaved = await localforage.getItem(HIS_KEY);
            if (hisSaved && Array.isArray(hisSaved.posts)) {
                hisData = Object.assign(hisData, hisSaved);
            }
        } catch (e) { console.warn('[moments] load fail', e); }
    }
    async function save() {
        try { await localforage.setItem(KEY, { posts: data.posts.slice(-200) }); } catch (e) {}
    }
    async function saveHis() {
        try {
            await localforage.setItem(HIS_KEY, {
                posts: hisData.posts.slice(0, 60),
                lastPostTs: hisData.lastPostTs
            });
        } catch (e) {}
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

    // ============ 他自发一条动态 ============
    function hisAutoPost(silent) {
        var text = HIS_POSTS[Math.floor(Math.random() * HIS_POSTS.length)];
        var image = null;
        if (Math.random() < 0.55) {
            try {
                if (typeof window.getRandomPartnerImage === 'function') {
                    var img = window.getRandomPartnerImage();
                    if (img && img.url) image = img.url;
                }
            } catch (e) {}
            if (!image) {
                try {
                    var pool = (typeof stickerLibrary !== 'undefined' && Array.isArray(stickerLibrary)) ? stickerLibrary : [];
                    if (pool.length) image = pool[Math.floor(Math.random() * pool.length)];
                } catch (e) {}
            }
        }
        hisData.posts.unshift({
            id: 'hm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            author: 'partner',
            text: text,
            image: image,
            timestamp: Date.now(),
            likes: [],
            comments: []
        });
        hisData.posts = hisData.posts.slice(0, 60);
        hisData.lastPostTs = Date.now();
        saveHis();
        if (!silent && typeof showNotification === 'function') {
            var pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
            showNotification(pn + ' 发了一条朋友圈', 'info', 2500);
        }
    }

    // ============ 渲染 ============
    function renderHome() {
        var myCount = data.posts.filter(function (p) { return p.author === 'me'; }).length;
        var hisCount = hisData.posts.length;

        return '<div style="padding:20px 16px;">'
            + '<div style="text-align:center;margin-bottom:24px;padding:20px 0;">'
            +   '<div style="font-size:44px;margin-bottom:12px;">📷</div>'
            +   '<div style="font-size:18px;font-weight:800;color:var(--text-primary);margin-bottom:4px;">朋友圈</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);">你和他的世界</div>'
            + '</div>'

            + '<div style="display:flex;flex-direction:column;gap:12px;">'
            +   '<button class="mv-entry" data-view="mine" style="display:flex;align-items:center;gap:14px;padding:18px 18px;border:1.5px solid var(--border-color);border-radius:16px;background:var(--secondary-bg);cursor:pointer;text-align:left;font-family:var(--font-family);transition:all 0.2s;">'
            +     '<div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,rgba(var(--accent-color-rgb),0.25),rgba(var(--accent-color-rgb),0.1));display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">🖼️</div>'
            +     '<div style="flex:1;min-width:0;">'
            +       '<div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:3px;">我的朋友圈</div>'
            +       '<div style="font-size:11.5px;color:var(--text-secondary);">' + (myCount ? myCount + ' 条动态' : '还没发过，去发一条') + '</div>'
            +     '</div>'
            +     '<i class="fas fa-chevron-right" style="color:var(--text-secondary);font-size:13px;"></i>'
            +   '</button>'

            +   '<button class="mv-entry" data-view="his" style="display:flex;align-items:center;gap:14px;padding:18px 18px;border:1.5px solid var(--border-color);border-radius:16px;background:var(--secondary-bg);cursor:pointer;text-align:left;font-family:var(--font-family);transition:all 0.2s;">'
            +     '<div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,rgba(255,143,171,0.3),rgba(255,143,171,0.1));display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">💗</div>'
            +     '<div style="flex:1;min-width:0;">'
            +       '<div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:3px;">' + esc(nameOf('partner')) + ' 的朋友圈</div>'
            +       '<div style="font-size:11.5px;color:var(--text-secondary);">' + (hisCount ? hisCount + ' 条动态' : '还没有动态') + '</div>'
            +     '</div>'
            +     '<i class="fas fa-chevron-right" style="color:var(--text-secondary);font-size:13px;"></i>'
            +   '</button>'
            + '</div>'
            + '</div>';
    }

    function renderPostList(posts, source) {
        if (!posts.length) {
            return '<div style="text-align:center;padding:50px 20px;color:var(--text-secondary);font-size:13px;">'
                + '<div style="font-size:44px;opacity:0.25;margin-bottom:14px;">📷</div>'
                + '<div style="font-weight:600;opacity:0.7;">还没有动态</div>'
                + '</div>';
        }
        return posts.map(function (p) {
            var name = nameOf(p.author);
            var textHTML = p.text ? '<div style="font-size:13.5px;color:var(--text-primary);line-height:1.7;margin-bottom:8px;white-space:pre-wrap;word-break:break-word;">' + esc(p.text) + '</div>' : '';
            var imgHTML = p.image ? '<img src="' + p.image + '" onerror="this.style.display=\'none\'" style="max-width:100%;max-height:220px;border-radius:10px;display:block;margin-bottom:8px;cursor:pointer;" onclick="if(typeof viewImage===\'function\')viewImage(\'' + p.image.replace(/'/g, "\\'") + '\')" loading="lazy">' : '';
            var musicHTML = p.music ? '<div style="background:var(--primary-bg);border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;border:1px solid var(--border-color);">'
                + '<div style="width:34px;height:34px;border-radius:8px;background:var(--accent-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-music" style="color:#fff;font-size:14px;"></i></div>'
                + '<div style="flex:1;min-width:0;">'
                + '<div style="font-size:12.5px;color:var(--text-primary);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(p.music.title || '未知歌曲') + '</div>'
                + (p.music.sub ? '<div style="font-size:11px;color:var(--text-secondary);">' + esc(p.music.sub) + '</div>' : '')
                + '</div>'
                + '<button onclick="window._momentsPlayMusic(\'' + p.id + '\')"style="width:30px;height:30px;border-radius:50%;border:none;background:var(--accent-color);color:#fff;cursor:pointer;flex-shrink:0;"><i class="fas fa-play" style="font-size:11px;"></i></button>'
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
            var likeHtml = '<button onclick="window._momentsToggleLike(\'' + p.id + '\')" style="background:none;border:none;cursor:pointer;font-size:12px;color:' + (likedByMe ? 'var(--accent-color)' : 'var(--text-secondary)') + ';padding:4px 6px;display:flex;align-items:center;gap:4px;">'
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

            var delBtn = (source === 'mine' && p.author === 'me')
                ? '<button onclick="window._momentsDelete(\'' + p.id + '\')"style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:11px;padding:4px 6px;opacity:0.6;"><i class="fas fa-trash"></i></button>'
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
                + '<button onclick="window._momentsComment(\'' + p.id + '\')"style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-secondary);padding:4px 6px;display:flex;align-items:center;gap:4px;"><i class="far fa-comment"></i> 评论</button>'
                + '</div>'
                + likesDisplay
                + commentsHtml
                + '</div>';
        }).join('');
    }

    function renderView() {
        if (!panelEl) return;
        var content = panelEl.querySelector('#moments-content');
        var titleEl = panelEl.querySelector('#moments-title');
        var backBtn = panelEl.querySelector('#moments-back');
        var postBtn = panelEl.querySelector('#moments-post-btn');

        if (currentView === 'home') {
            titleEl.textContent = '朋友圈';
            backBtn.style.display = 'none';
            postBtn.style.display = 'none';
            content.innerHTML = renderHome();
            content.querySelectorAll('.mv-entry').forEach(function (el) {
                el.onclick = function () {
                    currentView = el.dataset.view;
                    renderView();
                };
            });
        } else if (currentView === 'mine') {
            titleEl.textContent = '我的朋友圈';
            backBtn.style.display = 'flex';
            postBtn.style.display = 'flex';
            var mine = data.posts.filter(function (p) { return p.author === 'me'; })
                .sort(function (a, b) { return b.timestamp - a.timestamp; });
            content.innerHTML = '<div style="padding:14px;">' + renderPostList(mine, 'mine') + '</div>';
            bindListEvents(content);
        } else if (currentView === 'his') {
            titleEl.textContent = nameOf('partner') + ' 的朋友圈';
            backBtn.style.display = 'flex';
            postBtn.style.display = 'none';
            var his = hisData.posts.slice().sort(function (a, b) { return b.timestamp - a.timestamp; });
            content.innerHTML = '<div style="padding:14px;">' + renderPostList(his, 'his') + '</div>';
            bindListEvents(content);
        }
    }

    function bindListEvents(container) {
        container.querySelectorAll('img[onclick]').forEach(function (el) { /* 已内联 */ });
    }

    // ============ 打开面板 ============
    window.openMomentsPanel = async function () {
        if (panelEl) { panelEl.remove(); panelEl = null; }
        await load();
        currentView = 'home';

        panelEl = document.createElement('div');
        panelEl.id = 'moments-panel';
        panelEl.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        panelEl.innerHTML =
            '<div style="background:var(--primary-bg);border-radius:20px;width:94%;max-width:460px;height:88vh;max-height:760px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border-color);background:var(--secondary-bg);flex-shrink:0;">'
            +   '<div style="display:flex;align-items:center;gap:10px;min-width:0;">'
            +     '<button id="moments-back" style="display:none;background:none;border:none;color:var(--text-primary);cursor:pointer;font-size:18px;padding:0 6px 0 0;"><i class="fas fa-chevron-left"></i></button>'
            +     '<div style="width:34px;height:34px;border-radius:10px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
            +       '<i class="fas fa-camera-retro" style="color:var(--accent-color);font-size:14px;"></i>'
            +     '</div>'
            +     '<span id="moments-title" style="font-size:16px;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">朋友圈</span>'
            +   '</div>'
            +   '<div style="display:flex;gap:6px;align-items:center;">'
            +     '<button id="moments-post-btn" style="display:none;padding:7px 14px;border:none;border-radius:10px;background:var(--accent-color);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-plus"></i> 发动态</button>'
            +     '<button id="moments-settings-btn" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;padding:0 6px;" title="互动概率设置"><i class="fas fa-sliders-h"></i></button>'
            +     '<button id="moments-close-btn" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;padding:0 6px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            + '</div>'
            + '<div id="moments-content" style="flex:1;overflow-y:auto;background:var(--primary-bg);"></div>'
            + '</div>';

        document.body.appendChild(panelEl);

        panelEl.querySelector('#moments-close-btn').onclick = function () { panelEl.remove(); panelEl = null; };
        panelEl.addEventListener('click', function (e) {
            if (e.target === panelEl) { panelEl.remove(); panelEl = null; }
        });
        panelEl.querySelector('#moments-back').onclick = function () {
            currentView = 'home';
            renderView();
        };
        panelEl.querySelector('#moments-post-btn').onclick = function () { openPostEditor(); };
        panelEl.querySelector('#moments-settings-btn').onclick = function () { openSettingsPanel(); };

        renderView();
    };

    // ============ 发动态编辑器 ============
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
            renderView();
            if (typeof showNotification === 'function') showNotification('✓ 已发布', 'success');
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
            + '<span style="font-size:14px;font-weight:600;color:var(--text-primary);">选择歌曲</span>'
            + '<button id="msp-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;"><i class="fas fa-times"></i></button>'
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

    // ============ 各种动作 ============
    window._momentsPlayMusic = function (postId) {
        var p = data.posts.find(function (x) { return x.id === postId; })
            || hisData.posts.find(function (x) { return x.id === postId; });
        if (!p || !p.music || !p.music.url) return;
        try {
            var a = new Audio(p.music.url);
            a.volume = 0.6;
            a.play();
        } catch (e) { if (typeof showNotification === 'function') showNotification('播放失败', 'error'); }
    };

    window._momentsToggleLike = async function (postId) {
        var p = data.posts.find(function (x) { return x.id === postId; })
            || hisData.posts.find(function (x) { return x.id === postId; });
        if (!p) return;
        if (!p.likes) p.likes = [];
        var idx = p.likes.indexOf('me');
        if (idx === -1) p.likes.push('me');
        else p.likes.splice(idx, 1);
        // 判断来源
        if (data.posts.indexOf(p) !== -1) await save();
        else await saveHis();
        renderView();
        if (p.author === 'me' && idx === -1) schedulePartnerBackLike();
    };

    window._momentsComment = async function (postId) {
        var p = data.posts.find(function (x) { return x.id === postId; })
            || hisData.posts.find(function (x) { return x.id === postId; });
        if (!p) return;
        var text = prompt('评论：');
        if (!text || !text.trim()) return;
        if (!p.comments) p.comments = [];
        p.comments.push({ from: 'me', text: text.trim(), time: Date.now() });
        if (data.posts.indexOf(p) !== -1) await save();
        else await saveHis();
        renderView();
        if (p.author === 'partner') {
            if (Math.random() < 0.30) {
                setTimeout(async function () {
                    var replyText = HIS_REPLIES[Math.floor(Math.random() * HIS_REPLIES.length)];
                    p.comments.push({ from: 'partner', text: replyText, time: Date.now() });
                    if (data.posts.indexOf(p) !== -1) await save();
                    else await saveHis();
                    renderView();
                    if (typeof showNotification === 'function') {
                        var pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
                        showNotification(pn + ' 回复了你的评论', 'info', 2000);
                    }
                }, 4000 + Math.random() * 6000);
            }
        }
        if (p.author === 'me') schedulePartnerReplyComment(postId);
    };

    window._momentsDelete = async function (postId) {
        if (!confirm('删除这条动态？')) return;
        data.posts = data.posts.filter(function (x) { return x.id !== postId; });
        await save();
        renderView();
    };

    // ============ 设置面板 ============
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
            + '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-sliders-h" style="color:var(--accent-color);margin-right:8px;"></i>互动概率设置</span>'
            + '<button id="ms-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">调整他回应你动态的概率</div>'
            + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">'
            + '<span style="font-size:13px;color:var(--text-primary);flex:1;">自动点赞</span>'
            + '<input type="range" id="ms-like" min="0" max="100" value="' + cur.like + '" style="flex:2;accent-color:var(--accent-color);">'
            + '<span id="ms-like-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:44px;text-align:right;">' + cur.like + '%</span>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">'
            + '<span style="font-size:13px;color:var(--text-primary);flex:1;">自动评论</span>'
            + '<input type="range" id="ms-comment" min="0" max="100" value="' + cur.comment + '" style="flex:2;accent-color:var(--accent-color);">'
            + '<span id="ms-comment-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:44px;text-align:right;">' + cur.comment + '%</span>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">'
            + '<span style="font-size:13px;color:var(--text-primary);flex:1;">回复我的评论</span>'
            + '<input type="range" id="ms-reply" min="0" max="100" value="' + cur.reply + '" style="flex:2;accent-color:var(--accent-color);">'
            + '<span id="ms-reply-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:44px;text-align:right;">' + cur.reply + '%</span>'
            + '</div>'
            + '<div style="display:flex;gap:10px;">'
            + '<button id="ms-reset" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">恢复默认</button>'
            + '<button id="ms-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">保存</button>'
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

    // ============ 对方行为 ============
    function schedulePartnerReact(postId) {
        var delay = 30000 + Math.random() * 90000;
        setTimeout(async function () {
            var p = data.posts.find(function (x) { return x.id === postId; });
            if (!p) return;
            if (!p.likes) p.likes = [];
            if (Math.random() < getChance('like') && p.likes.indexOf('partner') === -1) p.likes.push('partner');
            if (Math.random() < getChance('comment')) {
                var cardText = randomCardText();
                if (cardText) {
                    if (!p.comments) p.comments = [];
                    p.comments.push({ from: 'partner', text: cardText, time: Date.now() });
                }
            }
            await save();
            if (currentView === 'mine') renderView();
            var pn = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
            if (typeof addMessage === 'function') {
                if (p.likes.indexOf('partner') !== -1) {
                    try { addMessage({ id: Date.now() + Math.random(), sender: null, text: '📱 ' + pn + ' 点赞了你的朋友圈', timestamp: new Date(), status: 'received', type: 'system' }); } catch (e) {}
                }
                if (p.comments && p.comments.length > 0) {
                    var last = p.comments[p.comments.length - 1];
                    if (last && last.from === 'partner') {
                        try { addMessage({ id: Date.now() + Math.random() + 1, sender: null, text: '📱 ' + pn + ' 评论了你的朋友圈：' + last.text, timestamp: new Date(), status: 'received', type: 'system' }); } catch (e) {}
                    }
                }
            }
            if (typeof showNotification === 'function') showNotification(pn + ' 回应了你的动态', 'info', 2500);
        }, delay);
    }

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
                if (currentView === 'mine') renderView();
            }
        }, delay);
    }

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
            if (currentView === 'mine') renderView();
            var pn = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
            if (typeof showNotification === 'function') showNotification(pn + ' 回复了你的评论', 'info', 2500);
        }, delay);
    }

    // ============ 初始化 ============
    async function init() {
        await load();
        if (hisData.posts.length === 0) hisAutoPost(true);
        function scheduleHis() {
            var delay = (40 + Math.random() * 50) * 60 * 1000;
            setTimeout(function () {
                if (Math.random() < 0.6) hisAutoPost();
                scheduleHis();
            }, delay);
        }
        scheduleHis();
        var since = Date.now() - (hisData.lastPostTs || 0);
        if (since > 6 * 3600000 && hisData.posts.length > 0) {
            setTimeout(hisAutoPost, 5000 + Math.random() * 10000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 2000); });
    } else {
        setTimeout(init, 2000);
    }
})();

// === 入口 ===
window.initMomentsPanel = function () {
    var btn = document.getElementById('moments-function');
    if (btn && !btn.dataset.initialized) {
        btn.dataset.initialized = 'true';
        btn.addEventListener('click', function () {
            var advancedModal = document.getElementById('advanced-modal');
            if (advancedModal && typeof hideModal === 'function') hideModal(advancedModal);
            if (typeof window.openMomentsPanel === 'function') window.openMomentsPanel();
        });
    }
};