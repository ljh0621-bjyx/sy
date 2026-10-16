/* ============================================================
 * timezone.js - 时差
 * 顶栏显示对方所在时区的当前时间
 * ============================================================ */
(function () {
    'use strict';

    const DEFAULT_OFFSET = -3;   // 默认他比你晚 3 小时
    const MIN_OFFSET = -12;
    const MAX_OFFSET = 14;

    function getKey() {
        return (typeof getStorageKey === 'function')
            ? getStorageKey('hisTimezoneOffset')
            : 'hisTimezoneOffset';
    }

    function getOffset() {
        const raw = localStorage.getItem(getKey());
        if (raw === null) {
            try {
                if (typeof settings !== 'undefined' &&
                    typeof settings.hisTimezoneOffset === 'number') {
                    return settings.hisTimezoneOffset;
                }
            } catch (e) {}
            return DEFAULT_OFFSET;
        }
        const v = parseFloat(raw);
        return isNaN(v) ? DEFAULT_OFFSET : Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, v));
    }

    function setOffset(v) {
        const n = Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, v));
        try { localStorage.setItem(getKey(), String(n)); } catch (e) {}
        try {
            if (typeof settings !== 'undefined') settings.hisTimezoneOffset = n;
            if (typeof throttledSaveData === 'function') throttledSaveData();
        } catch (e) {}
        renderHisTime();
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function getPeriodIcon(hour) {
        if (hour >= 5 && hour < 9)  return '🌅';
        if (hour >= 9 && hour < 18) return '☀️';
        if (hour >= 18 && hour < 22) return '🌇';
        return '🌙';
    }

    function renderHisTime() {
        const el = document.getElementById('his-time-display');
        if (!el) return;
        const diff = getOffset();
        const now = new Date();
        const hisTime = new Date(now.getTime() + diff * 3600000);
        const hh = pad(hisTime.getHours());
        const mm = pad(hisTime.getMinutes());
        const icon = getPeriodIcon(hisTime.getHours());

        el.textContent = icon + ' ' + hh + ':' + mm;
        el.title = '他那里现在 ' + hh + ':' + mm +
            '（比你这' + (diff >= 0 ? '早' : '晚') + ' ' + Math.abs(diff) + ' 小时）';
    }

    let _timer = null;
    function startTimer() {
        if (_timer) return;
        renderHisTime();
        _timer = setInterval(renderHisTime, 1000);
    }

    // ========== 设置面板 ==========
    window.openTimezoneSettings = function () {
        const old = document.getElementById('timezone-settings-panel');
        if (old) old.remove();

        let cur = getOffset();
        let direction = cur >= 0 ? 'early' : 'late';
        let amount = Math.abs(cur);

        const modal = document.createElement('div');
        modal.id = 'timezone-settings-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML = `
            <div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                    <span style="font-size:16px;font-weight:700;color:var(--text-primary);">
                        <i class="fas fa-clock" style="color:var(--accent-color);margin-right:8px;"></i>时差设置
                    </span>
                    <button id="tz-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">
                    设置对方所在时区与你的时差，顶栏会实时显示他的时间。
                </div>

                <div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:16px;margin-bottom:16px;">
                    <div style="display:flex;gap:6px;margin-bottom:14px;">
                        <button id="tz-early" style="flex:1;padding:10px;border:1.5px solid var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);font-weight:600;">他比我早</button>
                        <button id="tz-late" style="flex:1;padding:10px;border:1.5px solid var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);font-weight:600;">他比我晚</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <input id="tz-slider" type="range" min="0" max="14" step="0.5" style="flex:1;accent-color:var(--accent-color);">
                        <span id="tz-slider-val" style="font-size:16px;font-weight:800;color:var(--accent-color);width:52px;text-align:right;"></span>
                    </div>
                    <div style="font-size:11px;color:var(--text-secondary);margin-top:10px;text-align:center;opacity:0.7;">
                        <span id="tz-preview"></span>
                    </div>
                </div>

                <div style="display:flex;gap:10px;">
                    <button id="tz-cancel" style="flex:1;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>
                    <button id="tz-save" style="flex:2;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>
                </div>
            </div>`;

        document.body.appendChild(modal);

        const $ = (s) => modal.querySelector(s);

        function updateUI() {
            const sign = direction === 'early' ? 1 : -1;
            const value = sign * amount;

            $('#tz-early').style.background = direction === 'early' ? 'var(--accent-color)' : 'none';
            $('#tz-early').style.color = direction === 'early' ? '#fff' : 'var(--text-secondary)';
            $('#tz-early').style.borderColor = direction === 'early' ? 'var(--accent-color)' : 'var(--border-color)';

            $('#tz-late').style.background = direction === 'late' ? 'var(--accent-color)' : 'none';
            $('#tz-late').style.color = direction === 'late' ? '#fff' : 'var(--text-secondary)';
            $('#tz-late').style.borderColor = direction === 'late' ? 'var(--accent-color)' : 'var(--border-color)';

            $('#tz-slider').value = amount;
            $('#tz-slider-val').textContent = amount + 'h';

            const now = new Date();
            const hisTime = new Date(now.getTime() + value * 3600000);
            const hh = pad(hisTime.getHours());
            const mm = pad(hisTime.getMinutes());
            const icon = getPeriodIcon(hisTime.getHours());
            $('#tz-preview').textContent = icon + ' 他那里 ' + hh + ':' + mm;
        }

        $('#tz-early').onclick = () => { direction = 'early'; updateUI(); };
        $('#tz-late').onclick  = () => { direction = 'late'; updateUI(); };
        $('#tz-slider').oninput = (e) => { amount = parseFloat(e.target.value); updateUI(); };

        const close = () => modal.remove();
        $('#tz-close').onclick = close;
        $('#tz-cancel').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        $('#tz-save').onclick = () => {
            const sign = direction === 'early' ? 1 : -1;
            setOffset(sign * amount);
            close();
            if (typeof showNotification === 'function') showNotification('✓ 时差已保存', 'success');
        };

        updateUI();
    };

    // ========== 点顶栏小标签打开设置 ==========
    function bindEntry() {
        const el = document.getElementById('his-time-display');
        if (!el || el._tzBound) return;
        el._tzBound = true;
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            window.openTimezoneSettings();
        });
    }

    // ========== 初始化 ==========
    window.initTimezone = function () {
        try {
            if (typeof settings !== 'undefined' &&
                typeof settings.hisTimezoneOffset === 'number' &&
                localStorage.getItem(getKey()) === null) {
                localStorage.setItem(getKey(), String(settings.hisTimezoneOffset));
            }
        } catch (e) {}

        startTimer();
        bindEntry();
        setTimeout(bindEntry, 1500);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initTimezone, 1200); });
    } else {
        setTimeout(window.initTimezone, 1200);
    }

    console.log('[timezone] 时差已加载 ✓');
})();