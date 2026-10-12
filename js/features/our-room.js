/* ============================================================
 * our-room.js - 共同的房间
 * 你和他共用的虚拟小房间。他会自己布置、留字条
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'ourRoom_v1';

    // 家具库
    const FURNITURE = [
        { id: 'sofa',      icon: '🛋️', name: '沙发',   x: 22, y: 68 },
        { id: 'table',     icon: '🪑', name: '桌子',   x: 50, y: 74 },
        { id: 'lamp',      icon: '💡', name: '台灯',   x: 78, y: 58 },
        { id: 'plant',     icon: '🪴', name: '绿植',   x: 12, y: 58 },
        { id: 'bookshelf', icon: '📚', name: '书架',   x: 88, y: 46 },
        { id: 'rug',       icon: '🧶', name: '地毯',   x: 42, y: 88 },
        { id: 'curtain',   icon: '🪟', name: '窗帘',   x: 60, y: 16 },
        { id: 'clock',     icon: '🕰️', name: '挂钟',   x: 30, y: 12 },
        { id: 'picture',   icon: '🖼️', name: '装饰画', x: 70, y: 20 },
        { id: 'cat',       icon: '🐱', name: '猫',     x: 55, y: 84 },
        { id: 'music',     icon: '🎵', name: '音响',   x: 8,  y: 80 },
        { id: 'wine',      icon: '🍷', name: '小酒柜', x: 90, y: 72 },
        { id: 'flower',    icon: '🌸', name: '花瓶',   x: 45, y: 62 },
        { id: 'phone',     icon: '📱', name: '手机支架', x: 30, y: 78 }
    ];

    // 墙纸
    const WALLPAPERS = [
        { id: 'warm',   name: '暖色',   value: 'linear-gradient(180deg,#f5e6d3,#e8d0b0)' },
        { id: 'cool',   name: '冷色',   value: 'linear-gradient(180deg,#d6e4f0,#b8c9dc)' },
        { id: 'green',  name: '森系',   value: 'linear-gradient(180deg,#e0ebd5,#c2d4b0)' },
        { id: 'night',  name: '夜空',   value: 'linear-gradient(180deg,#2a2a4a,#1a1a2e)' },
        { id: 'sunset', name: '晚霞',   value: 'linear-gradient(180deg,#ffd6b0,#e8a0a0)' }
    ];

    // 他留的小字条
    const HIS_NOTES = [
        '今天出去了一下，晚点回来。',
        '给你留了一盏灯。',
        '沙发上等你。',
        '别太累。',
        '冰箱里放了水，记得喝。',
        '昨晚梦到你了。',
        '看窗外，今晚星星挺亮的。',
        '想你。',
        '回来告诉我一声。',
        '先睡了，晚安。'
    ];

    // 数据
    let data = {
        placed: [],
        wallpaper: 'warm',
        note: null,           // { text, ts }
        lastPartnerTouchTs: 0,
        log: []
    };

    let _loaded = false;

    async function load() {
        if (_loaded) return;
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') Object.assign(data, saved);
        } catch (e) {}
        _loaded = true;
    }
    async function persist() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }

    function getPartnerName() {
        return (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
    }

    // ========== 他动房间 ==========
    function partnerTouch() {
        const now = Date.now();
        if (now - data.lastPartnerTouchTs < 4 * 3600000) return; // 4 小时冷却
        if (Math.random() > 0.5) return; // 50% 概率

        const available = FURNITURE.filter(f => !data.placed.includes(f.id));
        const actions = [];
        if (available.length > 0) actions.push('add', 'add');
        if (data.placed.length > 0) actions.push('remove');
        actions.push('wallpaper', 'note');

        const action = actions[Math.floor(Math.random() * actions.length)];
        let logText = '';

        if (action === 'add' && available.length > 0) {
            const item = available[Math.floor(Math.random() * available.length)];
            data.placed.push(item.id);
            logText = getPartnerName() + ' 放了一个 ' + item.name + ' 进来';
        } else if (action === 'wallpaper') {
            const wp = WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
            data.wallpaper = wp.id;
            logText = getPartnerName() + ' 把墙纸换成了「' + wp.name + '」';
        } else if (action === 'remove' && data.placed.length > 0) {
            const id = data.placed[Math.floor(Math.random() * data.placed.length)];
            const item = FURNITURE.find(f => f.id === id);
            data.placed = data.placed.filter(f => f !== id);
            if (item) logText = getPartnerName() + ' 把 ' + item.name + ' 收起来了';
        } else if (action === 'note') {
            const text = HIS_NOTES[Math.floor(Math.random() * HIS_NOTES.length)];
            data.note = { text: text, ts: now };
            logText = getPartnerName() + ' 在桌上留了张字条';
        }

        if (logText) {
            data.lastPartnerTouchTs = now;
            data.log.unshift({ text: logText, ts: now });
            data.log = data.log.slice(0, 20);
            persist();
            if (typeof showNotification === 'function') {
                showNotification(logText, 'info', 2600);
            }
        }
    }

    // ========== 画房间 ==========
    function renderRoom() {
        const wp = WALLPAPERS.find(w => w.id === data.wallpaper) || WALLPAPERS[0];

        const h = new Date().getHours();
        let overlay = 'rgba(0,0,0,0)';
        if (h >= 6 && h < 10) overlay = 'rgba(255,220,150,0.15)';
        else if (h >= 10 && h < 17) overlay = 'rgba(255,255,255,0.05)';
        else if (h >= 17 && h < 20) overlay = 'rgba(255,150,80,0.18)';
        else overlay = 'rgba(20,20,50,0.35)';

        const placedHTML = FURNITURE.filter(f => data.placed.includes(f.id)).map(f => {
            return '<div style="position:absolute;left:' + f.x + '%;top:' + f.y + '%;transform:translate(-50%,-50%);font-size:38px;line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.25));user-select:none;">' + f.icon + '</div>';
        }).join('');

        // 字条
        const noteHTML = data.note
            ? '<div style="position:absolute;left:50%;top:60%;transform:translate(-50%,-50%) rotate(-3deg);background:#fffbea;color:#5a4530;font-size:11px;padding:8px 12px;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:150px;line-height:1.5;font-family:var(--font-family);">'
                + '📝 ' + escapeHTML(data.note.text)
                + '</div>'
            : '';

        return '<div style="position:relative;width:100%;height:100%;background:' + wp.value + ';overflow:hidden;">'
            + '<div style="position:absolute;left:0;right:0;bottom:0;height:28%;background:linear-gradient(180deg,#8b6f4e,#5a4530);opacity:0.85;"></div>'
            + placedHTML
            + noteHTML
            + '<div style="position:absolute;inset:0;background:' + overlay + ';pointer-events:none;"></div>'
            + '</div>';
    }

    function escapeHTML(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ========== 打开面板 ==========
    window.openOurRoomPanel = async function () {
        await load();

        const old = document.getElementById('our-room-panel');
        if (old) old.remove();

        const pName = getPartnerName();

        const modal = document.createElement('div');
        modal.id = 'our-room-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:orFadeIn 0.25s ease;';

        modal.innerHTML =
            '<style>@keyframes orFadeIn{from{opacity:0}to{opacity:1}}@keyframes orPop{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}</style>'
            + '<div style="background:var(--secondary-bg);border-radius:22px;width:94%;max-width:460px;height:88vh;max-height:760px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4);animation:orPop 0.35s cubic-bezier(0.34,1.56,0.64,1);">'

            +   '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border-color);background:var(--secondary-bg);flex-shrink:0;">'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<div style="width:34px;height:34px;border-radius:10px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;font-size:16px;">🏠</div>'
            +       '<span style="font-size:15px;font-weight:700;color:var(--text-primary);">共同的房间</span>'
            +     '</div>'
            +     '<button id="or-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div id="or-room" style="flex:1;position:relative;overflow:hidden;"></div>'

            +   '<div style="padding:12px 14px;border-top:1px solid var(--border-color);background:var(--secondary-bg);flex-shrink:0;">'
            +     '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;letter-spacing:1px;">家具库（点击添加/移除）</div>'
            +     '<div id="or-furniture" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;"></div>'
            +   '</div>'

            +   '<div style="padding:0 14px 12px;background:var(--secondary-bg);flex-shrink:0;">'
            +     '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;font-weight:600;letter-spacing:1px;">墙纸</div>'
            +     '<div id="or-wallpapers" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:8px;"></div>'
            +     '<button id="or-log-btn" style="width:100%;padding:9px;border:1px solid var(--border-color);border-radius:10px;background:var(--primary-bg);color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-clock-rotate-left"></i> 他最近动过什么</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

        function refreshRoom() {
            const el = modal.querySelector('#or-room');
            el.innerHTML = renderRoom();
        }

        function renderFurniture() {
            const el = modal.querySelector('#or-furniture');
            el.innerHTML = FURNITURE.map(f => {
                const placed = data.placed.includes(f.id);
                return '<div class="or-f" data-id="' + f.id + '" style="flex-shrink:0;width:56px;height:56px;border-radius:14px;background:' + (placed ? 'rgba(var(--accent-color-rgb),0.15)' : 'var(--primary-bg)') + ';border:1.5px solid ' + (placed ? 'var(--accent-color)' : 'var(--border-color)') + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;transition:all 0.18s;">'
                    + '<div style="font-size:22px;line-height:1;">' + f.icon + '</div>'
                    + '<div style="font-size:9px;color:var(--text-secondary);line-height:1;">' + f.name + '</div>'
                    + '</div>';
            }).join('');
            el.querySelectorAll('.or-f').forEach(fEl => {
                fEl.onclick = async () => {
                    const id = fEl.dataset.id;
                    if (data.placed.includes(id)) data.placed = data.placed.filter(x => x !== id);
                    else data.placed.push(id);
                    await persist();
                    renderFurniture();
                    refreshRoom();
                    if (typeof playSound === 'function') playSound('favorite');
                };
            });
        }

        function renderWallpapers() {
            const el = modal.querySelector('#or-wallpapers');
            el.innerHTML = WALLPAPERS.map(w => {
                const active = w.id === data.wallpaper;
                return '<div class="or-w" data-id="' + w.id + '" style="flex-shrink:0;width:60px;height:44px;border-radius:10px;background:' + w.value + ';border:2px solid ' + (active ? 'var(--accent-color)' : 'transparent') + ';cursor:pointer;position:relative;display:flex;align-items:flex-end;justify-content:center;padding-bottom:3px;box-shadow:0 2px 6px rgba(0,0,0,0.1);">'
                    + '<span style="font-size:9px;color:rgba(0,0,0,0.65);background:rgba(255,255,255,0.6);padding:1px 5px;border-radius:5px;">' + w.name + '</span>'
                    + '</div>';
            }).join('');
            el.querySelectorAll('.or-w').forEach(wEl => {
                wEl.onclick = async () => {
                    data.wallpaper = wEl.dataset.id;
                    await persist();
                    renderWallpapers();
                    refreshRoom();
                    if (typeof playSound === 'function') playSound('favorite');
                };
            });
        }

        refreshRoom();
        renderFurniture();
        renderWallpapers();

        const close = () => modal.remove();
        modal.querySelector('#or-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        // 日志
        modal.querySelector('#or-log-btn').onclick = () => {
            if (data.log.length === 0) {
                if (typeof showNotification === 'function') showNotification('他还没动过什么', 'info', 1800);
                return;
            }
            let html = '';
            data.log.forEach(item => {
                const t = new Date(item.ts);
                const label = (t.getMonth() + 1) + '/' + t.getDate() + ' ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
                html += '<div style="padding:10px 12px;background:var(--primary-bg);border-radius:10px;margin-bottom:6px;font-size:12.5px;color:var(--text-primary);"><div style="font-size:10px;color:var(--text-secondary);margin-bottom:3px;">' + label + '</div>' + item.text + '</div>';
            });
            const oldLog = document.getElementById('or-log-modal');
            if (oldLog) oldLog.remove();
            const logModal = document.createElement('div');
            logModal.id = 'or-log-modal';
            logModal.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;';
            logModal.innerHTML = '<div style="background:var(--secondary-bg);border-radius:20px;padding:22px;width:90%;max-width:380px;max-height:80vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
                + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
                + '<span style="font-size:15px;font-weight:700;color:var(--text-primary);"><i class="fas fa-clock-rotate-left" style="color:var(--accent-color);margin-right:6px;"></i>他最近动过什么</span>'
                + '<button id="or-log-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
                + '</div>'
                + html + '</div>';
            document.body.appendChild(logModal);
            logModal.querySelector('#or-log-close').onclick = () => logModal.remove();
            logModal.addEventListener('click', (e) => { if (e.target === logModal) logModal.remove(); });
        };
    };

    // ========== 挂顶栏按钮（自动） ==========
    function bindTopBtn() {
        const bar = document.querySelector('.header-actions');
        if (!bar) { setTimeout(bindTopBtn, 800); return; }
        if (document.getElementById('our-room-top-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'our-room-top-btn';
        btn.className = 'action-btn';
        btn.title = '共同的房间';
        btn.innerHTML = '<i class="fas fa-home"></i>';
        btn.onclick = function () { window.openOurRoomPanel(); };
        bar.appendChild(btn);
    }

    // ========== 初始化 ==========
    async function init() {
        await load();
        bindTopBtn();
        setTimeout(bindTopBtn, 2000);
        // 每 30 分钟检查一次他动不动
        setInterval(partnerTouch, 30 * 60 * 1000);
        setTimeout(partnerTouch, 2 * 60 * 1000);
    }

    window.initOurRoom = init;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1500); });
    } else {
        setTimeout(init, 1500);
    }

    console.log('[our-room] 共同的房间已加载 ✓');
})();