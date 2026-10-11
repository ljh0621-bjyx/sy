/**
 * decision-helper.js
 * 对方帮我做选择
 */

(function () {
    'use strict';

    const KEY = getStorageKey('decisionHelperData_v1');

    let panelEl = null;

    // 预设场景
    const PRESETS = {
        '午饭吃什么': ['吃面', '吃饭', '吃汉堡', '吃饺子', '随便吃点'],
        '晚饭吃什么': ['火锅', '烧烤', '炒菜', '外卖', '自己做'],
        '去哪里玩': ['看电影', '逛街', '公园', '咖啡店', '在家躺平'],
        '看什么电影': ['爱情片', '喜剧片', '悬疑片', '动画片', '恐怖片'],
        '喝什么奶茶': ['奶茶', '果茶', '咖啡', '白开水', '柠檬水'],
        '穿什么衣服': ['裙子', '牛仔裤', '运动服', '衬衫', '居家服']
    };

    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ---------- 让对方选择并回复 ----------
    async function partnerChoose(question, options) {
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        if (!options || options.length === 0) {
            if (typeof showNotification === 'function') showNotification('至少要有一个选项', 'warning');
            return;
        }

        // 随机选一个
        const picked = options[Math.floor(Math.random() * options.length)];

        // 挑一句"选择的理由"（从字卡库）
        let reason = '';
        const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(t => t && String(t).trim())
            : [];
        if (pool.length > 0 && Math.random() < 0.7) {
            reason = pool[Math.floor(Math.random() * pool.length)];
        }

        // 拼回复文本
        let replyText = '我选「' + picked + '」';
        if (question) replyText = '关于「' + question + '」，' + replyText;
        if (reason) replyText += ' —— ' + reason;

        // 先让对方打字
        if (typeof window.simulatePartnerTypingProcess === 'function') {
            try { await window.simulatePartnerTypingProcess(replyText); } catch (e) {}
        }

        // 再发消息
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: pn,
                text: replyText,
                timestamp: new Date(),
                status: 'received',
                type: 'normal'
            });
        }
        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(pn, replyText);
        }

        return picked;
    }

    // ---------- 打开面板 ----------
    window.openDecisionHelperPanel = function () {
        if (panelEl) { panelEl.remove(); panelEl = null; }

        panelEl = document.createElement('div');
        panelEl.id = 'decision-helper-panel';
        panelEl.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        panelEl.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.45);">'

            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-shrink:0;">'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<div style="width:36px;height:36px;border-radius:12px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">'
            +         '<i class="fas fa-balance-scale" style="color:var(--accent-color);font-size:15px;"></i>'
            +       '</div>'
            +       '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">帮我做选择</span>'
            +     '</div>'
            +     '<button id="dh-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="flex:1;overflow-y:auto;">'

            // 预设场景
            +     '<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px;">快捷场景</div>'
            +     '<div id="dh-presets" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">'
            +       Object.keys(PRESETS).map(k =>
                        '<button data-preset="' + k + '" style="padding:6px 12px;border:1.5px solid var(--border-color);border-radius:20px;background:var(--primary-bg);color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);transition:all 0.15s;">' + k + '</button>'
                    ).join('')
            +     '</div>'

            // 问题标题
            +     '<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px;">问题（可选）</div>'
            +     '<input id="dh-question" type="text" placeholder="例如：今天午饭吃什么" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-family:var(--font-family);outline:none;margin-bottom:16px;">'

            // 选项列表
            +     '<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">'
            +       '<span>选项（每行一个）</span>'
            +       '<span id="dh-count" style="font-size:11px;color:var(--accent-color);font-weight:600;">0 个</span>'
            +     '</div>'
            +     '<textarea id="dh-options" placeholder="吃面&#10;吃饭&#10;吃汉堡" style="width:100%;box-sizing:border-box;min-height:130px;padding:12px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-family:var(--font-family);resize:vertical;outline:none;line-height:1.7;"></textarea>'

            +   '</div>'

            +   '<div style="display:flex;gap:10px;margin-top:16px;flex-shrink:0;">'
            +     '<button id="dh-clear" style="flex:1;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">清空</button>'
            +     '<button id="dh-go" style="flex:2;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-hand-sparkles"></i> 让他帮我选</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(panelEl);

        const questionInput = panelEl.querySelector('#dh-question');
        const optionsInput = panelEl.querySelector('#dh-options');
        const countEl = panelEl.querySelector('#dh-count');

        // 更新选项计数
        function updateCount() {
            const lines = optionsInput.value.split('\n').map(s => s.trim()).filter(Boolean);
            countEl.textContent = lines.length + ' 个';
        }
        optionsInput.addEventListener('input', updateCount);

        // 预设按钮
        panelEl.querySelectorAll('[data-preset]').forEach(btn => {
            btn.onclick = () => {
                const k = btn.dataset.preset;
                questionInput.value = k;
                optionsInput.value = PRESETS[k].join('\n');
                updateCount();
                // 高亮选中的按钮
                panelEl.querySelectorAll('[data-preset]').forEach(b => {
                    const active = b.dataset.preset === k;
                    b.style.borderColor = active ? 'var(--accent-color)' : 'var(--border-color)';
                    b.style.color = active ? 'var(--accent-color)' : 'var(--text-secondary)';
                    b.style.background = active ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--primary-bg)';
                });
            };
        });

        // 清空
        panelEl.querySelector('#dh-clear').onclick = () => {
            questionInput.value = '';
            optionsInput.value = '';
            updateCount();
            panelEl.querySelectorAll('[data-preset]').forEach(b => {
                b.style.borderColor = 'var(--border-color)';
                b.style.color = 'var(--text-secondary)';
                b.style.background = 'var(--primary-bg)';
            });
        };

        // 关闭
        const close = () => { panelEl.remove(); panelEl = null; };
        panelEl.querySelector('#dh-close').onclick = close;
        panelEl.addEventListener('click', (e) => { if (e.target === panelEl) close(); });

        // 让他帮我选
        panelEl.querySelector('#dh-go').onclick = async () => {
            const q = questionInput.value.trim();
            const opts = optionsInput.value.split('\n').map(s => s.trim()).filter(Boolean);
            if (opts.length === 0) {
                if (typeof showNotification === 'function') showNotification('请至少输入一个选项', 'warning');
                return;
            }
            close();
            await partnerChoose(q, opts);
        };

        // 自动聚焦
        setTimeout(() => optionsInput.focus(), 150);
    };

    // ---------- 手动测试用 ----------
    window._testDecisionHelper = function (q, opts) {
        partnerChoose(q || '测试问题', opts || ['选项A', '选项B', '选项C']);
    };

})();

window.initDecisionHelper = function () {
    const btn = document.getElementById('decision-helper-function');
    if (btn && !btn.dataset.initialized) {
        btn.dataset.initialized = 'true';
        btn.addEventListener('click', function () {
            const advancedModal = document.getElementById('advanced-modal');
            if (advancedModal && typeof hideModal === 'function') hideModal(advancedModal);
            if (typeof window.openDecisionHelperPanel === 'function') window.openDecisionHelperPanel();
        });
    }
};