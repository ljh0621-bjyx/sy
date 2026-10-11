/* ============================================================
 * daily-question.js - 每日一问
 * ============================================================ */
(function () {
    'use strict';

    const DEFAULT_QUESTIONS = [
        '如果只能记住我的一件事，你会记住什么？',
        '今天有没有哪一刻想到我？',
        '如果可以一起去一个地方，最想去哪里？',
        '你觉得我们最像的地方是什么？',
        '最近有没有什么想做但一直没做的事？',
        '你最喜欢我说话时的什么语气？',
        '如果我是个动物，你觉得我是什么？',
        '难过的时候，最希望别人怎么对你？',
        '睡前脑子里想得最多的会是什么？',
        '你觉得十年后的我们会怎样？',
        '今天遇到了什么开心的小事？',
        '你有没有想对我说但一直没说的话？',
        '如果给今天打个分数，你会打几分？',
        '你最喜欢我们一起做的哪件事？',
        '在你眼里，我是个什么样的人？',
        '如果我突然出现在你面前，你会做什么？',
        '最近有没有什么想尝试的新事物？',
        '你有过"就是这个人了"的瞬间吗？',
        '哪一句话你听我说过之后一直记得？',
        '你希望我们以后住在什么样的地方？'
    ];

    const KEY = 'dailyQuestion_v1';
    let data = {
        custom: [],
        history: {}
    };

    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    async function load() {
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') Object.assign(data, saved);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }

    function getAllQuestions() {
        return DEFAULT_QUESTIONS.concat(data.custom || []);
    }

    function pickTodayQuestion() {
        const today = todayStr();
        if (data.history[today] && data.history[today].q) return data.history[today].q;

        const pool = getAllQuestions();
        let seed = 0;
        for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i) * (i + 1);
        const idx = seed % pool.length;
        return pool[idx];
    }

    function generatePartnerAnswer() {
        const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(function (t) { return t && String(t).trim(); })
            : [];
        if (pool.length === 0) return '（对方沉默了一会…）';
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ========== 主面板 ==========
    window.openDailyQuestionPanel = function () {
        const old = document.getElementById('daily-question-panel');
        if (old) old.remove();

        const today = todayStr();
        const q = pickTodayQuestion();
        const entry = data.history[today];
        const answered = !!(entry && entry.myAnswer);

        const modal = document.createElement('div');
        modal.id = 'daily-question-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        let bodyHTML = '';
        if (!answered) {
            bodyHTML =
                '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;text-align:center;">答完后可以看到对方的回答</div>'
                + '<textarea id="dq-answer" placeholder="写下你的回答…" rows="4" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-family:var(--font-family);outline:none;line-height:1.6;resize:vertical;margin-bottom:12px;"></textarea>'
                + '<button id="dq-submit" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font-family);">提交回答</button>'
                + '<button id="dq-manage" style="width:100%;margin-top:10px;padding:10px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">管理题库</button>';
        } else {
            const pn = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
            bodyHTML =
                '<div style="background:rgba(var(--accent-color-rgb),0.06);border-radius:12px;padding:14px 16px;margin-bottom:12px;border-left:3px solid var(--accent-color);">'
                +   '<div style="font-size:11px;color:var(--accent-color);font-weight:600;letter-spacing:1px;margin-bottom:6px;">我的回答</div>'
                +   '<div style="font-size:13px;color:var(--text-primary);line-height:1.7;white-space:pre-wrap;">' + String(entry.myAnswer).replace(/</g, '&lt;') + '</div>'
                + '</div>'
                + (entry.partnerAnswer
                    ? '<div style="background:var(--primary-bg);border-radius:12px;padding:14px 16px;border-left:3px solid #F4A6B3;">'
                        + '<div style="font-size:11px;color:#F4A6B3;font-weight:600;letter-spacing:1px;margin-bottom:6px;">' + pn + ' 的回答</div>'
                        + '<div style="font-size:13px;color:var(--text-primary);line-height:1.7;white-space:pre-wrap;">' + String(entry.partnerAnswer).replace(/</g, '&lt;') + '</div>'
                      + '</div>'
                    : '<div style="background:var(--primary-bg);border-radius:12px;padding:14px 16px;border-left:3px solid var(--border-color);text-align:center;">'
                        + '<div style="font-size:12px;color:var(--text-secondary);">等待对方回答…</div>'
                      + '</div>')
                + '<div style="display:flex;gap:8px;margin-top:14px;">'
                +   '<button id="dq-history" style="flex:1;padding:10px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">查看往期</button>'
                +   '<button id="dq-manage" style="flex:1;padding:10px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">管理题库</button>'
                + '</div>';
        }

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:400px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-shrink:0;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-question-circle" style="color:var(--accent-color);margin-right:8px;"></i>每日一问</span>'
            +     '<button id="dq-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="background:linear-gradient(135deg, rgba(var(--accent-color-rgb),0.12), rgba(var(--accent-color-rgb),0.03));border-radius:14px;padding:18px 16px;margin-bottom:16px;border:1px solid rgba(var(--accent-color-rgb),0.2);flex-shrink:0;">'
            +     '<div style="font-size:11px;color:var(--accent-color);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">QUESTION</div>'
            +     '<div style="font-size:15px;font-weight:700;color:var(--text-primary);line-height:1.6;">' + String(q).replace(/</g, '&lt;') + '</div>'
            +   '</div>'
            +   '<div style="flex:1;overflow-y:auto;">' + bodyHTML + '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#dq-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        const submitBtn = modal.querySelector('#dq-submit');
        if (submitBtn) {
            submitBtn.onclick = function () {
                const ta = modal.querySelector('#dq-answer');
                const v = ta.value.trim();
                if (!v) {
                    if (typeof showNotification === 'function') showNotification('请先写下你的回答', 'warning', 1500);
                    return;
                }

                if (!data.history[today]) data.history[today] = { q: q };
                data.history[today].myAnswer = v;
                data.history[today].ts = Date.now();
                data.history[today].partnerAnswer = '';
                save();

                close();
                if (typeof showNotification === 'function') showNotification('✓ 已提交，等待对方回答…', 'success', 1500);
                if (typeof window._intimacyAddPoints === 'function') window._intimacyAddPoints(1);

                setTimeout(function () {
                    if (!data.history[today]) return;
                    data.history[today].partnerAnswer = generatePartnerAnswer();
                    save();

                    const pn = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
                    if (typeof addMessage === 'function') {
                        try {
                            addMessage({
                                id: Date.now() + Math.floor(Math.random() * 1000),
                                sender: null,
                                text: pn + ' 回答了今日一问 📝',
                                timestamp: new Date(),
                                type: 'system'
                            });
                        } catch (e) {}
                    }
                    if (typeof playSound === 'function') playSound('message');
                    if (typeof showNotification === 'function') showNotification('对方回答了！点开看看', 'info', 2500);
                }, 5000);
            };
        }

        const historyBtn = modal.querySelector('#dq-history');
        if (historyBtn) {
            historyBtn.onclick = function () {
                close();
                window.openDailyQuestionHistory();
            };
        }

        const manageBtn = modal.querySelector('#dq-manage');
        if (manageBtn) {
            manageBtn.onclick = function () {
                close();
                window.openDailyQuestionManager();
            };
        }
    };

    // ========== 历史记录 ==========
    window.openDailyQuestionHistory = function () {
        const old = document.getElementById('dq-history-panel');
        if (old) old.remove();

        const dates = Object.keys(data.history).sort().reverse();
        const pn = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
        const listHTML = dates.length === 0
            ? '<div style="text-align:center;padding:30px;color:var(--text-secondary);font-size:13px;">还没有记录</div>'
            : dates.map(function (d) {
                const e = data.history[d];
                if (!e || !e.myAnswer) return '';
                return '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:12px;padding:12px 14px;margin-bottom:10px;">'
                    +   '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;letter-spacing:1px;">' + d + '</div>'
                    +   '<div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:8px;line-height:1.5;">' + String(e.q).replace(/</g, '&lt;') + '</div>'
                    +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;"><b style="color:var(--accent-color);">我：</b>' + String(e.myAnswer).replace(/</g, '&lt;') + '</div>'
                    +   (e.partnerAnswer ? '<div style="font-size:12px;color:var(--text-secondary);"><b style="color:#F4A6B3;">' + pn + '：</b>' + String(e.partnerAnswer).replace(/</g, '&lt;') + '</div>' : '')
                    + '</div>';
            }).join('');

        const modal = document.createElement('div');
        modal.id = 'dq-history-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-book" style="color:var(--accent-color);margin-right:8px;"></i>往期回答</span>'
            +     '<button id="dqh-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="flex:1;overflow-y:auto;">' + listHTML + '</div>'
            + '</div>';

        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelector('#dqh-close').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    };

    // ========== 题库管理 ==========
    window.openDailyQuestionManager = function () {
        const old = document.getElementById('dq-manager-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'dq-manager-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-list" style="color:var(--accent-color);margin-right:8px;"></i>题库管理</span>'
            +     '<button id="dqm-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div id="dq-manager-body" style="flex:1;overflow-y:auto;"></div>'
            + '</div>';

        document.body.appendChild(modal);

        const inner = modal.querySelector('#dq-manager-body');

        function render() {
            const customList = (data.custom || []).map(function (q, i) {
                return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:10px;margin-bottom:6px;">'
                    +   '<span style="flex:1;font-size:12.5px;color:var(--text-primary);line-height:1.5;word-break:break-word;">' + String(q).replace(/</g, '&lt;') + '</span>'
                    +   '<button data-del="' + i + '" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:13px;padding:2px 6px;opacity:0.6;"><i class="fas fa-times"></i></button>'
                    + '</div>';
            }).join('');

            const defaultList = DEFAULT_QUESTIONS.map(function (q) {
                return '<div style="padding:10px 12px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:10px;margin-bottom:6px;font-size:12.5px;color:var(--text-secondary);line-height:1.5;opacity:0.75;">' + String(q).replace(/</g, '&lt;') + '</div>';
            }).join('');

            inner.innerHTML =
                '<div style="font-size:12px;font-weight:700;color:var(--accent-color);margin-bottom:8px;letter-spacing:1px;">✏️ 我的题库 (' + (data.custom || []).length + ')</div>'
                + ((data.custom || []).length === 0
                    ? '<div style="text-align:center;padding:16px;color:var(--text-secondary);font-size:12px;opacity:0.6;">还没有自定义题目</div>'
                    : customList)
                + '<div style="display:flex;gap:8px;margin:12px 0 20px;">'
                +   '<input id="dq-new-q" type="text" placeholder="输入新题目…" maxlength="60" style="flex:1;padding:10px 12px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-family:var(--font-family);outline:none;box-sizing:border-box;">'
                +   '<button id="dq-add-q" style="padding:10px 16px;border:none;border-radius:10px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);white-space:nowrap;">添加</button>'
                + '</div>'
                + '<div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:8px;letter-spacing:1px;">📚 默认题库 (' + DEFAULT_QUESTIONS.length + ')</div>'
                + defaultList;

            inner.querySelectorAll('[data-del]').forEach(function (btn) {
                btn.onclick = function () {
                    const i = parseInt(btn.dataset.del, 10);
                    data.custom.splice(i, 1);
                    save();
                    render();
                };
            });

            const addBtn = inner.querySelector('#dq-add-q');
            const input = inner.querySelector('#dq-new-q');
            addBtn.onclick = function () {
                const v = input.value.trim();
                if (!v) return;
                data.custom.push(v);
                save();
                input.value = '';
                render();
                if (typeof showNotification === 'function') showNotification('✓ 已添加', 'success', 1200);
            };
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') addBtn.click();
            });
        }

        render();

        const close = () => modal.remove();
        modal.querySelector('#dqm-close').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    };

    // ========== 初始化 ==========
    window.initDailyQuestion = function () {
        load();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initDailyQuestion, 1200); });
    } else {
        setTimeout(window.initDailyQuestion, 1200);
    }

    console.log('[daily-question] 每日一问已加载 ✓');
})();