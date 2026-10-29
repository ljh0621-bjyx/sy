/* ============================================================
 * room.js - 敲门卡片交互
 * ============================================================ */
(function () {
    'use strict';

    window.myOpenRoom = function() {
        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';
        
        // 1. 发送敲门卡片消息（特殊 type，待会儿让 anti-empty.js 渲染）
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now(), 
                sender: 'user', 
                type: 'room-invite',  // 特殊类型
                text: '希望可以进你家', 
                subText: '咚咚。我在门口，可以进去吗？',
                timestamp: new Date(), 
                status: 'sent'
            });
        }
        if (typeof playSound === 'function') playSound('send');
        
        // 2. 对方经过 2~4 秒的“犹豫”，决定是否同意
        setTimeout(() => {
            // 50% 概率拒绝
            const isReject = Math.random() < 0.5; 
            
            if (isReject) {
                const rejectLines = ['……你先别进来。', '等一下，房间里有点乱。', '现在不行，稍微等会儿。', '我还没准备好。'];
                addMessage({
                    id: Date.now() + 1, 
                    sender: pName, 
                    text: rejectLines[Math.floor(Math.random() * rejectLines.length)], 
                    timestamp: new Date(), 
                    status: 'received', 
                    type: 'normal'
                });
                if (typeof playSound === 'function') playSound('message');
            } else {
                addMessage({
                    id: Date.now() + 1, 
                    sender: pName, 
                    text: '进来吧。', 
                    timestamp: new Date(), 
                    status: 'received', 
                    type: 'normal'
                });
                if (typeof playSound === 'function') playSound('message');
                
                // 如果你希望他同意后自动弹卡片，也可以，但现在我们做成点击卡片进入
            }
        }, 2000 + Math.random() * 2000);
    };

    // 点击卡片后进入的房间（保留简单的互动）
    window.enterHisRoom = function() {
        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';
        const old = document.getElementById('his-room-panel');
        if (old) old.remove();
        
        const modal = document.createElement('div');
        modal.id = 'his-room-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(20, 20, 25, 0.95);backdrop-filter:blur(10px);display:flex;flex-direction:column;color:#fff;animation:fadeIn 0.3s ease;';
        
        modal.innerHTML = `
            <div style="height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid rgba(255,255,255,0.1);">
                <span style="font-size:15px;font-weight:600;">🚪 你在 ${pName} 的房间里</span>
                <button onclick="document.getElementById('his-room-panel').remove();" style="background:rgba(255,255,255,0.1);border:none;color:#fff;padding:6px 14px;border-radius:15px;font-size:12px;cursor:pointer;">退出</button>
            </div>
            <div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;">
                <div style="font-size:64px;margin-bottom:20px;">🛋️</div>
                <h2 style="font-size:20px;font-weight:700;margin-bottom:12px;">你走进了他的领地</h2>
                <p style="font-size:14px;color:rgba(255,255,255,0.6);">他就在你面前，你要做点什么？</p>
            </div>
            <div style="padding:20px;text-align:center;">
                <button onclick="document.getElementById('his-room-panel').remove();" style="background:#ff6699;color:#fff;border:none;padding:12px 30px;border-radius:20px;font-size:14px;font-weight:600;">去抱他</button>
            </div>
        `;
        document.body.appendChild(modal);
    };
})();