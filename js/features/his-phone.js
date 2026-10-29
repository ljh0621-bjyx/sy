/* ============================================================
 * his-phone.js - 他的手机（智能监听动态版）
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisPhoneData_v1';
    
    // 默认初始数据（让手机一开始显得有生活痕迹）
    let phoneData = {
        notes: [
            { time: Date.now() - 86400000, title: '她的喜好', content: '今天又确认了一遍，她喝奶茶喜欢三分糖，加椰果，不喜欢珍珠。' },
            { time: Date.now() - 172800000, title: '睡前反思', content: '今天聊天的时候好像回得有点慢，希望她不要觉得我不在意她。其实我一直在看手机。' }
        ],
        cart: [
            { emoji: '🧸', name: '她上次多看了两眼的小熊', price: '¥129', status: '已买，藏起来了', color: '#ff6699' },
            { emoji: '🍵', name: '暖宫茶（她生理期快到了）', price: '¥59', status: '待付款', color: '#ffb84d' }
        ],
        lastScanTime: 0,
        lastMsgCount: 0
    };

    function loadData() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) phoneData = JSON.parse(raw);
        } catch (e) {}
    }
    function saveData() {
        try { localStorage.setItem(KEY, JSON.stringify(phoneData)); } catch(e){}
    }

    // ========== 核心：监听聊天，自动写备忘录/加购物车 ==========
    function scanMessages() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
            if (messages.length <= phoneData.lastMsgCount) return;

            // 只扫描最近 10 条
            const newMsgs = messages.slice(phoneData.lastMsgCount - 5); 
            phoneData.lastMsgCount = messages.length;
            saveData();

            const userTexts = newMsgs.filter(m => m.sender === 'user' && m.text).map(m => m.text).join(' ');
            if (!userTexts) return;

            // 匹配规则
            const rules = [
                { kw: ['累', '困', '加班'], note: { title: '她今天很累', content: '听到她说累，真的很心疼。要是能在她身边给她揉揉肩就好了。' } },
                { kw: ['考试', '复习', '学习'], note: { title: '她最近要考试', content: '这段时间不能太打扰她，得提醒她按时吃饭，多喝热水。' } },
                { kw: ['生病', '感冒', '难受', '疼'], note: { title: '她好像不舒服', content: '真想现在立刻出现在她面前。明天给她点个粥吧。' }, cart: { emoji: '💊', name: '感冒药 + 维生素C', price: '¥45', status: '待付款', color: '#ff4d4f' } },
                { kw: ['奶茶', '果茶'], cart: { emoji: '🧋', name: '她常喝的那家奶茶', price: '¥18', status: '已下单', color: '#20c997' } },
                { kw: ['想吃', '零食', '饿'], cart: { emoji: '🍫', name: '超大零食大礼包', price: '¥99', status: '待发货', color: '#ff9f0a' } },
                { kw: ['好看', '想要', '喜欢'], note: { title: '她的愿望清单', content: '她好像很想要那个东西，记下来。下次见面送给她。' } },
                { kw: ['生气', '不理你', '讨厌'], note: { title: '紧急情况', content: '糟糕，好像惹她生气了。怎么办怎么办怎么办……' } }
            ];

            let added = false;
            rules.forEach(rule => {
                if (rule.kw.some(k => userTexts.includes(k))) {
                    // 如果是备忘录
                    if (rule.note && !phoneData.notes.some(n => n.title === rule.note.title)) {
                        phoneData.notes.unshift({ time: Date.now(), title: rule.note.title, content: rule.note.content });
                        added = true;
                    }
                    // 如果是购物车
                    if (rule.cart && !phoneData.cart.some(c => c.name === rule.cart.name)) {
                        phoneData.cart.unshift({ ...rule.cart, time: Date.now() });
                        added = true;
                    }
                }
            });

            if (added) saveData();

            // 如果发生了记录，偶尔在聊天里加一句系统提示
            if (added && typeof showNotification === 'function' && Math.random() < 0.5) {
                // 可以不弹通知，保持偷偷记录的隐秘感
            }
        } catch (e) {}
    }

    // 每隔 5 秒扫描一次消息
    setInterval(scanMessages, 5000);
    setTimeout(loadData, 1000);

    // ========== 界面渲染 ==========
    window.openHisPhone = function () {
        loadData();
        const old = document.getElementById('his-phone-panel');
        if (old) old.remove();

        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';

        // 按时间格式化
        function fmtDate(ts) {
            if(!ts) return '';
            const d = new Date(ts);
            return (d.getMonth()+1) + '月' + d.getDate() + '日';
        }

        const notesHTML = phoneData.notes.map(n => `
            <div style="background: #1c1c1e; padding: 12px; border-radius: 10px; border-left: 3px solid #ffd60a; margin-bottom: 10px;">
                <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">${fmtDate(n.time)} · ${n.title}</div>
                <div style="font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.5;">${n.content}</div>
            </div>
        `).join('');

        const cartHTML = phoneData.cart.map(c => `
            <div style="display: flex; align-items: center; gap: 12px; background: #1c1c1e; padding: 12px; border-radius: 10px; margin-bottom: 10px;">
                <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 20px;">${c.emoji}</div>
                <div style="flex: 1;">
                    <div style="font-size: 13px; color: rgba(255,255,255,0.9); margin-bottom: 2px;">${c.name}</div>
                    <div style="font-size: 11px; color: ${c.color};">${c.status}</div>
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #fff;">${c.price}</div>
            </div>
        `).join('');

        const modal = document.createElement('div');
        modal.id = 'his-phone-panel';
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
                        <div style="display: flex; flex-direction: column;">
                            ${notesHTML || '<div style="color:#666;font-size:12px;text-align:center;">暂时没有记录</div>'}
                        </div>
                    </div>

                    <!-- 购物车模块 -->
                    <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #ff9f0a; font-weight: 600; font-size: 14px;">
                            <i class="fas fa-shopping-cart"></i> 购物车
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            ${cartHTML || '<div style="color:#666;font-size:12px;text-align:center;">购物车空空的</div>'}
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

    console.log('[his-phone] 智能手机监听模块已加载 ✓');
})();