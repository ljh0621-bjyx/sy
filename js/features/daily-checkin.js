/* ============================================================
 * daily-checkin.js - 每日打卡
 * ============================================================ */
(function () {
    'use strict';

    const KEY = getStorageKey('dailyCheckin_v1');
    let data = { dates: [], streak: 0, total: 0, lastDate: null };

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved && typeof saved === 'object') data = Object.assign(data, saved);
        } catch (e) { console.warn('[checkin] load fail', e); }
    }
    async function save() {
        try { await localforage.setItem(KEY, data); } catch (e) {}
    }

    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function dateOffset(n) {
        const d = new Date();
        d.setDate(d.getDate() + n);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function hasCheckedToday() {
        return data.dates.indexOf(todayStr()) !== -1;
    }

    // ========== 打卡 ==========
    window.doDailyCheckin = async function () {
        await load();
        const today = todayStr();

        if (hasCheckedToday()) {
            if (typeof showNotification === 'function') showNotification('今天已经打过卡啦～', 'info', 2000);
            return;
        }

        // 判断是否连续
        const yesterday = dateOffset(-1);
        if (data.lastDate === yesterday) {
            data.streak += 1;
        } else {
            data.streak = 1;
        }

        data.dates.push(today);
        if (data.dates.length > 365) data.dates = data.dates.slice(-365);
        data.total += 1;
        data.lastDate = today;

        await save();

        // 播放音效
        if (typeof playSound === 'function') playSound('favorite');

        // 显示庆祝
        showCheckinCelebration(data.streak);

        // 通知
        if (typeof showNotification === 'function') {
            showNotification('✓ 今日打卡成功！连续 ' + data.streak + ' 天', 'success', 2500);
        }

        // 让"对方"回应
        schedulePartnerResponse(data.streak);
    };

    // 打卡庆祝动画
    function showCheckinCelebration(streak) {
        const old = document.getElementById('checkin-celebration');
        if (old) old.remove();

        const el = document.createElement('div');
        el.id = 'checkin-celebration';
        el.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:checkinFadeIn 0.3s ease;';

        el.innerHTML =
            '<div style="background:linear-gradient(135deg, var(--accent-color), rgba(var(--accent-color-rgb),0.7));border-radius:24px;padding:36px 28px;text-align:center;color:#fff;box-shadow:0 24px 80px rgba(0,0,0,0.5);animation:checkinPop 0.5s cubic-bezier(0.34,1.56,0.64,1);max-width:300px;">'
            +   '<div style="font-size:64px;line-height:1;margin-bottom:16px;">🎉</div>'
            +   '<div style="font-size:18px;font-weight:700;margin-bottom:8px;letter-spacing:1px;">打卡成功</div>'
            +   '<div style="font-size:13px;opacity:0.9;margin-bottom:20px;">已连续打卡</div>'
            +   '<div style="font-size:48px;font-weight:900;line-height:1;margin-bottom:6px;text-shadow:0 2px 8px rgba(0,0,0,0.2);">' + streak + '</div>'
            +   '<div style="font-size:12px;opacity:0.85;margin-bottom:24px;letter-spacing:2px;">天</div>'
            +   '<button id="checkin-close-btn" style="padding:11px 32px;border:none;border-radius:14px;background:rgba(255,255,255,0.2);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);backdrop-filter:blur(8px);">好的</button>'
            + '</div>';

        document.body.appendChild(el);

        const close = () => el.remove();
        el.querySelector('#checkin-close-btn').onclick = close;
        el.addEventListener('click', (e) => { if (e.target === el) close(); });

        if (!document.getElementById('checkin-anim-style')) {
            const s = document.createElement('style');
            s.id = 'checkin-anim-style';
            s.textContent = '@keyframes checkinFadeIn{from{opacity:0}to{opacity:1}}@keyframes checkinPop{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}';
            document.head.appendChild(s);
        }
    }

    // 对方回应
    function schedulePartnerResponse(streak) {
        const delay = 3000 + Math.random() * 4000;
        setTimeout(() => {
            try {
                const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
                let text = '';
                if (streak >= 30) text = '连续 ' + streak + ' 天……真的好厉害，我一直在看你打卡哦 ✦';
                else if (streak >= 7) text = '一周了呢，继续陪你走下去。';
                else if (streak >= 3) text = '连续 ' + streak + ' 天了，真好～';
                else text = '看到你打卡了，今天也要开开心心的 ✦';

                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now() + Math.random(),
                        sender: pn,
                        text: text,
                        timestamp: new Date(),
                        status: 'received',
                        type: 'normal'
                    });
                }
                if (typeof playSound === 'function') playSound('message');
            } catch (e) {}
        }, delay);
    }

    // ========== 面板 ==========
    window.openDailyCheckinPanel = async function () {
        await load();
        const old = document.getElementById('daily-checkin-panel');
        if (old) old.remove();

        const today = todayStr();
        const checked = hasCheckedToday();
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        // 最近 30 天日历
        let calendarHTML = '';
        for (let i = 29; i >= 0; i--) {
            const dateStr = dateOffset(-i);
            const day = new Date(dateStr).getDate();
            const done = data.dates.indexOf(dateStr) !== -1;
            const isToday = dateStr === today;
            calendarHTML += '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">'
                + '<div style="width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;'
                + (done ? 'background:var(--accent-color);color:#fff;' : 'background:var(--primary-bg);color:var(--text-secondary);border:1px solid var(--border-color);')
                + (isToday ? 'box-shadow:0 0 0 2px rgba(var(--accent-color-rgb),0.3);' : '')
                + '">' + (done ? '✓' : day) + '</div>'
                + '</div>';
        }

        const modal = document.createElement('div');
        modal.id = 'daily-checkin-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:92%;max-width:420px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">'
            +         '<i class="fas fa-calendar-check" style="color:var(--accent-color);font-size:15px;"></i>'
            +       '</div>'
            +       '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">每日打卡</span>'
            +     '</div>'
            +     '<button id="checkin-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            // 大数字卡片
            +   '<div style="background:linear-gradient(135deg, rgba(var(--accent-color-rgb),0.12), rgba(var(--accent-color-rgb),0.03));border-radius:18px;padding:20px;margin-bottom:16px;border:1px solid rgba(var(--accent-color-rgb),0.2);text-align:center;">'
            +     '<div style="font-size:12px;color:var(--text-secondary);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">连续打卡</div>'
            +     '<div style="font-size:52px;font-weight:900;color:var(--accent-color);line-height:1;font-family:Georgia,serif;">' + data.streak + '</div>'
            +     '<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">天</div>'
            +     '<div style="display:flex;justify-content:center;gap:20px;margin-top:16px;padding-top:14px;border-top:1px dashed rgba(var(--accent-color-rgb),0.2);">'
            +       '<div><div style="font-size:16px;font-weight:700;color:var(--text-primary);">' + data.total + '</div><div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">累计打卡</div></div>'
            +       '<div><div style="font-size:16px;font-weight:700;color:var(--text-primary);">' + data.dates.length + '</div><div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">总天数</div></div>'
            +     '</div>'
            +   '</div>'

            // 打卡按钮
            +   '<button id="checkin-btn" style="width:100%;padding:14px;border:none;border-radius:14px;background:' + (checked ? 'var(--primary-bg)' : 'var(--accent-color)') + ';color:' + (checked ? 'var(--text-secondary)' : '#fff') + ';font-size:14px;font-weight:700;cursor:' + (checked ? 'default' : 'pointer') + ';font-family:var(--font-family);letter-spacing:1px;margin-bottom:18px;box-shadow:' + (checked ? 'none' : '0 6px 20px rgba(var(--accent-color-rgb),0.35)') + ';">'
            +     (checked ? '<i class="fas fa-check-circle"></i> 今日已打卡' : '<i class="fas fa-hand-sparkles"></i> 立即打卡')
            +   '</button>'

            // 最近 30 天
            +   '<div style="font-size:12px;font-weight:700;color:var(--text-secondary);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">最近 30 天</div>'
            +   '<div style="display:grid;grid-template-columns:repeat(10,1fr);gap:6px;padding:12px;background:var(--primary-bg);border-radius:12px;border:1px solid var(--border-color);">'
            +     calendarHTML
            +   '</div>'

            +   '<div style="margin-top:14px;font-size:11px;color:var(--text-secondary);text-align:center;opacity:0.7;line-height:1.6;">' + pn + ' 会看到你的打卡，偶尔也会回应你哦</div>'
            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#checkin-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        if (!checked) {
            modal.querySelector('#checkin-btn').onclick = async () => {
                close();
                await window.doDailyCheckin();
            };
        }
    };

    window.initDailyCheckin = function () {
        const btn = document.getElementById('daily-checkin-function');
        if (btn && !btn.dataset.initialized) {
            btn.dataset.initialized = 'true';
            btn.addEventListener('click', () => {
                const adv = document.getElementById('advanced-modal');
                if (adv && typeof hideModal === 'function') hideModal(adv);
                window.openDailyCheckinPanel();
            });
        }
    };

    load();
})();