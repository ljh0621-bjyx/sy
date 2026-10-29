/* ============================================================
 * room.js - 进入梦角的房间（极简测试版）
 * ============================================================ */
(function () {
    'use strict';

    // 1. 敲门逻辑
    window.knockHisRoom = function () {
        console.log('敲门事件触发！');
        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        // 先发一条消息
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now(),
                sender: 'user',
                text: '咚咚。我在门口，可以进去吗？',
                timestamp: new Date(),
                status: 'sent',
                type: 'normal'
            });
        }
        
        // 模拟等待 2 秒后，直接弹出房间（跳过拒绝概率测试）
        setTimeout(() => {
            if (typeof addMessage === 'function') {
                addMessage({
                    id: Date.now() + 1,
                    sender: partnerName,
                    text: '进来吧，门没锁。',
                    timestamp: new Date(),
                    status: 'received',
                    type: 'normal'
                });
            }
            showHisRoom();
        }, 2000);
    };

    // 2. 房间界面渲染
    function showHisRoom() {
        console.log('渲染房间界面');
        const old = document.getElementById('his-room-panel');
        if (old) old.remove();

        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';

        const modal = document.createElement('div');
        modal.id = 'his-room-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:linear-gradient(135deg, #1e1e24, #0f0f13);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;';

        modal.innerHTML = `
            <div style="text-align:center;">
                <div style="font-size:64px;margin-bottom:20px;">🚪</div>
                <h2 style="font-size:24px;font-weight:700;letter-spacing:2px;margin-bottom:12px;">你走进了 ${partnerName} 的房间</h2>
                <p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.8;max-width:300px;margin:0 auto;">
                    房间里弥漫着淡淡的香气。<br>
                    他靠在桌边，抬眼看着你。
                </p>
            </div>
            
            <button onclick="document.getElementById('his-room-panel').remove();" style="margin-top:40px;padding:12px 36px;border:none;border-radius:30px;background:rgba(255,255,255,0.2);color:#fff;font-size:14px;font-weight:600;cursor:pointer;">
                退出房间
            </button>
        `;

        document.body.appendChild(modal);
    }

    // 暴露一个直接打开房间的方法，方便测试
    window.forceOpenRoom = showHisRoom;

    console.log('[room] 房间功能已加载');
})();