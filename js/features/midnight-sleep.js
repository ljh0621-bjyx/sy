/* ============================================================
 * midnight-sleep.js - 强制熄灯与熬夜警告
 * ============================================================ */
(function () {
    'use strict';

    const LAST_SHOWN_KEY = 'midnightSleepLastShown';
    let isLocked = false;

    // 检查是否在深夜（23:30 ~ 04:00）
    function isMidnight() {
        const hour = new Date().getHours();
        const min = new Date().getMinutes();
        if (hour >= 23 && hour < 24) {
            return min >= 30; // 23:30 以后
        }
        return hour >= 0 && hour < 4; // 0点 到 4点
    }

    // 触发强制熄灯
    function triggerSleepMode() {
        if (isLocked) return;
        
        const today = new Date().toDateString();
        // 每天只触发一次，除非你刷新页面（防刷屏）
        if (localStorage.getItem(LAST_SHOWN_KEY) === today) return;

        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';
        isLocked = true;
        localStorage.setItem(LAST_SHOWN_KEY, today);

        // 1. 他的霸总发言
        const lines = [
            '几点了？还不睡？',
            '我看你是不想要你的头发了。',
            '把手机放下。现在。',
            '再不睡，明天别理我。',
            '乖乖闭眼，我数三声。'
        ];
        
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: pName,
                text: lines[0],
                timestamp: new Date(),
                status: 'received',
                type: 'normal'
            });
        }
        if (typeof playSound === 'function') playSound('message');

        // 2. 屏幕逐渐变暗
        const overlay = document.createElement('div');
        overlay.id = 'midnight-sleep-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0);pointer-events:none;transition:background 3s ease, backdrop-filter 3s ease;display:flex;flex-direction:column;align-items:center;justify-content:center;';
        
        document.body.appendChild(overlay);

        // 触发渐变
        requestAnimationFrame(() => {
            overlay.style.background = 'rgba(0,0,0,0.95)';
            overlay.style.backdropFilter = 'blur(10px)';
            overlay.style.pointerEvents = 'auto';
        });

        // 3. 锁死输入框，并显示强制睡眠UI
        const inputWrapper = document.querySelector('.input-area-wrapper');
        if (inputWrapper) inputWrapper.style.display = 'none';

        setTimeout(() => {
            overlay.innerHTML = `
                <div style="text-align:center; animation: fadeIn 1s ease;">
                    <div style="font-size:64px; margin-bottom:20px; filter: drop-shadow(0 0 20px rgba(255,255,255,0.2));">🌙</div>
                    <h2 style="font-size:22px; font-weight:700; color:#fff; margin-bottom:12px; letter-spacing:2px;">该睡觉了</h2>
                    <p style="font-size:14px; color:rgba(255,255,255,0.6); margin-bottom:40px; line-height:1.8;">
                        他不允许你再熬夜了。<br>把手机放下，闭上眼睛。
                    </p>
                    <button id="force-sleep-btn" style="padding:12px 36px; border:none; border-radius:30px; background:#fff; color:#000; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 0 20px rgba(255,255,255,0.3);">
                        乖乖去睡
                    </button>
                    <button id="beg-btn" style="margin-top:20px; display:block; width:100%; background:none; border:none; color:rgba(255,255,255,0.4); font-size:12px; cursor:pointer; text-decoration:underline;">
                        求求你，再玩五分钟
                    </button>
                </div>
            `;

            // 绑定乖乖去睡按钮
            document.getElementById('force-sleep-btn').onclick = () => {
                overlay.style.background = 'rgba(0,0,0,0)';
                overlay.style.pointerEvents = 'none';
                setTimeout(() => { overlay.remove(); }, 1000);
                if (inputWrapper) inputWrapper.style.display = 'flex';
                isLocked = false;
                if (typeof showNotification === 'function') showNotification('晚安，做个好梦。', 'success', 3000);
            };

            // 绑定求情按钮
            document.getElementById('beg-btn').onclick = () => {
                const btn = document.getElementById('beg-btn');
                btn.textContent = '他：不行。';
                btn.style.color = '#ff4d4f';
                
                setTimeout(() => {
                    btn.textContent = '他：没得商量，去睡。';
                    btn.style.textDecoration = 'none';
                }, 1500);
            };

        }, 1500); // 等变暗后再显示文字
    }

    // 监听你的发送行为
    function watchActivity() {
        if (!isMidnight() || isLocked) return;
        
        // 如果你在这个时间段发了消息，有 80% 概率触发
        if (Math.random() < 0.8) {
            triggerSleepMode();
        }
    }

    // 监听发送按钮和回车
    document.addEventListener('click', function(e) {
        if (e.target.closest('#send-btn')) {
            setTimeout(watchActivity, 100);
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.id === 'message-input') {
            setTimeout(watchActivity, 100);
        }
    });

    // 如果一直开着页面，每隔 10 分钟检查一次是不是已经深夜了
    setInterval(() => {
        if (isMidnight() && !isLocked) {
            // 如果深夜了，且页面很久没动，直接强制熄灯
            if (Math.random() < 0.3) triggerSleepMode();
        }
    }, 10 * 60 * 1000);

    console.log('[midnight-sleep] 强制熄灯系统已加载 ✓');
})();