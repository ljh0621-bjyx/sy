/* ============================================================
 * his-phone.js - 他的手机
 * 点开像真的翻开了他的手机
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisPhone_v1';

    // 备忘录的文案池
    const MEMO_POOL = [
        '她说她喜欢向日葵。',
        '周五晚上，她说要去看那部电影。',
        '她说最近腰疼，要买药。',
        '她喜欢吃甜的，不喜欢太咸。',
        '她说她喜欢下雨天。',
        '她怕打雷。',
        '她说她名字的由来，我记住了。',
        '她下个月生日，还没想好送什么。',
        '她不吃香菜。',
        '她说想去看海，很久了。',
        '她穿浅蓝色最好看。',
        '她说她最近睡不好，要早点睡。',
        '她说过想去一次敦煌。',
        '她怕黑，睡觉要留小灯。',
        '她说想去打卡那家咖啡店。',
        '她喜欢栀子花的味道。'
    ];

    // 相册标题池
    const ALBUM_TITLES = [
        '她',
        '偷偷存的',
        '笑起来的时候',
        '她不知道我拍了',
        '今天',
        '好看的',
        '想她的时候'
    ];

    // 通话记录池
    const CALL_POOL = [
        { name: '妈妈',     type: 'in',  dur: '12:31', time: '今天' },
        { name: '妈妈',     type: 'out', dur: '5:08',  time: '昨天' },
        { name: '你',       type: 'out', dur: '00:00', time: '昨天' },
        { name: '外卖',     type: 'in',  dur: '0:12',  time: '昨天' },
        { name: '快递',     type: 'in',  dur: '0:18',  time: '前天' },
        { name: '你',       type: 'missed', dur: '—',  time: '3天前' },
        { name: '老张',     type: 'out', dur: '3:42',  time: '3天前' },
        { name: '你',       type: 'in',  dur: '23:17', time: '上周' }
    ];

    // 搜索记录池
    const SEARCH_POOL = [
        '怎么哄女朋友开心',
        '她生气了怎么道歉',
        '女朋友说没关系是不是真的没关系',
        '怎么才算是对的人',
        '异地恋怎么维持',
        '礼物送什么不会踩雷',
        '她说没事怎么回应',
        '怎么让她开心'
    ];

    // 购物车池
    const CART_POOL = [
        { name: '向日葵永生花', price: 168 },
        { name: '她上次说的那本书', price: 45 },
        { name: '一对杯子', price: 89 },
        { name: '香薰蜡烛（栀子花香）', price: 78 },
        { name: '她喜欢的那款巧克力', price: 128 },
        { name: '小夜灯（暖黄光）', price: 56 }
    ];

    // 短信草稿
    const DRAFT_POOL = [
        '其实我想跟你说……算了。',
        '今天真的很想你。',
        '你是不是有点烦我了。',
        '我有点吃醋，但不敢说。',
        '你要好好照顾自己。',
        '很久没听到你的声音了。'
    ];

    let data = {
        memos: [],
        albumTitles: [],
        calls: [],
        searches: [],
        cart: [],
        draft: ''
    };

    async function load() {
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') {
                Object.assign(data, saved);
            }
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }

    // ========== 随机填充数据 ==========
    async function ensureData() {
        let changed = false;

        if (!data.memos || data.memos.length === 0) {
            const pool = MEMO_POOL.slice().sort(() => Math.random() - 0.5);
            data.memos = pool.slice(0, 5 + Math.floor(Math.random() * 4));
            changed = true;
        }
        if (!data.albumTitles || data.albumTitles.length === 0) {
            data.albumTitles = ALBUM_TITLES.slice(0, 3);
            changed = true;
        }
        if (!data.calls || data.calls.length === 0) {
            data.calls = CALL_POOL.slice(0, 6);
            changed = true;
        }
        if (!data.searches || data.searches.length === 0) {
            const pool = SEARCH_POOL.slice().sort(() => Math.random() - 0.5);
            data.searches = pool.slice(0, 5);
            changed = true;
        }
        if (!data.cart || data.cart.length === 0) {
            const pool = CART_POOL.slice().sort(() => Math.random() - 0.5);
            data.cart = pool.slice(0, 3);
            changed = true;
        }
        if (!data.draft) {
            data.draft = DRAFT_POOL[Math.floor(Math.random() * DRAFT_POOL.length)];
            changed = true;
        }

        if (changed) await save();
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ========== 从已有图片库抽图 ==========
    function pickPhotos() {
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
            // 头像
            const pImg = document.querySelector('#partner-avatar img');
            const mImg = document.querySelector('#my-avatar img');
            if (pImg && pImg.src) pool.push(pImg.src);
            if (mImg && mImg.src) pool.push(mImg.src);
        } catch (e) {}
        return pool.slice(0, 9);
    }

    // ========== 主面板 ==========
    window.openHisPhonePanel = async function () {
        const old = document.getElementById('his-phone-panel');
        if (old) old.remove();

        await load();
        await ensureData();

        const modal = document.createElement('div');
        modal.id = 'his-phone-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.75);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:20px;';

        // 手机外框
        modal.innerHTML =
            '<div style="position:relative;width:100%;max-width:340px;">'
            +   '<button id="hp-close" style="position:absolute;top:-38px;right:0;background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">×</button>'
            +   '<div style="background:#000;border-radius:38px;padding:10px;box-shadow:0 30px 80px rgba(0,0,0,0.7), 0 0 0 2px #2a2a2a;">'
            +     '<div style="background:#1a1a1a;border-radius:30px;overflow:hidden;position:relative;">'

            // 顶部状态栏
            +       '<div style="background:#000;padding:10px 18px 6px;display:flex;justify-content:space-between;color:#fff;font-size:11px;">'
            +         '<span id="hp-status-time">--:--</span>'
            +         '<span>🔋 100% · 📶</span>'
            +       '</div>'

            // 主界面容器
            +       '<div id="hp-screen" style="background:linear-gradient(160deg,#1a1a1a,#0d0d0d);min-height:440px;padding:20px 18px 24px;color:#fff;">'
            +       '</div>'

            // 底部
            +       '<div style="background:#000;padding:8px 0 10px;display:flex;justify-content:center;">'
            +         '<div style="width:100px;height:4px;background:#333;border-radius:2px;"></div>'
            +       '</div>'

            +     '</div>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        // 时间
        const timeEl = modal.querySelector('#hp-status-time');
        function tickTime() {
            const d = new Date();
            timeEl.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        }
        tickTime();
        setInterval(tickTime, 30000);

        const close = () => modal.remove();
        modal.querySelector('#hp-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        renderHome(modal.querySelector('#hp-screen'), modal);
    };

    // ========== 主屏幕（图标网格） ==========
    function renderHome(screen, modal) {
        const photos = pickPhotos();

        const icons = [
            { id: 'album',   icon: '🖼️', label: '相册' },
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

        // 绑定图标点击
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
                if (id === 'memo')    renderMemo(screen, modal);
                if (id === 'call')    renderCall(screen, modal);
                if (id === 'search')  renderSearch(screen, modal);
                if (id === 'cart')    renderCart(screen, modal);
                if (id === 'message') renderMessage(screen, modal);
            };
        });
    }

    // ========== 顶栏（子页共用） ==========
    function header(title, backFn) {
        return '<div style="display:flex;align-items:center;margin-bottom:18px;">'
            +   '<div class="hp-back" style="cursor:pointer;color:#fff;font-size:18px;padding:4px 10px 4px 0;">‹</div>'
            +   '<div style="font-size:15px;font-weight:600;color:#fff;">' + title + '</div>'
            + '</div>';
    }

    function bindBack(screen, modal) {
        const back = screen.querySelector('.hp-back');
        if (back) back.onclick = function () { renderHome(screen, modal); };
    }

    // ========== 相册 ==========
    function renderAlbum(screen, modal) {
        const photos = pickPhotos();
        const titles = data.albumTitles || [];

        const grid = photos.length === 0
            ? '<div style="text-align:center;padding:40px 20px;color:rgba(255,255,255,0.4);font-size:12px;">'
                + '还没有照片<br><span style="font-size:10px;opacity:0.6;">（去"我的表情"里传几张试试）</span>'
              + '</div>'
            : '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">'
                + photos.map(function (p) {
                    return '<div style="aspect-ratio:1/1;border-radius:8px;overflow:hidden;background:#222;cursor:pointer;">'
                        + '<img src="' + p + '" style="width:100%;height:100%;object-fit:cover;display:block;">'
                        + '</div>';
                }).join('')
              + '</div>';

        const titleBlocks = titles.map(function (t) {
            return '<div style="font-size:11.5px;color:rgba(255,255,255,0.55);margin:14px 0 6px;font-style:italic;">📁 ' + esc(t) + '</div>';
        }).join('');

        screen.innerHTML =
            header('相册', null)
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:12px;">他存的照片，都是关于你的</div>'
            + titleBlocks
            + grid;

        bindBack(screen, modal);
    }

    // ========== 备忘录 ==========
    function renderMemo(screen, modal) {
        const memos = data.memos || [];

        const list = memos.length === 0
            ? '<div style="text-align:center;padding:40px 20px;color:rgba(255,255,255,0.4);font-size:12px;">还没有笔记</div>'
            : memos.map(function (m, i) {
                const d = new Date(Date.now() - (i + 1) * 86400000);
                const dateStr = (d.getMonth() + 1) + '月' + d.getDate() + '日';
                return '<div style="padding:12px 14px;background:rgba(255,255,255,0.05);border-radius:10px;margin-bottom:8px;border-left:3px solid rgba(255,255,255,0.15);">'
                    +   '<div style="font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:6px;">' + dateStr + '</div>'
                    +   '<div style="font-size:13px;color:rgba(255,255,255,0.9);line-height:1.7;">' + esc(m) + '</div>'
                    + '</div>';
            }).join('');

        screen.innerHTML =
            header('备忘录', null)
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">记着一些关于你的事</div>'
            + list;

        bindBack(screen, modal);
    }

    // ========== 通话记录 ==========
    function renderCall(screen, modal) {
        const calls = data.calls || [];

        const list = calls.map(function (c) {
            const isYou = c.name === '你';
            const isMissed = c.type === 'missed';
            const icon = isMissed ? '📵' : (c.type === 'in' ? '↙️' : '↗️');
            const color = isMissed ? '#FF6B6B' : (isYou ? '#7FA6CD' : 'rgba(255,255,255,0.6)');

            return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,' + (isYou ? '0.08' : '0.04') + ');border-radius:10px;margin-bottom:6px;">'
                +   '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">'
                +     (isYou ? '💙' : '👤')
                +   '</div>'
                +   '<div style="flex:1;min-width:0;">'
                +     '<div style="font-size:13.5px;color:' + color + ';font-weight:' + (isYou ? '600' : '500') + ';">' + esc(c.name) + '</div>'
                +     '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">' + icon + ' ' + c.dur + '</div>'
                +   '</div>'
                +   '<div style="font-size:11px;color:rgba(255,255,255,0.4);">' + esc(c.time) + '</div>'
                + '</div>';
        }).join('');

        screen.innerHTML =
            header('通话记录', null)
            + list;

        bindBack(screen, modal);
    }

    // ========== 搜索记录 ==========
    function renderSearch(screen, modal) {
        const searches = data.searches || [];

        const list = searches.map(function (s) {
            return '<div style="padding:11px 14px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">'
                +   '<span style="font-size:12px;color:rgba(255,255,255,0.35);">🔍</span>'
                +   '<span style="font-size:12.5px;color:rgba(255,255,255,0.85);">' + esc(s) + '</span>'
                + '</div>';
        }).join('');

        screen.innerHTML =
            header('搜索记录', null)
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">他最近搜过……</div>'
            + list;

        bindBack(screen, modal);
    }

    // ========== 购物车 ==========
    function renderCart(screen, modal) {
        const cart = data.cart || [];

        const list = cart.map(function (c) {
            return '<div style="padding:12px 14px;background:rgba(255,255,255,0.05);border-radius:10px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">'
                +   '<span style="font-size:18px;">🎁</span>'
                +   '<div style="flex:1;min-width:0;">'
                +     '<div style="font-size:13px;color:rgba(255,255,255,0.9);">' + esc(c.name) + '</div>'
                +     '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">¥ ' + c.price + '</div>'
                +   '</div>'
                +   '<div style="font-size:11px;color:rgba(255,255,255,0.35);">未下单</div>'
                + '</div>';
        }).join('');

        screen.innerHTML =
            header('购物车', null)
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">他纠结着还没买的</div>'
            + list;

        bindBack(screen, modal);
    }

    // ========== 短信草稿 ==========
    function renderMessage(screen, modal) {
        const draft = data.draft || '';

        screen.innerHTML =
            header('短信', null)
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">一条没发出去的草稿</div>'
            + '<div style="padding:14px 16px;background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">'
            +   '<div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:8px;">收件人：你</div>'
            +   '<div style="font-size:13px;color:rgba(255,255,255,0.9);line-height:1.85;">' + esc(draft) + '</div>'
            +   '<div style="font-size:11px;color:rgba(255,255,255,0.35);text-align:right;margin-top:12px;">未发送</div>'
            + '</div>';

        bindBack(screen, modal);
    }

    // ========== 初始化 ==========
    window.initHisPhone = function () {
        load().then(function () { ensureData(); });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initHisPhone, 2500); });
    } else {
        setTimeout(window.initHisPhone, 2500);
    }

    console.log('[his-phone] 他的手机已加载 ✓');
})();