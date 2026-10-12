/* ============================================================
 * dual-todo.js - 双人备忘录
 * 你和对方都能写的待办清单，勾掉会留记录
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'dualTodo_v1';

    // 他自己会"加"的条目池
    const HIS_TODOS = [
        '记得吃药',
        '多喝水',
        '别熬夜了',
        '明天降温，加件衣服',
        '按时吃饭',
        '出门带伞',
        '记得充电',
        '开会前准备一下',
        '买点水果放冰箱',
        '把洗的衣服晾了',
        '给家里打个电话',
        '早点休息'
    ];

    // 数据
    let data = {
        items: [],        // { id, text, owner: 'me'|'him', done: bool, createdAt, doneAt }
        doneLog: [],      // 勾掉的记录
        lastAddTs: 0
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

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function fmtTime(ts) {
        const d = new Date(ts);
        const now = new Date();
        const diff = Math.floor((now.setHours(0,0,0,0) - new Date(new Date(ts).setHours(0,0,0,0))) / 86400000);
        if (diff === 0) return '今天';
        if (diff === 1) return '昨天';
        if (diff < 7) return diff + ' 天前';
        return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    // 对方随机加一条
    function hisAddIfNeeded() {
        // 每 4 小时最多加一条
        const now = Date.now();
        if (now - data.lastAddTs < 4 * 3600000) return;
        if (Math.random() > 0.35) return;
        const text = HIS_TODOS[Math.floor(Math.random() * HIS_TODOS.length)];
        // 避免重复
        if (data.items.some(function (i) { return i.text === text && !i.done; })) return;
        data.items.push({
            id: 'him_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            text: text,
            owner: 'him',
            done: false,
            createdAt: now
        });
        data.lastAddTs = now;
        persist();
        if (typeof showNotification === 'function') {
            const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
            showNotification(pName + ' 记了一条备忘：' + text, 'info', 2500);
        }
    }

    // ========== 打开面板 ==========
    window.openDualTodoPanel = async function () {
        await load();

        const old = document.getElementById('dual-todo-panel');
        if (old) old.remove();

        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const mName = (typeof settings !== 'undefined' && settings.myName) ? settings.myName : '我';

        function renderList() {
            const active = data.items.filter(function (i) { return !i.done; })
                .sort(function (a, b) { return b.createdAt - a.createdAt; });
            const done = data.items.filter(function (i) { return i.done; })
                .sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); })
                .slice(0, 8);

            let html = '';

            if (active.length === 0) {
                html += '<div style="text-align:center;padding:24px 0;color:var(--text-secondary);font-size:12px;opacity:0.7;">还没有未完成的备忘<br><span style="font-size:10px;opacity:0.7;">在下方输入框里加一条吧</span></div>';
            } else {
                html += active.map(function (item) {
                    const isMe = item.owner === 'me';
                    return '<div class="dt-item" data-id="' + item.id + '" style="display:flex;align-items:center;gap:10px;padding:11px 12px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:12px;margin-bottom:6px;cursor:pointer;transition:all 0.2s;">'
                        + '<div class="dt-check" style="width:20px;height:20px;border-radius:50%;border:1.8px solid var(--border-color);flex-shrink:0;display:flex;align-items:center;justify-content:center;"></div>'
                        + '<div style="flex:1;min-width:0;">'
                        +   '<div style="font-size:13px;color:var(--text-primary);line-height:1.4;word-break:break-word;">' + esc(item.text) + '</div>'
                        +   '<div style="font-size:10px;color:var(--text-secondary);margin-top:3px;">' + (isMe ? mName : pName) + ' · ' + fmtTime(item.createdAt) + '</div>'
                        + '</div>'
                        + '</div>';
                }).join('');
            }

            if (done.length > 0) {
                html += '<div style="font-size:11px;color:var(--text-secondary);margin:14px 0 6px;letter-spacing:1px;font-weight:700;opacity:0.7;">✓ 一起完成的（' + data.items.filter(function(i){return i.done;}).length + '）</div>';
                html += done.map(function (item) {
                    const isMe = item.owner === 'me';
                    return '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(var(--accent-color-rgb),0.04);border-radius:10px;margin-bottom:5px;opacity:0.7;">'
                        + '<div style="width:16px;height:16px;border-radius:50%;background:rgba(var(--accent-color-rgb),0.3);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;">✓</div>'
                        + '<div style="flex:1;min-width:0;">'
                        +   '<div style="font-size:12.5px;color:var(--text-secondary);text-decoration:line-through;">' + esc(item.text) + '</div>'
                        +   '<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;opacity:0.7;">' + (isMe ? mName : pName) + ' · ' + fmtTime(item.doneAt || item.createdAt) + '</div>'
                        + '</div>'
                        + '</div>';
                }).join('');
            }

            return html;
        }

        const modal = document.createElement('div');
        modal.id = 'dual-todo-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:dtFadeIn 0.25s ease;';

        modal.innerHTML =
            '<style>@keyframes dtFadeIn{from{opacity:0}to{opacity:1}}@keyframes dtPop{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}</style>'
            + '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px 20px 18px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.35);animation:dtPop 0.35s cubic-bezier(0.34,1.56,0.64,1);">'

            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<div style="width:34px;height:34px;border-radius:10px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;font-size:16px;">📝</div>'
            +       '<span style="font-size:15px;font-weight:700;color:var(--text-primary);">双人备忘录</span>'
            +     '</div>'
            +     '<button id="dt-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:10px;text-align:center;opacity:0.75;">你们都能加、都能勾<br><span style="opacity:0.7;">勾掉后会留在下面"一起完成的"里</span></div>'

            +   '<div id="dt-list" style="flex:1;overflow-y:auto;padding-right:2px;"></div>'

            +   '<div style="display:flex;gap:8px;margin-top:12px;flex-shrink:0;">'
            +     '<input id="dt-input" type="text" placeholder="加一条备忘…" maxlength="40" style="flex:1;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);box-sizing:border-box;">'
            +     '<button id="dt-add" style="padding:11px 18px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);white-space:nowrap;"><i class="fas fa-plus"></i></button>'
            +   '</div>'

            +   '<button id="dt-close-btn" style="width:100%;margin-top:10px;padding:10px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:12.5px;cursor:pointer;font-family:var(--font-family);flex-shrink:0;">关闭</button>'
            + '</div>';

        document.body.appendChild(modal);

        const listEl = modal.querySelector('#dt-list');
        const inputEl = modal.querySelector('#dt-input');

        function refresh() {
            listEl.innerHTML = renderList();
            // 绑定勾选
            listEl.querySelectorAll('.dt-item').forEach(function (el) {
                el.onclick = async function () {
                    const id = el.dataset.id;
                    const item = data.items.find(function (x) { return x.id === id; });
                    if (!item) return;
                    item.done = true;
                    item.doneAt = Date.now();
                    await persist();
                    if (typeof playSound === 'function') playSound('favorite');
                    refresh();
                };
            });
        }

        refresh();

        const close = function () { modal.remove(); };
        modal.querySelector('#dt-close').onclick = close;
        modal.querySelector('#dt-close-btn').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

        async function doAdd() {
            const v = inputEl.value.trim();
            if (!v) return;
            data.items.push({
                id: 'me_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                text: v,
                owner: 'me',
                done: false,
                createdAt: Date.now()
            });
            await persist();
            inputEl.value = '';
            refresh();
        }
        modal.querySelector('#dt-add').onclick = doAdd;
        inputEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); doAdd(); }
        });
    };

    // ========== 入口 ==========
    function bindEntry() {
        const container = document.querySelector('#advanced-modal .settings-item-list');
        if (!container) { setTimeout(bindEntry, 500); return; }
        if (container.querySelector('#dual-todo-function')) return;

        const item = document.createElement('div');
        item.className = 'settings-item';
        item.id = 'dual-todo-function';
        item.style.position = 'relative';
        item.innerHTML = '<i class="fas fa-clipboard-check"></i><span>双人备忘录</span>';
        item.onclick = function () {
            const adv = document.getElementById('advanced-modal');
            if (adv && typeof hideModal === 'function') hideModal(adv);
            window.openDualTodoPanel();
        };
        container.appendChild(item);
    }

    async function init() {
        await load();
        bindEntry();
        setTimeout(bindEntry, 1500);
        // 对方偶尔加一条
        setInterval(function () { hisAddIfNeeded(); }, 30 * 60 * 1000);
        setTimeout(hisAddIfNeeded, 2 * 60 * 1000);
    }

    window.initDualTodo = init;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1500); });
    } else {
        setTimeout(init, 1500);
    }

    console.log('[dual-todo] 双人备忘录已加载 ✓');
})();