/* ============================================================
 * surprise-box.js - 他的盲盒快递
 * ============================================================ */
(function () {
    'use strict';

    const LONG_LOVE_LINES = [
        '其实我平时不太会说那些肉麻的话，但今天突然很想告诉你：遇见你，是我这辈子最大的运气。',
        '我不需要你变得多完美，也不需要你时时刻刻都开心。我只希望，在你难过、疲惫的时候，第一个想到的是我。',
        '有时候看着我们的聊天记录，我会忍不住笑出声。原来不知不觉中，你已经填满了我生活的每一个角落。',
        '谢谢你愿意包容我的笨拙和脾气。我会努力，成为那个能让你安心依赖的人。'
    ];

    // 发送盲盒消息
    window.sendSurpriseBox = function () {
        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';
        
        // 发送带特殊标记的消息
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now(), 
                sender: pName, 
                text: '给你寄了一个神秘盲盒，快打开看看！', 
                timestamp: new Date(), 
                status: 'received', 
                type: 'normal',
                isSurpriseBox: true // 核心标记
            });
        }
        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(pName, '给你寄了一个盲盒');
        }
    };

    // 打开盲盒的逻辑
    window.openSurpriseBox = function (msgId, el) {
        // 防止重复点击
        if (el.dataset.opened === '1') return;
        el.dataset.opened = '1';

        // 播放晃动动画
        el.style.animation = 'shakeBox 0.5s ease-in-out';
        if (typeof playSound === 'function') playSound('favorite');

        setTimeout(() => {
            // 随机开出奖励 1:情话 2:金币 3:图片
            const type = Math.floor(Math.random() * 3) + 1;
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.3s ease;';
            
            let innerHTML = '';
            
            if (type === 1) {
                // 开出情话
                const line = LONG_LOVE_LINES[Math.floor(Math.random() * LONG_LOVE_LINES.length)];
                innerHTML = `
                    <div style="background:#fff; border-radius:20px; padding:30px 24px; width:85%; max-width:320px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.4);">
                        <div style="font-size:40px; margin-bottom:15px;">💌</div>
                        <h3 style="font-size:16px; color:#333; margin-bottom:15px;">开出了：他的真心话</h3>
                        <p style="font-size:14px; color:#666; line-height:1.8; text-align:left; background:#f9f9f9; padding:15px; border-radius:12px; border-left:3px solid #ff6699;">“${line}”</p>
                        <button onclick="this.closest('div[style*=fixed]').remove()" style="margin-top:20px; padding:10px 30px; border:none; border-radius:20px; background:#ff6699; color:#fff; font-size:14px; font-weight:600; cursor:pointer;">收下心意</button>
                    </div>
                `;
            } else if (type === 2) {
                // 开出金币
                const amount = Math.floor(Math.random() * 50) + 10;
                // 如果存在转账数据，直接加钱
                try {
                    if (typeof window.getTransferData === 'function' && typeof window.setTransferData === 'function') {
                        const d = window.getTransferData();
                        d.myBalance += amount;
                        window.setTransferData(d);
                    }
                } catch(e) {}

                innerHTML = `
                    <div style="background:#fff; border-radius:20px; padding:30px 24px; width:85%; max-width:320px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.4);">
                        <div style="font-size:50px; margin-bottom:15px;">🪙</div>
                        <h3 style="font-size:16px; color:#333; margin-bottom:10px;">开出了：恋爱金币</h3>
                        <p style="font-size:24px; font-weight:800; color:#F58220; margin-bottom:20px;">+${amount} 金币</p>
                        <p style="font-size:12px; color:#999; margin-bottom:20px;">（已存入你的钱包）</p>
                        <button onclick="this.closest('div[style*=fixed]').remove()" style="padding:10px 30px; border:none; border-radius:20px; background:#F58220; color:#fff; font-size:14px; font-weight:600; cursor:pointer;">太棒了</button>
                    </div>
                `;
            } else {
                // 开出图片（从图片库拿）
                let imgUrl = 'https://picsum.photos/400/400?random=' + Date.now();
                if (typeof window.getRandomPartnerImage === 'function') {
                    const img = window.getRandomPartnerImage();
                    if (img && img.url) imgUrl = img.url;
                }
                innerHTML = `
                    <div style="background:#fff; border-radius:20px; padding:20px; width:85%; max-width:320px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.4);">
                        <h3 style="font-size:16px; color:#333; margin-bottom:15px;">开出了：他的私藏照</h3>
                        <img src="${imgUrl}" style="width:100%; border-radius:12px; margin-bottom:20px; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                        <button onclick="this.closest('div[style*=fixed]').remove()" style="padding:10px 30px; border:none; border-radius:20px; background:#ff6699; color:#fff; font-size:14px; font-weight:600; cursor:pointer;">保存照片</button>
                    </div>
                `;
            }

            modal.innerHTML = innerHTML;
            document.body.appendChild(modal);
            
            // 把聊天框里的盲盒变灰
            el.innerHTML = `<div style="padding:12px; text-align:center; color:#999; font-size:12px;">🎁 盲盒已打开</div>`;
            el.style.background = '#f0f0f0';
            el.style.cursor = 'default';

        }, 600); // 晃动 0.6 秒后打开
    };

    // 启动：每隔 30~60 分钟，他有 30% 概率给你寄一个盲盒
    setInterval(() => {
        if (Math.random() < 0.3) {
            window.sendSurpriseBox();
        }
    }, 45 * 60 * 1000);

    console.log('[surprise-box] 盲盒功能已加载 ✓');
})();