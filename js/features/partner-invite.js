/**
 * partner-invite.js
 * 对方主动邀请：看小说 / 看漫画 / 看电影 / 一起听歌 / 要礼物
 */

(function () {
    'use strict';

    const KEY = getStorageKey('partnerInviteSettings_v1');

    let settingsInv = {
        novelEnabled: true,
        comicEnabled: true,
        movieEnabled: true,
        musicEnabled: true,
        giftEnabled: true,
        novelChance: 25,
        comicChance: 25,
        movieChance: 25,
        musicChance: 30,
        giftChance: 20,
        minIntervalMin: 25,
        maxIntervalMin: 80
    };

    let _inviteTimer = null;

    async function load() {
        try {
            const s = await localforage.getItem(KEY);
            if (s && typeof s === 'object') Object.assign(settingsInv, s);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, settingsInv); } catch (e) {}
    }
    load();

    function pickFromPool(pool, fallback) {
        const arr = (typeof pool !== 'undefined' && Array.isArray(pool))
            ? pool.filter(t => t && String(t).trim())
            : [];
        if (arr.length === 0) return fallback;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // ---------- 通用邀请弹窗 ----------
    function showInviteModal(opts) {
        const old = document.getElementById('partner-invite-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'partner-invite-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        const accent = opts.accent || 'var(--accent-color)';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:26px 24px 20px;width:88%;max-width:360px;box-shadow:0 24px 80px rgba(0,0,0,0.45);text-align:center;animation:piPop 0.4s cubic-bezier(0.34,1.56,0.64,1);">'
            +   '<style>@keyframes piPop{from{opacity:0;transform:scale(0.85) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);}}</style>'
            +   '<div style="width:64px;height:64px;border-radius:20px;background:' + accent + '1a;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">'
            +     '<i class="' + opts.icon + '" style="font-size:26px;color:' + accent + ';"></i>'
            +   '</div>'
            +   '<div style="font-size:17px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">' + opts.title + '</div>'
            +   '<div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:6px;">' + opts.desc + '</div>'
            +   (opts.sub ? '<div style="font-size:12px;color:' + accent + ';font-weight:600;margin-bottom:6px;padding:8px 12px;background:' + accent + '0f;border-radius:10px;">' + opts.sub + '</div>' : '')
            +   '<div style="display:flex;gap:10px;margin-top:18px;">'
            +     '<button id="pi-reject" style="flex:1;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">下次吧</button>'
            +     '<button id="pi-accept" style="flex:2;padding:12px;border:none;border-radius:12px;background:' + accent + ';color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">' + (opts.acceptText || '好呀 ✦') + '</button>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#pi-reject').onclick = () => { close(); if (typeof opts.reject === 'function') opts.reject(); };
        modal.querySelector('#pi-accept').onclick = () => { close(); if (typeof opts.accept === 'function') opts.accept(); };
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        setTimeout(() => { if (document.body.contains(modal)) close(); }, 15000);

        if (typeof playSound === 'function') playSound('message');
        if (typeof showNotification === 'function') {
            const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
            showNotification(pn + ' 向你发起了一个邀请', 'info', 2500);
        }
    }

    // ---------- 1) 邀请看小说 ----------
    function inviteNovel() {
        if (typeof window.openNovelPanel !== 'function') return false;
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const line = pickFromPool(
            typeof customReplies !== 'undefined' ? customReplies : [],
            '我们一起看小说好不好？'
        );

        showInviteModal({
            icon: 'fas fa-book-open',
            title: pn + ' 想和你一起看小说',
            desc: '「' + line + '」',
            sub: '📖 打开看小说面板，边看边聊',
            accent: '#9C6FD4',
            acceptText: '好呀，一起看 📖',
            accept: () => {
                try { window.openNovelPanel(); } catch (e) {}
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now(), sender: null,
                        text: '📖 ' + pn + ' 邀请你一起看小说，你们打开了书页',
                        timestamp: new Date(), type: 'system'
                    });
                }
            },
            reject: () => {
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now(), sender: null,
                        text: '📖 你婉拒了 ' + pn + ' 的看小说邀请',
                        timestamp: new Date(), type: 'system'
                    });
                }
            }
        });
        return true;
    }

    // ---------- 2) 邀请看漫画 ----------
    function inviteComic() {
        if (typeof window.openComicPanel !== 'function') return false;
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const line = pickFromPool(
            typeof customReplies !== 'undefined' ? customReplies : [],
            '陪我一起看漫画吧～'
        );

        showInviteModal({
            icon: 'fas fa-book',
            title: pn + ' 想和你一起看漫画',
            desc: '「' + line + '」',
            sub: '📚 打开看漫画面板，一起翻页',
            accent: '#FB7299',
            acceptText: '好啊，一起看 📚',
            accept: () => {
                try { window.openComicPanel(); } catch (e) {}
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now(), sender: null,
                        text: '📚 ' + pn + ' 邀请你一起看漫画，你们凑在了一起',
                        timestamp: new Date(), type: 'system'
                    });
                }
            },
            reject: () => {
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now(), sender: null,
                        text: '📚 你婉拒了 ' + pn + ' 的看漫画邀请',
                        timestamp: new Date(), type: 'system'
                    });
                }
            }
        });
        return true;
    }

    // ---------- 3) 邀请看电影 ----------
    function inviteMovie() {
        if (typeof window.openWatchMoviePanel !== 'function') return false;
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const line = pickFromPool(
            typeof customReplies !== 'undefined' ? customReplies : [],
            '今晚要不要一起看电影？'
        );

        showInviteModal({
            icon: 'fas fa-film',
            title: pn + ' 想和你一起看电影',
            desc: '「' + line + '」',
            sub: '🎬 打开看电影面板，一起看一部',
            accent: '#F58220',
            acceptText: '好呀，一起看 🎬',
            accept: () => {
                try { window.openWatchMoviePanel(); } catch (e) {}
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now(), sender: null,
                        text: '🎬 ' + pn + ' 邀请你一起看电影，你们依偎在一起',
                        timestamp: new Date(), type: 'system'
                    });
                }
            },
            reject: () => {
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now(), sender: null,
                        text: '🎬 你婉拒了 ' + pn + ' 的看电影邀请',
                        timestamp: new Date(), type: 'system'
                    });
                }
            }
        });
        return true;
    }

    // ---------- 4) 邀请一起听歌 ----------
    function inviteMusic() {
        if (typeof window.openListenMusicPanel !== 'function') return false;
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const line = pickFromPool(
            typeof customReplies !== 'undefined' ? customReplies : [],
            '给你放首歌，陪我一起听好不好？'
        );

        showInviteModal({
            icon: 'fas fa-headphones',
            title: pn + ' 想和你一起听歌',
            desc: '「' + line + '」',
            sub: '🎧 打开音乐面板，戴上耳机',
            accent: '#3BC8A4',
            acceptText: '好呀，一起听 🎧',
            accept: () => {
                try { window.openListenMusicPanel(); } catch (e) {}
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now(), sender: null,
                        text: '🎧 ' + pn + ' 邀请你一起听歌，你们戴上了同一副耳机',
                        timestamp: new Date(), type: 'system'
                    });
                }
                if (typeof playSound === 'function') playSound('favorite');
            },
            reject: () => {
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now(), sender: null,
                        text: '🎧 你婉拒了 ' + pn + ' 的听歌邀请',
                        timestamp: new Date(), type: 'system'
                    });
                }
            }
        });
        return true;
    }

    // ---------- 5) 要礼物 ----------
    function inviteGift() {
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        let items = [];
        try {
            if (typeof window.getShopItems === 'function') items = window.getShopItems();
        } catch (e) {}

        if (!items || items.length === 0) {
            items = [
                { id: 'g1', name: '一束玫瑰', price: 50, icon: '🌹' },
                { id: 'g2', name: '一盒巧克力', price: 80, icon: '🍫' },
                { id: 'g3', name: '一杯奶茶', price: 30, icon: '🧋' },
                { id: 'g4', name: '一颗糖', price: 10, icon: '🍬' },
                { id: 'g9', name: '生日蛋糕', price: 150, icon: '🎂' },
                { id: 'g11', name: '月亮', price: 999, icon: '🌙' }
            ];
        }

        const affordable = items.filter(i => i.price <= 300);
        const pool = affordable.length > 0 ? affordable : items;
        const item = pool[Math.floor(Math.random() * pool.length)];

        const line = pickFromPool(
            typeof customReplies !== 'undefined' ? customReplies : [],
            '想要这个，可以买给我吗？'
        );

        showInviteModal({
            icon: 'fas fa-gift',
            title: pn + ' 想要一件礼物',
            desc: '「' + line + '」',
            sub: item.icon + ' ' + item.name + ' · ' + item.price + ' 金币',
            accent: '#FF6B6B',
            acceptText: '好，买给你 🎁',
            accept: () => {
                try {
                    if (typeof window.buyGiftForPartner === 'function') {
                        window.buyGiftForPartner(item.id);
                    } else {
                        if (typeof addMessage === 'function') {
                            addMessage({
                                id: Date.now(), sender: null,
                                text: '🎁 你给 ' + pn + ' 买了一份「' + item.icon + ' ' + item.name + '」',
                                timestamp: new Date(), type: 'system'
                            });
                            setTimeout(() => {
                                addMessage({
                                    id: Date.now() + 1, sender: pn,
                                    text: '谢谢…我真的很喜欢 💕',
                                    timestamp: new Date(), status: 'received', type: 'normal'
                                });
                                if (typeof playSound === 'function') playSound('message');
                            }, 2000 + Math.random() * 2000);
                        }
                    }
                } catch (e) { console.warn('[partner-invite] gift accept fail', e); }
                if (typeof playSound === 'function') playSound('favorite');
            },
            reject: () => {
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now(), sender: null,
                        text: '🎁 你拒绝了 ' + pn + ' 的礼物请求',
                        timestamp: new Date(), type: 'system'
                    });
                    setTimeout(() => {
                        addMessage({
                            id: Date.now() + 1, sender: pn,
                            text: '好吧…没关系。',
                            timestamp: new Date(), status: 'received', type: 'normal'
                        });
                        if (typeof playSound === 'function') playSound('message');
                    }, 1500 + Math.random() * 1500);
                }
            }
        });
        return true;
    }

    // ---------- 调度 ----------
    const INVITERS = [
        { key: 'novelEnabled', chanceKey: 'novelChance', fn: inviteNovel },
        { key: 'comicEnabled', chanceKey: 'comicChance', fn: inviteComic },
        { key: 'movieEnabled', chanceKey: 'movieChance', fn: inviteMovie },
        { key: 'musicEnabled', chanceKey: 'musicChance', fn: inviteMusic },
        { key: 'giftEnabled',  chanceKey: 'giftChance',  fn: inviteGift  }
    ];

    function scheduleNextInvite() {
        if (_inviteTimer) clearTimeout(_inviteTimer);
        const minMs = settingsInv.minIntervalMin * 60 * 1000;
        const maxMs = settingsInv.maxIntervalMin * 60 * 1000;
        const delay = minMs + Math.random() * Math.max(0, maxMs - minMs);

        _inviteTimer = setTimeout(() => {
            try {
                const enabled = INVITERS.filter(it => settingsInv[it.key]);
                if (enabled.length > 0) {
                    const picked = enabled[Math.floor(Math.random() * enabled.length)];
                    const chance = settingsInv[picked.chanceKey] || 25;
                    if (Math.random() * 100 < chance) picked.fn();
                }
            } catch (e) { console.warn('[partner-invite] fail', e); }
            scheduleNextInvite();
        }, delay);
    }

    // ---------- 设置面板 ----------
    window.openPartnerInviteSettings = function () {
        const old = document.getElementById('partner-invite-settings');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'partner-invite-settings';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        const row = (icon, label, enabledKey, chanceKey, color) =>
            '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:12px 14px;margin-bottom:10px;">'
            +   '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
            +     '<div style="width:30px;height:30px;border-radius:10px;background:' + color + '1a;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
            +       '<i class="' + icon + '" style="color:' + color + ';font-size:13px;"></i>'
            +     '</div>'
            +     '<span style="flex:1;font-size:13px;font-weight:600;color:var(--text-primary);">' + label + '</span>'
            +     '<div class="pi-toggle" data-key="' + enabledKey + '" style="width:40px;height:22px;border-radius:22px;background:' + (settingsInv[enabledKey] ? color : 'var(--border-color)') + ';position:relative;cursor:pointer;transition:background 0.2s;flex-shrink:0;">'
            +       '<div style="position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:3px;' + (settingsInv[enabledKey] ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +     '</div>'
            +   '</div>'
            +   '<div style="display:flex;align-items:center;gap:10px;">'
            +     '<span style="font-size:11px;color:var(--text-secondary);width:28px;flex-shrink:0;">概率</span>'
            +     '<input type="range" class="pi-chance" data-key="' + chanceKey + '" min="0" max="100" value="' + settingsInv[chanceKey] + '" style="flex:1;accent-color:' + color + ';">'
            +     '<span class="pi-chance-val" data-key="' + chanceKey + '" style="font-size:12px;font-weight:700;color:' + color + ';width:38px;text-align:right;">' + settingsInv[chanceKey] + '%</span>'
            +   '</div>'
            + '</div>';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.45);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-envelope-open-text" style="color:var(--accent-color);margin-right:8px;"></i>对方邀请设置</span>'
            +     '<button id="pi-set-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;line-height:1.6;flex-shrink:0;">开启后，对方会按概率邀请你做这些事</div>'
            +   '<div style="flex:1;overflow-y:auto;">'
            +     row('fas fa-book-open',    '邀请看小说',  'novelEnabled', 'novelChance', '#9C6FD4')
            +     row('fas fa-book',         '邀请看漫画',  'comicEnabled', 'comicChance', '#FB7299')
            +     row('fas fa-film',         '邀请看电影',  'movieEnabled', 'movieChance', '#F58220')
            +     row('fas fa-headphones',   '邀请一起听歌','musicEnabled', 'musicChance', '#3BC8A4')
            +     row('fas fa-gift',         '要礼物',      'giftEnabled',  'giftChance',  '#FF6B6B')
            +     '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:12px 14px;">'
            +       '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">⏱ 触发间隔（分钟）</div>'
            +       '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">'
            +         '<span style="font-size:11px;color:var(--text-secondary);width:36px;">最短</span>'
            +         '<input type="range" id="pi-min-min" min="1" max="240" value="' + settingsInv.minIntervalMin + '" style="flex:1;accent-color:var(--accent-color);">'
            +         '<span id="pi-min-val" style="font-size:12px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + settingsInv.minIntervalMin + '分钟</span>'
            +       '</div>'
            +       '<div style="display:flex;align-items:center;gap:10px;">'
            +         '<span style="font-size:11px;color:var(--text-secondary);width:36px;">最长</span>'
            +         '<input type="range" id="pi-max-min" min="1" max="480" value="' + settingsInv.maxIntervalMin + '" style="flex:1;accent-color:var(--accent-color);">'
            +         '<span id="pi-max-val" style="font-size:12px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + settingsInv.maxIntervalMin + '分钟</span>'
            +       '</div>'
            +     '</div>'
            +   '</div>'
            +   '<div style="display:flex;gap:10px;margin-top:14px;flex-shrink:0;">'
            +     '<button id="pi-set-cancel" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +     '<button id="pi-set-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        modal.querySelectorAll('.pi-toggle').forEach(el => {
            el.onclick = () => {
                const k = el.dataset.key;
                settingsInv[k] = !settingsInv[k];
                el.style.background = settingsInv[k] ? 'var(--accent-color)' : 'var(--border-color)';
                const knob = el.querySelector('div');
                knob.style.right = settingsInv[k] ? '3px' : 'auto';
                knob.style.left = settingsInv[k] ? 'auto' : '3px';
            };
        });

        modal.querySelectorAll('.pi-chance').forEach(slider => {
            slider.oninput = () => {
                const k = slider.dataset.key;
                const v = slider.value;
                const label = modal.querySelector('.pi-chance-val[data-key="' + k + '"]');
                if (label) label.textContent = v + '%';
            };
        });

        const minMin = modal.querySelector('#pi-min-min');
        const maxMin = modal.querySelector('#pi-max-min');
        const minVal = modal.querySelector('#pi-min-val');
        const maxVal = modal.querySelector('#pi-max-val');
        minMin.oninput = () => { minVal.textContent = minMin.value + '分钟'; };
        maxMin.oninput = () => { maxVal.textContent = maxMin.value + '分钟'; };

        const close = () => modal.remove();
        modal.querySelector('#pi-set-close').onclick = close;
        modal.querySelector('#pi-set-cancel').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelector('#pi-set-save').onclick = async () => {
            modal.querySelectorAll('.pi-chance').forEach(slider => {
                settingsInv[slider.dataset.key] = parseInt(slider.value, 10);
            });
            settingsInv.minIntervalMin = parseInt(minMin.value, 10);
            settingsInv.maxIntervalMin = parseInt(maxMin.value, 10);
            if (settingsInv.minIntervalMin > settingsInv.maxIntervalMin) {
                settingsInv.maxIntervalMin = settingsInv.minIntervalMin;
            }
            await save();
            close();
            if (typeof showNotification === 'function') showNotification('✓ 邀请设置已保存', 'success');
        };
    };

    // ---------- 启动 ----------
    window.initPartnerInvite = function () {
        setTimeout(() => { scheduleNextInvite(); }, 60000);
    };

    // 手动测试（控制台可调）
    window._partnerInvite = {
        novel: inviteNovel,
        comic: inviteComic,
        movie: inviteMovie,
        music: inviteMusic,
        gift: inviteGift
    };

    // 自动启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(() => scheduleNextInvite(), 60000));
    } else {
        setTimeout(() => scheduleNextInvite(), 60000);
    }

})();