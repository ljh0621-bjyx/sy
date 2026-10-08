/**
 * envelope-settings.js
 * 信封来信时间设置（独立文件，不污染主模块）
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'envelopeTimeSettings_v1';
    var DEFAULTS = { firstMin: 4, firstMax: 12, intervalMin: 20, intervalMax: 40 };

    // 全局设置对象（一开始就有默认值）
    window.ENV_SETTINGS = Object.assign({}, DEFAULTS);

    // 安全读取函数（envelope.js 调用）
    window.getEnvSetting = function (key, fallback) {
        var v = window.ENV_SETTINGS && window.ENV_SETTINGS[key];
        return (typeof v === 'number' && v > 0) ? v : fallback;
    };

    // 异步加载已保存的设置
    if (window.localforage) {
        localforage.getItem(STORAGE_KEY).then(function (saved) {
            if (saved && typeof saved === 'object') {
                Object.assign(window.ENV_SETTINGS, saved);
            }
        }).catch(function () {});
    }

    function saveSettings() {
        if (!window.localforage) return;
        localforage.setItem(STORAGE_KEY, window.ENV_SETTINGS).catch(function () {});
    }

    // 打开设置面板
    window.openEnvTimeSettings = function () {
        var old = document.getElementById('env-time-settings-panel');
        if (old) old.remove();

        var s = window.ENV_SETTINGS;
        var panel = document.createElement('div');
        panel.id = 'env-time-settings-panel';
        panel.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        panel.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px;padding:22px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">'
            + '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-clock" style="color:var(--accent-color);margin-right:8px;"></i>来信时间设置</span>'
            + '<button id="env-ts-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">首次来信延迟（小时）</div>'
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">'
            + '<input id="env-ts-fmin" type="number" min="1" max="72" value="' + s.firstMin + '" style="flex:1;padding:9px;border:1px solid var(--border-color);border-radius:10px;background:var(--primary-bg);color:var(--text-primary);font-size:14px;text-align:center;outline:none;font-family:var(--font-family);box-sizing:border-box;">'
            + '<span style="font-size:13px;color:var(--text-secondary);">~</span>'
            + '<input id="env-ts-fmax" type="number" min="1" max="72" value="' + s.firstMax + '" style="flex:1;padding:9px;border:1px solid var(--border-color);border-radius:10px;background:var(--primary-bg);color:var(--text-primary);font-size:14px;text-align:center;outline:none;font-family:var(--font-family);box-sizing:border-box;">'
            + '</div>'
            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">后续来信间隔（小时）</div>'
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">'
            + '<input id="env-ts-imin" type="number" min="1" max="240" value="' + s.intervalMin + '" style="flex:1;padding:9px;border:1px solid var(--border-color);border-radius:10px;background:var(--primary-bg);color:var(--text-primary);font-size:14px;text-align:center;outline:none;font-family:var(--font-family);box-sizing:border-box;">'
            + '<span style="font-size:13px;color:var(--text-secondary);">~</span>'
            + '<input id="env-ts-imax" type="number" min="1" max="240" value="' + s.intervalMax + '" style="flex:1;padding:9px;border:1px solid var(--border-color);border-radius:10px;background:var(--primary-bg);color:var(--text-primary);font-size:14px;text-align:center;outline:none;font-family:var(--font-family);box-sizing:border-box;">'
            + '</div>'
            + '<div style="font-size:11px;color:var(--text-secondary);line-height:1.6;margin-bottom:16px;padding:10px 12px;background:rgba(var(--accent-color-rgb),0.06);border-radius:10px;">'
            + '💡 首次来信：打开网站后第一次收信延迟<br>'
            + '💡 后续来信：之后每封信之间的间隔<br>'
            + '💡 数值越小，他写信越频繁'
            + '</div>'
            + '<div style="display:flex;gap:10px;">'
            + '<button id="env-ts-reset" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">恢复默认</button>'
            + '<button id="env-ts-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">保存</button>'
            + '</div></div>';

        document.body.appendChild(panel);

        document.getElementById('env-ts-close').onclick = function () { panel.remove(); };
        panel.addEventListener('click', function (e) { if (e.target === panel) panel.remove(); });

        document.getElementById('env-ts-reset').onclick = function () {
            document.getElementById('env-ts-fmin').value = DEFAULTS.firstMin;
            document.getElementById('env-ts-fmax').value = DEFAULTS.firstMax;
            document.getElementById('env-ts-imin').value = DEFAULTS.intervalMin;
            document.getElementById('env-ts-imax').value = DEFAULTS.intervalMax;
        };

        document.getElementById('env-ts-save').onclick = function () {
            var fm = parseInt(document.getElementById('env-ts-fmin').value, 10);
            var fM = parseInt(document.getElementById('env-ts-fmax').value, 10);
            var im = parseInt(document.getElementById('env-ts-imin').value, 10);
            var iM = parseInt(document.getElementById('env-ts-imax').value, 10);
            if (!fm || !fM || !im || !iM || fm < 1 || fM < fm || im < 1 || iM < im) {
                if (typeof showNotification === 'function') showNotification('请填写有效数值（最小 ≤ 最大）', 'warning');
                return;
            }
            window.ENV_SETTINGS.firstMin = fm;
            window.ENV_SETTINGS.firstMax = fM;
            window.ENV_SETTINGS.intervalMin = im;
            window.ENV_SETTINGS.intervalMax = iM;
            saveSettings();
            panel.remove();
            if (typeof showNotification === 'function') showNotification('✓ 来信时间已保存', 'success');
        };
    };

    // 注入齿轮按钮到信封 tab 栏
    function injectBtn() {
        var tabBar = document.querySelector('.env-tab-bar');
        if (!tabBar) return false;
        if (document.getElementById('env-settings-btn')) return true;

        var btn = document.createElement('button');
        btn.id = 'env-settings-btn';
        btn.type = 'button';
        btn.title = '来信时间设置';
        btn.innerHTML = '<i class="fas fa-cog" style="font-size:13px;"></i>';
        btn.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text-secondary);padding:0 10px;flex-shrink:0;font-size:13px;';
        btn.onclick = function (e) {
            e.stopPropagation();
            window.openEnvTimeSettings();
        };
        tabBar.appendChild(btn);
        return true;
    }

    // 首次加载时尝试注入
    setTimeout(injectBtn, 1200);

    // 监听信封弹窗打开（点击"信封投递"入口时，延迟注入按钮）
    document.addEventListener('click', function (e) {
        if (e.target.closest('#envelope-function')) {
            setTimeout(injectBtn, 150);
            setTimeout(injectBtn, 500);
            setTimeout(injectBtn, 1000);
        }
    });

})();
