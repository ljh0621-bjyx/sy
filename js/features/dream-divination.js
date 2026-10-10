/* ============================================================
 * dream-divination.js - 梦向占卜（塔罗 + 雷诺曼）
 * 内置完整牌意，无需用户上传
 * ============================================================ */
(function () {
    'use strict';

    const KEY = getStorageKey('dreamDivinationHistory_v1');
const CHANCE_KEY = getStorageKey('dreamDivinationChance');

    /* ==================== 塔罗牌（78张，含牌意） ==================== */
    const TAROT_MAJOR = [
        { name:'愚人', eng:'The Fool', icon:'🌱', keyword:'启程 · 天真 · 信任',
          upright:'抛开世俗的顾虑，带着赤子之心纵身一跃。新的旅程正在召唤你，未知不是危险，而是礼物。放下"我必须准备好"的执念，勇气本身就足够。',
          reversed:'鲁莽、逃避责任、不敢落地。你可能在用"随性"掩盖恐惧，或是在关系与选择里拖延成熟。停一停，先问清自己真正想要的。' },
        { name:'魔术师', eng:'The Magician', icon:'🪄', keyword:'创造 · 显化 · 意志',
          upright:'你手里已经握有全部工具——问题只是你还不知道自己有。此刻适合把想法落地：谈判、表白、启动项目、下定心意。宇宙在配合你说"我可以"。',
          reversed:'能量被浪费、才华被搁置、被自我怀疑困住。也可能有人正在用话术迷惑你。谨防"说得比做得好听"。' },
        { name:'女祭司', eng:'The High Priestess', icon:'🌙', keyword:'直觉 · 秘密 · 静默',
          upright:'答案不在外面，在你自己心里。现在的你需要少说话多感受，梦境、直觉、突然闪过的念头都是提示。有人在悄悄观察你。',
          reversed:'忽视直觉、情绪被压抑、被表象迷惑。你可能在合理化一段本就不对的关系。' },
        { name:'女帝', eng:'The Empress', icon:'🌷', keyword:'丰盛 · 母性 · 感官',
          upright:'你被滋养着，也正在滋养他人。适合照顾身体、布置空间、享受美与爱。感情中意味着温柔包容、被珍惜、被偏爱。',
          reversed:'过度付出、忽略自己、创造力停滞。也可能是情感里"爱得太用力"而失衡。' },
        { name:'皇帝', eng:'The Emperor', icon:'👑', keyword:'秩序 · 权威 · 边界',
          upright:'是时候建立规则和边界了。稳、实、有担当。感情中代表一位可靠但略显强势的人，或是关系走向稳定承诺。',
          reversed:'控制欲过强、权威压人、僵化。也可能是你自己在逃避做决定。' },
        { name:'教皇', eng:'The Hierophant', icon:'⛪', keyword:'传统 · 指引 · 信念',
          upright:'有人正在给你善意的建议，或是你适合走一条被验证过的路。感情中常出现见家长、正式化、谈婚论嫁的讯号。',
          reversed:'叛逆传统、质疑权威、不想被定义。也可能暗示不合常规的关系形态。' },
        { name:'恋人', eng:'The Lovers', icon:'💞', keyword:'选择 · 结合 · 共鸣',
          upright:'心与心的真正连接。你可能正面临一个重要的选择，而这个选择关于"你要成为怎样的人"。爱在此刻是真实的。',
          reversed:'关系失衡、价值观冲突、犹豫不决。也可能是诱惑与责任的拉扯。' },
        { name:'战车', eng:'The Chariot', icon:'🐎', keyword:'意志 · 胜利 · 前进',
          upright:'目标明确、势不可挡。用意志驾驭矛盾的两股力量。这段关系或这件事，只要你肯往前推，就会赢。',
          reversed:'失控、方向不明、内耗。也可能有人在你们之间横加阻力。' },
        { name:'力量', eng:'Strength', icon:'🦁', keyword:'温柔的勇气 · 耐心 · 驯服',
          upright:'真正的强大不是压制，而是温柔地驯服。你有能力用耐心化解冲突、用柔软赢得人心。感情中常代表一方在包容另一方。',
          reversed:'自我怀疑、被情绪吞噬、失去耐心。' },
        { name:'隐士', eng:'The Hermit', icon:'🕯️', keyword:'独处 · 内省 · 寻求',
          upright:'需要退回到自己里面。他在想你，只是不擅长表达；你也在想他，但需要先想清楚自己。适合沉淀、复盘、等待。',
          reversed:'孤立、逃避、拒绝被帮助。' },
        { name:'命运之轮', eng:'Wheel of Fortune', icon:'🎡', keyword:'转机 · 循环 · 时机',
          upright:'命运的齿轮开始转动，一个阶段正在结束，新的周期开启。意料之外的重逢、消息或机会。顺势而为比抵抗更重要。',
          reversed:'时运不济、循环被卡、抗拒改变。' },
        { name:'正义', eng:'Justice', icon:'⚖️', keyword:'公正 · 因果 · 平衡',
          upright:'一切都在被结算。你的付出会被看见，你的逃避也会被清算。感情中代表需要坦诚沟通、给关系一个"公平"的答案。',
          reversed:'不公、被冤枉、逃避责任。' },
        { name:'倒吊人', eng:'The Hanged Man', icon:'🙃', keyword:'暂停 · 换视角 · 牺牲',
          upright:'停下来，反而是一种前进。此刻不行动比行动更有力量。当你能从对方角度看问题时，困局会松动。',
          reversed:'无谓的牺牲、拖延、钻牛角尖。' },
        { name:'死神', eng:'Death', icon:'🦋', keyword:'结束 · 蜕变 · 重生',
          upright:'一段旧的关系形态、旧的身份、旧的执念正在结束。这不是失去，是空间被腾出来给新东西。允许自己哀悼，也允许自己重生。',
          reversed:'抗拒结束、拖延蜕变、卡在原地。' },
        { name:'节制', eng:'Temperance', icon:'🏺', keyword:'调和 · 中庸 · 疗愈',
          upright:'两股力量正在被温柔地融合。适合修复关系、调整节奏、耐心等待愈合。此刻的你，正在被慢慢调成对的温度。',
          reversed:'失衡、极端、缺乏耐心。' },
        { name:'恶魔', eng:'The Devil', icon:'😈', keyword:'执着 · 欲望 · 束缚',
          upright:'强烈的吸引、纠缠、难以割舍。有时是关于身体和欲望，有时是关于"明知不合适却放不下"。提醒你：链子其实是你自己挂上的。',
          reversed:'挣脱束缚、看清真相、重获自由。' },
        { name:'高塔', eng:'The Tower', icon:'🌩️', keyword:'崩解 · 真相 · 顿悟',
          upright:'一个突然的真相砸下来，旧的认知崩塌。痛苦，但必要。被震碎的都是本就不牢的东西。' ,
          reversed:'避免崩塌、内在瓦解、恐惧改变。' },
        { name:'星星', eng:'The Star', icon:'⭐', keyword:'希望 · 疗愈 · 指引',
          upright:'暴风雨之后的宁静夜空。你正在被治愈，也正在成为别人的光。许愿吧，宇宙此刻听得见。感情中代表纯粹的心意。',
          reversed:'失去信心、灰心、看不到希望。' },
        { name:'月亮', eng:'The Moon', icon:'🌕', keyword:'幻象 · 潜意识 · 不安',
          upright:'雾里的世界，看不清但不代表危险。你可能过度解读了某些细节，或是被自己的不安放大。梦境会给你答案。',
          reversed:'走出迷雾、真相浮现、恐惧消散。' },
        { name:'太阳', eng:'The Sun', icon:'☀️', keyword:'喜悦 · 清晰 · 成功',
          upright:'一切都会明朗起来。真诚的快乐、被看见的成功、毫无阴霾的爱。这是塔罗中最幸运的牌之一。',
          reversed:'短暂的低落、过度乐观、快乐被延迟。' },
        { name:'审判', eng:'Judgement', icon:'📯', keyword:'觉醒 · 召唤 · 复活',
          upright:'一个重要的觉醒时刻，过去的一切在此刻被重新理解。你被召唤去做一个决定——关于关系、关于自己。原谅过去的自己，然后向前。',
          reversed:'逃避决定、自我怀疑、沉溺过去。' },
        { name:'世界', eng:'The World', icon:'🌍', keyword:'圆满 · 完成 · 整合',
          upright:'一个周期圆满收尾，你抵达了曾经向往的地方。感情中代表"对的人"、修成正果、旅程完成。深呼吸，享受它。',
          reversed:'迟迟未完成、缺乏闭环、留下遗憾。' }
    ];

    const TAROT_SUITS = {
        wands: { label:'权杖', icon:'🔥', element:'火', theme:'行动 · 热情 · 创造' },
        cups: { label:'圣杯', icon:'💧', element:'水', theme:'情感 · 关系 · 直觉' },
        swords: { label:'宝剑', icon:'⚔️', element:'风', theme:'思想 · 冲突 · 真相' },
        pentacles: { label:'星币', icon:'🪙', element:'土', theme:'物质 · 身体 · 实践' }
    };

    function buildMinorCards() {
        const cards = [];
        const ranks = [
            { num:'Ace', cn:'一', meaning:'新的开始、纯粹的能量' },
            { num:'2', cn:'二', meaning:'二元、选择、平衡' },
            { num:'3', cn:'三', meaning:'成长、协作、初步成果' },
            { num:'4', cn:'四', meaning:'稳定、停顿、基础' },
            { num:'5', cn:'五', meaning:'冲突、挑战、失去' },
            { num:'6', cn:'六', meaning:'和谐、给予、过渡' },
            { num:'7', cn:'七', meaning:'评估、坚持、幻象' },
            { num:'8', cn:'八', meaning:'力量、速度、精进' },
            { num:'9', cn:'九', meaning:'接近完成、独自承担' },
            { num:'10', cn:'十', meaning:'完成、圆满、循环终章' },
            { num:'Page', cn:'侍者', meaning:'学习、消息、初心' },
            { num:'Knight', cn:'骑士', meaning:'行动、追求、奔赴' },
            { num:'Queen', cn:'女王', meaning:'内在成熟、包容、感受' },
            { num:'King', cn:'国王', meaning:'外在成熟、掌控、决断' }
        ];
        const suitMeanings = {
            wands: {
                '一':['灵感迸发、新的热情、行动的冲动','创意受阻、缺乏动力'],
                '二':['规划未来、眺望远方、决断时刻','犹豫不决、恐惧未知'],
                '三':['扩展视野、等待成果、远行将至','延迟、合作受阻'],
                '四':['庆祝、稳定、归属','基础不稳、延迟庆祝'],
                '五':['竞争、冲突、意见分歧','回避对抗、内部冲突'],
                '六':['凯旋、被认可、好消息','短暂的成功、傲慢'],
                '七':['坚守立场、面对挑战','放弃抵抗、被压倒'],
                '八':['迅速行动、进展加速、消息传来','延迟、计划受阻'],
                '九':['坚韧不拔、最后防线','偏执、精疲力竭'],
                '十':['责任过重、接近终点、承担','放下重担、委派'],
                '侍者':['热情探索、新消息、跃跃欲试','三分钟热度、方向不明'],
                '骑士':['冒险精神、勇敢出发、追爱','鲁莽、半途而废'],
                '女王':['魅力四射、热情自信、独立','嫉妒、控制欲强'],
                '国王':['领袖风范、果断决策、权威','专横、冲动']
            },
            cups: {
                '一':['情感的萌芽、直觉、丰盛之爱','情感封闭、内心空虚'],
                '二':['相互吸引、平等相爱、伙伴','关系失衡、单相思'],
                '三':['庆祝欢聚、友情、社群温暖','过度放纵、团体矛盾'],
                '四':['内省、倦怠、重新评估','新机会出现、打开心扉'],
                '五':['失落、悲伤、专注缺失','从失去中恢复、宽恕'],
                '六':['怀旧、单纯、重逢','困在过去、拒绝长大'],
                '七':['幻想、选择过多、迷失','聚焦目标、回归现实'],
                '八':['离开、追寻更深意义','逃避、停滞不前'],
                '九':['满足、愿望成真、幸福','不满足、表面光鲜'],
                '十':['情感圆满、家庭幸福、归宿','家庭矛盾、失去和谐'],
                '侍者':['温柔敏感、创意涌现、消息','情绪化、逃避现实'],
                '骑士':['浪漫多情、追求理想、邀请','幻想破灭、言不由衷'],
                '女王':['同理心、温柔包容、直觉','情绪失控、过度依赖'],
                '国王':['情感成熟、外交手腕、慷慨','情绪操控、冷漠']
            },
            swords: {
                '一':['真相、思维清晰、突破困境','混乱、谎言、误解'],
                '二':['僵局、难以决断、封闭','打破僵局、真相显现'],
                '三':['心碎、分离、痛苦','疗愈开始、宽恕'],
                '四':['休息、冥想、暂停','重返活动、躁动'],
                '五':['冲突、空洞的胜利、争吵','和解、走向和平'],
                '六':['过渡、逃离困境、向前','抗拒改变、反复挣扎'],
                '七':['策略、独自行动、隐瞒','真相揭露、归还'],
                '八':['受困、无助感、自我设限','重获自由、看清真相'],
                '九':['焦虑、噩梦、内疚','走出绝望、寻求帮助'],
                '十':['终结、低谷、被背叛','从失败恢复、重生'],
                '侍者':['好奇、机警、学习','言语伤人、散漫'],
                '骑士':['冲劲十足、直接、果断','鲁莽、言语尖刻'],
                '女王':['独立、清晰、设立界限','刻薄、过于批判'],
                '国王':['理性权威、公正判断','操控、专横']
            },
            pentacles: {
                '一':['新机遇、财富开端、踏实起步','错失良机、财务不稳'],
                '二':['多任务、灵活应对、收支平衡','失衡、忙乱'],
                '三':['团队合作、技能提升、认可','沟通不畅、合作失败'],
                '四':['安全感、守护、节俭','过度节俭、不愿分享'],
                '五':['艰难时期、物质损失、孤立','从艰难恢复、求助'],
                '六':['慷慨给予、接受馈赠、平衡','债务、吝啬、权力不均'],
                '七':['长期投资、耐心耕耘、评估','无效努力、灰心'],
                '八':['工匠精神、精益求精、专注','完美主义、倦怠'],
                '九':['丰盛富足、优雅从容、独立','虚假繁荣、空虚'],
                '十':['家族传承、长期稳定、圆满','家族冲突、根基动摇'],
                '侍者':['学习热情、踏实起步、潜力','拖延、目标不明'],
                '骑士':['勤勉可靠、按部就班、守护','停滞、固执'],
                '女王':['务实养育、富足慷慨、接地','工作生活失衡'],
                '国王':['物质成功、商业头脑、可靠','固执、贪婪']
            }
        };
        for (const suitKey of Object.keys(TAROT_SUITS)) {
            ranks.forEach(r => {
                const m = suitMeanings[suitKey][r.cn];
                cards.push({
                    name: TAROT_SUITS[suitKey].label + r.cn,
                    eng: r.num + ' of ' + suitKey.charAt(0).toUpperCase() + suitKey.slice(1),
                    icon: TAROT_SUITS[suitKey].icon,
                    keyword: r.meaning,
                    upright: m[0],
                    reversed: m[1],
                    suit: suitKey
                });
            });
        }
        return cards;
    }

    const TAROT_ALL = TAROT_MAJOR.concat(buildMinorCards());

    /* ==================== 雷诺曼（40张，含牌意） ==================== */
    const LENORMAND = [
        { num:1,  name:'骑士',  icon:'🐴', keyword:'消息 · 速度',       meaning:'一则即将到来的消息或访客，行动迅速。事情正在路上，比你预想的更快。' },
        { num:2,  name:'四叶草', icon:'🍀', keyword:'幸运 · 机遇',       meaning:'小而确切的幸运，短暂但真实。抓住眼前的小机会，别想太多。' },
        { num:3,  name:'帆船',  icon:'⛵', keyword:'旅程 · 远行',       meaning:'一段旅程、一次远行，或关系进入新阶段。方向比速度重要。' },
        { num:4,  name:'房屋',  icon:'🏠', keyword:'家庭 · 安稳',       meaning:'家庭、安全感、稳定的基础。关系进入"家"的状态。' },
        { num:5,  name:'大树',  icon:'🌳', keyword:'健康 · 长久',       meaning:'缓慢但扎实的成长，健康、根基、长久的关系。' },
        { num:6,  name:'乌云',  icon:'☁️', keyword:'困惑 · 阴霾',       meaning:'暂时的迷雾与不确定。别急着下结论，等云散去。' },
        { num:7,  name:'蛇',    icon:'🐍', keyword:'诱惑 · 复杂',       meaning:'一位有吸引力的女性、一段复杂的关系，或一条迂回的路。' },
        { num:8,  name:'棺材',  icon:'⚰️', keyword:'结束 · 转变',       meaning:'一段关系/事情走到尽头，也是新生的前夜。允许告别。' },
        { num:9,  name:'花束',  icon:'💐', keyword:'礼物 · 喜悦',       meaning:'一份礼物、一个惊喜、被欣赏。美好的事情正在靠近。' },
        { num:10, name:'镰刀',  icon:'🌾', keyword:'决断 · 突然',       meaning:'一个突然的决定或结束。小心伤害，但也意味着收割时机到了。' },
        { num:11, name:'鞭子',  icon:'🪢', keyword:'争执 · 激情',       meaning:'反复的争吵，或反复的激情。能量的重复性使用。' },
        { num:12, name:'鸟儿',  icon:'🐦', keyword:'对话 · 焦虑',       meaning:'一次重要的对话，或许多碎碎念。两人之间的小世界。' },
        { num:13, name:'孩童',  icon:'🧒', keyword:'新开始 · 纯真',     meaning:'新的开始、纯真的心意、小小的可能。' },
        { num:14, name:'狐狸',  icon:'🦊', keyword:'工作 · 谨慎',       meaning:'工作、策略、谨防被算计。要聪明一点。' },
        { num:15, name:'熊',    icon:'🐻', keyword:'力量 · 保护',       meaning:'一位强势的保护者，或财务/权威议题。' },
        { num:16, name:'星星',  icon:'✨', keyword:'希望 · 清晰',       meaning:'指引、希望、清晰的愿景。是宇宙在给你导航。' },
        { num:17, name:'鹳鸟',  icon:'🦢', keyword:'变化 · 迁移',       meaning:'一种积极的改变，例如搬家、换工作、关系的转折。' },
        { num:18, name:'狗',    icon:'🐕', keyword:'忠诚 · 朋友',       meaning:'一位忠诚的朋友、可靠的伙伴，或一段深厚的友谊。' },
        { num:19, name:'高塔',  icon:'🏰', keyword:'孤独 · 距离',       meaning:'距离、孤独、机构。也可能是一段关系里需要空间。' },
        { num:20, name:'花园',  icon:'🌺', keyword:'社交 · 公开',       meaning:'公开场合、社交聚会。关系可能公开化。' },
        { num:21, name:'山',    icon:'⛰️', keyword:'障碍 · 挑战',       meaning:'一个需要跨越的障碍，或是被延迟的事情。' },
        { num:22, name:'十字路口', icon:'🛤️', keyword:'选择 · 方向',    meaning:'一个岔口、重要的决定。你的选择会决定方向。' },
        { num:23, name:'老鼠',  icon:'🐭', keyword:'损耗 · 焦虑',       meaning:'慢慢流失的东西（精力/信任/钱财），需要留意。' },
        { num:24, name:'心',    icon:'❤️', keyword:'爱 · 感情',         meaning:'真挚的爱、心动、情感的核心。这是最美好的牌之一。' },
        { num:25, name:'戒指',  icon:'💍', keyword:'承诺 · 契约',       meaning:'一份承诺、一个契约、一个循环。关系可能升级。' },
        { num:26, name:'书',    icon:'📖', keyword:'秘密 · 知识',       meaning:'尚未揭晓的秘密，或需要深入学习的事物。' },
        { num:27, name:'信件',  icon:'✉️', keyword:'消息 · 文件',       meaning:'一条重要消息、一份文件或一次书面沟通。' },
        { num:28, name:'男士',  icon:'🤵', keyword:'男性当事人',         meaning:'代表一位重要的男性，或是提问者本人（若为男性）。' },
        { num:29, name:'女士',  icon:'👰', keyword:'女性当事人',         meaning:'代表一位重要的女性，或是提问者本人（若为女性）。' },
        { num:30, name:'百合',  icon:'🌸', keyword:'纯洁 · 平静',       meaning:'纯净、成熟的爱、宁静的关系。' },
        { num:31, name:'太阳',  icon:'☀️', keyword:'成功 · 活力',       meaning:'巨大的成功、光明、积极的能量。' },
        { num:32, name:'月亮',  icon:'🌕', keyword:'情感 · 直觉',       meaning:'情感的流动、直觉、名誉。也代表潜意识。' },
        { num:33, name:'钥匙',  icon:'🔑', keyword:'答案 · 开启',       meaning:'关键、答案、突破。谜题即将解开。' },
        { num:34, name:'鱼',    icon:'🐟', keyword:'财富 · 流动',       meaning:'金钱、资源、丰盛，或情感的流动。' },
        { num:35, name:'锚',    icon:'⚓', keyword:'稳定 · 坚持',       meaning:'稳定、长期的坚持、一个可靠的方向。' },
        { num:36, name:'十字架', icon:'✝️', keyword:'命运 · 承担',      meaning:'命运的安排、需要承担的责任。苦中有意义。' },
        { num:37, name:'灵体',  icon:'💭', keyword:'高我 · 感应',       meaning:'直觉、感应、灵魂层面的连接。' },
        { num:38, name:'香炉',  icon:'🕯️', keyword:'净化 · 归零',       meaning:'清除、净化、放下执念，回归清净。' },
        { num:39, name:'床',    icon:'🛏️', keyword:'休息 · 亲密',       meaning:'休息、亲密、卧室。关系中的私密层面。' },
        { num:40, name:'市场',  icon:'🏪', keyword:'交易 · 势均力敌',    meaning:'等价交换、势均力敌、共同经营。' }
    ];

    /* ==================== 占卜历史 ==================== */
    function loadHistory() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e) { return []; } }
    function saveHistory(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50))); } catch(e) {} }

    /* ==================== 抽牌 ==================== */
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function drawTarot(n) {
        const deck = shuffle(TAROT_ALL).slice(0, n);
        return deck.map(c => ({ ...c, isReversed: Math.random() < 0.42 }));
    }
    function drawLenormand(n) {
        return shuffle(LENORMAND).slice(0, n);
    }

    /* ==================== 三张牌结合解读 ==================== */
    function buildTarotSynthesis(cards) {
        if (cards.length < 2) return '';
        const positions = ['过去/根源', '现在/核心', '未来/走向'];
        const positions2 = ['当前状态', '你的行动'];
        const lines = [];
        lines.push('<b>牌阵含义：</b>');
        if (cards.length === 2) {
            lines.push('此牌阵为「二元对照」：第一张映照<b>当前状态</b>，第二张指出<b>可行之道</b>。');
        } else {
            lines.push('此牌阵为「时间之流」：第一张代表<b>过去或根源</b>，第二张代表<b>当下的核心议题</b>，第三张代表<b>未来的走向或建议</b>。');
        }
        lines.push('');
        lines.push('<b>逐张串联：</b>');
        cards.forEach((c, i) => {
            const pos = cards.length === 3 ? positions[i] : positions2[i];
            const state = c.isReversed ? '逆位' : '正位';
            const meaning = c.isReversed ? c.reversed : c.upright;
            lines.push(`「${pos}」—— <b>${c.name}（${state}）</b>：${meaning}`);
        });
        lines.push('');
        lines.push('<b>综合牌意：</b>');
        const keywords = cards.map(c => c.keyword.split('·')[0].trim());
        const energies = cards.map(c => c.name).join(' → ');
        lines.push(`三张牌的能量流动为：<b>${energies}</b>。`);
        lines.push(`主题围绕 <b>${keywords.join('、')}</b> 展开。`);
        if (cards.length === 3) {
            const [a, b, c] = cards;
            const tension = (a.isReversed !== c.isReversed) ? '过去的能量与未来方向形成张力，说明你正处在一个转变点上，旧的模式即将被打破。' : '三张牌能量共振，暗示这条路径是顺畅的，顺着它走即可。';
            lines.push(tension);
            const middle = b.isReversed
                ? '核心议题以逆位呈现，说明当前你在抗拒某些东西，或尚未看见关键的一环。'
                : '核心议题以正位呈现，说明此刻你正处在最清晰的焦点上，可以信任自己的感受。';
            lines.push(middle);
        }
        return lines.join('<br>');
    }

    function buildLenormandSynthesis(cards) {
        if (cards.length < 2) return '';
        const lines = [];
        lines.push('<b>牌阵含义：</b>');
        if (cards.length === 2) {
            lines.push('双牌组合：两张牌彼此对话，第一张是<b>起因/背景</b>，第二张是<b>结果/趋势</b>。');
        } else {
            lines.push('三牌牌阵：第一张是<b>事情的起点</b>，第二张是<b>核心/正在发生</b>，第三张是<b>去向/结果</b>。');
        }
        lines.push('');
        lines.push('<b>逐张串联：</b>');
        cards.forEach((c, i) => {
            const pos = cards.length === 3 ? ['起点', '核心', '去向'][i] : ['背景', '趋势'][i];
            lines.push(`「${pos}」—— <b>${c.name}</b>（${c.keyword}）：${c.meaning}`);
        });
        lines.push('');
        lines.push('<b>综合牌意：</b>');
        const names = cards.map(c => c.name).join(' + ');
        const keywords = cards.map(c => c.keyword.split('·')[0].trim());
        lines.push(`牌面组合为 <b>${names}</b>，主题是 <b>${keywords.join(' · ')}</b>。`);
        if (cards.length === 3) {
            const [a, b, c] = cards;
            lines.push(`<b>${a.name}</b> 奠定了 ${a.keyword.split('·')[0].trim()} 的基调，<b>${b.name}</b> 是当下正在发生的重点，而 <b>${c.name}</b> 提示了走向——${c.keyword.split('·')[0].trim()}。`);
            const num = a.num + b.num + c.num;
            if (num >= 3 && num <= 40) {
                const sumCard = LENORMAND.find(x => x.num === num);
                if (sumCard) lines.push(`<br><b>牌意加和（${a.num}+${b.num}+${c.num}=${num}）：</b>可参考「${sumCard.name}」——${sumCard.meaning}`);
            }
        }
        return lines.join('<br>');
    }

    /* ==================== 渲染 UI ==================== */
    function buildTarotCardHTML(c, index, total) {
        const positions = total === 3 ? ['过去 · 根源', '现在 · 核心', '未来 · 走向'] : ['当前', '行动'];
        const pos = positions[index] || '';
        const state = c.isReversed ? '逆位' : '正位';
        const stateClass = c.isReversed ? 'reversed' : 'upright';
        const meaning = c.isReversed ? c.reversed : c.upright;
        return `
        <div class="dream-card ${stateClass}">
            <div class="dream-card-pos">${pos}</div>
            <div class="dream-card-icon">${c.icon}</div>
            <div class="dream-card-name">${c.name}</div>
            <div class="dream-card-eng">${c.eng || ''}</div>
            <div class="dream-card-badge">${state}</div>
            <div class="dream-card-keyword">「${c.keyword}」</div>
            <div class="dream-card-meaning">${meaning}</div>
        </div>`;
    }

    function buildLenormandCardHTML(c, index, total) {
        const positions = total === 3 ? ['起点', '核心', '去向'] : ['背景', '趋势'];
        const pos = positions[index] || '';
        return `
        <div class="dream-card lenormand">
            <div class="dream-card-pos">${pos}</div>
            <div class="dream-card-icon">${c.icon}</div>
            <div class="dream-card-name">${c.name}</div>
            <div class="dream-card-eng">No.${c.num}</div>
            <div class="dream-card-keyword">「${c.keyword}」</div>
            <div class="dream-card-meaning">${c.meaning}</div>
        </div>`;
    }

    function renderResult(container, type, cards, question) {
        const qHTML = question ? `<div class="dream-question">「${question.replace(/</g,'&lt;')}」</div>` : '';
        const title = type === 'tarot' ? '塔罗牌阵' : '雷诺曼牌阵';
        const cardsHTML = cards.map((c, i) =>
            type === 'tarot' ? buildTarotCardHTML(c, i, cards.length) : buildLenormandCardHTML(c, i, cards.length)
        ).join('');
        const synthesis = type === 'tarot' ? buildTarotSynthesis(cards) : buildLenormandSynthesis(cards);

        container.innerHTML = `
            ${qHTML}
            <div class="dream-title">✦ ${title} · ${cards.length}张 ✦</div>
            <div class="dream-cards-row">${cardsHTML}</div>
            <div class="dream-synthesis">
                <div class="dream-synthesis-title">✦ 综合解读 ✦</div>
                <div class="dream-synthesis-body">${synthesis}</div>
            </div>
        `;
    }

    /* ==================== 主面板 ==================== */
    window.openDreamDivinationPanel = function () {
        const old = document.getElementById('dream-divination-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'dream-divination-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.65);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML = `
            <div class="dream-panel">
                <div class="dream-header">
                    <div class="dream-header-left">
                        <div class="dream-header-icon"><i class="fas fa-moon"></i></div>
                        <div>
                            <div class="dream-header-title">梦向占卜</div>
                            <div class="dream-header-sub">塔罗 · 雷诺曼</div>
                        </div>
                    </div>
                    <button id="dream-close" class="dream-close-btn"><i class="fas fa-times"></i></button>
                </div>

                <div class="dream-tabs">
                    <button class="dream-tab active" data-type="tarot"><i class="fas fa-star"></i> 塔罗</button>
                    <button class="dream-tab" data-type="lenormand"><i class="fas fa-moon"></i> 雷诺曼</button>
                </div>

                <div class="dream-body" id="dream-body">
                    <div class="dream-question-label">你的提问（可选）</div>
                    <textarea id="dream-question" class="dream-question-input" placeholder="把心里的疑问轻轻放进来…"></textarea>

                    <div class="dream-count-label">牌阵</div>
                    <div class="dream-count-btns" id="dream-count-btns">
                        <button class="dream-count-btn active" data-n="3">
                            <span class="dream-count-num">3</span>
                            <span class="dream-count-txt">三张 · 时间之流</span>
                        </button>
                        <button class="dream-count-btn" data-n="2">
                            <span class="dream-count-num">2</span>
                            <span class="dream-count-txt">两张 · 二元对照</span>
                        </button>
                        <button class="dream-count-btn" data-n="1">
                            <span class="dream-count-num">1</span>
                            <span class="dream-count-txt">一张 · 直指核心</span>
                        </button>
                    </div>

                    <div class="dream-hint" id="dream-hint">三张牌 · 时间之流 · 过去 / 现在 / 未来</div>

                    <button id="dream-draw-btn" class="dream-draw-btn">
                        <i class="fas fa-hand-sparkles"></i> 开始占卜
                    </button>

                    <div id="dream-result" class="dream-result"></div>
                </div>
            </div>`;

        document.body.appendChild(modal);

        let currentType = 'tarot';
        let currentCount = 3;

        const close = () => modal.remove();
        modal.querySelector('#dream-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelectorAll('.dream-tab').forEach(btn => {
            btn.onclick = () => {
                modal.querySelectorAll('.dream-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentType = btn.dataset.type;
                modal.querySelector('#dream-result').innerHTML = '';
                updateHint();
            };
        });

        modal.querySelectorAll('.dream-count-btn').forEach(btn => {
            btn.onclick = () => {
                modal.querySelectorAll('.dream-count-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCount = parseInt(btn.dataset.n, 10);
                updateHint();
            };
        });

        function updateHint() {
            const el = modal.querySelector('#dream-hint');
            if (currentCount === 3) el.textContent = '三张牌 · 时间之流 · 过去 / 现在 / 未来';
            else if (currentCount === 2) el.textContent = '两张牌 · 二元对照 · 状态 / 行动';
            else el.textContent = '一张牌 · 直指核心 · 一句话的答案';
        }

        modal.querySelector('#dream-draw-btn').onclick = () => {
            const q = modal.querySelector('#dream-question').value.trim();
            const resultEl = modal.querySelector('#dream-result');

            resultEl.innerHTML = '<div class="dream-loading"><div class="dream-loading-dot"></div><div class="dream-loading-dot"></div><div class="dream-loading-dot"></div></div>';

            setTimeout(() => {
                let cards;
                if (currentType === 'tarot') cards = drawTarot(currentCount);
                else cards = drawLenormand(currentCount);

                renderResult(resultEl, currentType, cards, q);

                // 保存历史
                const hist = loadHistory();
                hist.unshift({
                    id: Date.now(),
                    type: currentType,
                    count: currentCount,
                    question: q,
                    time: new Date().toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }),
                    cards: cards.map(c => ({ name: c.name, icon: c.icon, keyword: c.keyword, reversed: !!c.isReversed }))
                });
                saveHistory(hist);

                if (typeof playSound === 'function') playSound('favorite');
            }, 800);
        };
    };

    // 暴露给设置入口
    window.initDreamDivination = function () {
        const btn = document.getElementById('dream-divination-function');
        if (btn && !btn.dataset.initialized) {
            btn.dataset.initialized = 'true';
            btn.addEventListener('click', () => {
                const adv = document.getElementById('advanced-modal');
                if (adv && typeof hideModal === 'function') hideModal(adv);
                window.openDreamDivinationPanel();
            });
        }
    };

    /* ==================== 样式注入 ==================== */
    (function injectStyle() {
        if (document.getElementById('dream-divination-style')) return;
        const s = document.createElement('style');
        s.id = 'dream-divination-style';
        s.textContent = `
            .dream-panel {
                background: var(--secondary-bg);
                border-radius: 22px;
                width: 94%;
                max-width: 500px;
                max-height: 92vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 24px 80px rgba(0,0,0,0.45);
                border: 1px solid var(--border-color);
            }
            .dream-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color);
                background: linear-gradient(135deg, rgba(var(--accent-color-rgb),0.1), rgba(var(--accent-color-rgb),0.02));
            }
            .dream-header-left { display: flex; align-items: center; gap: 12px; }
            .dream-header-icon {
                width: 40px; height: 40px; border-radius: 12px;
                background: var(--accent-color); color: #fff;
                display: flex; align-items: center; justify-content: center;
                font-size: 17px;
                box-shadow: 0 4px 14px rgba(var(--accent-color-rgb),0.35);
            }
            .dream-header-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
            .dream-header-sub { font-size: 11px; color: var(--text-secondary); margin-top: 2px; letter-spacing: 1px; }
            .dream-close-btn {
                background: none; border: none; color: var(--text-secondary);
                cursor: pointer; font-size: 18px; padding: 4px 8px; border-radius: 8px;
            }
            .dream-close-btn:hover { background: var(--primary-bg); color: var(--text-primary); }

            .dream-tabs {
                display: flex; gap: 6px; padding: 12px 16px 0;
                background: var(--secondary-bg);
            }
            .dream-tab {
                flex: 1; padding: 10px;
                border-radius: 12px 12px 0 0;
                border: 1px solid transparent; border-bottom: none;
                background: transparent;
                color: var(--text-secondary);
                font-size: 13px; font-weight: 600;
                font-family: var(--font-family);
                cursor: pointer;
                display: flex; align-items: center; justify-content: center; gap: 6px;
                transition: all 0.2s;
            }
            .dream-tab.active {
                background: var(--primary-bg);
                color: var(--accent-color);
                border-color: var(--border-color);
            }
            .dream-tab i { font-size: 12px; }

            .dream-body {
                flex: 1; overflow-y: auto;
                padding: 16px 20px 24px;
                background: var(--primary-bg);
                -webkit-overflow-scrolling: touch;
            }
            .dream-question-label, .dream-count-label {
                font-size: 12px; font-weight: 700;
                color: var(--text-secondary);
                letter-spacing: 1px; text-transform: uppercase;
                margin-bottom: 8px;
            }
            .dream-question-input {
                width: 100%; box-sizing: border-box;
                min-height: 60px;
                padding: 12px 14px;
                border-radius: 12px;
                border: 1.5px solid var(--border-color);
                background: var(--secondary-bg);
                color: var(--text-primary);
                font-size: 13px; font-family: var(--font-family);
                resize: vertical;
                outline: none;
                margin-bottom: 16px;
                line-height: 1.6;
            }
            .dream-question-input:focus { border-color: var(--accent-color); }

            .dream-count-btns {
                display: flex; gap: 8px; margin-bottom: 10px;
            }
            .dream-count-btn {
                flex: 1;
                padding: 12px 6px;
                border-radius: 12px;
                border: 1.5px solid var(--border-color);
                background: var(--secondary-bg);
                color: var(--text-secondary);
                cursor: pointer; font-family: var(--font-family);
                display: flex; flex-direction: column; align-items: center; gap: 4px;
                transition: all 0.2s;
            }
            .dream-count-btn.active {
                background: var(--accent-color);
                border-color: var(--accent-color);
                color: #fff;
                box-shadow: 0 4px 14px rgba(var(--accent-color-rgb),0.3);
            }
            .dream-count-num { font-size: 20px; font-weight: 800; }
            .dream-count-txt { font-size: 10px; opacity: 0.85; }
            .dream-hint {
                font-size: 11px; color: var(--text-secondary);
                text-align: center; margin-bottom: 18px;
                font-style: italic; opacity: 0.7;
            }
            .dream-draw-btn {
                width: 100%;
                padding: 14px;
                border: none; border-radius: 14px;
                background: linear-gradient(135deg, var(--accent-color), rgba(var(--accent-color-rgb),0.75));
                color: #fff;
                font-size: 14px; font-weight: 700;
                font-family: var(--font-family);
                cursor: pointer;
                letter-spacing: 1px;
                box-shadow: 0 6px 20px rgba(var(--accent-color-rgb),0.35);
                display: flex; align-items: center; justify-content: center; gap: 8px;
                margin-bottom: 16px;
            }
            .dream-draw-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }

            .dream-result:empty { display: none; }

            .dream-question {
                text-align: center;
                font-size: 13px; color: var(--text-secondary);
                font-style: italic;
                padding: 10px 14px;
                background: var(--secondary-bg);
                border-radius: 10px;
                border-left: 3px solid var(--accent-color);
                margin-bottom: 14px;
            }
            .dream-title {
                text-align: center;
                font-size: 12px; font-weight: 700;
                color: var(--accent-color);
                letter-spacing: 3px;
                margin-bottom: 14px;
            }
            .dream-cards-row {
                display: flex; gap: 10px;
                justify-content: center;
                margin-bottom: 16px;
                flex-wrap: wrap;
            }
            .dream-card {
                flex: 1; min-width: 100px; max-width: 150px;
                background: var(--secondary-bg);
                border: 1.5px solid var(--border-color);
                border-radius: 14px;
                padding: 14px 10px;
                text-align: center;
                animation: dreamCardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
            }
            .dream-card.reversed { border-color: rgba(224,110,110,0.5); }
            @keyframes dreamCardIn {
                from { opacity: 0; transform: translateY(20px) scale(0.9); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            .dream-card-pos {
                font-size: 10px; color: var(--accent-color);
                letter-spacing: 1px; font-weight: 700;
                margin-bottom: 8px;
            }
            .dream-card-icon { font-size: 28px; margin-bottom: 6px; }
            .dream-card-name { font-size: 14px; font-weight: 700; color: var(--text-primary); }
            .dream-card-eng { font-size: 9px; color: var(--text-secondary); opacity: 0.7; margin-top: 2px; }
            .dream-card-badge {
                display: inline-block;
                font-size: 9px;
                padding: 2px 8px;
                border-radius: 8px;
                margin: 6px 0;
                background: rgba(var(--accent-color-rgb), 0.12);
                color: var(--accent-color);
            }
            .dream-card.reversed .dream-card-badge {
                background: rgba(224,110,110,0.15);
                color: #e07b7b;
            }
            .dream-card-keyword {
                font-size: 11px; color: var(--accent-color);
                margin-bottom: 8px;
            }
            .dream-card-meaning {
                font-size: 11px; color: var(--text-secondary);
                line-height: 1.6; text-align: left;
                border-top: 1px dashed var(--border-color);
                padding-top: 8px;
            }
            .dream-synthesis {
                background: linear-gradient(135deg, rgba(var(--accent-color-rgb),0.08), rgba(var(--accent-color-rgb),0.02));
                border: 1px solid rgba(var(--accent-color-rgb),0.22);
                border-radius: 14px;
                padding: 16px;
            }
            .dream-synthesis-title {
                font-size: 12px; font-weight: 700;
                color: var(--accent-color);
                letter-spacing: 2px;
                margin-bottom: 10px;
                text-align: center;
            }
            .dream-synthesis-body {
                font-size: 12.5px; color: var(--text-primary);
                line-height: 1.9;
            }
            .dream-synthesis-body b { color: var(--accent-color); }

            .dream-loading {
                display: flex; align-items: center; justify-content: center;
                gap: 6px; padding: 40px 0;
            }
            .dream-loading-dot {
                width: 8px; height: 8px; border-radius: 50%;
                background: var(--accent-color);
                animation: dreamDotBounce 1.2s ease-in-out infinite;
            }
            .dream-loading-dot:nth-child(2) { animation-delay: 0.15s; }
            .dream-loading-dot:nth-child(3) { animation-delay: 0.3s; }
            @keyframes dreamDotBounce {
                0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
                40% { transform: scale(1.2); opacity: 1; }
            }
        `;
        document.head.appendChild(s);
    })();

})();