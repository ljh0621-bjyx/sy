/* ============================================================
 * survey-bank.js - 问卷题库
 * 顶栏点一下 → 从题库随机抽一道题发给对方
 * ============================================================ */
(function () {
    'use strict';

    const KEY = getStorageKey('surveyBank_v1');
    // 题库数据
    let bank = [
        // 默认几道题，你可以删了重建
        { q: '今天想我了吗？', opts: ['想了', '没想', '一直在想'], multi: false },
        { q: '你更喜欢我什么？', opts: ['性格', '长相', '全部'], multi: false },
        { q: '今晚想做什么？', opts: ['看电影', '聊聊天', '抱抱'], multi: false }
    ];

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (Array.isArray(saved) && saved.length > 0) bank = saved;
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, bank); } catch (e) {}
    }
    load();

    // ========== 随机抽一题 ==========
    function pickRandom() {
        if (!bank || bank.length === 0) return null;
        return bank[Math.floor(Math.random() * bank.length)];
    }

    // ========== 发一道题给"对方" ==========
    window.sendRandomSurvey = async function () {
        await load();
        const item = pickRandom();
        if (!item) {
            if (typeof showNotification === 'function') {
                showNotification('问卷题库是空的，先去"管理题库"添加', 'warning', 3000);
            }
            return;
        }

        const q = item.q;
        const opts = item.opts && item.opts.length ? item.opts.slice() : [];
        const multi = !!item.multi;

        // 作为你发的问卷，进聊天
        addMessage({
            id: Date.now(),
            sender: 'user',
            text: q,
            timestamp: new Date(),
            status: 'sent',
            type: 'survey',
            survey: {
                question: q,
                options: opts,
                multi: multi,
                answered: false,
                answer: []
            }
        });
        if (typeof playSound === 'function') playSound('send');

        // 读取聊天设置里的"问卷回复速度"
        const _spMin = Math.max(500, (typeof settings !== 'undefined' && settings.surveyReplyDelayMin) || 30000);
        const _spMax = Math.max(_spMin + 500, (typeof settings !== 'undefined' && settings.surveyReplyDelayMax) || 60000);
        const _spDelay1 = _spMin + Math.random() * (_spMax - _spMin);
        const _spDelay2 = Math.max(400, _spMin * 0.4 + Math.random() * (_spMax - _spMin) * 0.4);

        const myMsgId = messages[messages.length - 1].id;

        // 对方选一个选项
        setTimeout(() => {
            const idx = messages.findIndex(m => String(m.id) === String(myMsgId));
            if (idx === -1) return;
            const msg = messages[idx];
            if (!msg || msg.type !== 'survey' || msg.survey.answered) return;

            if (opts.length === 0) {
                // 没有选项 → 对方自由回答一句字卡
                msg.survey.answered = true;
                msg.survey.answer = ['（自由回答）'];
                throttledSaveData();
                renderMessages(true);
                setTimeout(() => {
                    const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
                        ? customReplies.filter(t => t && String(t).trim())
                        : [];
                    if (pool.length > 0) {
                        const reply = pool[Math.floor(Math.random() * pool.length)];
                        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
                        addMessage({
                            id: Date.now() + Math.random(),
                            sender: partnerName,
                            text: reply,
                            timestamp: new Date(),
                            status: 'received',
                            type: 'normal'
                        });
                        if (typeof playSound === 'function') playSound('message');
                    }
                }, _spDelay2);
                return;
            }

            if (multi) {
                const count = Math.random() < 0.5 ? 1 : 2;
                const shuffled = opts.slice().sort(() => Math.random() - 0.5);
                msg.survey.answer = shuffled.slice(0, Math.min(count, shuffled.length));
            } else {
                msg.survey.answer = [opts[Math.floor(Math.random() * opts.length)]];
            }
            msg.survey.answered = true;
            msg.survey.answeredBy = 'partner';
            throttledSaveData();
            renderMessages(true);
            if (typeof playSound === 'function') playSound('favorite');

            // 对方再回一句字卡
            setTimeout(() => {
                const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
                    ? customReplies.filter(t => t && String(t).trim())
                    : [];
                if (pool.length > 0) {
                    const reply = pool[Math.floor(Math.random() * pool.length)];
                    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
                    addMessage({
                        id: Date.now() + Math.random(),
                        sender: partnerName,
                        text: reply,
                        timestamp: new Date(),
                        status: 'received',
                        type: 'normal'
                    });
                    if (typeof playSound === 'function') playSound('message');
                }
            }, _spDelay2);
        }, _spDelay1);
    };

    // ========== 题库管理面板 ==========
    window.openSurveyBankPanel = function () {
        const old = document.getElementById('survey-bank-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'survey-bank-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:440px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-clipboard-list" style="color:var(--accent-color);margin-right:8px;"></i>问卷题库</span>'
            +     '<button id="sb-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;line-height:1.6;">这里是你维护的问题库。顶栏点 📋 时，会从这随机抽一道发给对方。</div>'
            +   '<div id="sb-list" style="flex:1;overflow-y:auto;margin-bottom:12px;"></div>'
            +   '<button id="sb-add" style="padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-plus"></i> 添加新问题</button>'
            + '</div>';

        document.body.appendChild(modal);

        const render = () => {
            const listEl = modal.querySelector('#sb-list');
            if (bank.length === 0) {
                listEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-secondary);font-size:13px;">题库为空，点下面添加</div>';
                return;
            }
            listEl.innerHTML = bank.map((item, i) => `
                <div style="display:flex;align-items:flex-start;gap:10px;padding:11px 12px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:12px;margin-bottom:8px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:600;color:var(--text-primary);word-break:break-word;">${(item.q || '').replace(/</g,'&lt;')}</div>
                        ${(item.opts && item.opts.length) ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">选项：${item.opts.map(o => o.replace(/</g,'&lt;')).join(' / ')}</div>` : ''}
                    </div>
                    <button data-del="${i}" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;opacity:0.6;padding:2px 4px;flex-shrink:0;"><i class="fas fa-times"></i></button>
                </div>
            `).join('');
            listEl.querySelectorAll('[data-del]').forEach(btn => {
                btn.onclick = async () => {
                    const idx = parseInt(btn.dataset.del);
                    if (!confirm('删除这个问题？')) return;
                    bank.splice(idx, 1);
                    await save();
                    render();
                };
            });
        };

        const close = () => modal.remove();
        modal.querySelector('#sb-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelector('#sb-add').onclick = async () => {
            const q = prompt('问题内容：');
            if (!q || !q.trim()) return;
            const optsStr = prompt('选项（用 / 分隔，留空则对方自由回答）：');
            let opts = [];
            if (optsStr && optsStr.trim()) {
                opts = optsStr.split('/').map(s => s.trim()).filter(Boolean);
            }
            bank.push({ q: q.trim(), opts: opts, multi: false });
            await save();
            render();
            if (typeof showNotification === 'function') showNotification('✓ 已添加', 'success');
        };

        render();
    };
})();