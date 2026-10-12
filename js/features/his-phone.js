/* ============================================================
 * his-phone.js - 他的手机（活人精简版）
 * 所有模块都会自己变化、主动新增、跟着你跟他的互动变
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisPhone_v4';

    // ============ 内容池 ============
    const MEMO_YOU = ['今天想跟她说：你笑起来的时候，我看了很久。','想说但没说的话——其实我很想抱抱你。','她今天很累，我想帮她做点什么，但不知道怎么说话。','答应自己，下次她生气的时候，先闭嘴，先抱抱她。','喜欢她喜欢到有点害怕。','她说的每一句话我都记得。哪怕她自己都忘了。','如果她能一直这么开心就好了。','我想陪她很久，久到她自己都习惯了。','今天看到她发的照片，反复看了五遍。','想告诉她：你不需要完美，我也会一直在。','我其实很怕她离开。但从没跟她说过。','她今天笑的时候，我心里"咯噔"了一下。','想每天醒来第一件事就是看到她的消息。','她难过的时候，我什么都做不了。这让我很难过。','她的名字，我好像比自己的还熟。','如果我笨拙一点也没关系，只要她懂。','她在的时候，时间过得好快。','她不在的时候，时间过得好慢。','今天想她想了 17 次。数到最后忘了。','我可能比她想象中更喜欢她。','今天她跟我说了很多话，我都记着。','她说"随便"的时候，其实很想我猜对。','她笑的时候，会先低下头。我一直没跟她说。','想牵她手的时候，手心会出汗。','其实我不太会哄人，但我愿意学。','她今天心情不太好。我猜是因为……算了。','她刚才说的那句话，我要记一晚上。','希望她睡觉的时候不做噩梦。','想成为她的习惯。','她说她没事。但她没事的时候不会这么说。'];
    const MEMO_SELF = ['今天事情有点多，但还行。','昨晚没睡好，今天状态一般。','把拖了很久的事做完了，轻松一点。','中午没吃饭，晚上要补一顿。','买的东西到了，还挺喜欢的。','路过一家店，想着下次带她来。','今天天气很好，出去走了一圈。','和朋友吃了顿饭，聊了挺久。','把桌子整理了一下，看着舒服多了。','心里有点闷，说不上来为什么。','今天听到一首歌，反复听了很久。','想休息一天，什么都不做。','晚饭煮了碗面，简单吃了。','衣服晾干了，叠好收起来了。','刚刚看到一只猫，蹲在路边看我。'];

    const ALBUM_TITLES = [
        { t:'她', e:'💙' }, { t:'偷偷存的', e:'🖼️' }, { t:'笑起来的时候', e:'😊' },
        { t:'今天', e:'📷' }, { t:'想她的时候', e:'💭' }, { t:'她不知道', e:'🤫' },
        { t:'最喜欢的', e:'⭐' }, { t:'晚安', e:'🌙' }, { t:'只看我', e:'👀' },
        { t:'一直看着', e:'🔒' }, { t:'偷拍的', e:'📸' }, { t:'反复看', e:'🔁' }
    ];

    const CALL_NAMES = [
        {n:'同事A',t:'work'}, {n:'同事B',t:'work'}, {n:'老同学',t:'friend'},
        {n:'前同事',t:'work'}, {n:'健身房教练',t:'life'}, {n:'房东',t:'life'},
        {n:'外卖',t:'life'}, {n:'快递',t:'life'}, {n:'球友',t:'friend'},
        {n:'兄弟伙',t:'friend'}, {n:'隔壁邻居',t:'life'}, {n:'你',t:'you'}
    ];
    const CALL_SHORT = ['0:08','0:12','0:18','0:24','0:36'];
    const CALL_MID   = ['1:42','2:15','3:08','4:22','5:40'];
    const CALL_LONG  = ['12:31','23:17','35:08','45:22','1:02:08'];

    const SEARCH_POOL = ['怎么哄女朋友开心','她生气了怎么道歉','女朋友说没关系是不是真的没关系','她说没事怎么回应','怎么让她开心','女朋友说累了什么意思','怎么让她觉得被在乎','异地怎么让她不孤单','女朋友爱哭怎么办','怎么回"我没事"这句话','女朋友生日送什么','怎么给女朋友惊喜','附近有什么好吃的','最近有什么新电影','周末去哪玩比较好','天气怎么样','怎么快速入睡','健身初学者怎么练','适合上班听的歌','怎么做番茄炒蛋','什么牌子的空调好','洗衣液什么牌子好','Excel 常用函数','PPT 怎么做才好看','会议纪要模板','怎么提高专注力','手机内存不够怎么办','怎么保养皮鞋','猫粮什么牌子好','租房要注意什么'];

    const CART_POOL = [
        {n:'向日葵永生花',p:168}, {n:'她上次说的那本书',p:45}, {n:'一对杯子',p:89},
        {n:'香薰蜡烛',p:78}, {n:'她喜欢的那款巧克力',p:128}, {n:'小夜灯',p:56},
        {n:'手工小挂件',p:68}, {n:'她提过的耳钉',p:199}, {n:'去她城市的车票',p:320},
        {n:'定制款钥匙扣',p:42}, {n:'她提过的那支笔',p:55}, {n:'生日蛋糕预定金',p:200},
        {n:'洗衣液补充装',p:32}, {n:'牙膏（薄荷味）',p:22}, {n:'新拖鞋',p:45},
        {n:'数据线（备用）',p:28}, {n:'无糖可乐 24 罐',p:68}, {n:'一次性洗脸巾',p:39}
    ];

    const DRAFT_POOL = ['其实我想跟你说……算了。','今天真的很想你。','你是不是有点烦我了。','我有点吃醋，但不敢说。','你要好好照顾自己。','很久没听到你的声音了。','今天有没有好好吃饭。','我没事，就是有点想你。','如果我说我想见你，你会不会觉得奇怪。','你今天发的那个表情，我保存了。','想跟你说晚安，又怕太晚吵到你。','其实那件事我一直记得。'];

    const WX_NAMES = [
        {n:'同事A',e:'💼',g:'work'}, {n:'同事B',e:'💼',g:'work'}, {n:'老同学',e:'🎓',g:'friend'},
        {n:'前同事',e:'🧑‍💻',g:'work'}, {n:'健身房教练',e:'💪',g:'life'}, {n:'房东',e:'🏠',g:'life'},
        {n:'外卖小哥',e:'🛵',g:'life'}, {n:'球友',e:'⚽',g:'friend'}, {n:'老同学L',e:'📚',g:'friend'},
        {n:'隔壁邻居',e:'👋',g:'life'}, {n:'同事群',e:'👥',g:'group'}, {n:'兄弟伙',e:'🍻',g:'friend'},
        {n:'亲戚群',e:'🧧',g:'group'}
    ];

    const WX_LINES = {
        work: {
            morning:['早，今天几点到公司','今天的会议材料记得带','昨天的报告怎么样了','客户那边催了'],
            noon:['吃饭了没','食堂今天有什么菜','一起点外卖？','中午休息一下'],
            afternoon:['三点的会别忘了','文件发你邮箱了','客户刚打电话来','明天那个方案再过一下'],
            evening:['今天能走吗','加班辛苦','明天见','先撤了，回头聊'],
            night:['还在加班？','早点休息','明天再说吧']
        },
        friend: {
            morning:['醒了没','今天上班吗','早啊'],
            noon:['中午吃啥','要不要一起','出来吃饭吗'],
            afternoon:['周末打球不','晚上有空吗','最近怎么样','哪天空了一起吃个饭'],
            evening:['在哪呢','出来喝点？','刚下班','今天累死了'],
            night:['还没睡？','睡了没','明天有事找你','晚安']
        },
        life: {
            morning:['快递到了，放门口','今天的房费记得转','通知：今天停水'],
            noon:['午餐时间，注意休息','您的订单正在配送中'],
            afternoon:['有空的话回个电话','这边有个事情需要确认一下'],
            evening:['今天的训练完成了？','明天记得带装备'],
            night:['晚安','早点休息，明天见']
        },
        group: {
            morning:['@所有人 早会记得签到','今天的日报别忘了'],
            noon:['有人一起点饭吗','食堂人多，大家晚点再去'],
            afternoon:['@所有人 下午三点例会','文件在群里了，自己看'],
            evening:['@所有人 今天辛苦了','明天的任务安排已经发群公告'],
            night:['@所有人 晚安']
        }
    };

    const WX_ABOUT_YOU = {
        happy:['今天她跟我聊了好久','她刚跟我说了一件特别有意思的事','今天感觉她心情不错','她今天好可爱','她刚刚回我消息了','今天她主动找我了，开心'],
        cold:['她好像不太想理我','今天她没怎么回我消息','我是不是说错什么了','她最近有点忙','有点想找她说话，又怕烦她','她今天回消息好慢'],
        normal:['她今天在忙吧','想找她聊天','她好像有点累']
    };

    // ============ 工具 ============
    function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
    function daysBetween(a,b){ const da=new Date(a); da.setHours(0,0,0,0); const db=new Date(b); db.setHours(0,0,0,0); return Math.round((db-da)/86400000); }
    function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function pickN(arr,n){ const c=arr.slice(); const o=[]; for(let i=0;i<n&&c.length>0;i++){ const idx=Math.floor(Math.random()*c.length); o.push(c.splice(idx,1)[0]); } return o; }
    function randInt(min,max){ return min+Math.floor(Math.random()*(max-min+1)); }
    function fmtLabel(ts){
        const d=new Date(ts); const now=new Date();
        const diff=Math.floor((now.setHours(0,0,0,0)-new Date(new Date(ts).setHours(0,0,0,0)))/86400000);
        if(diff===0) return '今天';
        if(diff===1) return '昨天';
        if(diff===2) return '前天';
        if(diff<7) return diff+' 天前';
        if(diff<30) return Math.floor(diff/7)+' 周前';
        return (d.getMonth()+1)+'月'+d.getDate()+'日';
    }
    function periodOf(h){
        if(h>=5&&h<11) return 'morning';
        if(h>=11&&h<14) return 'noon';
        if(h>=14&&h<18) return 'afternoon';
        if(h>=18&&h<22) return 'evening';
        return 'night';
    }

    // ============ 数据 ============
    let data = {
        lastUpdateDate: null,
        memos: [], albums: [], calls: [], searches: [], cart: [],
        draft: '', lockedUntil: null,
        wechat: { contacts: [], lastBuildTs: 0 }
    };
    let _loaded = false;

    async function load() {
        if (_loaded) return;
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') Object.assign(data, saved);
        } catch (e) {}
        _loaded = true;
    }
    async function persist() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }

    function getAllImages() {
        const pool = [];
        try {
            if (typeof myStickerLibrary !== 'undefined' && Array.isArray(myStickerLibrary)) myStickerLibrary.forEach(x => x && pool.push(x));
            if (typeof stickerLibrary !== 'undefined' && Array.isArray(stickerLibrary)) stickerLibrary.forEach(x => x && pool.push(x));
            if (typeof savedBackgrounds !== 'undefined' && Array.isArray(savedBackgrounds)) savedBackgrounds.forEach(b => b && b.type === 'image' && pool.push(b.value));
            const p = document.querySelector('#partner-avatar img'); if (p && p.src) pool.push(p.src);
            const m = document.querySelector('#my-avatar img'); if (m && m.src) pool.push(m.src);
        } catch (e) {}
        return Array.from(new Set(pool));
    }

    function getYourMood() {
        try {
            if (typeof messages === 'undefined' || !messages.length) return 'normal';
            const now = Date.now();
            const recent = messages.filter(m => m && m.timestamp && (now - new Date(m.timestamp).getTime()) < 3 * 86400000);
            if (!recent.length) return 'cold';
            let me = 0, them = 0;
            recent.forEach(m => { if (m.sender === 'user') me++; else if (m.sender && m.sender !== 'system') them++; });
            if (them > me * 1.5) return 'happy';
            if (me > them * 1.5 && me > 5) return 'cold';
            const last24 = recent.filter(m => (now - new Date(m.timestamp).getTime()) < 86400000);
            if (!last24.length) return 'cold';
            return 'normal';
        } catch (e) { return 'normal'; }
    }

    // ============ 每日更新 ============
    async function updateIfNeeded() {
        const today = todayStr();
        if (data.lastUpdateDate === today) return;
        const now = Date.now();
        const days = data.lastUpdateDate ? Math.max(1, daysBetween(data.lastUpdateDate, today)) : 5;

        for (let i = 0; i < days; i++) {
            const pool = Math.random() < 0.6 ? MEMO_YOU : MEMO_SELF;
            data.memos.unshift({ text: pickN(pool,1)[0], ts: now - i*86400000 });
        }
        data.memos = data.memos.slice(0, 40);

        const imgs = getAllImages();
        const albumAdd = Math.max(1, Math.ceil(days / 3));
        for (let i = 0; i < albumAdd; i++) {
            const t = pickN(ALBUM_TITLES,1)[0];
            const start = (data.albums.length * 4) % Math.max(1, imgs.length);
            data.albums.push({ title: t.t, emoji: t.e, photos: imgs.slice(start, start+4), createdAt: now - i*3*86400000 });
        }
        data.albums = data.albums.slice(-20);

        const callAdd = Math.max(1, days + randInt(0, days));
        for (let i = 0; i < callAdd; i++) {
            const c = pickN(CALL_NAMES,1)[0];
            let dur, type;
            if (c.n === '你') {
                type = Math.random() < 0.5 ? 'in' : 'out';
                dur = pickN(CALL_MID.concat(CALL_LONG),1)[0];
            } else {
                const r = Math.random();
                if (r < 0.15) { type = 'missed'; dur = '—'; }
                else type = r < 0.6 ? 'in' : 'out';
                dur = pickN(Math.random()<0.4?CALL_SHORT:(Math.random()<0.85?CALL_MID:CALL_LONG),1)[0];
            }
            data.calls.unshift({ name: c.n, type, dur, ts: now - i*86400000/2 - Math.random()*43200000 });
        }
        data.calls = data.calls.slice(0, 50);

        for (let i = 0; i < days; i++) data.searches.unshift({ text: pickN(SEARCH_POOL,1)[0], ts: now - i*86400000 });
        data.searches = data.searches.slice(0, 30);

        const cartAdd = Math.max(1, Math.ceil(days / 5));
        for (let i = 0; i < cartAdd; i++) {
            const c = pickN(CART_POOL,1)[0];
            data.cart.unshift({ name: c.n, price: c.p, ts: now - i*5*86400000 });
        }
        data.cart = data.cart.slice(0, 12);

        if (!data.draft || Math.floor(days/5) > 0) data.draft = pickN(DRAFT_POOL,1)[0];

        await buildWechat(true);
        data.lastUpdateDate = today;
        await persist();
    }

    // ============ 微信 ============
    async function buildWechat(force) {
        const now = Date.now();
        const period = periodOf(new Date().getHours());
        const mood = getYourMood();
        const wx = data.wechat || { contacts: [], lastBuildTs: 0 };
        const need = force || !wx.lastBuildTs || (now - wx.lastBuildTs) > 3*3600000;

        if (need || !wx.contacts.length) {
            const pool = WX_NAMES.slice().sort(() => Math.random() - 0.5);
            const picked = pool.slice(0, randInt(4,6)).map(c => ({ name: c.n, emoji: c.e, tag: c.g, chats: [] }));
            picked.unshift({ name: '她', emoji: '💗', tag: 'you', chats: [] });
            picked.forEach(c => { c.chats = genChat(c, period, mood, now); });
            data.wechat = { contacts: picked, lastBuildTs: now };
            return;
        }
        if (Math.random() < 0.35) {
            const exist = new Set(wx.contacts.map(c => c.name));
            const cands = WX_NAMES.filter(c => !exist.has(c.n));
            if (cands.length && wx.contacts.length < 9) {
                const nc = cands[Math.floor(Math.random()*cands.length)];
                wx.contacts.push({ name: nc.n, emoji: nc.e, tag: nc.g, chats: genChat({ tag: nc.g }, period, mood, now) });
            } else {
                const i = 1 + Math.floor(Math.random()*Math.max(1, wx.contacts.length-1));
                if (wx.contacts[i]) {
                    const m = pickChatLine(wx.contacts[i], period, now, 0, 0, mood);
                    if (m) wx.contacts[i].chats.push(m);
                }
            }
            wx.lastBuildTs = now;
        }
    }

    function genChat(contact, period, mood, now) {
        const count = randInt(2,5);
        const out = [];
        for (let i = 0; i < count; i++) {
            const m = pickChatLine(contact, period, now, i, count, mood);
            if (m) out.push(m);
        }
        return out;
    }

    function pickChatLine(contact, period, now, index, total, mood) {
        if (contact.tag === 'you') {
            const lines = {
                morning:['醒了没','早啊','今天要开心'],
                noon:['吃饭了没','在忙吗','想你了'],
                afternoon:['在干嘛','有没有想我','今天怎么样'],
                evening:['下班了吗','今晚吃什么','在做什么'],
                night:['睡了没','早点休息','晚安，好梦']
            };
            const arr = lines[period] || lines.night;
            return { from: Math.random()<0.5?'me':'them', text: arr[Math.floor(Math.random()*arr.length)], ts: randInt(5,60) };
        }
        if (index === total-1 && Math.random() < 0.30) {
            const key = mood==='happy'?'happy':(mood==='cold'?'cold':'normal');
            const pool = WX_ABOUT_YOU[key];
            if (pool) return { from: 'me', text: pool[Math.floor(Math.random()*pool.length)], ts: randInt(5,120) };
        }
        const byTag = WX_LINES[contact.tag] || WX_LINES.friend;
        const arr = byTag[period] || byTag.night;
        if (!arr || !arr.length) return null;
        return { from: Math.random()<0.6?'them':'me', text: arr[Math.floor(Math.random()*arr.length)], ts: randInt(5,200) };
    }

    // ============ 锁屏 ============
    function isLocked() {
        if (!data.lockedUntil) return false;
        if (Date.now() >= data.lockedUntil) { data.lockedUntil = null; persist(); return false; }
        return true;
    }

    window.openHisPhonePanel = async function () {
        const old = document.getElementById('his-phone-panel');
        if (old) old.remove();
        await load();
        await updateIfNeeded();

        const modal = document.createElement('div');
        modal.id = 'his-phone-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.75);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML =
            '<div style="position:relative;width:100%;max-width:340px;">'
            + '<button id="hp-close" style="position:absolute;top:-38px;right:0;background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">×</button>'
            + '<div style="background:#000;border-radius:38px;padding:10px;box-shadow:0 30px 80px rgba(0,0,0,0.7),0 0 0 2px #2a2a2a;">'
            +   '<div style="background:#1a1a1a;border-radius:30px;overflow:hidden;position:relative;">'
            +     '<div style="background:#000;padding:10px 18px 6px;display:flex;justify-content:space-between;color:#fff;font-size:11px;">'
            +       '<span id="hp-status-time">--:--</span><span>🔋 100% · 📶</span>'
            +     '</div>'
            +     '<div id="hp-screen" style="background:linear-gradient(160deg,#1a1a1a,#0d0d0d);min-height:440px;padding:20px 18px 24px;color:#fff;"></div>'
            +     '<div style="background:#000;padding:8px 0 10px;display:flex;justify-content:center;">'
            +       '<div style="width:100px;height:4px;background:#333;border-radius:2px;"></div>'
            +     '</div>'
            +   '</div>'
            + '</div></div>';
        document.body.appendChild(modal);

        const timeEl = modal.querySelector('#hp-status-time');
        const tick = () => { const d = new Date(); timeEl.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); };
        tick();
        const timer = setInterval(tick, 30000);

        const close = () => { clearInterval(timer); modal.remove(); };
        modal.querySelector('#hp-close').onclick = close;
        modal.addEventListener('click', e => { if (e.target === modal) close(); });

        renderLock(modal.querySelector('#hp-screen'), modal);
    };

    function renderLock(screen, modal) {
        if (isLocked()) {
            const remain = Math.ceil((data.lockedUntil - Date.now()) / 60000);
            screen.innerHTML = '<div style="min-height:440px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 20px;text-align:center;">'
                + '<div style="font-size:56px;margin-bottom:20px;filter:grayscale(0.5);">🔒</div>'
                + '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:10px;">他发现了</div>'
                + '<div style="font-size:12.5px;color:rgba(255,255,255,0.6);line-height:1.8;margin-bottom:20px;">他好像察觉到有人在看他的手机。<br>暂时打不开了。</div>'
                + '<div style="font-size:13px;color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.06);padding:10px 18px;border-radius:12px;">还需 ' + remain + ' 分钟</div></div>';
            return;
        }
        if (Math.random() < 0.30) { renderHome(screen, modal); return; }

        const secret = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const wd = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
        const dateStr = (now.getMonth()+1) + '月' + now.getDate() + '日 ' + wd[now.getDay()];

        const build = (label) => '<div style="text-align:center;margin-top:20px;">'
            + '<div style="font-size:58px;font-weight:200;color:#fff;letter-spacing:-2px;line-height:1;font-family:-apple-system,sans-serif;">' + hh + ':' + mm + '</div>'
            + '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:10px;letter-spacing:1px;">' + dateStr + '</div></div>'
            + '<div style="text-align:center;font-size:11.5px;color:rgba(255,255,255,0.5);margin-top:22px;letter-spacing:0.5px;">' + label + '</div>'
            + '<div id="hp-pwd-dots" style="display:flex;justify-content:center;gap:16px;margin-top:18px;">'
            + [0,1,2,3].map(i => '<div class="hp-pwd-circle" data-i="' + i + '" style="width:14px;height:14px;border-radius:50%;background:transparent;border:1.5px solid rgba(255,255,255,0.35);transition:all 0.15s ease;"></div>').join('')
            + '</div>'
            + '<div id="hp-keypad" style="display:flex;flex-direction:column;align-items:center;margin-top:14px;">'
            + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%;max-width:280px;">'
            + [{n:'1',l:''},{n:'2',l:'ABC'},{n:'3',l:'DEF'},{n:'4',l:'GHI'},{n:'5',l:'JKL'},{n:'6',l:'MNO'},{n:'7',l:'PQRS'},{n:'8',l:'TUV'},{n:'9',l:'WXYZ'},{n:'✱',l:''},{n:'0',l:'+'},{n:'#',l:''}]
                .map(k => {
                    const sp = k.n === '✱' || k.n === '#';
                    return '<div class="hp-key" data-k="' + k.n + '" style="width:64px;height:64px;border-radius:50%;background:#f0f0f0;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto;cursor:pointer;transition:all 0.1s ease;user-select:none;color:#333;">'
                        + '<span style="font-size:' + (sp ? '20px' : '28px') + ';font-weight:400;line-height:1;margin-bottom:1px;color:#000;">' + k.n + '</span>'
                        + '<span style="font-size:7.5px;font-weight:500;color:#888;letter-spacing:1.2px;text-transform:uppercase;line-height:1;">' + k.l + '</span></div>';
                }).join('')
            + '</div>'
            + '<div style="display:flex;justify-content:flex-end;margin-top:12px;width:100%;max-width:280px;padding-right:4px;">'
            + '<div class="hp-key" data-k="⌫" style="width:44px;height:44px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;user-select:none;color:#fff;font-size:20px;">⌫</div></div></div>'
            + '<div id="hp-hint-msg" style="text-align:center;font-size:11px;color:rgba(255,255,255,0.35);margin-top:18px;height:14px;">' + (label === '他正在输入…' ? '看仔细了' : '凭记忆输入') + '</div>';

        screen.innerHTML = '<div style="min-height:440px;display:flex;flex-direction:column;padding:10px 8px 0;">' + build('他正在输入…') + '</div>';

        const dots = screen.querySelectorAll('.hp-pwd-circle');
        const keys = screen.querySelectorAll('.hp-key');

        const setDots = n => dots.forEach((d, i) => {
            if (i < n) { d.style.background = '#fff'; d.style.borderColor = '#fff'; }
            else { d.style.background = 'transparent'; d.style.borderColor = 'rgba(255,255,255,0.35)'; }
        });
        const flash = k => {
            const el = Array.from(keys).find(x => x.dataset.k === k);
            if (!el) return;
            const back = k === '⌫';
            el.style.background = back ? 'rgba(0,0,0,0.2)' : '#d0d0d0';
            setTimeout(() => { el.style.background = back ? '#333' : '#f0f0f0'; }, 100);
        };

        let i = 0;
        const step = () => {
            if (!document.body.contains(screen)) return;
            if (i >= 4) {
                setTimeout(() => { if (!document.body.contains(screen)) return; setDots(0); showInput(screen, modal, secret, hh, mm, dateStr); }, 1000);
                return;
            }
            flash(secret[i]); setDots(i + 1); i++;
            setTimeout(step, 350);
        };
        setTimeout(step, 500);
    }

    function showInput(screen, modal, secret, hh, mm, dateStr) {
        const now = new Date();
        const wd = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
        const dateStr2 = (now.getMonth()+1) + '月' + now.getDate() + '日 ' + wd[now.getDay()];

        screen.innerHTML = '<div style="min-height:440px;display:flex;flex-direction:column;padding:10px 8px 0;">'
            + '<div style="text-align:center;margin-top:20px;">'
            + '<div style="font-size:58px;font-weight:200;color:#fff;letter-spacing:-2px;line-height:1;font-family:-apple-system,sans-serif;">' + hh + ':' + mm + '</div>'
            + '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:10px;">' + dateStr2 + '</div></div>'
            + '<div style="text-align:center;font-size:11.5px;color:rgba(255,255,255,0.5);margin-top:22px;">该你了</div>'
            + '<div id="hp-pwd-dots" style="display:flex;justify-content:center;gap:16px;margin-top:18px;">'
            + [0,1,2,3].map(i => '<div class="hp-pwd-circle" data-i="' + i + '" style="width:14px;height:14px;border-radius:50%;background:transparent;border:1.5px solid rgba(255,255,255,0.35);transition:all 0.15s ease;"></div>').join('')
            + '</div>'
            + '<div id="hp-keypad" style="display:flex;flex-direction:column;align-items:center;margin-top:14px;">'
            + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%;max-width:280px;">'
            + [{n:'1',l:''},{n:'2',l:'ABC'},{n:'3',l:'DEF'},{n:'4',l:'GHI'},{n:'5',l:'JKL'},{n:'6',l:'MNO'},{n:'7',l:'PQRS'},{n:'8',l:'TUV'},{n:'9',l:'WXYZ'},{n:'✱',l:''},{n:'0',l:'+'},{n:'#',l:''}]
                .map(k => {
                    const sp = k.n === '✱' || k.n === '#';
                    return '<div class="hp-key" data-k="' + k.n + '" style="width:64px;height:64px;border-radius:50%;background:#f0f0f0;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto;cursor:pointer;transition:all 0.1s ease;user-select:none;color:#333;">'
                        + '<span style="font-size:' + (sp ? '20px' : '28px') + ';font-weight:400;line-height:1;margin-bottom:1px;color:#000;">' + k.n + '</span>'
                        + '<span style="font-size:7.5px;font-weight:500;color:#888;letter-spacing:1.2px;text-transform:uppercase;line-height:1;">' + k.l + '</span></div>';
                }).join('')
            + '</div>'
            + '<div style="display:flex;justify-content:flex-end;margin-top:12px;width:100%;max-width:280px;padding-right:4px;">'
            + '<div class="hp-key" data-k="⌫" style="width:44px;height:44px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;user-select:none;color:#fff;font-size:20px;">⌫</div></div></div>'
            + '<div id="hp-hint-msg" style="text-align:center;font-size:11px;color:rgba(255,255,255,0.35);margin-top:18px;height:14px;">输错就直接被发现</div></div>';

        let input = '';
        const dots = screen.querySelectorAll('.hp-pwd-circle');
        const keys = screen.querySelectorAll('.hp-key');
        const msg = screen.querySelector('#hp-hint-msg');

        const refresh = () => dots.forEach((d, i) => {
            if (i < input.length) { d.style.background = '#fff'; d.style.borderColor = '#fff'; }
            else { d.style.background = 'transparent'; d.style.borderColor = 'rgba(255,255,255,0.35)'; }
        });
        const flash = k => {
            const el = Array.from(keys).find(x => x.dataset.k === k);
            if (!el) return;
            const back = k === '⌫';
            el.style.background = back ? 'rgba(0,0,0,0.2)' : '#d0d0d0';
            setTimeout(() => { el.style.background = back ? '#333' : '#f0f0f0'; }, 100);
        };
        const tryUnlock = () => {
            if (input.length !== 4) return;
            if (input === secret) {
                msg.style.color = '#7BC8A4'; msg.textContent = '✓ 解锁成功';
                setTimeout(() => {
                    screen.style.transition = 'opacity 0.35s ease';
                    screen.style.opacity = '0';
                    setTimeout(() => { screen.style.transition = ''; screen.style.opacity = ''; renderHome(screen, modal); }, 350);
                }, 400);
            } else {
                msg.style.color = '#FF6B6B'; msg.textContent = '……被发现了';
                data.lockedUntil = Date.now() + 3600000;
                persist();
                screen.style.background = 'rgba(180,40,40,0.4)';
                setTimeout(() => {
                    screen.style.background = '';
                    screen.style.transition = 'opacity 0.5s ease';
                    screen.style.opacity = '0';
                    setTimeout(() => { screen.style.transition = ''; screen.style.opacity = ''; renderLock(screen, modal); }, 500);
                }, 200);
            }
        };

        keys.forEach(el => {
            el.addEventListener('click', () => {
                const k = el.dataset.k;
                flash(k);
                if (k === '⌫') input = input.slice(0, -1);
                else if (/^[0-9✱#]$/.test(k) && input.length < 4) input += k;
                refresh();
                if (input.length === 4) setTimeout(tryUnlock, 150);
            });
        });
    }

    // ============ 主屏 ============
    function renderHome(screen, modal) {
        const icons = [
            { id: 'album',   icon: '🖼️', label: '相册' },
            { id: 'wechat',  icon: '💚', label: '微信' },
            { id: 'memo',    icon: '📝', label: '备忘录' },
            { id: 'call',    icon: '📞', label: '通话' },
            { id: 'search',  icon: '🔍', label: '搜索记录' },
            { id: 'cart',    icon: '🛒', label: '购物车' },
            { id: 'message', icon: '💬', label: '短信' }
        ];
        screen.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-align:center;margin-bottom:22px;font-weight:600;">他的手机</div>'
            + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px 16px;">'
            + icons.map(it => '<div class="hp-icon" data-id="' + it.id + '" style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;">'
                + '<div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03));border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:24px;">' + it.icon + '</div>'
                + '<div style="font-size:11px;color:rgba(255,255,255,0.75);text-align:center;">' + it.label + '</div></div>').join('')
            + '</div>'
            + '<div style="margin-top:28px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.6);line-height:1.6;text-align:center;">💭 这些都不是他告诉你的，<br>是你偷偷看到的</div>';

        screen.querySelectorAll('.hp-icon').forEach(el => {
            el.onclick = () => {
                const id = el.dataset.id;
                if (id === 'album') renderAlbum(screen, modal);
                if (id === 'wechat') renderWechatList(screen, modal);
                if (id === 'memo') renderMemo(screen, modal);
                if (id === 'call') renderCall(screen, modal);
                if (id === 'search') renderSearch(screen, modal);
                if (id === 'cart') renderCart(screen, modal);
                if (id === 'message') renderMessage(screen, modal);
            };
        });
    }

    function header(title) {
        return '<div style="display:flex;align-items:center;margin-bottom:18px;">'
            + '<div class="hp-back" style="cursor:pointer;color:#fff;font-size:22px;padding:0 12px 2px 0;line-height:1;">‹</div>'
            + '<div style="font-size:15px;font-weight:600;color:#fff;">' + title + '</div></div>';
    }
    function bindBack(screen, modal) {
        const b = screen.querySelector('.hp-back');
        if (b) b.onclick = () => renderHome(screen, modal);
    }

    // ============ 相册 ============
    let albumIdx = 0;
    function renderAlbum(screen, modal, idx) {
        if (typeof idx === 'number') albumIdx = idx;
        const albums = (data.albums || []).slice().sort((a,b) => (b.createdAt||0)-(a.createdAt||0));
        if (!albums.length) {
            screen.innerHTML = header('相册') + '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.4);font-size:12px;">还没有相册</div>';
            bindBack(screen, modal); return;
        }
        if (albumIdx >= albums.length) albumIdx = 0;
        if (albumIdx < 0) albumIdx = albums.length - 1;
        const cur = albums[albumIdx];
        const dateLabel = cur.createdAt ? fmtLabel(cur.createdAt) : '';

        const nav = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
            + '<button class="hp-album-prev" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;">‹</button>'
            + '<div style="text-align:center;"><div style="font-size:13px;color:rgba(255,255,255,0.9);font-weight:600;">' + cur.emoji + ' ' + esc(cur.title) + '</div>'
            + '<div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:3px;">' + dateLabel + ' · ' + (albumIdx+1) + ' / ' + albums.length + '</div></div>'
            + '<button class="hp-album-next" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;">›</button></div>';

        let grid;
        if (!cur.photos || !cur.photos.length) {
            grid = '<div style="text-align:center;padding:40px 20px;color:rgba(255,255,255,0.4);font-size:12px;">这个相册还没有照片<br><span style="font-size:10px;opacity:0.6;">（去"我的表情"里传几张试试）</span></div>';
        } else {
            grid = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">'
                + cur.photos.map(p => '<div class="hp-photo" data-src="' + String(p).replace(/"/g,'&quot;') + '" style="aspect-ratio:1/1;border-radius:8px;overflow:hidden;background:#222;cursor:pointer;"><img src="' + p + '" style="width:100%;height:100%;object-fit:cover;display:block;"></div>').join('')
                + '</div>';
        }
        screen.innerHTML = header('相册') + nav + grid;
        bindBack(screen, modal);
        const prev = screen.querySelector('.hp-album-prev');
        const next = screen.querySelector('.hp-album-next');
        if (prev) prev.onclick = () => renderAlbum(screen, modal, albumIdx + 1);
        if (next) next.onclick = () => renderAlbum(screen, modal, albumIdx - 1);
        screen.querySelectorAll('.hp-photo').forEach(el => {
            el.onclick = () => showPhoto(el.dataset.src, modal);
        });
    }
    function showPhoto(src, modal) {
        const old = document.getElementById('hp-photo-large'); if (old) old.remove();
        const el = document.createElement('div');
        el.id = 'hp-photo-large';
        el.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.92);z-index:100;display:flex;align-items:center;justify-content:center;border-radius:30px;cursor:pointer;';
        el.innerHTML = '<img src="' + src + '" style="max-width:92%;max-height:88%;object-fit:contain;border-radius:8px;">';
        modal.querySelector('#hp-screen').parentElement.appendChild(el);
        el.onclick = () => el.remove();
    }

    // ============ 微信 ============
    async function renderWechatList(screen, modal) {
        await buildWechat(false);
        await persist();
        const contacts = (data.wechat && data.wechat.contacts) || [];
        const list = contacts.map((c, idx) => {
            const last = c.chats && c.chats[c.chats.length-1];
            const preview = last ? (last.from==='me'?'我：'+last.text:last.text) : '（还没聊）';
            const isYou = c.name === '她';
            return '<div class="hp-wechat-item" data-idx="' + idx + '" style="display:flex;align-items:center;gap:12px;padding:14px 12px;background:' + (isYou?'rgba(255,77,109,0.08)':'rgba(255,255,255,0.04)') + ';border-radius:12px;margin-bottom:8px;cursor:pointer;">'
                + '<div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">' + c.emoji + '</div>'
                + '<div style="flex:1;min-width:0;">'
                + '<div style="font-size:13.5px;font-weight:' + (isYou?'700':'600') + ';color:' + (isYou?'#FF4D6D':'#fff') + ';margin-bottom:4px;">' + esc(c.name) + '</div>'
                + '<div style="font-size:11.5px;color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(preview) + '</div></div></div>';
        }).join('');
        screen.innerHTML = header('微信') + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">他最近跟谁在聊</div>' + list;
        bindBack(screen, modal);
        screen.querySelectorAll('.hp-wechat-item').forEach(el => {
            el.onclick = () => renderWechatChat(screen, modal, contacts[parseInt(el.dataset.idx,10)]);
        });
    }

    function renderWechatChat(screen, modal, contact) {
        if (!contact || !contact.chats) { renderWechatList(screen, modal); return; }
        const now = new Date();
        const tLabel = off => { const t = new Date(now.getTime() - off*60000); return String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0'); };
        const sorted = contact.chats.slice().sort((a,b) => b.ts - a.ts);
        const html = sorted.map(m => {
            const isMe = m.from === 'me';
            return '<div style="display:flex;' + (isMe?'justify-content:flex-end;':'') + ';margin-bottom:10px;">'
                + '<div style="max-width:72%;">'
                + '<div style="background:' + (isMe?'#07C160':'rgba(255,255,255,0.08)') + ';color:#fff;padding:10px 14px;border-radius:' + (isMe?'14px 14px 4px 14px':'14px 14px 14px 4px') + ';font-size:13px;line-height:1.5;word-break:break-word;">' + esc(m.text) + '</div>'
                + '<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px;text-align:' + (isMe?'right':'left') + ';padding:0 4px;">' + tLabel(m.ts) + '</div></div></div>';
        }).join('');
        screen.innerHTML = '<div style="display:flex;align-items:center;margin-bottom:18px;">'
            + '<div class="hp-back" style="cursor:pointer;color:#fff;font-size:22px;padding:0 12px 2px 0;">‹</div>'
            + '<div style="font-size:15px;font-weight:600;color:#fff;">' + esc(contact.name) + '</div></div>'
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;text-align:center;">—— 以下内容你都看到了 ——</div>'
            + html;
        const back = screen.querySelector('.hp-back');
        if (back) back.onclick = () => renderWechatList(screen, modal);
    }

    // ============ 其他模块 ============
    function renderMemo(screen, modal) {
        const memos = (data.memos || []).slice().sort((a,b) => b.ts - a.ts);
        const list = !memos.length
            ? '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.4);font-size:12px;">还没有笔记</div>'
            : memos.map(m => '<div style="padding:12px 14px;background:rgba(255,255,255,0.05);border-radius:10px;margin-bottom:8px;border-left:3px solid rgba(255,255,255,0.15);">'
                + '<div style="font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:6px;">' + fmtLabel(m.ts) + '</div>'
                + '<div style="font-size:13px;color:rgba(255,255,255,0.9);line-height:1.7;">' + esc(m.text) + '</div></div>').join('');
        screen.innerHTML = header('备忘录') + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">他写给你的，但没告诉过你</div>' + list;
        bindBack(screen, modal);
    }

    function renderCall(screen, modal) {
        const calls = (data.calls || []).slice().sort((a,b) => b.ts - a.ts);
        const list = calls.map(c => {
            const isYou = c.name === '你';
            const isMissed = c.type === 'missed';
            const icon = isMissed ? '📵' : (c.type === 'in' ? '↙️' : '↗️');
            const color = isMissed ? '#FF6B6B' : (isYou ? '#7FA6CD' : 'rgba(255,255,255,0.6)');
            return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,' + (isYou?'0.08':'0.04') + ');border-radius:10px;margin-bottom:6px;">'
                + '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">' + (isYou?'💙':'👤') + '</div>'
                + '<div style="flex:1;min-width:0;">'
                + '<div style="font-size:13.5px;color:' + color + ';font-weight:' + (isYou?'600':'500') + ';">' + esc(c.name) + '</div>'
                + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">' + icon + ' ' + c.dur + '</div></div>'
                + '<div style="font-size:11px;color:rgba(255,255,255,0.4);">' + (c.ts?fmtLabel(c.ts):'') + '</div></div>';
        }).join('');
        screen.innerHTML = header('通话记录') + list;
        bindBack(screen, modal);
    }

    function renderSearch(screen, modal) {
        const arr = (data.searches || []).slice().sort((a,b) => b.ts - a.ts);
        const list = arr.map(s => '<div style="padding:11px 14px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">'
            + '<span style="font-size:12px;color:rgba(255,255,255,0.35);">🔍</span>'
            + '<span style="flex:1;font-size:12.5px;color:rgba(255,255,255,0.85);">' + esc(s.text) + '</span>'
            + '<span style="font-size:10.5px;color:rgba(255,255,255,0.3);">' + fmtLabel(s.ts) + '</span></div>').join('');
        screen.innerHTML = header('搜索记录') + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">他最近搜过……</div>' + list;
        bindBack(screen, modal);
    }

    function renderCart(screen, modal) {
        const arr = (data.cart || []).slice().sort((a,b) => b.ts - a.ts);
        const list = arr.map(c => '<div style="padding:12px 14px;background:rgba(255,255,255,0.05);border-radius:10px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">'
            + '<span style="font-size:18px;">🎁</span><div style="flex:1;min-width:0;">'
            + '<div style="font-size:13px;color:rgba(255,255,255,0.9);">' + esc(c.name) + '</div>'
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">¥ ' + c.price + ' · ' + fmtLabel(c.ts) + '</div></div>'
            + '<div style="font-size:11px;color:rgba(255,255,255,0.35);">未下单</div></div>').join('');
        screen.innerHTML = header('购物车') + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">他纠结着还没买的</div>' + list;
        bindBack(screen, modal);
    }

    function renderMessage(screen, modal) {
        const draft = data.draft || '';
        screen.innerHTML = header('短信')
            + '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:14px;">一条没发出去的草稿</div>'
            + '<div style="padding:14px 16px;background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">'
            + '<div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:8px;">收件人：你</div>'
            + '<div style="font-size:13px;color:rgba(255,255,255,0.9);line-height:1.85;">' + esc(draft) + '</div>'
            + '<div style="font-size:11px;color:rgba(255,255,255,0.35);text-align:right;margin-top:12px;">未发送</div></div>';
        bindBack(screen, modal);
    }

    // ============ 初始化 ============
    window.initHisPhone = () => load().then(() => updateIfNeeded());

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(window.initHisPhone, 2500));
    } else {
        setTimeout(window.initHisPhone, 2500);
    }

    console.log('[his-phone] 他的手机（活人精简版）已加载 ✓');
})();