/* ============================================================
 * life-sync.js - 生活同步
 * 对方顶栏状态时不时变化，显示他此刻在干嘛
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'lifeSync_v1';

    // 状态池：emoji + 文案
    const POOL = [
        { emoji: '💭', text: '在想你' },
        { emoji: '☕', text: '在喝咖啡' },
        { emoji: '🍜', text: '在吃饭' },
        { emoji: '💻', text: '在写代码' },
        { emoji: '📖', text: '在看书' },
        { emoji: '🎬', text: '在看电影' },
        { emoji: '🚿', text: '刚洗完澡' },
        { emoji: '🛏️', text: '在床上躺着' },
        { emoji: '🚶', text: '在走路' },
        { emoji: '📷', text: '在翻相册' },
        { emoji: '🎵', text: '在听歌' },
        { emoji: '🌙', text: '在看月亮' },
        { emoji: '☁️', text: '在看云' },
        { emoji: '🍵', text: '在泡茶' },
        { emoji: '🐱', text: '在摸猫' },
        { emoji: '🥱', text: '有点困了' },
        { emoji: '🌧️', text: '在看雨' },
        { emoji: '✍️', text: '在写字' },
        { emoji: '🧹', text: '在收拾房间' },
        { emoji: '💤', text: '打了个哈欠' },
        { emoji: '🍎', text: '在吃水果' },
        { emoji: '🏃', text: '在跑步' },
        { emoji: '🧘', text: '在发呆' },
        { emoji: '👀', text: '在想一件事' },
        { emoji: '💌', text: '在写点什么' }
    ];

    // 状态变化时偶尔带一句"自言自语"
    const MURMURS = [
        '想你了',
        '有点无聊',
        '你在干嘛呢',
        '突然想跟你说句话',
        '刚刚想到你',
        '今天怎么样',
        '有点想你',
        '没事，就是看看你在不在'
    ];

    let data = {
        enabled: true,
        currentIndex: -1,
        lastChange: 0,
        nextChangeDelay: 0,       // 毫秒
        murmurChance: 0.25,       // 换状态时顺便说句话的概率
        minMin: 5,
        maxMin: 20
    };

    async function load() {
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') Object.assign(data, saved);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }

    function pickNextIndex() {
        if (POOL.length <= 1) return 0;
        let idx = data.currentIndex;
        for (let i = 0; i < 10; i++) {
            const n = Math.floor(Math.random() * POOL.length);
            if (n !== data.currentIndex) return n;
            idx = n;
        }
        return idx;
    }

    // ========== 应用状态到顶栏 ==========
    function applyToHeader(item) {
        if (!item) return;
        const el = document.getElementById('partner-status');
        if (!el) return;
        const span = el.querySelector('span');
        if (span) span.textContent = item.emoji + ' ' + item.text;
    }

    // ========== 切换 ==========
    async function rotate() {
        if (!data.enabled) {
            scheduleNext();
            return;
        }

        data.currentIndex = pickNextIndex();
        data.lastChange = Date.now();
        const item = POOL[data.currentIndex];
        applyToHeader(item);
        await save();

        // 偶尔"自言自语"一句
        if (Math.random() < data.murmurChance) {
            setTimeout(function () {
                try {
                    const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
                    const line = MURMURS[Math.floor(Math.random() * MURMURS.length)];
                    if (typeof addMessage === 'function') {
                        addMessage({
                            id: Date.now() + Math.floor(Math.random() * 1000),
                            sender: pn,
                            text: line,
                            timestamp: new Date(),
                            status: 'received',
                            type: 'normal'
                        });
                    }
                    if (typeof playSound === 'function') playSound('message');
                    if (typeof window._sendPartnerNotification === 'function') {
                        window._sendPartnerNotification(pn, line);
                    }
                } catch (e) {}
            }, 1500 + Math.random() * 3000);
        }

        scheduleNext();
    }

    function scheduleNext() {
        if (window._lifeSyncTimer) clearTimeout(window._lifeSyncTimer);
        if (!data.enabled) return;
        const minMs = data.minMin * 60 * 1000;
        const maxMs = data.maxMin * 60 * 1000;
        const delay = minMs + Math.random() * (maxMs - minMs);
        data.nextChangeDelay = delay;
        window._lifeSyncTimer = setTimeout(rotate, delay);
    }

    // ========== 面板 ==========
    window.openLifeSyncPanel = function () {
        const old = document.getElementById('life-sync-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'life-sync-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:400px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-sync-alt" style="color:var(--accent-color);margin-right:8px;"></i>生活同步</span>'
            +     '<button id="ls-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.7;">顶栏上他的状态会时不时变化，显示他此刻在做什么。偶尔他会主动冒一句。</div>'

            +   '<div id="ls-toggle" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:12px;cursor:pointer;">'
            +     '<div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-sync-alt" style="color:var(--accent-color);font-size:15px;"></i></div>'
            +     '<div style="flex:1;">'
            +       '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">开启生活同步</div>'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="ls-toggle-status">' + (data.enabled ? '已开启' : '已关闭') + '</div>'
            +     '</div>'
            +     '<div id="ls-toggle-pill" style="width:44px;height:24px;border-radius:24px;background:' + (data.enabled ? 'var(--accent-color)' : 'var(--border-color)') + ';position:relative;transition:background 0.2s;flex-shrink:0;">'
            +       '<div id="ls-toggle-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;' + (data.enabled ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +     '</div>'
            +   '</div>'

            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">⏱ 状态切换间隔（分钟）</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);width:44px;">最短</span>'
            +       '<input type="range" id="ls-min" min="1" max="120" value="' + data.minMin + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="ls-min-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + data.minMin + '分钟</span>'
            +     '</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);width:44px;">最长</span>'
            +       '<input type="range" id="ls-max" min="1" max="240" value="' + data.maxMin + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="ls-max-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + data.maxMin + '分钟</span>'
            +     '</div>'
            +   '</div>'

            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:16px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">💬 换状态时"自言自语"的概率</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<input type="range" id="ls-murmur" min="0" max="100" value="' + Math.round(data.murmurChance * 100) + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="ls-murmur-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:48px;text-align:right;">' + Math.round(data.murmurChance * 100) + '%</span>'
            +     '</div>'
            +   '</div>'

            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="ls-test" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">🧪 立即切换</button>'
            +     '<button id="ls-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#ls-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        // 开关
        modal.querySelector('#ls-toggle').onclick = () => {
            data.enabled = !data.enabled;
            const pill = modal.querySelector('#ls-toggle-pill');
            const knob = modal.querySelector('#ls-toggle-knob');
            const status = modal.querySelector('#ls-toggle-status');
            pill.style.background = data.enabled ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = data.enabled ? '3px' : 'auto';
            knob.style.left = data.enabled ? 'auto' : '3px';
            status.textContent = data.enabled ? '已开启' : '已关闭';
        };

        // 滑块
        const minSl = modal.querySelector('#ls-min');
        const maxSl = modal.querySelector('#ls-max');
        const minVal = modal.querySelector('#ls-min-val');
        const maxVal = modal.querySelector('#ls-max-val');
        const murSl = modal.querySelector('#ls-murmur');
        const murVal = modal.querySelector('#ls-murmur-val');

        minSl.oninput = () => {
            minVal.textContent = minSl.value + '分钟';
            if (parseInt(minSl.value, 10) > parseInt(maxSl.value, 10)) {
                maxSl.value = minSl.value;
                maxVal.textContent = minSl.value + '分钟';
            }
        };
        maxSl.oninput = () => {
            maxVal.textContent = maxSl.value + '分钟';
            if (parseInt(maxSl.value, 10) < parseInt(minSl.value, 10)) {
                minSl.value = maxSl.value;
                minVal.textContent = maxSl.value + '分钟';
            }
        };
        murSl.oninput = () => {
            murVal.textContent = murSl.value + '%';
        };

        // 立即切换
        modal.querySelector('#ls-test').onclick = () => {
            rotate();
            if (typeof showNotification === 'function') showNotification('✓ 已切换状态', 'success', 1200);
        };

        // 保存
        modal.querySelector('#ls-save').onclick = async () => {
            data.minMin = parseInt(minSl.value, 10);
            data.maxMin = parseInt(maxSl.value, 10);
            data.murmurChance = parseInt(murSl.value, 10) / 100;
            await save();
            close();
            if (data.enabled) {
                scheduleNext();
            } else {
                if (window._lifeSyncTimer) clearTimeout(window._lifeSyncTimer);
            }
            if (typeof showNotification === 'function') showNotification('✓ 已保存', 'success', 1500);
        };
    };

    // ========== 初始化 ==========
    window.initLifeSync = function () {
        load().then(function () {
            // 恢复到上次状态
            if (data.currentIndex >= 0 && data.currentIndex < POOL.length) {
                applyToHeader(POOL[data.currentIndex]);
            } else {
                data.currentIndex = pickNextIndex();
                applyToHeader(POOL[data.currentIndex]);
                save();
            }
            // 定下一个切换
            scheduleNext();
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initLifeSync, 2000); });
    } else {
        setTimeout(window.initLifeSync, 2000);
    }

    console.log('[life-sync] 生活同步已加载 ✓');
})();