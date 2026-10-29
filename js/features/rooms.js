/* ============================================================
 * room.js - 进入梦角的房间（可互动版）
 * ============================================================ */
(function () {
    'use strict';

    window.myOpenRoom = function() {
        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';
        
        // 1. 在聊天里发送敲门
        if (typeof addMessage === 'function') {
            addMessage({id: Date.now(), sender: 'user', text: '咚咚。我在门口，可以进去吗？', timestamp: new Date(), status: 'sent', type: 'normal'});
        }
        if (typeof playSound === 'function') playSound('send');
        
        // 2. 延迟 1.5 秒后开门，展示房间
        setTimeout(() => {
            if (typeof addMessage === 'function') {
                addMessage({id: Date.now() + 1, sender: pName, text: '进来吧，门没锁。', timestamp: new Date(), status: 'received', type: 'normal'});
            }
            if (typeof playSound === 'function') playSound('message');
            
            showRoomInterface(pName);
        }, 1500);
    };

    function showRoomInterface(pName) {
        const old = document.getElementById('his-room-panel');
        if (old) old.remove();
        
        const modal = document.createElement('div');
        modal.id = 'his-room-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(20, 20, 25, 0.95);backdrop-filter:blur(10px);display:flex;flex-direction:column;color:#fff;';
        
        // 互动的回复库
        const reactions = {
            '靠近': [`${pName} 看着你走近，没有躲闪，只是眼神暗了暗。`, `你靠近他，能闻到他身上淡淡的香味。`, `${pName} 微微低头，呼吸打在你的额头上。`],
            '抱抱': [`你抱住他，他愣了一下，然后轻轻回抱住了你。`, `${pName} 顺势把你搂进怀里，下巴搁在你颈窝。`, `他把手放在你背上，轻轻拍了拍。`],
            '牵手': [`你牵起他的手，他反手扣紧了你的十指。`, `${pName} 捏了捏你的手心。`],
            '看窗外': [`你转头看向窗外，${pName} 的视线却一直落在你身上。`, `窗外风很大，他的房间却很温暖。`],
            '倒水': [`你给他倒了杯水，他接过去喝了一口，说：“谢谢。”`, `他端着杯子，指尖不经意碰到了你的手。`],
            '安静': [`你们谁也没说话，房间里只有呼吸声。`, `他安静地陪着你，过了好一会儿。`, `他放下手里的东西，专心看着你。`]
        };

        modal.innerHTML = `
            <div style="height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid rgba(255,255,255,0.1);">
                <span style="font-size:15px;font-weight:600;color:#fff;">🚪 ${pName} 的房间</span>
                <button onclick="document.getElementById('his-room-panel').remove();" style="background:rgba(255,255,255,0.1);border:none;color:#fff;padding:6px 14px;border-radius:15px;font-size:12px;cursor:pointer;">退出房间</button>
            </div>
            
            <div id="room-chat-area" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px;">
                <div style="text-align:center;font-size:12px;color:rgba(255,255,255,0.3);margin-top:20px;">— 你走进了房间，他在看着你 —</div>
            </div>
            
            <div style="padding:15px 20px 30px;background:rgba(0,0,0,0.2);">
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
                    <button class="room-action-btn" data-action="靠近" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;cursor:pointer;backdrop-filter:blur(5px);">走近一点</button>
                    <button class="room-action-btn" data-action="抱抱" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;cursor:pointer;backdrop-filter:blur(5px);">抱抱他</button>
                    <button class="room-action-btn" data-action="牵手" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;cursor:pointer;backdrop-filter:blur(5px);">牵他的手</button>
                    <button class="room-action-btn" data-action="倒水" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;cursor:pointer;backdrop-filter:blur(5px);">给他倒水</button>
                    <button class="room-action-btn" data-action="看窗外" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;cursor:pointer;backdrop-filter:blur(5px);">看看窗外</button>
                    <button class="room-action-btn" data-action="安静" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;cursor:pointer;backdrop-filter:blur(5px);">什么也不做</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定互动事件
        const chatArea = modal.querySelector('#room-chat-area');
        modal.querySelectorAll('.room-action-btn').forEach(btn => {
            btn.onclick = () => {
                const action = btn.dataset.action;
                const replies = reactions[action];
                const replyText = replies[Math.floor(Math.random() * replies.length)];
                
                // 1. 玩家动作
                const userMsg = document.createElement('div');
                userMsg.style.cssText = 'align-self:flex-end;background:#ff6699;color:#fff;padding:10px 14px;border-radius:14px 14px 4px 14px;font-size:14px;max-width:80%;box-shadow:0 2px 8px rgba(255,102,153,0.3);animation:slideIn 0.3s ease;';
                userMsg.textContent = '你选择了：' + action;
                chatArea.appendChild(userMsg);
                chatArea.scrollTop = chatArea.scrollHeight;
                
                // 2. 对方反应
                setTimeout(() => {
                    const botMsg = document.createElement('div');
                    botMsg.style.cssText = 'align-self:flex-start;background:rgba(255,255,255,0.15);color:#fff;padding:10px 14px;border-radius:14px 14px 14px 4px;font-size:14px;max-width:80%;backdrop-filter:blur(5px);animation:slideIn 0.3s ease;';
                    botMsg.textContent = replyText;
                    chatArea.appendChild(botMsg);
                    chatArea.scrollTop = chatArea.scrollHeight;
                    
                    if (typeof playSound === 'function') playSound('message');
                    if (navigator.vibrate) navigator.vibrate(50);
                }, 600);
            };
        });

        // 注入动画
        if (!document.getElementById('room-style')) {
            const style = document.createElement('style');
            style.id = 'room-style';
            style.textContent = '@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }';
            document.head.appendChild(style);
        }
    }
})();