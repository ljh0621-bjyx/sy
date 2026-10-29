/* ============================================================
 * his-phone.js - 他的手机（高随机性智能监听版）
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisPhoneData_v1';
    
    // ================= 随机素材库 =================
    const INITIAL_NOTES_POOL = [
        { title: '她的喜好', content: '今天又确认了一遍，她喝奶茶喜欢三分糖，加椰果，不喜欢珍珠。' },
        { title: '睡前反思', content: '今天聊天的时候好像回得有点慢，希望她不要觉得我不在意她。其实我一直在看手机。' },
        { title: '天气预报', content: '明天要降温了，得提醒她多穿点衣服，她总是要风度不要温度。' },
        { title: '工作走神', content: '开会的时候走神了，脑子里全是她昨天发的那个表情包。' },
        { title: '关于未来', content: '想带她去海边，想在沙滩上牵着她的手走很久很久。' },
        { title: '一点感悟', content: '其实不用她多完美，她能平平安安、开开心心地待在我身边就好。' }
    ];

    const INITIAL_CART_POOL = [
        { emoji: '🧸', name: '她上次在商场看了很久的毛绒熊', price: '¥129', status: '已买，藏起来了', color: '#ff6699' },
        { emoji: '🍵', name: '暖宫茶（她快生理期了）', price: '¥59', status: '待付款', color: '#ffb84d' },
        { emoji: '💐', name: '洋桔梗（她喜欢的花）', price: '¥128', status: '待发货', color: '#8b6fd4' },
        { emoji: '🍬', name: '某牌子草莓糖', price: '¥15', status: '已买，放口袋里了', color: '#20c997' },
        { emoji: '☕', name: '情侣马克杯', price: '¥89', status: '准备送她', color: '#ff9f0a' }
    ];

    // 关键词触发库
    const TRIGGERS = [
        {
            kw: ['累', '困', '加班', '辛苦'],
            notes: [
                '今天她看起来真的很疲惫，明天得想办法逗她开心。',
                '心疼她，希望今晚她能睡个好觉，不要做梦了。',
                '如果我在她身边，一定给她捏捏肩膀。'
            ],
            cart: [
                { emoji: '💆', name: '颈椎按摩仪', price: '¥299', status: '待付款', color: '#ff6699' },
                { emoji: '👀', name: '蒸汽眼罩', price: '¥45', status: '已下单', color: '#20c997' }
            ]
        },
        {
            kw: ['生病', '感冒', '难受', '疼', '不舒服'],
            notes: [
                '看到她说不舒服，我什么都做不了，这种感觉糟透了。',
                '真想立刻瞬移到她身边照顾她。',
                '得提醒她按时吃药，不能由着她的性子来。'
            ],
            cart: [
                { emoji: '💊', name: '感冒药 + 维生素C', price: '¥45', status: '待付款', color: '#ff4d4f' },
                { emoji: '🌡️', name: '电子体温计', price: '¥39', status: '已下单', color: '#ff9f0a' }
            ]
        },
        {
            kw: ['奶茶', '果茶', '喝的'],
            notes: [
                '她又想喝奶茶了，虽然不太健康，但今天就纵容她一次吧。'
            ],
            cart: [
                { emoji: '🧋', name: '三分糖加椰果奶茶', price: '¥18', status: '已下单', color: '#20c997' },
                { emoji: '🥤', name: '超大杯果茶', price: '¥22', status: '已下单', color: '#ffb84d' }
            ]
        },
        {
            kw: ['想吃', '零食', '饿', '好吃'],
            notes: [
                '小馋猫又饿了，下次见面带她去吃顿好的。'
            ],
            cart: [
                { emoji: '🍫', name: '一整箱进口巧克力', price: '¥199', status: '待发货', color: '#ff9f0a' },
                { emoji: '🍰', name: '她爱吃的那家小蛋糕', price: '¥68', status: '已预订', color: '#ff6699' },
                { emoji: '🍟', name: '零食大礼包', price: '¥88', status: '待付款', color: '#ffb84d' }
            ]
        },
        {
            kw: ['好看', '想要', '喜欢'],
            notes: [
                '她好像很想要那个东西，记下来。下次见面当做惊喜送给她。',
                '她喜欢的东西，我都想给她买。'
            ],
            cart: [
                { emoji: '🎁', name: '她想要的那个礼物', price: '未知', status: '加急准备中', color: '#ff4d4f' },
                { emoji: '💍', name: '一条项链', price: '¥520', status: '偷偷准备好了', color: '#8b6fd4' }
            ]
        }
    ];

    // 数据对象
    let phoneData = {
        notes: [],
        cart: [],
        lastMsgCount: 0
    };

    // 从数组中随机取 n 个
    function getRandomItems(arr, n) {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    }

    function loadData() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                phoneData = JSON.parse(raw);
            } else {
                // 首次加载：随机初始化
                initPhoneData();
            }
        } catch (e) {
            initPhoneData();
        }
    }

    function initPhoneData() {
        // 随机抽 2 条备忘录和 2 个购物车物品
        const initNotes = getRandomItems(INITIAL_NOTES_POOL, 2).map(n => ({
            ...n,
            time: Date.now() - Math.floor(Math.random() * 86400000 * 3) // 过去1-3天的随机时间
        }));
        const initCart = getRandomItems(INITIAL_CART_POOL, 2);
        
        phoneData = {
            notes: initNotes,
            cart: initCart,
            lastMsgCount: 0
        };
        saveData();
    }

    function saveData() {
        try { localStorage.setItem(KEY, JSON.stringify(phoneData)); } catch(e){}
    }

    // ========== 核心：监听聊天，自动写备忘录/加购物车 ==========
    function scanMessages() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
            if (messages.length <= phoneData.lastMsgCount) return;

            const newMsgs = messages.slice(phoneData.lastMsgCount - 5); 
            phoneData.lastMsgCount = messages.length;
            saveData();

            const userTexts = newMsgs.filter(m => m.sender === 'user' && m.text).map(m => m.text).join(' ');
            if (!userTexts) return;

            let added = false;

            TRIGGERS.forEach(trigger => {
                if (trigger.kw.some(k => userTexts.includes(k))) {
                    
                    // 1. 看看要不要加备忘录
                    if (trigger.notes && trigger.notes.length > 0) {
                        const noteText = trigger.notes[Math.floor(Math.random() * trigger.notes.length)];
                        // 如果备忘录里没有这句一模一样的话，就加进去
                        if (!phoneData.notes.some(n => n.content === noteText)) {
                            phoneData.notes.unshift({
                                time: Date.now(),
                                title: '随手记',
                                content: noteText
                            });
                            added = true;
                        }
                    }

                    // 2. 看看要不要加购物车
                    if (trigger.cart && trigger.cart.length > 0) {
                        const cartItem = trigger.cart[Math.floor(Math.random() * trigger.cart.length)];
                        // 如果购物车里没有同名物品，就加进去
                        if (!phoneData.cart.some(c => c.name === cartItem.name)) {
                            phoneData.cart.unshift({
                                ...cartItem,
                                time: Date.now()
                            });
                            added = true;
                        }
                    }
                }
            });

            if (added) saveData();
        } catch (e) {}
    }

    // 每隔 5 秒扫描一次
    setInterval(scanMessages, 5000);
    setTimeout(loadData, 1000);

    // ========== 界面渲染 ==========
    window.openHisPhone = function () {
        loadData();
        const old = document.getElementById('his-phone-panel');
        if (old) old.remove();

        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';

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
                
                <div style="height: 44px; background:#1c1c1e; display:flex; justify-content:space-between; align-items:center; padding: 0 24px; font-size: 12px; color: #fff; font-weight: 600; flex-shrink:0; z-index: 10;">
                    <span>10:24</span>
                    <div style="width: 80px; height: 24px; background: #000; border-radius: 20px; position: absolute; left: 50%; transform: translateX(-50%); top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <div style="width: 6px; height: 6px; border-radius: 50%; background: #333;"></div>
                    </div>
                    <span><i class="fas fa-signal" style="margin-right:4px;"></i><i class="fas fa-battery-three-quarters"></i></span>
                </div>

                <div style="padding: 10px 20px 15px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;">
                    <div style="font-size: 18px; font-weight: 700; color: #fff;">${pName} 的手机</div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px;">你不小心看到了他的秘密…</div>
                </div>

                <div style="flex: 1; overflow-y: auto; background: #000; padding: 15px; display: flex; flex-direction: column; gap: 15px;">
                    
                    <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #ffd60a; font-weight: 600; font-size: 14px;">
                            <i class="fas fa-file-alt"></i> 备忘录
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            ${notesHTML || '<div style="color:#666;font-size:12px;text-align:center;">暂时没有记录</div>'}
                        </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #ff9f0a; font-weight: 600; font-size: 14px;">
                            <i class="fas fa-shopping-cart"></i> 购物车
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            ${cartHTML || '<div style="color:#666;font-size:12px;text-align:center;">购物车空空的</div>'}
                        </div>
                    </div>

                </div>

                <div style="padding: 15px 20px 25px; background: #1c1c1e; flex-shrink: 0; text-align: center; border-top: 1px solid rgba(255,255,255,0.08);">
                    <button onclick="document.getElementById('his-phone-panel').remove()" style="background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 12px 0; width: 100%; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer;">锁屏退出</button>
                </div>

            </div>
        `;
        document.body.appendChild(modal);
    };

    console.log('[his-phone] 高随机性智能监听模块已加载 ✓');
})();