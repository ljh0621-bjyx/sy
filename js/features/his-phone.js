/* ============================================================
 * his-phone.js - 他的手机（备忘录 & 购物车）
 * ============================================================ */
(function () {
    'use strict';

    const NOTES = [
        { date: '10月12日', title: '她好像有点咳嗽', content: '今天打电话听她嗓子有点哑，明天得提醒她买点胖大海或者含片。我不在身边，她总是照顾不好自己。' },
        { date: '10月15日', title: '草莓味', content: '路过便利店看到草莓味的糖，记得她上次提过一句。买了一点，等下次见面塞给她。' },
        { date: '10月21日', title: '周末', content: '她说这周末要加班，心情好像不太好。周末还是别烦她了，让她多睡会儿，但记得给她点个她爱吃的外卖。' },
        { date: '10月25日', title: '我是不是惹她生气了？', content: '今天回消息有点慢，她好像不太开心。但我真的不是故意的……明天想办法哄哄她。' },
        { date: '10月28日', title: '未来', content: '想带她去看海。想和她一起养只猫。想一直、一直和她在一起。' }
    ];

    const CART = [
        { emoji: '☕', name: '情侣马克杯（一粉一蓝）', price: '¥89', status: '已买，准备送她', color: '#ff6699' },
        { emoji: '🧸', name: '她上次在商场看了很久的毛绒熊', price: '¥199', status: '待付款', color: '#ffb84d' },
        { emoji: '🍬', name: '某牌子草莓糖（加购了 5 包）', price: '¥45', status: '已买，放在口袋里', color: '#51cf66' },
        { emoji: '💐', name: '洋桔梗（她喜欢的花）', price: '¥128', status: '待发货', color: '#8b6fd4' },
        { emoji: '🎫', name: '双人电影票', price: '¥120', status: '已预订', color: '#20c997' }
    ];

    window.openHisPhone = function () {
        const old = document.getElementById('his-phone-panel');
        if (old) old.remove();

        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';

        const modal = document.createElement('div');
        modal.id = 'his-phone-panel';
        // 模拟深色背景，手机居中
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(10,10,15,0.85);backdrop-filter:blur(15px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML = `
            <div style="background:#1c1c1e; width: 92%; max-width: 380px; height: 85vh; max-height: 700px; border-radius: 40px; border: 6px solid #333; box-shadow: 0 20px 60px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,255,255,0.05); display: flex; flex-direction: column; overflow: hidden; position: relative;">
                
                <!-- 手机顶部状态栏 -->
                <div style="height: 44px; background:#1c1c1e; display:flex; justify-content:space-between; align-items:center; padding: 0 24px; font-size: 12px; color: #fff; font-weight: 600; flex-shrink:0; z-index: 10;">
                    <span>10:24</span>
                    <div style="width: 80px; height: 24px; background: #000; border-radius: 20px; position: absolute; left: 50%; transform: translateX(-50%); top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <div style="width: 6px; height: 6px; border-radius: 50%; background: #333;"></div>
                    </div>
                    <span><i class="fas fa-signal" style="margin-right:4px;"></i><i class="fas fa-battery-three-quarters"></i></span>
                </div>

                <!-- 头部标题 -->
                <div style="padding: 10px 20px 15px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;">
                    <div style="font-size: 18px; font-weight: 700; color: #fff;">${pName} 的手机</div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px;">你不小心看到了他的秘密…</div>
                </div>

                <!-- 内容区 -->
                <div style="flex: 1; overflow-y: auto; background: #000; padding: 15px; display: flex; flex-direction: column; gap: 15px;">
                    
                    <!-- 备忘录模块 -->
                    <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #ffd60a; font-weight: 600; font-size: 14px;">
                            <i class="fas fa-file-alt"></i> 备忘录
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${NOTES.map(n => `
                                <div style="background: #1c1c1e; padding: 12px; border-radius: 10px; border-left: 3px solid #ffd60a;">
                                    <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">${n.date} · ${n.title}</div>
                                    <div style="font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.5;">${n.content}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- 购物车模块 -->
                    <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #ff9f0a; font-weight: 600; font-size: 14px;">
                            <i class="fas fa-shopping-cart"></i> 购物车
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${CART.map(c => `
                                <div style="display: flex; align-items: center; gap: 12px; background: #1c1c1e; padding: 12px; border-radius: 10px;">
                                    <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 20px;">${c.emoji}</div>
                                    <div style="flex: 1;">
                                        <div style="font-size: 13px; color: rgba(255,255,255,0.9); margin-bottom: 2px;">${c.name}</div>
                                        <div style="font-size: 11px; color: ${c.color};">${c.status}</div>
                                    </div>
                                    <div style="font-size: 13px; font-weight: 600; color: #fff;">${c.price}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                </div>

                <!-- 底部退出按钮 -->
                <div style="padding: 15px 20px 25px; background: #1c1c1e; flex-shrink: 0; text-align: center; border-top: 1px solid rgba(255,255,255,0.08);">
                    <button onclick="document.getElementById('his-phone-panel').remove()" style="background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 12px 0; width: 100%; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer;">锁屏退出</button>
                </div>

            </div>
        `;
        document.body.appendChild(modal);
    };

    console.log('[his-phone] 他的手机已加载 ✓');
})();