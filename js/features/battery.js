/* ============================================================
 * battery.js - 他的电量
 * 顶栏显示电池图标 + 电量，会慢慢掉，也会充电
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'partnerBattery_v1';

    // 默认设置
    let data = {
        level: 78,                 // 当前电量 0~100
        isCharging: false,         // 是否在充电
        isOffline: false,          // 是否离线（0% 时）
        lastTickTime: Date.now(),  // 上次结算时间
        lastWarnTime: 0,           // 上次"快没电"提醒时间
        offlineStartTime: 0        // 离线开始时间
    };

    let _loaded = false;
    let _tickTimer = null;
    let _saveTimer = null;

    // ========== 读写 ==========
    async function load() {
        if (_loaded) return;
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') Object.assign(data, saved);
        } catch (e) {}
        _loaded = true;
        // 补算离线时间
        tryRepowerIfNeeded();
    }
    async function save() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }
    function saveSoon() {
        if (_saveTimer) return;
        _saveTimer = setTimeout(function () {
            _saveTimer = null;
            save();
        }, 2000);
    }

    // ========== 电量图标 ==========
    function getBatteryIcon(level, isCharging) {
        if (isCharging) return '🔌';
        if (level <= 0) return '🪫';
        if (level <= 20) return '🪫';
        if (level <= 50) return '🔋';
        return '🔋';
    }

    function renderBattery() {
        const el = document.getElementById('partner-battery');
        if (!el) return;

        if (data.isOffline) {
            el.textContent = '📴 离线';
            el.style.color = '#999';
            el.title = '他暂时离线了';
            return;
        }

        const icon = getBatteryIcon(data.level, data.isCharging);
        el.textContent = icon + ' ' + Math.round(data.level) + '%';

        // 颜色
        if (data.level <= 20) el.style.color = '#ff5050';
        else if (data.level <= 50) el.style.color = '#e6a23c';
        else el.style.color = '';

        el.title = data.isCharging
            ? '他正在充电（' + Math.round(data.level) + '%）'
            : '他的手机电量：' + Math.round(data.level) + '%';
    }

    // ========== 掉落 ==========
    function tick() {
        const now = Date.now();
        const elapsed = now - data.lastTickTime;

        // 每 15 分钟掉 1% ；充电时涨得快一点
        const MIN_MS = 15 * 60 * 1000;

        if (data.isOffline) {
            data.lastTickTime = now;
            tryRepowerIfNeeded();
            renderBattery();
            saveSoon();
            return;
        }

        if (data.isCharging) {
            // 充电：每 5 分钟涨 1%
            const gainMs = 5 * 60 * 1000;
            const gain = Math.floor(elapsed / gainMs);
            if (gain > 0) {
                data.level = Math.min(100, data.level + gain);
                data.lastTickTime = now;
                if (data.level >= 100) {
                    data.isCharging = false;
                    data.level = 100;
                }
                renderBattery();
                saveSoon();
            }
            return;
        }

        // 正常掉电
        const steps = Math.floor(elapsed / MIN_MS);
        if (steps > 0) {
            // 每步掉 1~2%
            let totalDrop = 0;
            for (let i = 0; i < steps; i++) {
                totalDrop += 1 + Math.floor(Math.random() * 2);
            }
            data.level = Math.max(0, data.level - totalDrop);
            data.lastTickTime = now;

            // 20% 以下警告一次
            if (data.level <= 20 && data.level > 0) {
                const sinceWarn = now - data.lastWarnTime;
                if (sinceWarn > 60 * 60 * 1000) {
                    data.lastWarnTime = now;
                    sendLowBatteryLine();
                }
            }

            // 0% → 离线
            if (data.level <= 0) {
                data.level = 0;
                goOffline();
            }

            renderBattery();
            saveSoon();
        }
    }

    // ========== 快没电了，他说一句 ==========
    function sendLowBatteryLine() {
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const lines = [
            '我手机快没电了…',
            '电量不多了，先跟你说一声。',
            '马上要关机了，等下再回你。',
            '手机剩一点点电，我先省着用。',
            '快没电啦，别怪我哦。'
        ];
        const text = lines[Math.floor(Math.random() * lines.length)];

        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: pn,
                text: text,
                timestamp: new Date(),
                status: 'received',
                type: 'normal'
            });
        }
        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(pn, text);
        }
    }

    // ========== 离线 ==========
    function goOffline() {
        if (data.isOffline) return;
        data.isOffline = true;
        data.offlineStartTime = Date.now();
        data.isCharging = false;

        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                text: pn + ' 手机没电，暂时离线了',
                timestamp: new Date(),
                type: 'system'
            });
        }
        if (typeof showNotification === 'function') {
            showNotification('📴 ' + pn + ' 手机关机了', 'info', 3000);
        }

        // 状态改成离线
        try {
            const statusEl = document.getElementById('partner-status');
            if (statusEl) {
                const span = statusEl.querySelector('span');
                if (span) span.textContent = '离线';
            }
        } catch (e) {}

        renderBattery();
        saveSoon();
    }

    // ========== 充电回来 ==========
    function tryRepowerIfNeeded() {
        if (!data.isOffline) return;
        const since = Date.now() - data.offlineStartTime;
        // 20~60 分钟回来
        const waitMs = (20 + Math.random() * 40) * 60 * 1000;
        if (since >= waitMs) {
            data.isOffline = false;
            data.isCharging = false;
            data.level = 60 + Math.floor(Math.random() * 25);  // 充到 60~85
            data.lastTickTime = Date.now();

            const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
            if (typeof addMessage === 'function') {
                addMessage({
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    sender: pn,
                    text: '充上电了，我回来了。',
                    timestamp: new Date(),
                    status: 'received',
                    type: 'normal'
                });
            }
            if (typeof playSound === 'function') playSound('message');

            // 状态改回在线
            try {
                const statusEl = document.getElementById('partner-status');
                if (statusEl) {
                    const span = statusEl.querySelector('span');
                    if (span) span.textContent = '在线';
                }
            } catch (e) {}

            renderBattery();
            saveSoon();
        }
    }

    // ========== 顶栏挂图标 ==========
    function ensureBatteryEl() {
        if (document.getElementById('partner-battery')) return;

        // 放在"时差"标签下面
        const tz = document.getElementById('his-time-display');
        if (!tz || !tz.parentNode) {
            setTimeout(ensureBatteryEl, 800);
            return;
        }

        const div = document.createElement('div');
        div.id = 'partner-battery';
        div.title = '他的手机电量';
        div.style.cssText = 'cursor:pointer;display:flex;align-items:center;justify-content:center;margin-top:2px;user-select:none;font-size:10.5px;font-weight:500;letter-spacing:0.3px;color:var(--text-secondary);';
        div.textContent = '🔋 --%';
        div.addEventListener('click', function (e) {
            e.stopPropagation();
            openBatteryPanel();
        });

        tz.parentNode.insertBefore(div, tz.nextSibling);
    }

    // ========== 设置面板 ==========
    function openBatteryPanel() {
        const old = document.getElementById('battery-panel');
        if (old) old.remove();

        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        const modal = document.createElement('div');
        modal.id = 'battery-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-battery-half" style="color:var(--accent-color);margin-right:8px;"></i>他的电量</span>'
            +     '<button id="bt-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="background:linear-gradient(135deg,rgba(var(--accent-color-rgb),0.12),rgba(var(--accent-color-rgb),0.03));border-radius:16px;padding:20px;margin-bottom:16px;text-align:center;border:1px solid rgba(var(--accent-color-rgb),0.2);">'
            +     '<div style="font-size:48px;line-height:1;margin-bottom:8px;">' + getBatteryIcon(data.level, data.isCharging) + '</div>'
            +     '<div style="font-size:36px;font-weight:900;color:var(--accent-color);font-family:Georgia,serif;line-height:1;">' + Math.round(data.level) + '<span style="font-size:16px;">%</span></div>'
            +     '<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">'
            +       (data.isOffline ? '📴 暂时离线' : (data.isCharging ? '⚡ 正在充电' : '正常使用中'))
            +     '</div>'
            +   '</div>'

            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">🎚 手动调整电量</div>'
            +     '<input type="range" id="bt-slider" min="0" max="100" value="' + Math.round(data.level) + '" style="width:100%;accent-color:var(--accent-color);">'
            +     '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary);margin-top:6px;">'
            +       '<span>0%</span><span id="bt-slider-val" style="color:var(--accent-color);font-weight:700;">' + Math.round(data.level) + '%</span><span>100%</span>'
            +     '</div>'
            +   '</div>'

            +   '<div style="display:flex;gap:10px;margin-bottom:12px;">'
            +     '<button id="bt-charge" style="flex:1;padding:11px;border:1.5px solid var(--accent-color);border-radius:12px;background:none;color:var(--accent-color);font-size:13px;cursor:pointer;font-family:var(--font-family);">'
            +       '<i class="fas fa-bolt"></i> 模拟充电'
            +     '</button>'
            +     '<button id="bt-drain" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">'
            +       '<i class="fas fa-battery-quarter"></i> 立即掉到 15%'
            +     '</button>'
            +   '</div>'

            +   '<div style="font-size:11px;color:var(--text-secondary);line-height:1.7;margin-bottom:16px;opacity:0.75;padding:0 4px;">'
            +     '· 电量每 15 分钟掉 1~2%<br>'
            +     '· 20% 以下会提醒你一次<br>'
            +     '· 0% 时' + pn + '会暂时离线，过一会充上电再回来'
            +   '</div>'

            +   '<button id="bt-save" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">好的</button>'
            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#bt-close').onclick = close;
        modal.querySelector('#bt-save').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        const slider = modal.querySelector('#bt-slider');
        const sliderVal = modal.querySelector('#bt-slider-val');
        slider.oninput = function () {
            sliderVal.textContent = slider.value + '%';
        };
        slider.onchange = function () {
            data.level = parseInt(slider.value, 10);
            data.isOffline = false;
            data.isCharging = false;
            if (data.level > 0) data.lastTickTime = Date.now();
            save();
            renderBattery();
            if (typeof showNotification === 'function') showNotification('✓ 电量已改为 ' + data.level + '%', 'success', 1500);
        };

        modal.querySelector('#bt-charge').onclick = function () {
            data.isCharging = true;
            data.isOffline = false;
            data.lastTickTime = Date.now();
            save();
            renderBattery();
            close();
            if (typeof showNotification === 'function') showNotification('⚡ ' + pn + ' 正在充电', 'success', 2000);
        };

        modal.querySelector('#bt-drain').onclick = function () {
            data.level = 15;
            data.isCharging = false;
            data.isOffline = false;
            data.lastTickTime = Date.now();
            save();
            renderBattery();
            close();
            if (typeof showNotification === 'function') showNotification('电量已掉到 15%', 'info', 2000);
        };
    }
    window.openBatteryPanel = openBatteryPanel;

    // ========== 启动 ==========
    window.initBattery = function () {
        load().then(function () {
            ensureBatteryEl();
            renderBattery();
            // 每 1 分钟检查一次
            if (_tickTimer) clearInterval(_tickTimer);
            _tickTimer = setInterval(function () {
                tick();
                tryRepowerIfNeeded();
            }, 60 * 1000);
            // 立即跑一次
            setTimeout(tick, 3000);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initBattery, 1500); });
    } else {
        setTimeout(window.initBattery, 1500);
    }

    console.log('[battery] 他的电量已加载 ✓');
})();