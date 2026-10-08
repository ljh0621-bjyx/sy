/**
 * word-card-compose.js
 * 拼字卡：只设置句数，他会自己发
 */
(function () {
    'use strict';

    var KEY = 'wordCardComposeCount';

    // 供外部调用：抽 N 句拼成一段
    window.composeWordCard = function (count) {
        var n = count || parseInt(localStorage.getItem(KEY) || '3', 10);
        var pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(function (t) { return t && String(t).trim(); })
            : [];
        if (pool.length === 0) return null;
        var picked = [];
        for (var i = 0; i < n; i++) {
            picked.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        return picked.join('　');
    };

    window.openWordCardComposePanel = function () {
        var old = document.getElementById('word-card-compose-panel');
        if (old) old.remove();

        var curCount = parseInt(localStorage.getItem(KEY) || '3', 10);

        var modal = document.createElement('div');
        modal.id = 'word-card-compose-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:90%;max-width:380px;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">'
            +   '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">'
            +     '<i class="fas fa-layer-group" style="color:var(--accent-color);margin-right:8px;"></i>拼字卡'
            +   '</span>'
            +   '<button id="wcc-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'

            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:20px;line-height:1.7;">'
            +   '设置他拼字卡时的句数。平时他回复你时，会随机以拼字卡的方式回你。'
            + '</div>'

            + '<div style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">'
            +   '<span style="font-size:13px;color:var(--text-secondary);white-space:nowrap;">句数</span>'
            +   '<input type="range" id="wcc-count" min="1" max="10" value="' + curCount + '" style="flex:1;accent-color:var(--accent-color);">'
            +   '<span id="wcc-count-val" style="font-size:18px;font-weight:700;color:var(--accent-color);width:34px;text-align:right;font-family:Georgia,serif;">' + curCount + '</span>'
            + '</div>'
            + '<div style="font-size:11px;color:var(--text-secondary);opacity:0.6;text-align:center;">松手自动保存</div>'
            + '</div>';

        document.body.appendChild(modal);

        var countInput = document.getElementById('wcc-count');
        var countVal = document.getElementById('wcc-count-val');

        countInput.addEventListener('input', function () {
            countVal.textContent = countInput.value;
        });

        countInput.addEventListener('change', function () {
            var n = parseInt(countInput.value, 10);
            try { localStorage.setItem(KEY, String(n)); } catch (e) {}
            if (typeof showNotification === 'function') {
                showNotification('✓ 已设为 ' + n + ' 句', 'success', 1500);
            }
            modal.remove();
        });

        document.getElementById('wcc-close').onclick = function () { modal.remove(); };
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    };
})();
