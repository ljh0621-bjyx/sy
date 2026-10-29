/* ============================================================
 * period-tracker.js - 经期记录与男友提醒
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'periodTrackerData_v1';

    // 默认数据
    let data = {
        lastStart: '',      // 上一次开始的日期 YYYY-MM-DD
        cycleLength: 28,    // 周期长度（天）
        periodLength: 5,    // 经期天数
        history: [],        // 历史记录 [{ start, end }]
        lastRemindDate: ''  // 上次提醒的日期（防止一天多次提醒）
    };

    // 他的关心台词库
    const REMIND_LINES = [
        '算算日子，你这几天应该快到了？记得提前备好卫生巾，别吃冰的。',
        '我看日子快到了，这两天别喝凉水了，要是肚子疼一定要告诉我。',
        '那个快来了吧？晚上睡觉盖好肚子，别着凉了。',
        '给你买了暖宫贴，估计快到了，这几天自己要当心点。',
        '算算时间差不多了，脾气暴躁的话我允许你骂我两句，别自己忍着疼。'
    ];

    // 经期中的安抚台词
    const DURING_LINES = [
        '肚子还疼吗？要是实在难受就请假休息，我给你倒杯热水。',
        '这两天就别乱跑了，乖乖在床上躺着。',
        '好想现在就在你身边，给你揉揉肚子。'
    ];

    function loadData() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                data = JSON.parse(raw);
            }
        } catch (e) {}
    }
    function saveData() {
        try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    }

    // 格式化今天的日期 YYYY-MM-DD
    function getTodayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // 计算两个日期相差多少天
    function daysBetween(dateStr1, dateStr2) {
        if (!dateStr1 || !dateStr2) return null;
        const d1 = new Date(dateStr1);
        const d2 = new Date(dateStr2);
        d1.setHours(0,0,0,0);
        d2.setHours(0,0,0,0);
        return Math.round((d2 - d1) / 86400000);
    }

    // ========== 检查并发送提醒 ==========
    function checkReminder() {
        loadData();
        if (!data.lastStart) return; // 没有记录就不提醒

        const today = getTodayStr();
        if (data.lastRemindDate === today) return; // 今天已经提醒过了

        const nextStartStr = (() => {
            const d = new Date(data.lastStart);
            d.setDate(d.getDate() + data.cycleLength);
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        })();

        const daysToNext = daysBetween(today, nextStartStr);
        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';

        let text = '';

        // 1. 距离下次经期还有 1~2 天，提醒
        if (daysToNext !== null && daysToNext >= 0 && daysToNext <= 2) {
            text = REMIND_LINES[Math.floor(Math.random() * REMIND_LINES.length)];
        } 
        // 2. 算算日子，可能已经在经期中了（比如上次开始后的 1~5 天）
        else {
            const daysSinceLast = daysBetween(data.lastStart, today);
            if (daysSinceLast !== null && daysSinceLast > 0 && daysSinceLast <= data.periodLength) {
                // 经期中，偶尔关心一下
                if (Math.random() < 0.3) {
                    text = DURING_LINES[Math.floor(Math.random() * DURING_LINES.length)];
                }
            }
        }

        // 如果触发了台词，发送消息
        if (text) {
            if (typeof addMessage === 'function') {
                addMessage({
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    sender: pName,
                    text: text,
                    timestamp: new Date(),
                    status: 'received',
                    type: 'normal'
                });
                data.lastRemindDate = today;
                saveData();

                if (typeof playSound === 'function') playSound('message');
                if (typeof window._sendPartnerNotification === 'function') {
                    window._sendPartnerNotification(pName, text);
                }
            }
        }
    }

    // 每半小时检查一次（或者页面加载时检查）
    setInterval(checkReminder, 30 * 60 * 1000);
    setTimeout(checkReminder, 5000);

    // ========== 记录面板 UI ==========
    window.openPeriodTracker = function () {
        loadData();
        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';
        const today = getTodayStr();

        let nextStartStr = '未记录';
        let daysToNext = '-';
        
        if (data.lastStart) {
            const d = new Date(data.lastStart);
            d.setDate(d.getDate() + data.cycleLength);
            nextStartStr = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
            daysToNext = daysBetween(today, d.toISOString().split('T')[0]);
            if (daysToNext < 0) daysToNext = '已逾期';
        }

        const old = document.getElementById('period-tracker-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'period-tracker-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML = `
            <div style="background:var(--secondary-bg);border-radius:24px;padding:24px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">
                
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                    <span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-heartbeat" style="color:#ff6699;margin-right:8px;"></i>姨妈助手</span>
                    <button onclick="document.getElementById('period-tracker-panel').remove()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>
                </div>

                <div style="background:linear-gradient(135deg, rgba(255,102,153,0.1), rgba(255,102,153,0.02));border:1px solid rgba(255,102,153,0.2);border-radius:16px;padding:16px;margin-bottom:20px;text-align:center;">
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">预计下次经期</div>
                    <div style="font-size:18px;font-weight:800;color:#ff6699;margin-bottom:6px;">${nextStartStr}</div>
                    <div style="font-size:12px;color:var(--text-primary);font-weight:600;">还有 <span style="color:#ff6699;font-size:16px;">${daysToNext}</span> 天</div>
                </div>

                <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
                    <button onclick="recordPeriodStart()" style="width:100%;padding:14px;border:none;border-radius:14px;background:#ff6699;color:#fff;font-size:14px;font-weight:700;cursor:pointer;">
                        🌸 今天来了（记录开始）
                    </button>
                    <div style="display:flex;gap:10px;">
                        <div style="flex:1;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:12px;padding:10px;text-align:center;">
                            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">周期长度</div>
                            <input type="number" id="pt-cycle" value="${data.cycleLength}" style="width:100%;text-align:center;border:none;background:transparent;color:var(--text-primary);font-size:16px;font-weight:700;outline:none;">
                            <div style="font-size:10px;color:var(--text-secondary);">天</div>
                        </div>
                        <div style="flex:1;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:12px;padding:10px;text-align:center;">
                            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">经期天数</div>
                            <input type="number" id="pt-length" value="${data.periodLength}" style="width:100%;text-align:center;border:none;background:transparent;color:var(--text-primary);font-size:16px;font-weight:700;outline:none;">
                            <div style="font-size:10px;color:var(--text-secondary);">天</div>
                        </div>
                    </div>
                    <button onclick="savePeriodSettings()" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;">保存周期设置</button>
                </div>

                <div style="font-size:12px;color:var(--text-secondary);text-align:center;line-height:1.6;opacity:0.8;">
                    💡 记录后，${pName} 会在快来的时候主动提醒你。
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    };

    window.recordPeriodStart = function () {
        const today = getTodayStr();
        data.lastStart = today;
        data.lastRemindDate = today; // 今天记录，今天就不提醒了
        saveData();

        const modal = document.getElementById('period-tracker-panel');
        if (modal) modal.remove();

        if (typeof showNotification === 'function') {
            showNotification('已记录，这几天好好休息哦', 'success', 3000);
        }
    };

    window.savePeriodSettings = function () {
        const cycle = parseInt(document.getElementById('pt-cycle').value) || 28;
        const len = parseInt(document.getElementById('pt-length').value) || 5;
        data.cycleLength = cycle;
        data.periodLength = len;
        saveData();
        if (typeof showNotification === 'function') {
            showNotification('周期设置已保存', 'success', 2000);
        }
    };

    console.log('[period-tracker] 姨妈助手已加载 ✓');
})();