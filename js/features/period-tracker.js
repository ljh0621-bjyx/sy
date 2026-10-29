/* ============================================================
 * period-tracker.js - 经期日历与男友提醒
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'periodTrackerData_v2';
    
    // 状态数据
    let data = {
        periodDays: [],      // 记录来的日子，如 ['2023-10-01', '2023-10-02']
        avgCycle: 28,        // 平均周期
        lastRemindDate: ''   // 防止同一天重复提醒
    };

    let currentCalDate = new Date(); // 日历当前显示的月份

    // 他的台词库
    const REMIND_LINES = [
        '算算日子，你这几天应该快到了？记得提前备好卫生巾，别吃冰的。',
        '我看日子快到了，这两天别喝凉水了，要是肚子疼一定要告诉我。',
        '那个快来了吧？晚上睡觉盖好肚子，别着凉了。',
        '给你买了暖宫贴，估计快到了，这几天自己要当心点。'
    ];
    const DURING_LINES = [
        '肚子还疼吗？要是实在难受就请假休息，我给你倒杯热水。',
        '这两天就别乱跑了，乖乖在床上躺着。',
        '好想现在就在你身边，给你揉揉肚子。'
    ];

    function loadData() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) data = JSON.parse(raw);
        } catch (e) {}
    }
    function saveData() {
        try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    }

    function formatDate(dateObj) {
        return dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
    }

    function daysBetween(dateStr1, dateStr2) {
        if (!dateStr1 || !dateStr2) return null;
        const d1 = new Date(dateStr1);
        const d2 = new Date(dateStr2);
        d1.setHours(0,0,0,0); d2.setHours(0,0,0,0);
        return Math.round((d2 - d1) / 86400000);
    }

    // ========== 智能预测逻辑 ==========
    // 找出现有记录中，最近一次的开始时间
    function getLastPeriodStart() {
        if (data.periodDays.length === 0) return null;
        const sorted = [...data.periodDays].sort();
        return sorted[sorted.length - 1]; // 最晚的一天（可能还没点结束）
    }

    // 预测下个月的经期（返回一个数组，包含未来几个月的预测日期）
    function getPredictedDays() {
        const lastStart = getLastPeriodStart();
        if (!lastStart) return [];

        const preds = [];
        let currentStart = new Date(lastStart);
        
        // 预测未来 3 个月的经期（每次周期 28 天，经期 5 天）
        for (let m = 0; m < 3; m++) {
            currentStart.setDate(currentStart.getDate() + data.avgCycle);
            for (let d = 0; d < 5; d++) {
                const pDay = new Date(currentStart);
                pDay.setDate(pDay.getDate() + d);
                preds.push(formatDate(pDay));
            }
        }
        return preds;
    }

    // ========== 日历渲染 ==========
    window.openPeriodTracker = function () {
        loadData();
        renderCalendarUI();
    };

    function renderCalendarUI() {
        const old = document.getElementById('period-tracker-panel');
        if (old) old.remove();

        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth();
        const todayStr = formatDate(new Date());
        const preds = getPredictedDays();

        // 计算日历格子
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0是周日

        let gridHTML = '';
        // 空白格子
        for (let i = 0; i < startDayOfWeek; i++) {
            gridHTML += '<div></div>';
        }

        // 日期格子
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isRecorded = data.periodDays.includes(dateStr);
            const isPredicted = preds.includes(dateStr);

            let bgColor = 'transparent';
            let color = 'var(--text-primary)';
            let border = 'none';
            let dotHTML = '';

            if (isRecorded) {
                bgColor = '#ff6699'; // 粉色背景
                color = '#fff';
            } else if (isPredicted) {
                bgColor = 'rgba(255,102,153,0.08)'; // 浅粉预测
                color = '#ff6699';
                border = '1px dashed rgba(255,102,153,0.4)';
            }

            if (isToday && !isRecorded) {
                border = '2px solid #ff6699';
            }

            gridHTML += `
                <div onclick="window.togglePeriodDay('${dateStr}')" style="
                    height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center;
                    border-radius: 12px; cursor: pointer; transition: all 0.2s;
                    background: ${bgColor}; color: ${color}; border: ${border};
                    font-weight: ${isToday ? 'bold' : 'normal'};
                    position: relative;
                ">
                    <span>${i}</span>
                </div>
            `;
        }

        const modal = document.createElement('div');
        modal.id = 'period-tracker-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML = `
            <div style="background:var(--secondary-bg);border-radius:24px;padding:24px;width:92%;max-width:400px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">
                
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                    <span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-heartbeat" style="color:#ff6699;margin-right:8px;"></i>经期日历</span>
                    <button onclick="document.getElementById('period-tracker-panel').remove()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>
                </div>

                <!-- 月份切换 -->
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                    <button onclick="window.changePeriodMonth(-1)" style="background:none;border:none;font-size:18px;color:var(--text-secondary);cursor:pointer;padding:0 10px;"><i class="fas fa-chevron-left"></i></button>
                    <span style="font-size:15px;font-weight:600;color:var(--text-primary);">${year}年 ${month + 1}月</span>
                    <button onclick="window.changePeriodMonth(1)" style="background:none;border:none;font-size:18px;color:var(--text-secondary);cursor:pointer;padding:0 10px;"><i class="fas fa-chevron-right"></i></button>
                </div>

                <!-- 星期栏 -->
                <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:11px;color:var(--text-secondary);margin-bottom:10px;">
                    <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
                </div>

                <!-- 日历格子 -->
                <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:20px;">
                    ${gridHTML}
                </div>

                <!-- 图例说明 -->
                <div style="display:flex;gap:16px;justify-content:center;font-size:11px;color:var(--text-secondary);margin-bottom:20px;">
                    <div style="display:flex;align-items:center;gap:4px;">
                        <div style="width:10px;height:10px;border-radius:3px;background:#ff6699;"></div> 已记录
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;">
                        <div style="width:10px;height:10px;border-radius:3px;border:1px dashed #ff6699;background:rgba(255,102,153,0.08);"></div> 预测经期
                    </div>
                </div>

                <!-- 周期设置 -->
                <div style="background:var(--primary-bg);border-radius:12px;padding:12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                    <span style="font-size:13px;color:var(--text-primary);">我的周期长度</span>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <button onclick="window.adjustCycle(-1)" style="width:24px;height:24px;border-radius:6px;border:1px solid var(--border-color);background:var(--secondary-bg);color:var(--text-primary);cursor:pointer;">-</button>
                        <span style="font-size:14px;font-weight:700;color:#ff6699;min-width:30px;text-align:center;">${data.avgCycle} 天</span>
                        <button onclick="window.adjustCycle(1)" style="width:24px;height:24px;border-radius:6px;border:1px solid var(--border-color);background:var(--secondary-bg);color:var(--text-primary);cursor:pointer;">+</button>
                    </div>
                </div>

                <div style="font-size:11px;color:var(--text-secondary);text-align:center;line-height:1.6;opacity:0.8;">
                    💡 点击日期可记录/取消。他会在快来的时候主动提醒你。
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    window.changePeriodMonth = function(offset) {
        currentCalDate.setMonth(currentCalDate.getMonth() + offset);
        renderCalendarUI();
    };

    window.togglePeriodDay = function(dateStr) {
        loadData();
        const idx = data.periodDays.indexOf(dateStr);
        if (idx > -1) {
            data.periodDays.splice(idx, 1); // 取消记录
        } else {
            data.periodDays.push(dateStr); // 添加记录
        }
        saveData();
        renderCalendarUI(); // 重新渲染
    };

    window.adjustCycle = function(offset) {
        data.avgCycle = Math.max(20, Math.min(45, data.avgCycle + offset));
        saveData();
        renderCalendarUI();
    };

    // ========== 定时提醒 ==========
    function checkReminder() {
        loadData();
        const today = formatDate(new Date());
        if (data.lastRemindDate === today) return;

        const preds = getPredictedDays();
        if (preds.length === 0) return;

        // 预测的“开始日”就是 preds 里最近的一天
        const nextStart = preds[0];
        const daysToNext = daysBetween(today, nextStart);
        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';

        let text = '';

        // 1. 距离下次经期还有 1~2 天
        if (daysToNext !== null && daysToNext >= 0 && daysToNext <= 2) {
            text = REMIND_LINES[Math.floor(Math.random() * REMIND_LINES.length)];
        } 
        // 2. 正好在预测的经期里
        else if (preds.includes(today)) {
            if (Math.random() < 0.3) {
                text = DURING_LINES[Math.floor(Math.random() * DURING_LINES.length)];
            }
        }

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

    // 后台定时检查
    setInterval(checkReminder, 30 * 60 * 1000);
    setTimeout(checkReminder, 5000);

    console.log('[period-tracker] 日历版经期助手已加载 ✓');
})();