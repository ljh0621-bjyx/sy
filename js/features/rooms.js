/* ============================================================
 * room.js - 进入梦角的房间
 * 敲门交互，有概率被拒绝，同意后展示房间
 * ============================================================ */
(function () {
    'use strict';

    // 设定被拒绝的概率（0.3 = 30% 概率被拒绝，70% 概率同意）
    const REJECT_CHANCE = 0.3; 

    const REJECT_LINES = [
        '……你先别进来。',
        '等一下，房间里有点乱。',
        '现在不行，稍微等会儿。',
        '我还没准备好，你在门外等一下吧。',
        '（里面传来一阵慌乱的声音）……先别推门！'
    ];

    const ACCEPT_LINES = [
        '进来吧，门没锁。',
        '请进，我等你很久了。',
        '（他拉开了门）怎么现在才来？',
        '嗯，进来坐吧。',
        '（他侧过身，给你让出了一条路）'
    ];

    // ========== 敲门逻辑 ==========
    window.knockHisRoom = function () {
        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        // 1. 我发送敲门请求
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: 'user',
                text: '咚咚。我在门口，可以进去吗？',
                timestamp: new Date(),
                status: 'sent',
                type: 'normal'
            });
        }
        if (typeof playSound === 'function') playSound('send');

        // 2. 对方“思考”2~4秒
        const waitTime = 2000 + Math.random() * 2000;

        setTimeout(() => {
            const isReject = Math.random() < REJECT_CHANCE;

            if (isReject) {
                // 拒绝
                const line = REJECT_LINES[Math.floor(Math.random() * REJECT_LINES.length)];
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now() + Math.floor(Math.random() * 1000),
                        sender: partnerName,
                        text: line,
                        timestamp: new Date(),
                        status: 'received',
                        type: 'normal'
                    });
                }
                if (typeof playSound === 'function') playSound('message');
            } else {
                // 同意
                const line = ACCEPT_LINES[Math.floor(Math.random() * ACCEPT_LINES.length)];
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now() + Math.floor(Math.random() * 1000),
                        sender: partnerName,
                        text: line,
                        timestamp: new Date(),
                        status: 'received',
                        type: 'normal'
                    });
                }
                if (typeof playSound === 'function') playSound('message');

                // 延迟 1 秒后弹出房间界面
                setTimeout(() => {
                    showHisRoom();
                }, 1000);
            }
        }, waitTime);
    };

    // ========== 房间界面 ==========
    function showHisRoom() {
        const old = document.getElementById('his-room-panel');
        if (old) old.remove();

        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';

        const modal = document.createElement('div');
        modal.id = 'his-room-panel';
        // 这里用了深色静谧的氛围背景，你可以换成你喜欢的图片背景
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg, #1e1e24, #0f0f13);display:flex;flex-direction:column;align-items:center;justify-content:center;animation:fadeIn 0.5s ease;color:#fff;';

        modal.innerHTML = `
            <div style="text-align:center;animation:slideUp 0.6s cubic-bezier(0.34,1.56,0.64,1);">
                <div style="font-size:64px;margin-bottom:20px;filter:drop-shadow(0 0 20px rgba(255,255,255,0.2));">🚪</div>
                <h2 style="font-size:24px;font-weight:700;letter-spacing:2px;margin-bottom:12px;">你走进了 ${partnerName} 的房间</h2>
                <p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.8;max-width:300px;margin:0 auto;">
                    房间里弥漫着淡淡的香气。<br>
                    他靠在桌边，抬眼看着你，仿佛早就料到你会来。
                </p>
            </div>
            
            <button id="leave-room-btn" style="margin-top:40px;padding:12px 36px;border:none;border-radius:30px;background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);color:#fff;font-size:14px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.2);transition:all 0.2s;">
                退出房间
            </button>
        `;

        if (!document.getElementById('room-anim-style')) {
            const style = document.createElement('style');
            style.id = 'room-anim-style';
            style.textContent = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        modal.querySelector('#leave-room-btn').onclick = () => {
            modal.remove();
            // 退出时在聊天里发一条系统提示
            if (typeof addMessage === 'function') {
                addMessage({
                    id: Date.now(),
                    sender: null,
                    text: '你离开了房间',
                    timestamp: new Date(),
                    type: 'system'
                });
            }
        };
    }

    console.log('[room] 房间敲门功能已加载 ✓');
})();