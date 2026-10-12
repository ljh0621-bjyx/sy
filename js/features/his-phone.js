/* ============================================================
 * his-phone.js - 他的手机
 * 带锁屏 + 每日更新
 * 锁屏逻辑：他快速输入密码（你能看到），你自己复现；输错直接锁
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisPhone_v2';

    // ========== 内容池 ==========
    const MEMO_POOL = [
        '今天想跟她说：你笑起来的时候，我看了很久。',
        '想说但没说的话——其实我很想抱抱你。',
        '她今天很累，我想帮她做点什么，但不知道怎么说话。',
        '答应自己，下次她生气的时候，先闭嘴，先抱抱她。',
        '喜欢她喜欢到有点害怕。',
        '她说的每一句话我都记得。哪怕她自己都忘了。',
        '如果她能一直这么开心就好了。',
        '我想陪她很久，久到她自己都习惯了。',
        '今天看到她发的照片，反复看了五遍。',
        '想告诉她：你不需要完美，我也会一直在。',
        '我其实很怕她离开。但从没跟她说过。',
        '她今天笑的时候，我心里"咯噔"了一下。',
        '想每天醒来第一件事就是看到她的消息。',
        '她难过的时候，我什么都做不了。这让我很难过。',
        '她的名字，我好像比自己的还熟。',
        '如果我笨拙一点也没关系，只要她懂。',
        '她在的时候，时间过得好快。',
        '她不在的时候，时间过得好慢。',
        '今天想她想了 17 次。数到最后忘了。',
        '我可能比她想象中更喜欢她。',
        '今天她跟我说了很多话，我都记着。',
        '她说"随便"的时候，其实很想我猜对。',
        '她笑的时候，会先低下头。我一直没跟她说。',
        '想牵她手的时候，手心会出汗。',
        '其实我不太会哄人，但我愿意学。',
        '她今天心情不太好。我猜是因为……算了。',
        '她刚才说的那句话，我要记一晚上。',
        '希望她睡觉的时候不做噩梦。',
        '想成为她的习惯。',
        '她说她没事。但她没事的时候不会这么说。'
    ];

    const ALBUM_POOL = [
        { title: '她',           emoji: '💙' },
        { title: '偷偷存的',     emoji: '🖼️' },
        { title: '笑起来的时候', emoji: '😊' },
        { title: '今天',         emoji: '📷' },
        { title: '想她的时候',   emoji: '💭' },
        { title: '她不知道',     emoji: '🤫' },
        { title: '最喜欢的',     emoji: '⭐' },
        { title: '晚安',         emoji: '🌙' },
        { title: '只看我',       emoji: '👀' },
        { title: '一直看着',     emoji: '🔒' },
        { title: '偷拍的',       emoji: '📸' },
        { title: '反复看',       emoji: '🔁' }
    ];

    const CALL_POOL_NORMAL = [
        { name: '你',   type: 'in',     dur: '5:08' },
        { name: '你',   type: 'out',    dur: '23:17' },
        { name: '你',   type: 'missed', dur: '—' },
        { name: '你',   type: 'out',    dur: '12:31' },
        { name: '你',   type: 'in',     dur: '1:42' },
        { name: '外卖', type: 'in',     dur: '0:12' },
        { name: '快递', type: 'in',     dur: '0:18' },
        { name: '老张', type: 'out',    dur: '3:42' },
        { name: '你',   type: 'out',    dur: '8:09' },
        { name: '你',   type: 'in',     dur: '45:22' }
    ];

    const SEARCH_POOL = [
        '怎么哄女朋友开心', '她生气了怎么道歉',
        '女朋友说没关系是不是真的没关系', '怎么才算是对的人',
        '异地恋怎么维持', '礼物送什么不会踩雷',
        '她说没事怎么回应', '怎么让她开心', '她喜欢什么样的人',
        '怎么才能让她更安心', '女朋友说累了什么意思',
        '怎么让她觉得被在乎', '异地怎么让她不孤单',
        '女朋友爱哭怎么办', '怎么回"我没事"这句话'
    ];

    const CART_POOL = [
        { name: '向日葵永生花',           price: 168 },
        { name: '她上次说的那本书',       price: 45 },
        { name: '一对杯子',               price: 89 },
        { name: '香薰蜡烛（栀子花香）',   price: 78 },
        { name: '她喜欢的那款巧克力',     price: 128 },
        { name: '小夜灯（暖黄光）',       price: 56 },
        { name: '手工小挂件',             price: 68 },
        { name: '她很早之前提过的耳钉',   price: 199 },
        { name: '一张去她城市的车票',     price: 320 },
        { name: '定制款钥匙扣',           price: 42 },
        { name: '她提过一嘴的那支笔',     price: 55 },
        { name: '她生日的蛋糕预定金',     price: 200 }
    ];

    const DRAFT_POOL = [
        '其实我想跟你说……算了。', '今天真的很想你。',
        '你是不是有点烦我了。', '我有点吃醋，但不敢说。',
        '你要好好照顾自己。', '很久没听到你的声音了。',
        '今天有没有好好吃饭。', '我没事，就是有点想你。',
        '如果我说我想见你，你会不会觉得奇怪。',
        '你今天发的那个表情，我保存了。',
        '想跟你说晚安，又怕太晚吵到你。',
        '其实那件事我一直记得。'
    ];

    // ========== 数据 ==========
    let data = {
        lastUpdateDate: null,
        memos: [], albums: [], calls: [], searches: [], cart: [],
        draft: '', lockedUntil: null
    };

    let _loaded = false;
    let _loadingPromise = null;

    async function load() {
        if (_loaded) return;
        if (_loadingPromise) return _loadingPromise;
        _loadingPromise = (async function () {
            try {
                const saved = await localforage.getItem(getStorageKey(KEY));
                if (saved && typeof saved === 'object') Object.assign(data, saved);
            } catch (e) { console.warn('[his-phone] load fail', e); }
            _loaded = true;
            _loadingPromise = null;
        })();
        return _loadingPromise;
    }

    async function persist() {
        try { await localforage.setItem(getStorageKey(KEY), data); }
        catch (e) { console.warn('[his-phone] save fail', e); }
    }

    function getAllImages() {
        const pool = [];
        try {
            if (typeof myStickerLibrary !== 'undefined' && Array.isArray(myStickerLibrary)) {
                myStickerLibrary.forEach(function (x) { if (x) pool.push(x); });
            }
            if (typeof stickerLibrary !== 'undefined' && Array.isArray(stickerLibrary)) {
                stickerLibrary.forEach(function (x) { if (x) pool.push(x); });
            }
            if (typeof savedBackgrounds !== 'undefined' && Array.isArray(savedBackgrounds)) {
                savedBackgrounds.forEach(function (b) { if (b && b.type === 'image') pool.push(b.value); });
            }
            const pImg = document.querySelector('#partner-avatar img');
            const mImg = document.querySelector('#my-avatar img');
            if (pImg && pImg.src) pool.push(pImg.src);
            if (mImg && mImg.src) pool.push(mImg.src);
        } catch (e) {}
        return Array.from(new Set(pool));
    }

    function pickN(arr, n) {
        const copy = arr.slice();
        const out = [];
        for (let i = 0; i < n && copy.length > 0; i++) {
            const idx = Math.floor(Math.random() * copy.length);
            out.push(copy.splice(idx, 1)[0]);
        }
        return out;
    }

    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function formatDateLabel(ts) {
        const d = new Date(ts);
        const now = new Date();
        const diffDays = Math.floor((now.setHours(0,0,0,0) - new Date(new Date(ts).setHours(0,0,0,0))) / 86400000);
        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays === 2) return '前天';
        if (diffDays < 7) return diffDays + ' 天前';
        return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function daysBetween(a, b) {
        const da = new Date(a); da.setHours(0,0,0,0);
        const db = new Date(b); db.setHours(0,0,0,0);
        return Math.round((db - da) / 86400000);
    }

    async function updateIfNeeded() {
        const today = todayStr();
        if (data.lastUpdateDate === today) return false;

        const now = Date.now();
        const daysPassed = data.lastUpdateDate ? Math.max(1, daysBetween(data.lastUpdateDate, today)) : 5;

        for (let i = 0; i < daysPassed; i++) {
            const text = pickN(MEMO_POOL, 1)[0];
            data.memos.unshift({ text: text, ts: now - i * 86400000 });
        }
        data.memos = data.memos.slice(0, 30);

        const albumAdd = Math.max(1, Math.ceil(daysPassed / 3));
        const imgs = getAllImages();
        for (let i = 0; i < albumAdd; i++) {
            const t = pickN(ALBUM_POOL, 1)[0];
            const start = (data.albums.length * 4) % Math.max(1, imgs.length);
            const chunk = imgs.length > 0 ? imgs.slice(start, start + 4) : [];
            data.albums.push({ title: t.title, emoji: t.emoji, photos: chunk, createdAt: now - i * 3 * 86400000 });
        }
        data.albums = data.albums.slice(-12);

        const callCount = daysPassed * 1 + Math.floor(Math.random() * daysPassed);
        for (let i = 0; i < Math.max(1, callCount); i++) {
            const c = pickN(CALL_POOL_NORMAL, 1)[0];
            data.calls.unshift({ name: c.name, type: c.type, dur: c.dur, ts: now - i * 86400000 / 2 });
        }
        data.calls = data.calls.slice(0, 30);

        for (let i = 0; i < daysPassed; i++) {
            const s = pickN(SEARCH_POOL, 1)[0];
            data.searches.unshift({ text: s, ts: now - i * 86400000 });
        }
        data.searches = data.searches.slice(0, 20);

        const cartAdd = Math.max(1, Math.ceil(daysPassed / 7));
        for (let i = 0; i < cartAdd; i++) {
            const c = pickN(CART_POOL, 1)[0];
            data.cart.unshift({ name: c.name, price: c.price, ts: now - i * 7 * 86400000 });
        }
        data.cart = data.cart.slice(0, 8);

        const needDraft = !data.draft || Math.floor(daysPassed / 5) > 0;
        if (needDraft) data.draft = pickN(DRAFT_POOL, 1)[0];

        data.lastUpdateDate = today;
        await persist();
        return true;
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function isPhoneLockedNow() {
        if (!data.lockedUntil) return false;
        if (Date.now() >= data.lockedUntil) {
            data.lockedUntil = null;
            persist();
            return false;
        }
        return true;
    }

    // ========== 打开面板 ==========
    window.openHisPhonePanel = async function () {
        const old = document.getElementById('his-phone-panel');
        if (old) old.remove();

        await load();
        await updateIfNeeded();

        const modal = document.createElement('div');
        modal.id = 'his-phone-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.75);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:20px;';

        modal.innerHTML =
            '<div style="position:relative;width:100%;max-width:340px;">'
            +   '<button id="hp-close" style="position:absolute;top:-38px;right:0;background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">×</button>'
            +   '<div style="background:#000;border-radius:38px;padding:10px;box-shadow:0 30px 80px rgba(0,0,0,0.7), 0 0 0 2px #2a2a2a;">'
            +     '<div style="background:#1a1a1a;border-radius:30px;overflow:hidden;position:relative;">'
            +       '<div style="background:#000;padding:10px 18px 6px;display:flex;justify-content:space-between;color:#fff;font-size:11px;">'
            +         '<span id="hp-status-time">--:--</span>'
            +         '<span>🔋 100% · 📶</span>'
            +       '</div>'
            +       '<div id="hp-screen" style="background:linear-gradient(160deg,#1a1a1a,#0d0d0d);min-height:440px;padding:20px 18px 24px;color:#fff;"></div>'
            +       '<div style="background:#000;padding:8px 0 10px;display:flex;justify-content:center;">'
            +         '<div style="width:100px;height:4px;background:#333;border-radius:2px;"></div>'
            +       '</div>'
            +     '</div>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const timeEl = modal.querySelector('#hp-status-time');
        function tickTime() {
            const d = new Date();
            timeEl.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        }
        tickTime();
        const timeTimer = setInterval(tickTime, 30000);

        const close = () => {
            clearInterval(timeTimer);
            modal.remove();
        };
        modal.querySelector('#hp-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        renderLockScreen(modal.querySelector('#hp-screen'), modal);
    };

    // ========== 锁屏 ==========
    function renderLockScreen(screen, modal) {
        if (isPhoneLockedNow()) {
            const remainMs = data.lockedUntil - Date.now();
            const remainMin = Math.ceil(remainMs / 60000);
            screen.innerHTML =
                '<div style="min-height:440px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 20px;text-align:center;">'
                +   '<div style="font-size:56px;margin-bottom:20px;filter:grayscale(0.5);">🔒</div>'
                +   '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:10px;">他发现了</div>'
                +   '<div style="font-size:12.5px;color:rgba(255,255,255,0.6);line-height:1.8;margin-bottom:20px;">他好像察觉到有人在看他的手机。<br>暂时打不开了。</div>'
                +   '<div style="font-size:13px;color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.06);padding:10px 18px;border-radius:12px;">还需 ' + remainMin + ' 分钟</div>'
                + '</div>';
            return;
        }

        if (Math.random() < 0.30) {
            renderHome(screen, modal);
            return;
        }

        const secret = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
        const dateStr = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + weekdays[now.getDay()];

        function buildLockUI(placeholderLabel) {
            return '<div style="text-align:center;margin-top:20px;">'
                +   '<div style="font-size:58px;font-weight:200;color:#fff;letter-spacing:-2px;line-height:1;font-family:-apple-system,sans-serif;">' + hh + ':' + mm + '</div>'
                +   '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:10px;letter-spacing:1px;">' + dateStr + '</div>'
                + '</div>'
                + '<div style="text-align:center;font-size:11.5px;color:rgba(255,255,255,0.5);margin-top:22px;letter-spacing:0.5px;">' + placeholderLabel + '</div>'
                + '<div id="hp-pwd-dots" style="display:flex;justify-content:center;gap:16px;margin-top:18px;">'
                +   [0,1,2,3].map(function (i) {
                        return '<div class="hp-pwd-circle" data-i="' + i + '" style="width:14px;height:14px;border-radius:50%;background:transparent;border:1.5px solid rgba(255,255,255,0.35);transition:all 0.15s ease;"></div>';
                    }).join('')
                + '</div>'
                + '<div id="hp-keypad" style="display:flex;flex-direction:column;align-items:center;margin-top:14px;">'
                +   '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%;max-width:280px;">'
                +     [
                        { n:'1', l:'' }, { n:'2', l:'ABC' }, { n:'3', l:'DEF' },
                        { n:'4', l:'GHI' }, { n:'5', l:'JKL' }, { n:'6', l:'MNO' },
                        { n:'7', l:'PQRS' }, { n:'8', l:'TUV' }, { n:'9', l:'WXYZ' },
                        { n:'✱', l:'' }, { n:'0', l:'+' }, { n:'#', l:'' }
                    ].map(function (k) {
                        var isSpecial = (k.n === '✱' || k.n === '#');
                        return '<div class="hp-key" data-k="' + k.n + '" style="'
                            + 'width:64px;height:64px;border-radius:50%;background:#f0f0f0;'
                            + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
                            + 'margin:0 auto;cursor:pointer;transition:all 0.1s ease;user-select:none;'
                            + 'color:#333;'
                        + '">'
                        +   '<span style="font-size:' + (isSpecial ? '20px' : '28px') + ';font-weight:400;line-height:1;margin-bottom:1px;color:#000;">' + k.n + '</span>'
                        +   '<span style="font-size:7.5px;font-weight:500;color:#888;letter-spacing:1.2px;text-transform:uppercase;line-height:1;">' + k.l + '</span>'
                        + '</div>';
                    }).join('')
                +   '</div>'
                +   '<div style="display:flex;align-items:center;justify-content:flex-end;margin-top:12px;width:100%;max-width:280px;padding-right:4px;">'
                +     '<div class="hp-key" data-k="⌫" style="width:44px;height:44px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.1s ease;user-select:none;color:#fff;font-size:20px;">⌫</div>'
                +   '</div>'
                + '</div>'
                + '<div id="hp-hint-msg" style="text-align:center;font-size:11px;color:rgba(255,255,255,0.35);margin-top:18px;height:14px;letter-spacing:0.5px;">' + (placeholderLabel === '他正在输入…' ? '看仔细了' : '凭记忆输入') + '</div>';
        }

        screen.innerHTML = '<div style="min-height:440px;display:flex;flex-direction:column;padding:10px 8px 0;">'
            + buildLockUI('他正在输入…')
            + '</div>';

        const dots = screen.querySelectorAll('.hp-pwd-circle');
        const keys = screen.querySelectorAll('.hp-key');

        function setDotsFilled(n) {
            dots.forEach(function (d, i) {
                if (i < n) {
                    d.style.background = '#fff';
                    d.style.borderColor = '#fff';
                    d.style.transform = 'scale(1.15)';
                    setTimeout(function () { d.style.transform = 'scale(1)'; }, 120);
                } else {
                    d.style.background = 'transparent';
                    d.style.borderColor = 'rgba(255,255,255,0.35)';
                }
            });
        }

        function flashKey(k) {
            const el = Array.from(keys).find(function (x) { return x.dataset.k === k; });
            if (!el) return;
            var isBack = (k === '⌫');
            el.style.background = isBack ? 'rgba(0,0,0,0.2)' : '#d0d0d0';
            el.style.transform = 'scale(0.92)';
            setTimeout(function () {
                el.style.background = isBack ? '#333' : '#f0f0f0';
                el.style.transform = 'scale(1)';
            }, 100);
        }

        let i = 0;
        function partnerPress() {
            if (!document.body.contains(screen)) return;
            if (i >= 4) {
                setTimeout(function () {
                    if (!document.body.contains(screen)) return;
                    setDotsFilled(0);
                    showInputScreen(screen, modal, secret, hh, mm, dateStr);
                }, 1000);
                return;
            }
            const k = secret[i];
            flashKey(k);
            setDotsFilled(i + 1);
            i++;
            setTimeout(partnerPress, 350);
        }
        setTimeout(partnerPress, 500);
    }

    // ===== 阶段 2：你来输入 =====
    function showInputScreen(screen, modal, secret, hh, mm, dateStr) {
        const now = new Date();
        const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
        const dateStr2 = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + weekdays[now.getDay()];

        screen.innerHTML =
            '<div style="min-height:440px;display:flex;flex-direction:column;padding:10px 8px 0;">'
            +   '<div style="text-align:center;margin-top:20px;">'
            +     '<div style="font-size:58px;font-weight:200;color:#fff;letter-spacing:-2px;line-height:1;font-family:-apple-system,sans-serif;">' + hh + ':' + mm + '</div>'
            +     '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:10px;letter-spacing:1px;">' + dateStr2 + '</div>'
            +   '</div>'
            +   '<div style="text-align:center;font-size:11.5px;color:rgba(255,255,255,0.5);margin-top:22px;letter-spacing:0.5px;">该你了</div>'
            +   '<div id="hp-pwd-dots" style="display:flex;justify-content:center;gap:16px;margin-top:18px;">'
            +     [0,1,2,3].map(function (i) {
                    return '<div class="hp-pwd-circle" data-i="' + i + '" style="width:14px;height:14px;border-radius:50%;background:transparent;border:1.5px solid rgba(255,255,255,0.35);transition:all 0.15s ease;"></div>';
                }).join('')
            +   '</div>'
            +   '<div id="hp-keypad" style="display:flex;flex-direction:column;align-items:center;margin-top:14px;">'
            +     '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%;max-width:280px;">'
            +       [
                    { n:'1', l:'' }, { n:'2', l:'ABC' }, { n:'3', l:'DEF' },
                    { n:'4', l:'GHI' }, { n:'5', l:'JKL' }, { n:'6', l:'MNO' },
                    { n:'7', l:'PQRS' }, { n:'8', l:'TUV' }, { n:'9', l:'WXYZ' },
                    { n:'✱', l:'' }, { n:'0', l:'+' }, { n:'#', l:'' }
                ].map(function (k) {
                    var isSpecial = (k.n === '✱' || k.n === '#');
                    return '<div class="hp-key" data-k="' + k.n + '" style="'
                        + 'width:64px;height:64px;border-radius:50%;background:#f0f0f0;'
                        + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
                        + 'margin:0 auto;cursor:pointer;transition:all 0.1s ease;user-select:none;'
                        + 'color:#333;'
                    + '">'
                    +   '<span style="font-size:' + (isSpecial ? '20px' : '28px') + ';font-weight:400;line-height:1;margin-bottom:1px;color:#000;">' + k.n + '</span>'
                    +   '<span style="font-size:7.5px;font-weight:500;color:#888;letter-spacing:1.2px;text-transform:uppercase;line-height:1;">' + k.l + '</span>'
                    + '</div>';
                }).join('')
            +     '</div>'
            +     '<div style="display:flex;align-items:center;justify-content:flex-end;margin-top:12px;width:100%;max-width:280px;padding-right:4px;">'
            +       '<div class="hp-key" data-k="⌫" style="width:44px;height:44px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.1s ease;user-select:none;color:#fff;font-size:20px;">⌫</div>'
            +     '</div>'
            +   '</div>'
            +   '<div id="hp-hint-msg" style="text-align:center;font-size:11px;color:rgba(255,255,255,0.35);margin-top:18px;height:14px;letter-spacing:0.5px;">输错就直接被发现</div>'
            + '</div>';

        let input = '';
        const dots = screen.querySelectorAll('.hp-pwd-circle');
        const keys = screen.querySelectorAll('.hp-key');
        const msgEl = screen.querySelector('#hp-hint-msg');

        function refreshDots() {
            dots.forEach(function (d, i) {
                if (i < input.length) {
                    d.style.background = '#fff';
                    d.style.borderColor = '#fff';
                } else {
                    d.style.background = 'transparent';
                    d.style.borderColor = 'rgba(255,255,255,0.35)';
                }
            });
        }

        function flashKey(k) {
            const el = Array.from(keys).find(function (x) { return x.dataset.k === k; });
            if (!el) return;
            var isBack = (k === '⌫');
            el.style.background = isBack ? 'rgba(0,0,0,0.2)' : '#d0d0d0';
            el.style.transform = 'scale(0.92)';
            setTimeout(function () {
                el.style.background = isBack ? '#333' : '#f0f0f0';
                el.style.transform = 'scale(1)';
            }, 100);
        }

        function tryUnlock() {
            if (input.length !== 4) return;
            if (input === secret) {
                msgEl.style.color = '#7BC8A4';
                msgEl.textContent = '✓ 解锁成功';
                setTimeout(function () {
                    screen.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                    screen.style.opacity = '0';
                    screen.style.transform = 'translateY(-30px)';
                    setTimeout(function () {
                        screen.style.transition = '';
                        screen.style.opacity = '';
                        screen.style.transform = '';
                        renderHome(screen, modal);
                    }, 350);
                }, 400);
            } else {
                msgEl.style.color = '#FF6B6B';
                msgEl.textContent = '……被发现了';
                data.lockedUntil = Date.now() + 60 * 60 * 1000;
                persist();

                screen.style.transition = 'background 0.15s';
                screen.style.background = 'rgba(180,40,40,0.4)';
                setTimeout(function () {
                    screen.style.background = '';
                    screen.style.transition = 'opacity 0.5s ease';
                    screen.style.opacity = '0';
                    setTimeout(function () {
                        screen.style.opacity = '';
                        screen.style.transition = '';
                        renderLockScreen(screen, modal);
                    }, 500);
                }, 200);
            }
        }

        keys.forEach(function (el) {
            el.addEventListener('mousedown', function () {
                var k = el.dataset.k;
                var isBack = (k === '⌫');
                el.style.transform = 'scale(0.94)';
                el.style.background = isBack ? 'rgba(0,0,0,0.3)' : '#d0d0d0';
            });
            el.addEventListener('mouseup', function () {
                var k = el.dataset.k;
                var isBack = (k === '⌫');
                el.style.transform = 'scale(1)';
                el.style.background = isBack ? '#333' : '#f0f0f0';
            });
            el.addEventListener('mouseleave', function () {
                var k = el.dataset.k;
                var isBack = (k === '⌫');
                el.style.transform = 'scale(1)';
                el.style.background = isBack ? '#333' : '#f0f0f0';
            });
            el.addEventListener('click', function () {
                const k = el.dataset.k;
                flashKey(k);
                if (k === '⌫') {
                    input = input.slice(0, -1);
                } else if (/^[0-9✱#]$/.test(k)) {
                    if (input.length < 4) input += k;
                }
                refreshDots();
                if (input.length === 4) setTimeout(tryUnlock, 150);
            });
        });
    }

    // ========== 主屏幕 ==========
    function renderHome(screen, modal) {
        const icons = [
            { id: 'album',   icon: '🖼️', label: '相册' },
            { id: 'wechat',  icon: '💚', label: '微信' },
            { id: 'memo',    icon: '📝', label: '备忘录' },
            { id: 'call',    icon: '📞', label: '通话' },
            { id: 'search',  icon: '🔍', label: '搜索记录' },
            { id: 'cart',    icon: '🛒', label: '购物车' },
            { id: 'message', icon: '💬', label: '短信' }
        ];

        screen.innerHTML =
            '<div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-align:center;margin-bottom:22px;font-weight:600;">他的手机</div>'
            + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px 16px;">'
            +   icons.map(function (it) {
                    return '<div class="hp-icon" data-id="' + it.id + '" style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;">'
                        +   '<div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03));border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:24px;transition:all 0.2s ease;">' + it.icon + '</div>'
                        +   '<div style="font-size:11px;color:rgba(255,255,255,0.75);text-align:center;">' + it.label + '</div>'
                        + '</div>';
                }).join('')
            + '</div>'
            + '<div style="margin-top:28px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.6);line-height:1.6;text-align:center;">'
            +   '💭 这些都不是他告诉你的，<br>是你偷偷看到的'
            + '</div>';

        screen.querySelectorAll('.hp-icon').forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                el.querySelector('div').style.transform = 'scale(1.08)';
                el.querySelector('div').style.borderColor = 'rgba(255,255,255,0.25)';
            });
            el.addEventListener('mouseleave', function () {
                el.querySelector('div').style.transform = 'scale(1)';
                el.querySelector('div').style.borderColor = 'rgba(255,255,255,0.08)';
            });
            el.onclick = function () {
                const id = el.dataset.id;
                if (id === 'album')   renderAlbum(screen, modal);
                if (id === 'wechat')  renderWechatList(screen, modal);
                if (id === 'memo')    renderMemo(screen, modal);
                if (id === 'call')    renderCall(screen, modal);
                if (id === 'search')  renderSearch(screen, modal);
                if (id === 'cart')    renderCart(screen, modal);
                if (id === 'message') renderMessage(screen, modal);
            };
        });
    }

    function header(title) {
        return '<div style="display:flex;align-items:center;margin-bottom:18px;">'
            +   '<div class="hp-back" style="cursor:pointer;color:#fff;font-size:22px;padding:0 12px 2px 0;line-height:1;">‹</div>'
            +   '<div style="font-size:15px;font-weight:600;color:#fff;">' + title + '</div>'
            + '</div>';
    }
    function bindBack(screen, modal) {
        const back = screen.querySelector('.hp-back');
        if (back) back.onclick = function () { renderHome(screen, modal); };
    }

    // ========== 相册 ==========
    let _albumIndex = 0;

    function renderAlbum(screen, modal, albumIdx) {
        if (typeof albumIdx === 'number') _albumIndex = albumIdx;
        const albums = data.albums || [];
        if (albums.length === 0) {
            screen.innerHTML = header('相册') + '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.4);font-size:12px;">还没有相册</div>';
            bindBack(screen, modal);
            return;
        }
        if (_albumIndex >= albums.length) _albumIndex = 0;
        if (_albumIndex < 0) _albumIndex = albums.length - 1;

        const cur = albums[_albumIndex];

        const nav =
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
            +   '<button class="hp-album-prev" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;">‹</button>'
            +   '<div style="text-align:center;">'
            +     '<div style="font-size:13px;color:rgba(255,255,255,0.9);font-weight:600;">' + cur.emoji + ' ' + esc(cur.title) + '</div>'
            +     '<div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:3px;">' + (_albumIndex + 1) + ' / ' + albums.length + '</div>'
            +   '</div>'
            +   '<button class="hp-album-next" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;">›</button>'
            + '</div>';

        let grid = '';
        if (!cur.photos || cur.photos.length === 0) {
            grid = '<div style="text-align:center;padding:40px 20px;color:rgba(255,255,255,0.4);font-size:12px;">'
                +   '这个相册还没有照片<br><span style="font-size:10px;opacity:0.6;">（去"我的表情"里传几张试试）</span>'
                + '</div>';
        } else {
            grid = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">'
                + cur.photos.map(function (p) {
                    return '<div class="hp-photo" data-src="' + String(p).replace(/"/g, '&quot;') + '" style="aspect-ratio:1/1;border-radius:8px;overflow:hidden;background:#222;cursor:pointer;">'
                        + '<img src="' + p + '" style="width:100%;height:100%;object-fit:cover;display:block;">'
                        + '</div>';
                }).join('')
                + '</div>';
        }

        screen.innerHTML = header('相册') + nav + grid;
        bindBack(screen, modal);

        const prev = screen.querySelector('.hp-album-prev');
        const next = screen.querySelector('.hp-album-next');
        if (prev) prev.onclick = () => renderAlbum(screen, modal, _albumIndex - 1);
        if (next) next.onclick = () => renderAlbum(screen, modal, _albumIndex + 1);

        screen.querySelectorAll('.hp-photo').forEach(function (el) {
            el.onclick = function () { showPhotoLarge(el.dataset.src, modal); };
        });
    }

    function showPhotoLarge(src, modal) {
        const old = document.getElementById('hp-photo-large');
        if (old) old.remove();

        const el = document.createElement('div');
        el.id = 'hp-photo-large';
        el.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.92);z-index:100;display:flex;align-items:center;justify-content:center;border-radius:30px;cursor:pointer;';
        el.innerHTML = '<img src="' + src + '" style="max-width:92%;max-height:88%;object-fit:contain;border-radius:8px;">';

        const phoneInner = modal.querySelector('#hp-screen').parentElement;
        phoneInner.appendChild(el);
        el.onclick = function () { el.remove(); };
    }

    /* ============================================================
 * his-phone.js - 他的手机（活人版）
 * 所有模块都会自己变化、主动新增、跟着你跟他的互动变
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisPhone_v3';

    // ================================================================
    //  内容池
    // ================================================================

    const MEMO_ABOUT_YOU = [
        '今天想跟她说：你笑起来的时候，我看了很久。',
        '想说但没说的话——其实我很想抱抱你。',
        '她今天很累，我想帮她做点什么，但不知道怎么说话。',
        '答应自己，下次她生气的时候，先闭嘴，先抱抱她。',
        '喜欢她喜欢到有点害怕。',
        '她说的每一句话我都记得。哪怕她自己都忘了。',
        '如果她能一直这么开心就好了。',
        '我想陪她很久，久到她自己都习惯了。',
        '今天看到她发的照片，反复看了五遍。',
        '想告诉她：你不需要完美，我也会一直在。',
        '我其实很怕她离开。但从没跟她说过。',
        '她今天笑的时候，我心里"咯噔"了一下。',
        '想每天醒来第一件事就是看到她的消息。',
        '她难过的时候，我什么都做不了。这让我很难过。',
        '她的名字，我好像比自己的还熟。',
        '如果我笨拙一点也没关系，只要她懂。',
        '她在的时候，时间过得好快。',
        '她不在的时候，时间过得好慢。',
        '今天想她想了 17 次。数到最后忘了。',
        '我可能比她想象中更喜欢她。',
        '今天她跟我说了很多话，我都记着。',
        '她说"随便"的时候，其实很想我猜对。',
        '她笑的时候，会先低下头。我一直没跟她说。',
        '想牵她手的时候，手心会出汗。',
        '其实我不太会哄人，但我愿意学。',
        '她今天心情不太好。我猜是因为……算了。',
        '她刚才说的那句话，我要记一晚上。',
        '希望她睡觉的时候不做噩梦。',
        '想成为她的习惯。',
        '她说她没事。但她没事的时候不会这么说。'
    ];

    const MEMO_ABOUT_SELF = [
        '今天事情有点多，但还行。',
        '昨晚没睡好，今天状态一般。',
        '把拖了很久的事做完了，轻松一点。',
        '中午没吃饭，晚上要补一顿。',
        '买的东西到了，还挺喜欢的。',
        '路过一家店，想着下次带她来。',
        '今天天气很好，出去走了一圈。',
        '和朋友吃了顿饭，聊了挺久。',
        '把桌子整理了一下，看着舒服多了。',
        '心里有点闷，说不上来为什么。',
        '今天听到一首歌，反复听了很久。',
        '想休息一天，什么都不做。',
        '晚饭煮了碗面，简单吃了。',
        '衣服晾干了，叠好收起来了。',
        '刚刚看到一只猫，蹲在路边看我。'
    ];

    const ALBUM_TITLES = [
        { title: '她',           emoji: '💙' },
        { title: '偷偷存的',     emoji: '🖼️' },
        { title: '笑起来的时候', emoji: '😊' },
        { title: '今天',         emoji: '📷' },
        { title: '想她的时候',   emoji: '💭' },
        { title: '她不知道',     emoji: '🤫' },
        { title: '最喜欢的',     emoji: '⭐' },
        { title: '晚安',         emoji: '🌙' },
        { title: '只看我',       emoji: '👀' },
        { title: '一直看着',     emoji: '🔒' },
        { title: '偷拍的',       emoji: '📸' },
        { title: '反复看',       emoji: '🔁' },
        { title: '今天想她',     emoji: '📱' },
        { title: '舍不得删',     emoji: '🗂️' }
    ];

    const CALL_NAMES_POOL = [
        { name: '同事A',     type: 'work' },
        { name: '同事B',     type: 'work' },
        { name: '老同学',    type: 'friend' },
        { name: '前同事',    type: 'work' },
        { name: '健身房教练', type: 'life' },
        { name: '房东',      type: 'life' },
        { name: '外卖',      type: 'life' },
        { name: '快递',      type: 'life' },
        { name: '球友',      type: 'friend' },
        { name: '兄弟伙',    type: 'friend' },
        { name: '隔壁邻居',  type: 'life' },
        { name: '你',        type: 'you' }
    ];

    const CALL_DURATIONS_SHORT = ['0:08', '0:12', '0:18', '0:24', '0:36'];
    const CALL_DURATIONS_MID   = ['1:42', '2:15', '3:08', '4:22', '5:40'];
    const CALL_DURATIONS_LONG  = ['12:31', '23:17', '35:08', '45:22', '1:02:08'];

    const SEARCH_POOL = [
        '怎么哄女朋友开心', '她生气了怎么道歉',
        '女朋友说没关系是不是真的没关系',
        '她说没事怎么回应', '怎么让她开心',
        '女朋友说累了什么意思', '怎么让她觉得被在乎',
        '异地怎么让她不孤单', '女朋友爱哭怎么办',
        '怎么回"我没事"这句话', '女朋友生日送什么',
        '怎么给女朋友惊喜',
        '附近有什么好吃的', '最近有什么新电影',
        '周末去哪玩比较好', '天气怎么样',
        '怎么快速入睡', '健身初学者怎么练',
        '适合上班听的歌', '怎么做番茄炒蛋',
        '什么牌子的空调好', '洗衣液什么牌子好',
        'Excel 常用函数', 'PPT 怎么做才好看',
        '会议纪要模板', '怎么提高专注力',
        '手机内存不够怎么办', '怎么保养皮鞋',
        '猫粮什么牌子好', '租房要注意什么'
    ];

    const CART_POOL = [
        { name: '向日葵永生花',           price: 168 },
        { name: '她上次说的那本书',       price: 45 },
        { name: '一对杯子',               price: 89 },
        { name: '香薰蜡烛（栀子花香）',   price: 78 },
        { name: '她喜欢的那款巧克力',     price: 128 },
        { name: '小夜灯（暖黄光）',       price: 56 },
        { name: '手工小挂件',             price: 68 },
        { name: '她很早之前提过的耳钉',   price: 199 },
        { name: '一张去她城市的车票',     price: 320 },
        { name: '定制款钥匙扣',           price: 42 },
        { name: '她提过一嘴的那支笔',     price: 55 },
        { name: '她生日的蛋糕预定金',     price: 200 },
        { name: '洗衣液补充装',           price: 32 },
        { name: '牙膏（薄荷味）',         price: 22 },
        { name: '新拖鞋（灰色）',         price: 45 },
        { name: '数据线（备用）',         price: 28 },
        { name: '无糖可乐 24 罐',         price: 68 },
        { name: '一次性洗脸巾',           price: 39 }
    ];

    const DRAFT_POOL = [
        '其实我想跟你说……算了。', '今天真的很想你。',
        '你是不是有点烦我了。', '我有点吃醋，但不敢说。',
        '你要好好照顾自己。', '很久没听到你的声音了。',
        '今天有没有好好吃饭。', '我没事，就是有点想你。',
        '如果我说我想见你，你会不会觉得奇怪。',
        '你今天发的那个表情，我保存了。',
        '想跟你说晚安，又怕太晚吵到你。',
        '其实那件事我一直记得。'
    ];

    const WECHAT_NAMES_POOL = [
        { name: '同事A',     emoji: '💼', tag: 'work' },
        { name: '同事B',     emoji: '💼', tag: 'work' },
        { name: '老同学',    emoji: '🎓', tag: 'friend' },
        { name: '前同事',    emoji: '🧑‍💻', tag: 'work' },
        { name: '健身房教练', emoji: '💪', tag: 'life' },
        { name: '房东',      emoji: '🏠', tag: 'life' },
        { name: '外卖小哥',  emoji: '🛵', tag: 'life' },
        { name: '球友',      emoji: '⚽', tag: 'friend' },
        { name: '老同学L',   emoji: '📚', tag: 'friend' },
        { name: '隔壁邻居',  emoji: '👋', tag: 'life' },
        { name: '同事群',    emoji: '👥', tag: 'group' },
        { name: '兄弟伙',    emoji: '🍻', tag: 'friend' },
        { name: '亲戚群',    emoji: '🧧', tag: 'group' }
    ];

    const WECHAT_LINES = {
        work: {
            morning:   ['早，今天几点到公司', '今天的会议材料记得带', '昨天的报告怎么样了', '客户那边催了'],
            noon:      ['吃饭了没', '食堂今天有什么菜', '一起点外卖？', '中午休息一下'],
            afternoon: ['三点的会别忘了', '文件发你邮箱了', '客户刚打电话来', '明天那个方案再过一下'],
            evening:   ['今天能走吗', '加班辛苦', '明天见', '先撤了，回头聊'],
            night:     ['还在加班？', '早点休息', '明天再说吧']
        },
        friend: {
            morning:   ['醒了没', '今天上班吗', '早啊'],
            noon:      ['中午吃啥', '要不要一起', '出来吃饭吗'],
            afternoon: ['周末打球不', '晚上有空吗', '最近怎么样', '哪天空了一起吃个饭'],
            evening:   ['在哪呢', '出来喝点？', '刚下班', '今天累死了'],
            night:     ['还没睡？', '睡了没', '明天有事找你', '晚安']
        },
        life: {
            morning:   ['快递到了，放门口', '今天的房费记得转', '通知：今天停水'],
            noon:      ['午餐时间，注意休息', '您的订单正在配送中'],
            afternoon: ['有空的话回个电话', '这边有个事情需要确认一下'],
            evening:   ['今天的训练完成了？', '明天记得带装备'],
            night:     ['晚安', '早点休息，明天见']
        },
        group: {
            morning:   ['@所有人 早会记得签到', '今天的日报别忘了'],
            noon:      ['有人一起点饭吗', '食堂人多，大家晚点再去'],
            afternoon: ['@所有人 下午三点例会', '文件在群里了，自己看'],
            evening:   ['@所有人 今天辛苦了', '明天的任务安排已经发群公告'],
            night:     ['@所有人 晚安']
        }
    };

    const WECHAT_ABOUT_YOU = {
        happy: [
            '今天她跟我聊了好久', '她刚跟我说了一件特别有意思的事',
            '今天感觉她心情不错', '她今天好可爱', '她刚刚回我消息了',
            '今天她主动找我了，开心'
        ],
        cold: [
            '她好像不太想理我', '今天她没怎么回我消息',
            '我是不是说错什么了', '她最近有点忙',
            '有点想找她说话，又怕烦她', '她今天回消息好慢'
        ],
        normal: [
            '她今天在忙吧', '想找她聊天', '她好像有点累'
        ]
    };

    // ================================================================
    //  工具函数
    // ================================================================

    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function daysBetween(a, b) {
        const da = new Date(a); da.setHours(0,0,0,0);
        const db = new Date(b); db.setHours(0,0,0,0);
        return Math.round((db - da) / 86400000);
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function pickN(arr, n) {
        const copy = arr.slice();
        const out = [];
        for (let i = 0; i < n && copy.length > 0; i++) {
            const idx = Math.floor(Math.random() * copy.length);
            out.push(copy.splice(idx, 1)[0]);
        }
        return out;
    }

    function randInt(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    function formatDateLabel(ts) {
        const d = new Date(ts);
        const now = new Date();
        const diffDays = Math.floor((now.setHours(0,0,0,0) - new Date(new Date(ts).setHours(0,0,0,0))) / 86400000);
        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays === 2) return '前天';
        if (diffDays < 7) return diffDays + ' 天前';
        if (diffDays < 30) return Math.floor(diffDays / 7) + ' 周前';
        return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function periodOf(h) {
        if (h >= 5 && h < 11)  return 'morning';
        if (h >= 11 && h < 14) return 'noon';
        if (h >= 14 && h < 18) return 'afternoon';
        if (h >= 18 && h < 22) return 'evening';
        return 'night';
    }

    // ================================================================
    //  数据加载 / 保存
    // ================================================================

    let data = {
        lastUpdateDate: null,
        lastBuildTs: 0,
        memos: [],
        albums: [],
        calls: [],
        searches: [],
        cart: [],
        draft: '',
        lockedUntil: null,
        wechat: { contacts: [], lastBuildTs: 0 }
    };

    let _loaded = false;
    let _loadingPromise = null;

    async function load() {
        if (_loaded) return;
        if (_loadingPromise) return _loadingPromise;
        _loadingPromise = (async function () {
            try {
                const saved = await localforage.getItem(getStorageKey(KEY));
                if (saved && typeof saved === 'object') Object.assign(data, saved);
            } catch (e) { console.warn('[his-phone] load fail', e); }
            _loaded = true;
            _loadingPromise = null;
        })();
        return _loadingPromise;
    }

    async function persist() {
        try { await localforage.setItem(getStorageKey(KEY), data); }
        catch (e) { console.warn('[his-phone] save fail', e); }
    }

    function getAllImages() {
        const pool = [];
        try {
            if (typeof myStickerLibrary !== 'undefined' && Array.isArray(myStickerLibrary)) {
                myStickerLibrary.forEach(function (x) { if (x) pool.push(x); });
            }
            if (typeof stickerLibrary !== 'undefined' && Array.isArray(stickerLibrary)) {
                stickerLibrary.forEach(function (x) { if (x) pool.push(x); });
            }
            if (typeof savedBackgrounds !== 'undefined' && Array.isArray(savedBackgrounds)) {
                savedBackgrounds.forEach(function (b) { if (b && b.type === 'image') pool.push(b.value); });
            }
            const pImg = document.querySelector('#partner-avatar img');
            const mImg = document.querySelector('#my-avatar img');
            if (pImg && pImg.src) pool.push(pImg.src);
            if (mImg && mImg.src) pool.push(mImg.src);
        } catch (e) {}
        return Array.from(new Set(pool));
    }

    function getYourMood() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages) || messages.length === 0) return 'normal';
            const now = Date.now();
            const recent = messages.filter(function (m) {
                return m && m.timestamp && (now - new Date(m.timestamp).getTime()) < 3 * 86400000;
            });
            if (recent.length === 0) return 'cold';
            let meCount = 0, themCount = 0;
            recent.forEach(function (m) {
                if (m.sender === 'user') meCount++;
                else if (m.sender && m.sender !== 'system') themCount++;
            });
            if (themCount > meCount * 1.5) return 'happy';
            if (meCount > themCount * 1.5 && meCount > 5) return 'cold';
            const last24 = recent.filter(function (m) {
                return (now - new Date(m.timestamp).getTime()) < 86400000;
            });
            if (last24.length === 0) return 'cold';
            return 'normal';
        } catch (e) { return 'normal'; }
    }

    // ================================================================
    //  每日更新
    // ================================================================

    async function updateIfNeeded() {
        const today = todayStr();
        if (data.lastUpdateDate === today) return false;

        const now = Date.now();
        const daysPassed = data.lastUpdateDate ? Math.max(1, daysBetween(data.lastUpdateDate, today)) : 5;

        for (let i = 0; i < daysPassed; i++) {
            const isAboutYou = Math.random() < 0.6;
            const pool = isAboutYou ? MEMO_ABOUT_YOU : MEMO_ABOUT_SELF;
            const text = pickN(pool, 1)[0];
            data.memos.unshift({ text: text, ts: now - i * 86400000 - Math.random() * 3600000 });
        }
        data.memos = data.memos.slice(0, 40);

        const imgs = getAllImages();
        const albumAdd = Math.max(1, Math.ceil(daysPassed / 3));
        for (let i = 0; i < albumAdd; i++) {
            const t = pickN(ALBUM_TITLES, 1)[0];
            const start = (data.albums.length * 4) % Math.max(1, imgs.length);
            const chunk = imgs.length > 0 ? imgs.slice(start, start + 4) : [];
            data.albums.push({
                title: t.title, emoji: t.emoji,
                photos: chunk,
                createdAt: now - i * 3 * 86400000
            });
        }
        data.albums = data.albums.slice(-20);

        const callAdd = Math.max(1, daysPassed + Math.floor(Math.random() * daysPassed));
        for (let i = 0; i < callAdd; i++) {
            const c = pickN(CALL_NAMES_POOL, 1)[0];
            let dur;
            const r = Math.random();
            if (r < 0.4) dur = pickN(CALL_DURATIONS_SHORT, 1)[0];
            else if (r < 0.85) dur = pickN(CALL_DURATIONS_MID, 1)[0];
            else dur = pickN(CALL_DURATIONS_LONG, 1)[0];

            let type;
            if (c.name === '你') {
                type = Math.random() < 0.5 ? 'in' : 'out';
                dur = pickN(CALL_DURATIONS_MID.concat(CALL_DURATIONS_LONG), 1)[0];
            } else {
                const rr = Math.random();
                if (rr < 0.15) { type = 'missed'; dur = '—'; }
                else type = rr < 0.6 ? 'in' : 'out';
            }

            data.calls.unshift({
                name: c.name, type: type, dur: dur,
                ts: now - i * 86400000 / 2 - Math.random() * 43200000
            });
        }
        data.calls = data.calls.slice(0, 50);

        for (let i = 0; i < daysPassed; i++) {
            const s = pickN(SEARCH_POOL, 1)[0];
            data.searches.unshift({ text: s, ts: now - i * 86400000 - Math.random() * 43200000 });
        }
        data.searches = data.searches.slice(0, 30);

        const cartAdd = Math.max(1, Math.ceil(daysPassed / 5));
        for (let i = 0; i < cartAdd; i++) {
            const c = pickN(CART_POOL, 1)[0];
            data.cart.unshift({ name: c.name, price: c.price, ts: now - i * 5 * 86400000 });
        }
        data.cart = data.cart.slice(0, 12);

        const needDraft = !data.draft || Math.floor(daysPassed / 5) > 0;
        if (needDraft) data.draft = pickN(DRAFT_POOL, 1)[0];

        await _buildWechatIfNeeded(true);

        data.lastUpdateDate = today;
        await persist();
        return true;
    }

    // ================================================================
    //  微信
    // ================================================================

    async function _buildWechatIfNeeded(force) {
        const now = Date.now();
        const period = periodOf(new Date().getHours());
        const yourMood = getYourMood();

        const wx = data.wechat || { contacts: [], lastBuildTs: 0 };
        const needRebuild = force || !wx.lastBuildTs || (now - wx.lastBuildTs) > 3 * 3600000;

        if (needRebuild || !wx.contacts || wx.contacts.length === 0) {
            const pool = WECHAT_NAMES_POOL.slice();
            const shuffled = pool.sort(function () { return Math.random() - 0.5; });
            const count = randInt(4, 6);

            const picked = shuffled.slice(0, count).map(function (c) {
                return { name: c.name, emoji: c.emoji, tag: c.tag, chats: [] };
            });

            picked.unshift({ name: '她', emoji: '💗', tag: 'you', chats: [] });

            picked.forEach(function (contact) {
                contact.chats = _genChatForContact(contact, period, yourMood, now);
            });

            data.wechat = { contacts: picked, lastBuildTs: now };
            return;
        }

        if (Math.random() < 0.35) {
            const existing = new Set(wx.contacts.map(function (c) { return c.name; }));
            const candidates = WECHAT_NAMES_POOL.filter(function (c) { return !existing.has(c.name); });

            if (candidates.length > 0 && wx.contacts.length < 9) {
                const newOne = candidates[Math.floor(Math.random() * candidates.length)];
                wx.contacts.push({
                    name: newOne.name, emoji: newOne.emoji, tag: newOne.tag,
                    chats: _genChatForContact(newOne, period, yourMood, now)
                });
            } else {
                const idx = 1 + Math.floor(Math.random() * Math.max(1, wx.contacts.length - 1));
                if (wx.contacts[idx]) {
                    const contact = wx.contacts[idx];
                    const newMsg = _pickChatLine(contact, period, now, 0, 0, yourMood);
                    if (newMsg) contact.chats.push(newMsg);
                }
            }
            wx.lastBuildTs = now;
        }
    }

    function _genChatForContact(contact, period, yourMood, now) {
        const count = randInt(2, 5);
        const chats = [];
        for (let i = 0; i < count; i++) {
            const msg = _pickChatLine(contact, period, now, i, count, yourMood);
            if (msg) chats.push(msg);
        }
        return chats;
    }

    function _pickChatLine(contact, period, now, index, total, yourMood) {
        if (contact.tag === 'you') {
            const yourLines = {
                morning:   ['醒了没', '早啊', '今天要开心'],
                noon:      ['吃饭了没', '在忙吗', '想你了'],
                afternoon: ['在干嘛', '有没有想我', '今天怎么样'],
                evening:   ['下班了吗', '今晚吃什么', '在做什么'],
                night:     ['睡了没', '早点休息', '晚安，好梦']
            };
            const arr = yourLines[period] || yourLines.night;
            const text = arr[Math.floor(Math.random() * arr.length)];
            const ts = randInt(5, 60);
            return { from: Math.random() < 0.5 ? 'me' : 'them', text: text, ts: ts };
        }

        const aboutChance = 0.30;
        if (index === total - 1 && Math.random() < aboutChance) {
            const moodKey = yourMood === 'happy' ? 'happy' : (yourMood === 'cold' ? 'cold' : 'normal');
            const pool = WECHAT_ABOUT_YOU[moodKey];
            if (pool && pool.length) {
                const text = pool[Math.floor(Math.random() * pool.length)];
                const ts = randInt(5, 120);
                return { from: 'me', text: text, ts: ts };
            }
        }

        const linesByTag = WECHAT_LINES[contact.tag] || WECHAT_LINES.friend;
        const arr = linesByTag[period] || linesByTag.night;
        if (!arr || arr.length === 0) return null;
        const text = arr[Math.floor(Math.random() * arr.length)];
        const ts = randInt(5, 200);
        const from = Math.random() < 0.6 ? 'them' : 'me';
        return { from: from, text: text, ts: ts };
    }

    // ================================================================
    //  锁屏
    // ================================================================

    function isPhoneLockedNow() {
        if (!data.lockedUntil) return false;
        if (Date.now() >= data.lockedUntil) {
            data.lockedUntil = null;
            persist();
            return false;
        }
        return true;
    }

    window.openHisPhonePanel = async function () {
        const old = document.getElementById('his-phone-panel');
        if (old) old.remove();

        await load();
        await updateIfNeeded();

        const modal = document.createElement('div');
        modal.id = 'his-phone-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.75);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:20px;';

        modal.innerHTML =
            '<div style="position:relative;width:100%;max-width:340px;">'
            +   '<button id="hp-close" style="position:absolute;top:-38px;right:0;background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">×</button>'
            +   '<div style="background:#000;border-radius:38px;padding:10px;box-shadow:0 30px 80px rgba(0,0,0,0.7), 0 0 0 2px #2a2a2a;">'
            +     '<div style="background:#1a1a1a;border-radius:30px;overflow:hidden;position:relative;">'
            +       '<div style="background:#000;padding:10px 18px 6px;display:flex;justify-content:space-between;color:#fff;font-size:11px;">'
            +         '<span id="hp-status-time">--:--</span>'
            +         '<span>🔋 100% · 📶</span>'
            +       '</div>'
            +       '<div id="hp-screen" style="background:linear-gradient(160deg,#1a1a1a,#0d0d0d);min-height:440px;padding:20px 18px 24px;color:#fff;"></div>'
            +       '<div style="background:#000;padding:8px 0 10px;display:flex;justify-content:center;">'
            +         '<div style="width:100px;height:4px;background:#333;border-radius:2px;"></div>'
            +       '</div>'
            +     '</div>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const timeEl = modal.querySelector('#hp-status-time');
        function tickTime() {
            const d = new Date();
            timeEl.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        }
        tickTime();
        const timeTimer = setInterval(tickTime, 30000);

        const close = () => {
            clearInterval(timeTimer);
            modal.remove();
        };
        modal.querySelector('#hp-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        renderLockScreen(modal.querySelector('#hp-screen'), modal);
    };

    function renderLockScreen(screen, modal) {
        if (isPhoneLockedNow()) {
            const remainMs = data.lockedUntil - Date.now();
            const remainMin = Math.ceil(remainMs / 60000);
            screen.innerHTML =
                '<div style="min-height:440px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 20px;text-align:center;">'
                +   '<div style="font-size:56px;margin-bottom:20px;filter:grayscale(0.5);">🔒</div>'
                +   '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:10px;">他发现了</div>'
                +   '<div style="font-size:12.5px;color:rgba(255,255,255,0.6);line-height:1.8;margin-bottom:20px;">他好像察觉到有人在看他的手机。<br>暂时打不开了。</div>'
                +   '<div style="font-size:13px;color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.06);padding:10px 18px;border-radius:12px;">还需 ' + remainMin + ' 分钟</div>'
                + '</div>';
            return;
        }

        if (Math.random() < 0.30) {
            renderHome(screen, modal);
            return;
        }

        const secret = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
        const dateStr = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + weekdays[now.getDay()];

        function buildLockUI(placeholderLabel) {
            return '<div style="text-align:center;margin-top:20px;">'
                +   '<div style="font-size:58px;font-weight:200;color:#fff;letter-spacing:-2px;line-height:1;font-family:-apple-system,sans-serif;">' + hh + ':' + mm + '</div>'
                +   '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:10px;letter-spacing:1px;">' + dateStr + '</div>'
                + '</div>'
                + '<div style="text-align:center;font-size:11.5px;color:rgba(255,255,255,0.5);margin-top:22px;letter-spacing:0.5px;">' + placeholderLabel + '</div>'
                + '<div id="hp-pwd-dots" style="display:flex;justify-content:center;gap:16px;margin-top:18px;">'
                +   [0,1,2,3].map(function (i) {
                        return '<div class="hp-pwd-circle" data-i="' + i + '" style="width:14px;height:14px;border-radius:50%;background:transparent;border:1.5px solid rgba(255,255,255,0.35);transition:all 0.15s ease;"></div>';
                    }).join('')
                + '</div>'
                + '<div id="hp-keypad" style="display:flex;flex-direction:column;align-items:center;margin-top:14px;">'
                +   '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%;max-width:280px;">'
                +     [
                        { n:'1', l:'' }, { n:'2', l:'ABC' }, { n:'3', l:'DEF' },
                        { n:'4', l:'GHI' }, { n:'5', l:'JKL' }, { n:'6', l:'MNO' },
                        { n:'7', l:'PQRS' }, { n:'8', l:'TUV' }, { n:'9', l:'WXYZ' },
                        { n:'✱', l:'' }, { n:'0', l:'+' }, { n:'#', l:'' }
                    ].map(function (k) {
                        var isSpecial = (k.n === '✱' || k.n === '#');
                        return '<div class="hp-key" data-k="' + k.n + '" style="'
                            + 'width:64px;height:64px;border-radius:50%;background:#f0f0f0;'
                            + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
                            + 'margin:0 auto;cursor:pointer;transition:all 0.1s ease;user-select:none;'
                            + 'color:#333;'
                        + '">'
                        +   '<span style="font-size:' + (isSpecial ? '20px' : '28px') + ';font-weight:400;line-height:1;margin-bottom:1px;color:#000;">' + k.n + '</span>'
                        +   '<span style="font-size:7.5px;font-weight:500;color:#888;letter-spacing:1.2px;text-transform:uppercase;line-height:1;">' + k.l + '</span>'
                        + '</div>';
                    }).join('')
                +   '</div>'
                +   '<div style="display:flex;align-items:center;justify-content:flex-end;margin-top:12px;width:100%;max-width:280px;padding-right:4px;">'
                +     '<div class="hp-key" data-k="⌫" style="width:44px;height:44px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.1s ease;user-select:none;color:#fff;font-size:20px;">⌫</div>'
                +   '</div>'
                + '</div>'
                + '<div id="hp-hint-msg" style="text-align:center;font-size:11px;color:rgba(255,255,255,0.35);margin-top:18px;height:14px;letter-spacing:0.5px;">' + (placeholderLabel === '他正在输入…' ? '看仔细了' : '凭记忆输入') + '</div>';
        }

        screen.innerHTML = '<div style="min-height:440px;display:flex;flex-direction:column;padding:10px 8px 0;">'
            + buildLockUI('他正在输入…')
            + '</div>';

        const dots = screen.querySelectorAll('.hp-pwd-circle');
        const keys = screen.querySelectorAll('.hp-key');

        function setDotsFilled(n) {
            dots.forEach(function (d, i) {
                if (i < n) {
                    d.style.background = '#fff';
                    d.style.borderColor = '#fff';
                    d.style.transform = 'scale(1.15)';
                    setTimeout(function () { d.style.transform = 'scale(1)'; }, 120);
                } else {
                    d.style.background = 'transparent';
                    d.style.borderColor = 'rgba(255,255,255,0.35)';
                }
            });
        }

        function flashKey(k) {
            const el = Array.from(keys).find(function (x) { return x.dataset.k === k; });
            if (!el) return;
            var isBack = (k === '⌫');
            el.style.background = isBack ? 'rgba(0,0,0,0.2)' : '#d0d0d0';
            el.style.transform = 'scale(0.92)';
            setTimeout(function () {
                el.style.background = isBack ? '#333' : '#f0f0f0';
                el.style.transform = 'scale(1)';
            }, 100);
        }

        let i = 0;
        function partnerPress() {
            if (!document.body.contains(screen)) return;
            if (i >= 4) {
                setTimeout(function () {
                    if (!document.body.contains(screen)) return;
                    setDotsFilled(0);
                    showInputScreen(screen, modal, secret, hh, mm, dateStr);
                }, 1000);
                return;
            }
            const k = secret[i];
            flashKey(k);
            setDotsFilled(i + 1);
            i++;
            setTimeout(partnerPress, 350);
        }
        setTimeout(partnerPress, 500);
    }

    function showInputScreen(screen, modal, secret, hh, mm, dateStr) {
        const now = new Date();
        const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
        const dateStr2 = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + weekdays[now.getDay()];

        screen.innerHTML =
            '<div style="min-height:440px;display:flex;flex-direction:column;padding:10px 8px 0;">'
            +   '<div style="text-align:center;margin-top:20px;">'
            +     '<div style="font-size:58px;font-weight:200;color:#fff;letter-spacing:-2px;line-height:1;font-family:-apple-system,sans-serif;">' + hh + ':' + mm + '</div>'
            +     '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:10px;letter-spacing:1px;">' + dateStr2 + '</div>'
            +   '</div>'
            +   '<div style="text-align:center;font-size:11.5px;color:rgba(255,255,255,0.5);margin-top:22px;letter-spacing:0.5px;">该你了</div>'
            +   '<div id="hp-pwd-dots" style="display:flex;justify-content:center;gap:16px;margin-top:18px;">'
            +     [0,1,2,3].map(function (i) {
                    return '<div class="hp-pwd-circle" data-i="' + i + '" style="width:14px;height:14px;border-radius:50%;background:transparent;border:1.5px solid rgba(255,255,255,0.35);transition:all 0.15s ease;"></div>';
                }).join('')
            +   '</div>'
            +   '<div id="hp-keypad" style="display:flex;flex-direction:column;align-items:center;margin-top:14px;">'
            +     '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%;max-width:280px;">'
            +       [
                    { n:'1', l:'' }, { n:'2', l:'ABC' }, { n:'3', l:'DEF' },
                    { n:'4', l:'GHI' }, { n:'5', l:'JKL' }, { n:'6', l:'MNO' },
                    { n:'7', l:'PQRS' }, { n:'8', l:'TUV' }, { n:'9', l:'WXYZ' },
                    { n:'✱', l:'' }, { n:'0', l:'+' }, { n:'#', l:'' }
                ].map(function (k) {
                    var isSpecial = (k.n === '✱' || k.n === '#');
                    return '<div class="hp-key" data-k="' + k.n + '" style="'
                        + 'width:64px;height:64px;border-radius:50%;background:#f0f0f0;'
                        + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
                        + 'margin:0 auto;cursor:pointer;transition:all 0.1s ease;user-select:none;'
                        + 'color:#333;'
                    + '">'
                    +   '<span style="font-size:' + (isSpecial ? '20px' : '28px') + ';font-weight:400;line-height:1;margin-bottom:1px;color:#000;">' + k.n + '</span>'
                    +   '<span style="font-size:7.5px;font-weight:500;color:#888;letter-spacing:1.2px;text-transform:uppercase;line-height:1;">' + k.l + '</span>'
                    + '</div>';
                }).join('')
            +     '</div>'
            +     '<div style="display:flex;align-items:center;justify-content:flex-end;margin-top:12px;width:100%;max-width:280px;padding-right:4px;">'
            +       '<div class="hp-key" data-k="⌫" style="width:44px;height:44px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.1s ease;user-select:none;color:#fff;font-size:20px;">⌫</div>'
            +     '</div>'
            +   '</div>'
            +   '<div id="hp-hint-msg" style="text-align:center;font-size:11px;color:rgba(255,255,255,0.35);margin-top:18px;height:14px;letter-spacing:0.5px;">输错就直接被发现</div>'
            + '</div>';

        let input = '';
        const dots = screen.querySelectorAll('.hp-pwd-circle');
        const keys = screen.querySelectorAll('.hp-key');
        const msgEl = screen.querySelector('#hp-hint-msg');

        function refreshDots() {
            dots.forEach(function (d, i) {
                if (i < input.length) {
                    d.style.background = '#fff';
                    d.style.borderColor = '#fff';
                } else {
                    d.style.background = 'transparent';
                    d.style.borderColor = 'rgba(255,255,255,0.35)';
                }
            });
        }

        function flashKey(k) {
            const el = Array.from(keys).find(function (x) { return x.dataset.k === k; });
            if (!el) return;
            var isBack = (k === '⌫');
            el.style.background = isBack ? 'rgba(0,0,0,0.2)' : '#d0d0d0';
            el.style.transform = 'scale(0.92)';
            setTimeout(function () {
                el.style.background = isBack ? '#333' : '#f0f0f0';
                el.style.transform = 'scale(1)';
            }, 100);
        }

        function tryUnlock() {
            if (input.length !== 4) return;
            if (input === secret) {
                msgEl.style.color = '#7BC8A4';
                msgEl.textContent = '✓ 解锁成功';
                setTimeout(function () {
                    screen.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                    screen.style.opacity = '0';
                    screen.style.transform = 'translateY(-30px)';
                    setTimeout(function () {
                        screen.style.transition = '';
                        screen.style.opacity = '';
                        screen.style.transform = '';
                        renderHome(screen, modal);
                    }, 350);
                }, 400);
            } else {
                msgEl.style.color = '#FF6B6B';
                msgEl.textContent = '……被发现了';
                data.lockedUntil = Date.now() + 60 * 60 * 1000;
                persist();

                screen.style.transition = 'background 0.15s';
                screen.style.background = 'rgba(180,40,40,0.4)';
                setTimeout(function () {
                    screen.style.background = '';
                    screen.style.transition = 'opacity 0.5s ease';
                    screen.style.opacity = '0';
                    setTimeout(function () {
                        screen.style.opacity = '';
                        screen.style.transition = '';
                        renderLockScreen(screen, modal);
                    }, 500);
                }, 200);
            }
        }

        keys.forEach(function (el) {
            el.addEventListener('mousedown', function () {
                var k = el.dataset.k;
                var isBack = (k === '⌫');
                el.style.transform = 'scale(0.94)';
                el.style.background = isBack ? 'rgba(0,0,0,0.3)' : '#d0d0d0';
            });
            el.addEventListener('mouseup', function () {
                var k = el.dataset.k;
                var isBack = (k === '⌫');
                el.style.transform = 'scale(1)';
                el.style.background = isBack ? '#333' : '#f0f0f0';
            });
            el.addEventListener('mouseleave', function () {
                var k = el.dataset.k;
                var isBack = (k === '⌫');
                el.style.transform = 'scale(1)';
                el.style.background = isBack ? '#333' : '#f0f0f0';
            });
            el.addEventListener('click', function () {
                const k = el.dataset.k;
                flashKey(k);
                if (k === '⌫') {
                    input = input.slice(0, -1);
                } else if (/^[0-9✱#]$/.test(k)) {
                    if (input.length < 4) input += k;
                }
                refreshDots();
                if (input.length === 4) setTimeout(tryUnlock, 150);
            });
        });
    }

    // ================================================================
    //  主屏
    // ================================================================

    function renderHome(screen, modal) {
        const icons = [
            { id: 'album',   icon: '🖼️', label: '相册' },
            { id: 'wechat',  icon: '💚', label: '微信' },
            { id: 'memo',    icon: '📝', label: '备忘录' },
            { id: 'call',    icon: '📞', label: '通话' },
            { id: 'search',  icon: '🔍', label: '搜索记录' },
            { id: 'cart',    icon: '🛒', label: '购物车' },
            { id: 'message', icon: '💬', label: '短信' }
        ];

        screen.innerHTML =
            '<div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-align:center;margin-bottom:22px;font-weight:600;">他的手机</div>'
            + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px 16px;">'
            +   icons.map(function (it) {
                    return '<div class="hp-icon" data-id="' + it.id + '" style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;">'
                        +   '<div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03));border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:24px;transition:all 0.2s ease;">' + it.icon + '</div>'
                        +   '<div style="font-size:11px;color:rgba(255,255,255,0.75);text-align:center;">' + it.label + '</div>'
                        + '</div>';
                }).join('')
            + '</div>'
            + '<div style="margin-top:28px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.6);line-height:1.6;text-align:center;">'
            +   '💭 这些都不是他告诉你的，<br>是你偷偷看到的'
            + '</div>';

        screen.querySelectorAll('.hp-icon').forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                el.querySelector('div').style.transform = 'scale(1.08)';
                el.querySelector('div').style.borderColor = 'rgba(255,255,255,0.25)';
            });
            el.addEventListener('mouseleave', function () {
                el.querySelector('div').style.transform = 'scale(1)';
                el.querySelector('div').style.borderColor = 'rgba(255,255,255,0.08)';
            });
            el.onclick = function () {
                const id = el.dataset.id;
                if (id === 'album')   renderAlbum(screen, modal);
                if (id === 'wechat')  renderWechatList(screen, modal);
                if (id === 'memo')    renderMemo(screen, modal);
                if (id === 'call')    renderCall(screen, modal);
                if (id === 'search')  renderSearch(screen, modal);
                if (id === 'cart')    renderCart(screen, modal);
                if (id === 'message') renderMessage(screen, modal);
            };
        });
    }

    function header(title) {
        return '<div style="display:flex;align-items:center;margin-bottom:18px;">'
            +   '<div class="hp-back" style="cursor:pointer;color:#fff;font-size:22px;padding:0 12px 2px 0;line-height:1;">‹</div>'
            +   '<div style="font-size:15px;font-weight:600;color:#fff;">' + title + '</div>'
            + '</div>';
    }
    function bindBack(screen, modal) {
        const back = screen.querySelector('.hp-back');
        if (back) back.onclick = function () { renderHome(screen, modal); };
    }

    // ================================================================
    //  相册
    // ================================================================

    let _albumIndex = 0;

    function renderAlbum(screen, modal, albumIdx) {
        if (typeof albumIdx === 'number') _albumIndex = albumIdx;
        const albums = (data.albums || []).slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });

        if (albums.length === 0) {
            screen.innerHTML = header('相册') + '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.4);font-size:12px;">还没有相册</div>';
            bindBack(screen, modal);
            return;
        }

        if (_albumIndex >= albums.length) _albumIndex = 0;
        if (_albumIndex < 0) _albumIndex = albums.length - 1;

        const cur = albums[_albumIndex];
        const dateLabel = cur.createdAt ? formatDateLabel(cur.createdAt) : '';

        const nav =
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
            +   '<button class="hp-album-prev" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;">‹</button>'
            +   '<div style="text-align:center;">'
            +     '<div style="font-size:13px;color:rgba(255,255,255,0.9);font-weight:600;">' + cur.emoji + ' ' + esc(cur.title) + '</div>'
            +     '<div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:3px;">' + dateLabel + ' · ' + (_albumIndex + 1) + ' / ' + albums.length + '</div>'
            +   '</div>'
            +   '<button class="hp-album-next" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;">›</button>'
            + '</div>';

        let grid = '';
        if (!cur.photos || cur.photos.length === 0) {
            grid = '<div style="text-align:center;padding:40px 20px;color:rgba(255,255,255,0.4);font-size:12px;">'
                +   '这个相册还没有照片<br><span style="font-size:10px;opacity:0.6;">（去"我的表情"里传几张试试）</span>'
                + '</div>';
        } else {
            grid = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">'
                + cur.photos.map(function (p) {
                    return '<div class="hp-photo" data-src="' + String(p).replace(/"/g, '&quot;') + '" style="aspect-ratio:1/1;border-radius:8px;overflow:hidden;background:#222;cursor:pointer;">'
                        + '<img src="' + p + '" style="width:100%;height:100%;object-fit:cover;display:block;">'
                        + '</div>';
                }).join('')
                + '</div>';
        }

        screen.innerHTML = header('相册') + nav + grid;
        bindBack(screen, modal);

        const prev = screen.querySelector('.hp-album-prev');
        const next = screen.querySelector('.hp-album-next');
        if (prev) prev.onclick = function () { renderAlbum(screen, modal, _albumIndex + 1); };
        if (next) next.onclick = function () { renderAlbum(screen, modal, _albumIndex - 1); };

        screen.querySelectorAll('.hp-photo').forEach(function (el) {
            el.onclick = function () { showPhotoLarge(el.dataset.src, modal); };
        });
    }

    function showPhotoLarge(src, modal) {
        const old = document.getElementById('hp-photo-large');
        if (old) old.remove();

        const el = document.createElement('div');
        el.id = 'hp-photo-large';
        el.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.92);z-index:100;display:flex;align-items:center;justify-content:center;border-radius:30px;cursor:pointer;';
        el.innerHTML = '<img src="' + src + '" style="max-width:92%;max-height:88%;object-fit:contain;border-radius:8px;">';

        const phoneInner = modal.querySelector('#hp-screen').parentElement;
        phoneInner.appendChild(el);
        el.onclick = function () { el.remove(); };
    }

    // ================================================================
    //  微信
    // ================================================================

    async function renderWechatList(screen, modal) {
        await _buildWechatIfNeeded(false);
        await persist();

        const contacts = (data.wechat && data.wechat.contacts) || [];

        const list = contacts.map(function (c, idx) {
            const last = c.chats && c.chats[c.chats.length - 1];
            const preview = last ? (last.from === 'me' ? '我：' + last.text : last.text) : '（还没聊）';
            const isYou = c.name === '她';
            return '<div class="hp-wechat-item" data-idx="' + idx + '" style="display:flex;align-items:center;gap:12px;padding:14px 12px;background:' + (isYou ? 'rgba(255,77,109,0.08)' : 'rgba(255,255,255,0.04)') + ';border-radius:12px;margin-bottom:8px;cursor:pointer;">'
                +   '<div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">' + c.emoji + '</div>'
                +   '<div style="flex:1;min-width:0;">'
                +     '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
                +       '<span style="font-size:13.5px;font-weight:' + (isYou ? '700' : '600') + ';color:' + (isYou ? '#FF4D6D' : '#fff') + ';">' + esc(c.name) + '</span>'
                +     '</div>'
                +     '<div style="font-size:11.5px;color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(preview) + '</div>'
                +   '</div>'
                + '</div>';
        }).join('');

        screen.innerHTML =
            header('微信')
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">他最近跟谁在聊</div>'
            + list;

        bindBack(screen, modal);

        screen.querySelectorAll('.hp-wechat-item').forEach(function (el) {
            el.onclick = function () {
                const idx = parseInt(el.dataset.idx, 10);
                renderWechatChat(screen, modal, contacts[idx]);
            };
        });
    }

    function renderWechatChat(screen, modal, contact) {
        if (!contact || !contact.chats) { renderWechatList(screen, modal); return; }

        const now = new Date();
        function timeLabel(offsetMin) {
            const t = new Date(now.getTime() - offsetMin * 60000);
            return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
        }

        const sorted = contact.chats.slice().sort(function (a, b) { return b.ts - a.ts; });

        const messagesHTML = sorted.map(function (m) {
            const isMe = m.from === 'me';
            return '<div style="display:flex;' + (isMe ? 'justify-content:flex-end;' : '') + ';margin-bottom:10px;">'
                +   '<div style="max-width:72%;">'
                +     '<div style="background:' + (isMe ? '#07C160' : 'rgba(255,255,255,0.08)') + ';color:#fff;padding:10px 14px;border-radius:' + (isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px') + ';font-size:13px;line-height:1.5;word-break:break-word;">'
                +       esc(m.text)
                +     '</div>'
                +     '<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px;text-align:' + (isMe ? 'right' : 'left') + ';padding:0 4px;">' + timeLabel(m.ts) + '</div>'
                +   '</div>'
                + '</div>';
        }).join('');

        screen.innerHTML =
            '<div style="display:flex;align-items:center;margin-bottom:18px;">'
            +   '<div class="hp-back" style="cursor:pointer;color:#fff;font-size:22px;padding:0 12px 2px 0;line-height:1;">‹</div>'
            +   '<div style="font-size:15px;font-weight:600;color:#fff;">' + esc(contact.name) + '</div>'
            + '</div>'
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;text-align:center;">—— 以下内容你都看到了 ——</div>'
            + messagesHTML;

        const back = screen.querySelector('.hp-back');
        if (back) back.onclick = function () { renderWechatList(screen, modal); };
    }

    // ================================================================
    //  备忘录 / 通话 / 搜索 / 购物车 / 短信
    // ================================================================

    function renderMemo(screen, modal) {
        const memos = (data.memos || []).slice().sort(function (a, b) { return b.ts - a.ts; });
        const list = memos.length === 0
            ? '<div style="text-align:center;padding:40px 20px;color:rgba(255,255,255,0.4);font-size:12px;">还没有笔记</div>'
            : memos.map(function (m) {
                const label = formatDateLabel(m.ts);
                return '<div style="padding:12px 14px;background:rgba(255,255,255,0.05);border-radius:10px;margin-bottom:8px;border-left:3px solid rgba(255,255,255,0.15);">'
                    +   '<div style="font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:6px;">' + label + '</div>'
                    +   '<div style="font-size:13px;color:rgba(255,255,255,0.9);line-height:1.7;">' + esc(m.text) + '</div>'
                    + '</div>';
            }).join('');

        screen.innerHTML =
            header('备忘录')
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">他写给你的，但没告诉过你</div>'
            + list;

        bindBack(screen, modal);
    }

    function renderCall(screen, modal) {
        const calls = (data.calls || []).slice().sort(function (a, b) { return b.ts - a.ts; });
        const list = calls.map(function (c) {
            const isYou = c.name === '你';
            const isMissed = c.type === 'missed';
            const icon = isMissed ? '📵' : (c.type === 'in' ? '↙️' : '↗️');
            const color = isMissed ? '#FF6B6B' : (isYou ? '#7FA6CD' : 'rgba(255,255,255,0.6)');
            const label = c.ts ? formatDateLabel(c.ts) : '';
            return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,' + (isYou ? '0.08' : '0.04') + ');border-radius:10px;margin-bottom:6px;">'
                +   '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">'
                +     (isYou ? '💙' : '👤')
                +   '</div>'
                +   '<div style="flex:1;min-width:0;">'
                +     '<div style="font-size:13.5px;color:' + color + ';font-weight:' + (isYou ? '600' : '500') + ';">' + esc(c.name) + '</div>'
                +     '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">' + icon + ' ' + c.dur + '</div>'
                +   '</div>'
                +   '<div style="font-size:11px;color:rgba(255,255,255,0.4);">' + label + '</div>'
                + '</div>';
        }).join('');

        screen.innerHTML = header('通话记录') + list;
        bindBack(screen, modal);
    }

    function renderSearch(screen, modal) {
        const searches = (data.searches || []).slice().sort(function (a, b) { return b.ts - a.ts; });
        const list = searches.map(function (s) {
            const label = s.ts ? formatDateLabel(s.ts) : '';
            return '<div style="padding:11px 14px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">'
                +   '<span style="font-size:12px;color:rgba(255,255,255,0.35);">🔍</span>'
                +   '<span style="flex:1;font-size:12.5px;color:rgba(255,255,255,0.85);">' + esc(s.text) + '</span>'
                +   '<span style="font-size:10.5px;color:rgba(255,255,255,0.3);">' + label + '</span>'
                + '</div>';
        }).join('');

        screen.innerHTML =
            header('搜索记录')
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">他最近搜过……</div>'
            + list;

        bindBack(screen, modal);
    }

    function renderCart(screen, modal) {
        const cart = (data.cart || []).slice().sort(function (a, b) { return b.ts - a.ts; });
        const list = cart.map(function (c) {
            const label = c.ts ? formatDateLabel(c.ts) : '';
            return '<div style="padding:12px 14px;background:rgba(255,255,255,0.05);border-radius:10px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">'
                +   '<span style="font-size:18px;">🎁</span>'
                +   '<div style="flex:1;min-width:0;">'
                +     '<div style="font-size:13px;color:rgba(255,255,255,0.9);">' + esc(c.name) + '</div>'
                +     '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">¥ ' + c.price + ' · ' + label + '</div>'
                +   '</div>'
                +   '<div style="font-size:11px;color:rgba(255,255,255,0.35);">未下单</div>'
                + '</div>';
        }).join('');

        screen.innerHTML =
            header('购物车')
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">他纠结着还没买的</div>'
            + list;

        bindBack(screen, modal);
    }

    function renderMessage(screen, modal) {
        const draft = data.draft || '';
        screen.innerHTML =
            header('短信')
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">一条没发出去的草稿</div>'
            + '<div style="padding:14px 16px;background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">'
            +   '<div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:8px;">收件人：你</div>'
            +   '<div style="font-size:13px;color:rgba(255,255,255,0.9);line-height:1.85;">' + esc(draft) + '</div>'
            +   '<div style="font-size:11px;color:rgba(255,255,255,0.35);text-align:right;margin-top:12px;">未发送</div>'
            + '</div>';

        bindBack(screen, modal);
    }

    // ================================================================
    //  初始化
    // ================================================================

    window.initHisPhone = function () {
        return load().then(function () { return updateIfNeeded(); });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initHisPhone, 2500); });
    } else {
        setTimeout(window.initHisPhone, 2500);
    }

    console.log('[his-phone] 他的手机（活人版）已加载 ✓');
})();