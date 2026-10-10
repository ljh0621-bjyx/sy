/* ============================================================
 * quick-phrases.js - 快捷短语
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'quickPhrases_v1';
    const DEFAULT_PHRASES = ['早安', '晚安', '我到家了', '吃了吗？', '想你了', '在忙吗？'];

    let phrases = DEFAULT_PHRASES.slice();

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (Array.isArray(saved) && saved.length > 0) phrases = saved;
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, phrases); } catch (e) {}
    }

    window.sendQuickPhrase = function (text) {
        const input = document.getElementById('message-input');
        if (!input) return;
        input.value = text;
        if (typeof sendMessage === 'function') {
            sendMessage();
        } else if (typeof window.sendMessage === 'function') {
            window.sendMessage();
        }
    };

    window.openQuickPhrases = function () {
        const old = document.getElementById('quick-phrases-popover');
        if (old) { old.remove(); return; }

        const popover = document.createElement('div');
        popover.id = 'quick-phrases-popover';
        popover.style.cssText = 'position:fixed;z-index:99998;background:var(--secondary-bg);border:1px solid var(--border-color);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.15);padding:12px;min-width:200px;max-width:280px;';

        const btn = document.getElementById('quick-phrases-btn');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            popover.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
            popover.style.left = Math.max(10, Math.min(rect.left, window.innerWidth - 290)) + 'px';
        } else {
            popover.style.bottom = '80px';
            popover.style.left = '20px';
        }

        const listHTML = phrases.length === 0
            ? '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-secondary);opacity:0.7;">还没有快捷短语</div>'
            : phrases.map((p, i) => `
                <div data-qp-idx="${i}" style="padding:10px 12px;border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-bolt" style="color:var(--accent-color);font-size:11px;flex-shrink:0;"></i>
                    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.replace(/</g,'&lt;')}</span>
                </div>
            `).join('');

        popover.innerHTML = listHTML
            + '<div style="border-top:1px solid var(--border-color);margin-top:8px;padding-top:8px;display:flex;gap:6px;">'
            +   '<button id="qp-manage" style="flex:1;padding:8px;border:1px solid var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-cog"></i> 管理</button>'
            +   '<button id="qp-close" style="flex:1;padding:8px;border:1px solid var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);">关闭</button>'
            + '</div>';

        document.body.appendChild(popover);

        popover.querySelectorAll('[data-qp-idx]').forEach(el => {
            el.onclick = () => {
                const idx = parseInt(el.dataset.qpIdx, 10);
                popover.remove();
                window.sendQuickPhrase(phrases[idx]);
            };
        });
        popover.querySelector('#qp-manage').onclick = () => {
            popover.remove();
            window.openQuickPhrasesManager();
        };
        popover.querySelector('#qp-close').onclick = () => popover.remove();

        setTimeout(() => {
            const outsideHandler = (e) => {
                if (!popover.contains(e.target) && e.target.id !== 'quick-phrases-btn') {
                    popover.remove();
                    document.removeEventListener('click', outsideHandler);
                }
            };
            document.addEventListener('click', outsideHandler);
        }, 100);
    };

    window.openQuickPhrasesManager = function () {
        const old = document.getElementById('quick-phrases-manager');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'quick-phrases-manager';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML = `
            <div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-shrink:0;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-bolt" style="color:var(--accent-color);font-size:15px;"></i>
                        </div>
                        <span style="font-size:16px;font-weight:700;color:var(--text-primary);">快捷短语管理</span>
                    </div>
                    <button id="qpm-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>
                </div>

                <div id="qpm-list" style="flex:1;overflow-y:auto;margin-bottom:14px;display:flex;flex-direction:column;gap:8px;"></div>

                <div style="display:flex;gap:8px;flex-shrink:0;">
                    <input id="qpm-input" type="text" placeholder="输入新的短语…" maxlength="50" style="flex:1;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);box-sizing:border-box;">
                    <button id="qpm-add" style="padding:11px 18px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);white-space:nowrap;"><i class="fas fa-plus"></i> 添加</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        const render = () => {
            const list = modal.querySelector('#qpm-list');
            if (phrases.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-secondary);font-size:12px;opacity:0.7;">还没有快捷短语<br>在下方输入框里添加吧</div>';
                return;
            }
            list.innerHTML = phrases.map((p, i) => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:12px;">
                    <i class="fas fa-bolt" style="color:var(--accent-color);font-size:12px;flex-shrink:0;"></i>
                    <span style="flex:1;font-size:13px;color:var(--text-primary);word-break:break-word;">${p.replace(/</g,'&lt;')}</span>
                    <button data-edit="${i}" style="background:none;border:none;color:var(--accent-color);cursor:pointer;font-size:13px;padding:4px 6px;opacity:0.7;"><i class="fas fa-pen"></i></button>
                    <button data-del="${i}" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px;padding:4px 6px;opacity:0.7;"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');
            list.querySelectorAll('[data-del]').forEach(btn => {
                btn.onclick = async () => {
                    const idx = parseInt(btn.dataset.del, 10);
                    if (!confirm('删除这条快捷短语？')) return;
                    phrases.splice(idx, 1);
                    await save();
                    render();
                };
            });
            list.querySelectorAll('[data-edit]').forEach(btn => {
                btn.onclick = async () => {
                    const idx = parseInt(btn.dataset.edit, 10);
                    const nv = prompt('修改短语：', phrases[idx]);
                    if (nv === null) return;
                    const t = nv.trim();
                    if (!t) return;
                    phrases[idx] = t;
                    await save();
                    render();
                };
            });
        };
        render();

        const close = () => modal.remove();
        modal.querySelector('#qpm-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        const addBtn = modal.querySelector('#qpm-add');
        const inputEl = modal.querySelector('#qpm-input');
        const doAdd = async () => {
            const t = inputEl.value.trim();
            if (!t) return;
            if (phrases.indexOf(t) !== -1) {
                if (typeof showNotification === 'function') showNotification('这条短语已存在', 'info', 1500);
                return;
            }
            phrases.push(t);
            await save();
            inputEl.value = '';
            render();
            if (typeof showNotification === 'function') showNotification('✓ 已添加', 'success', 1500);
        };
        addBtn.onclick = doAdd;
        inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    };

    window.initQuickPhrases = function () {
        const btn = document.getElementById('quick-phrases-function');
        if (btn && !btn.dataset.initialized) {
            btn.dataset.initialized = 'true';
            btn.addEventListener('click', () => {
                const adv = document.getElementById('advanced-modal');
                if (adv && typeof hideModal === 'function') hideModal(adv);
                window.openQuickPhrasesManager();
            });
        }
        const quickBtn = document.getElementById('quick-phrases-btn');
        if (quickBtn && !quickBtn.dataset.initialized) {
            quickBtn.dataset.initialized = 'true';
            quickBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.openQuickPhrases();
            });
        }
    };

    load();
})();