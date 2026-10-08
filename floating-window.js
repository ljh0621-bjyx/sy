// floating-window.js
(function () {
    'use strict';

    let rtWindow = null;
    let isVisible = false;
    let isDragging = false, startX, startY, startLeft, startTop;
    let _playCancelled = false;
    let _currentSpeed = 50;
    let _isPlaying = false;

    const PINYIN_GROUPS = {
        'a':'啊阿吖嗄腌锕','ai':'爱哀挨碍癌矮艾唉皑蔼隘','an':'安按暗岸案俺鞍氨','ang':'昂盎','ao':'奥澳傲熬袄凹',
        'ba':'八把爸吧巴拔罢疤芭霸靶坝','bai':'白百败拜摆柏','ban':'半办班般搬斑板版伴拌绊瓣','bang':'帮邦棒榜绑磅','bao':'包保报抱宝暴爆薄饱堡胞剥','bei':'被北背倍贝备杯悲碑辈惫焙','ben':'本奔笨苯','beng':'蹦崩绷泵','bi':'比必笔毕币闭彼壁避臂鼻逼碧弊蔽庇痹','bian':'变边便遍编辩辨鞭贬','biao':'表标彪镖膘','bie':'别憋鳖','bin':'宾滨彬斌濒','bing':'并病兵冰饼屏丙秉柄','bo':'波博播拨剥伯玻驳脖搏膊泊勃菠','bu':'不部步布补捕怖簿卜',
        'ca':'擦','cai':'才猜裁采彩菜财踩材','can':'参残惨餐灿蚕惭','cang':'仓苍舱藏沧','cao':'草操槽糙曹','ce':'测侧策册厕','cen':'岑','ceng':'曾层蹭','cha':'查插茶差叉刹察岔','chai':'拆柴差','chan':'产缠禅颤蝉馋铲','chang':'长厂场常唱畅尝肠昌倡偿','chao':'朝吵超潮炒抄巢嘲','che':'车彻撤扯澈','chen':'沉陈晨尘臣忱衬趁','cheng':'成城程乘称诚承惩橙逞','chi':'吃持迟赤池痴尺齿斥驰耻翅','chong':'冲重崇虫宠充','chou':'抽丑臭愁仇绸酬筹','chu':'出初除处触厨橱储楚础','chuai':'揣','chuan':'传穿船川喘串','chuang':'创窗床闯疮','chui':'吹垂锤炊','chun':'春纯唇蠢醇','chuo':'戳','ci':'次此词刺慈磁瓷辞雌赐茨','cong':'从丛聪葱匆囱','cou':'凑','cu':'粗醋促簇猝','cuan':'窜蹿','cui':'催脆翠摧萃','cun':'存村寸','cuo':'错措搓挫磋',
        'da':'大答打达搭瘩','dai':'代带待呆戴袋贷逮怠','dan':'单但弹淡担丹胆蛋诞耽','dang':'当挡党荡档','dao':'到道倒刀岛盗稻悼捣祷','de':'的得德地','deng':'等登灯瞪凳邓蹬','di':'地第低底弟敌笛递抵帝滴堤迪缔','dian':'点电店典殿淀垫掂甸碘','diao':'掉调吊雕叼钓','die':'跌爹叠蝶碟','ding':'定丁顶订盯钉鼎','diu':'丢','dong':'动东冬懂洞冻董栋恫','dou':'都斗抖豆逗陡兜','du':'读度独毒渡堵赌杜督镀笃','duan':'段断短端锻缎','dui':'对队堆兑','dun':'顿盾蹲吨钝遁','duo':'多夺朵躲舵剁惰堕跺',
        'e':'额俄鹅恶饿厄遏扼愕鄂','en':'恩嗯','er':'而二耳儿尔饵贰',
        'fa':'发法罚伐乏阀筏','fan':'反饭烦范犯翻番繁帆贩凡矾','fang':'方放房防访仿纺芳妨肪','fei':'非飞费肥废肺匪沸吠菲斐','fen':'分份粉奋愤氛坟焚汾酚','feng':'风封峰疯丰蜂锋奉缝冯讽凤','fo':'佛','fou':'否','fu':'服父负富副复福付附幅扶浮腐妇符赴腹缚赋孵辅俯抚傅覆肤芙',
        'ga':'嘎噶','gai':'改该盖概钙丐','gan':'干感敢赶甘杆肝赣尴','gang':'刚钢港岗纲缸杠','gao':'高告稿搞膏糕睾','ge':'个各歌格哥革隔割阁葛咯铬','gei':'给','gen':'根跟','geng':'更耕梗庚羹颈','gong':'工共公功供宫攻贡巩躬','gou':'够狗构沟勾钩购垢','gu':'古故股顾骨鼓姑孤谷雇咕辜箍','gua':'挂瓜刮寡卦','guai':'怪乖拐','guan':'关管观官馆惯冠灌罐贯','guang':'光广逛','gui':'贵归鬼跪桂柜规龟硅诡轨','gun':'滚棍','guo':'过国果锅郭裹',
        'ha':'哈蛤','hai':'还海害孩嗨骸','han':'含汉寒喊韩汗罕憨焊憾撼翰涵','hang':'行航杭夯','hao':'好号豪浩毫耗郝壕嚎','he':'和喝合河核盒贺荷鹤赫褐呵禾','hei':'黑嘿','hen':'很恨狠痕','heng':'横衡恒哼','hong':'红宏洪轰烘虹鸿弘哄','hou':'后厚候猴喉侯吼','hu':'湖户互呼忽胡虎壶糊护沪弧狐蝴唬','hua':'话花华化画划滑哗','huai':'坏怀淮槐徊','huan':'还换欢环缓患幻唤焕宦','huang':'黄皇荒慌煌晃谎恍凰蝗','hui':'会回汇惠辉恢灰挥慧毁徽绘贿讳诲','hun':'婚混魂昏浑荤','huo':'或活火货获祸伙豁惑霍',
        'ji':'机几记极技纪绩既济际基激击鸡积集即级急挤季迹寂系继畸肌讥饥冀藉','jia':'家加价假架甲驾嫁佳嘉夹颊贾','jian':'见间件建减简检坚尖监健剑渐肩艰箭歼荐鉴键茧涧煎践','jiang':'讲将江降浆疆奖匠僵姜桨','jiao':'叫教角交脚觉较轿嚼搅郊骄娇','jie':'接街节解姐介界借届皆揭洁截杰竭劫诫捷结','jin':'今金进近尽紧仅禁锦津浸劲襟筋晋','jing':'经京精睛惊静竞镜境竟敬警径晶景井净','jiong':'窘','jiu':'就九久酒旧救究纠舅揪','ju':'举句局具居据巨距聚拒俱剧菊橘沮矩','juan':'卷捐娟眷倦绢','jue':'觉决绝掘诀爵嚼蕨','jun':'军均君俊峻竣骏',
        'ka':'卡咖喀','kai':'开凯慨楷恺铠','kan':'看刊堪砍坎侃','kang':'康抗炕扛慷亢','kao':'考靠烤拷','ke':'可课科克客刻棵颗壳咳渴柯磕苛','ken':'肯啃恳垦','keng':'坑吭','kong':'空恐孔控','kou':'口扣抠寇叩','ku':'苦哭库裤酷枯窟','kua':'跨夸垮','kuai':'快块筷会侩','kuan':'宽款','kuang':'狂况矿框眶筐旷','kui':'愧溃亏葵魁窥馈','kun':'困昆捆坤','kuo':'阔扩括廓',
        'la':'拉啦辣喇蜡腊垃','lai':'来赖莱睐','lan':'蓝懒览烂拦篮栏澜婪揽缆滥','lang':'浪朗狼郎廊琅榔','lao':'老劳牢捞姥酪烙唠','le':'了乐勒','lei':'类雷累泪垒擂蕾磊儡','leng':'冷棱楞','li':'里理力立李利历丽离厉例粒礼隶梨栗莉犁漓','lia':'俩','lian':'连联脸练恋链廉怜莲敛','liang':'两量亮良凉辆梁粮谅晾靓','liao':'聊料辽疗僚撩寥潦缭','lie':'列烈裂猎劣冽','lin':'林临邻淋琳磷鳞吝赁','ling':'令领零灵铃龄凌陵岭伶羚','liu':'六流留刘柳硫榴溜瘤琉浏','long':'龙隆笼聋咙窿垄拢','lou':'楼漏陋搂露','lu':'路陆录露鹿炉鲁庐虏卤碌赂颅','lv':'绿率虑律旅铝吕驴侣缕','luan':'乱卵峦','lue':'略掠','lun':'论轮伦仑沦纶','luo':'落罗洛络裸骆萝锣骡',
        'ma':'吗妈马嘛麻码骂玛蚂','mai':'买卖麦脉埋迈','man':'满慢蛮漫曼蔓瞒馒','mang':'忙盲茫芒莽','mao':'毛冒帽猫矛茅茂贸锚卯','me':'么','mei':'没每美妹眉媒煤霉玫梅莓魅昧媚','men':'门们闷焖','meng':'梦蒙猛盟萌孟朦锰','mi':'米密迷秘蜜谜眯觅泌','mian':'面免棉眠绵勉缅腼','miao':'苗秒妙描庙瞄渺','mie':'灭蔑','min':'民敏闽皿悯抿','ming':'名明命鸣铭冥','miu':'谬','mo':'末模摸墨磨摩魔抹莫沫漠默陌馍','mou':'某谋眸','mu':'木目母亩牧幕墓慕暮募沐穆拇',
        'na':'那拿哪纳娜呐钠','nai':'奶耐乃奈氖','nan':'南男难楠腩','nang':'囊','nao':'脑闹挠恼','ne':'呢','nei':'内','nen':'嫩','neng':'能','ni':'你尼泥逆腻匿拟妮溺','nian':'年念粘黏碾撵','niang':'娘酿','niao':'鸟尿','nie':'捏聂孽','nin':'您','ning':'宁凝拧柠','niu':'牛扭纽钮妞','nong':'农浓弄脓','nu':'怒奴努弩','nv':'女','nuan':'暖','nue':'虐','nuo':'诺挪糯',
        'o':'哦噢','ou':'欧偶呕鸥殴藕',
        'pa':'怕爬帕趴啪','pai':'拍排牌派徘','pan':'盘判盼叛攀磐潘','pang':'旁胖庞膀磅','pao':'跑泡炮抛袍刨','pei':'陪配培赔佩沛裴','pen':'喷盆','peng':'朋碰捧棚蓬膨鹏彭','pi':'皮批疲脾辟僻坯霹披劈屁譬','pian':'片篇偏骗翩','piao':'票飘漂瓢','pie':'撇瞥','pin':'品贫频聘拼','ping':'平评凭瓶萍屏乒苹','po':'破坡泼婆迫魄颇','pou':'剖','pu':'普铺扑朴谱蒲仆瀑葡菩浦',
        'qi':'起期其气七奇齐器骑弃泣棋旗祈启契戚凄','qia':'恰洽掐','qian':'前钱千签浅欠牵铅谦遣谴嵌潜钳乾','qiang':'强枪墙抢腔蔷呛','qiao':'桥巧悄敲翘瞧侨俏峭锹','qie':'切且窃茄怯惬','qin':'亲琴勤侵秦擒禽寝钦芹','qing':'情清请轻青庆倾晴卿擎顷','qiong':'穷琼','qiu':'求秋球囚邱丘蚯','qu':'去区取曲趣娶屈驱渠躯趋','quan':'全权圈劝拳犬泉券痊醛','que':'却确缺雀鹊瘸','qun':'群裙',
        'ran':'然染燃冉','rang':'让嚷壤','rao':'绕扰饶','re':'热惹','ren':'人认任仁忍刃韧饪','reng':'扔仍','ri':'日','rong':'容荣融绒溶蓉熔戎','rou':'肉柔揉','ru':'如入乳辱儒汝褥','ruan':'软阮','rui':'锐瑞蕊','run':'润闰','ruo':'若弱偌',
        'sa':'撒洒萨','sai':'塞赛腮鳃','san':'三散伞叁','sang':'桑嗓丧','sao':'扫嫂骚','se':'色涩瑟塞','sen':'森','seng':'僧','sha':'杀沙傻纱砂刹啥','shai':'晒筛','shan':'山善闪衫珊杉删煽扇擅赡膳','shang':'上商伤尚赏晌','shao':'少烧稍绍哨勺邵','she':'社设舍射蛇摄涉奢赦舌','shei':'谁','shen':'深什身神审甚申伸绅呻渗慎肾','sheng':'生声省胜升剩圣绳牲甥','shi':'是时十事实使式视试市世识食诗失始室示士尸矢释适逝誓狮饰屎柿嗜','shou':'手受收首守瘦兽售寿授','shu':'书数树属术述束舒疏输叔暑鼠熟蔬薯淑赎','shua':'刷耍','shuai':'摔甩帅衰','shuan':'栓拴涮','shuang':'双爽霜','shui':'水睡税','shun':'顺瞬','shuo':'说硕朔',
        'si':'四死思司似丝撕私寺嗣伺嘶肆饲','song':'送松宋颂诵怂耸','sou':'搜艘擞嗽','su':'素速诉宿塑俗肃苏酥','suan':'酸算蒜','sui':'岁随虽碎遂髓穗隧','sun':'孙损笋','suo':'所锁缩索梭嗦',
        'ta':'他她它踏塔塌榻','tai':'太台抬态胎泰汰苔','tan':'谈弹探碳叹坛坦毯瘫贪摊滩谭','tang':'堂唐糖躺烫趟汤倘膛塘','tao':'套讨逃桃涛掏淘陶滔','te':'特','teng':'疼腾藤','ti':'体提题踢替梯剃蹄剔','tian':'天田甜添填舔','tiao':'条跳挑调迢','tie':'铁贴帖','ting':'听停庭厅挺亭艇廷','tong':'同通童痛统桶筒铜桐瞳','tou':'头投透偷','tu':'图土突途徒吐涂兔屠','tuan':'团','tui':'推退腿褪','tun':'吞屯臀','tuo':'托脱拖拓妥驼椭唾',
        'wa':'哇挖娃瓦袜蛙','wai':'外歪','wan':'万完晚玩碗弯湾丸顽挽宛婉腕蔓','wang':'王往望网忘亡旺汪枉','wei':'为位未围味微危委喂威伟唯维谓慰违纬苇尾蔚畏魏惟','wen':'问文闻温吻稳蚊纹','weng':'翁嗡','wo':'我握窝卧沃蜗','wu':'无五物务午舞武误悟雾污屋呜伍捂梧侮巫',
        'xi':'西洗系细习喜希吸溪稀锡牺息熄膝袭席昔惜析晰熙嘻嬉夕汐','xia':'下夏吓霞峡侠狭瞎虾暇','xian':'先现线限显鲜闲献贤嫌宪陷馅羡腺掀仙咸衔','xiang':'想像相向香详祥享项响乡箱镶翔橡','xiao':'小笑消校销效肖萧霄削孝晓啸','xie':'些写谢协鞋斜挟携泄泻械蟹懈卸屑','xin':'心新信辛欣薪馨锌','xing':'行性形星兴幸姓醒刑型杏腥','xiong':'熊雄胸凶汹兄匈','xiu':'修休秀羞袖绣锈嗅朽','xu':'需许须序虚续徐叙绪蓄畜嘘','xuan':'选宣悬旋玄喧轩绚','xue':'学雪血穴靴削','xun':'寻训讯迅询巡循勋熏薰逊殉',
        'ya':'呀压牙押鸦雅亚讶芽崖哑鸭','yan':'眼言烟沿严研演颜延岩掩厌验炎燕宴艳咽淹腌嫣彦雁','yang':'样阳养羊洋央扬杨仰漾痒秧氧疡','yao':'要药腰摇咬邀妖遥谣尧瑶窑耀舀肴','ye':'也业夜叶爷野页冶噎耶液掖腋','yi':'一以已意义衣依易议移遗疑医仪益溢译异亦伊忆毅翼谊抑役','yin':'因音印银引饮阴隐姻殷吟淫瘾尹','ying':'应英赢影营迎硬映婴鹰樱盈萤蝇颖','yo':'哟','yong':'用永勇涌拥庸踊泳咏俑','you':'有又由游友右油优幽悠尤忧诱幼佑釉','yu':'于与语鱼雨育遇愈玉域欲余预狱渔愚娱宇羽屿吁喻寓御逾浴裕誉郁','yuan':'元原员院愿远缘园圆源冤猿渊苑怨袁垣','yue':'月越约悦阅跃岳粤钥','yun':'云运允孕韵蕴匀陨晕耘熨',
        'za':'杂咋匝','zai':'在再载仔宰栽','zan':'咱赞暂攒簪','zang':'脏葬藏赃','zao':'早造遭澡灶皂燥躁噪枣凿','ze':'则责择泽啧仄','zei':'贼','zen':'怎','zeng':'增曾赠憎','zha':'扎炸诈渣榨闸栅眨乍','zhai':'摘窄债宅斋寨','zhan':'站战占展粘沾瞻斩崭盏绽颤蘸','zhang':'长张章掌账涨障丈杖帐胀','zhao':'找着招照赵召兆沼罩爪嘲','zhe':'这着折者哲浙遮辙蜇','zhen':'真阵镇针震诊侦珍枕疹贞甄','zheng':'正政整争证郑征睁挣蒸拯症','zhi':'知只之直指制治志至致置质植支枝汁芝织止址旨帜挚掷滞稚','zhong':'中重种众终钟忠肿仲衷','zhou':'周州洲舟皱轴肘昼咒宙','zhu':'主住注助猪竹柱祝筑驻煮诸蛛朱逐嘱瞩铸','zhua':'抓爪','zhuai':'拽','zhuan':'转专砖赚撰篆','zhuang':'装状庄撞壮妆桩','zhui':'追坠缀椎锥','zhun':'准','zhuo':'着桌捉拙灼卓酌琢','zi':'子字自资紫姿滋仔兹咨姊籽梓渍','zong':'总宗纵综踪棕鬃','zou':'走奏揍邹','zu':'组足族祖阻租卒诅','zuan':'钻','zui':'最嘴醉罪','zun':'尊遵樽','zuo':'做作坐左座昨佐琢'
    };

    const pinyinMap = {};
    const candidatesMap = {};
    Object.keys(PINYIN_GROUPS).forEach(function (py) {
        var chars = PINYIN_GROUPS[py];
        candidatesMap[py] = Array.from(chars).slice(0, 5);
        for (var i = 0; i < chars.length; i++) {
            pinyinMap[chars[i]] = py;
        }
    });

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function charToPinyin(ch) {
        if (pinyinMap[ch]) return pinyinMap[ch];
        if (/^[a-zA-Z0-9]+$/.test(ch)) return ch;
        return ch;
    }
    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function isAnimEnabled() {
        return localStorage.getItem('partnerTypingAnimEnabled') !== '0';
    }

    function injectCSS() {
        if (document.getElementById('rt-float-style')) return;
        var s = document.createElement('style');
        s.id = 'rt-float-style';
        s.textContent = [
            '.rt-float-window{position:fixed;right:20px;bottom:120px;width:280px;min-width:220px;max-width:92vw;min-height:200px;background:#fbfaf5;border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,0.15),0 0 0 1px rgba(0,0,0,0.04);z-index:2147483000;display:flex;flex-direction:column;font-family:var(--font-family);animation:rtIn 0.3s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden;user-select:none;}',
            '.rt-resize-handle{position:absolute;bottom:0;right:0;width:22px;height:22px;cursor:se-resize;z-index:10;touch-action:none;background:linear-gradient(135deg,transparent 50%,rgba(217,154,108,0.55) 50%);border-radius:0 0 18px 0;}',
            '@keyframes rtIn{from{opacity:0;transform:translateY(20px) scale(0.95);}to{opacity:1;transform:translateY(0) scale(1);}}',
            '@keyframes rtBlink{0%,100%{opacity:1;}50%{opacity:0;}}',
            '@keyframes rtPop{from{opacity:0;transform:scale(0.6);}to{opacity:1;transform:scale(1);}}',
            '.rt-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px;cursor:grab;flex-shrink:0;}',
            '.rt-header-left{display:flex;align-items:center;gap:8px;}',
            '.rt-dot{width:6px;height:6px;border-radius:50%;background:#d99a6c;flex-shrink:0;}',
            '.rt-title{font-size:12px;font-weight:600;color:#4a3f35;}',
            '.rt-status{font-size:10px;color:#a89b8c;}',
            '.rt-close{background:none;border:none;color:#a89b8c;font-size:14px;cursor:pointer;padding:2px 6px;border-radius:6px;}',
            '.rt-pinyin-line{display:flex;flex-wrap:wrap;gap:8px;padding:2px 12px 8px;min-height:22px;align-items:center;}',
            '.rt-pinyin-tag{font-size:10px;color:#c8bfae;font-family:Georgia,serif;letter-spacing:0.5px;transition:color 0.15s;}',
            '.rt-pinyin-tag.done{color:#4a3f35;font-weight:600;}',
            '.rt-pinyin-tag.active{color:#d99a6c;}',
            '.rt-pinyin-tag.active::after{content:"▍";color:#d99a6c;animation:rtBlink 0.9s step-end infinite;margin-left:1px;}',
            '.rt-cand-area{padding:0 10px 10px;overflow-x:auto;min-height:48px;display:flex;gap:6px;align-items:center;justify-content:center;}',
            '.rt-cand-col{display:flex;flex-direction:row;gap:5px;flex-shrink:0;animation:rtPop 0.22s cubic-bezier(0.34,1.56,0.64,1);}',
            '.rt-cand-char{width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#4a3f35;background:rgba(217,154,108,0.1);border:1px solid transparent;transition:all 0.18s;}',
            '.rt-cand-char.selected{background:#d99a6c;color:#fff;font-weight:700;transform:scale(1.12);border-color:#c4824a;box-shadow:0 3px 10px rgba(217,154,108,0.45);}',
            '.rt-preview{font-size:11px;color:#4a3f35;min-height:26px;padding:2px 14px 12px;letter-spacing:2px;font-weight:600;}',
            '.rt-preview .rt-placeholder{color:#c8bfae;font-weight:400;letter-spacing:0font-size:11px;}',
            '.rt-speed-row{display:flex;align-items:center;gap:10px;padding:4px 14px 12px;font-size:11px;color:#a89b8c;flex-shrink:0;border-top:1px solid rgba(217,154,108,0.15);}',
            '.rt-speed-slider{flex:1;accent-color:#d99a6c;height:4px;}',
            'html[data-theme="dark"] .rt-float-window{background:#252220;}',
            'html[data-theme="dark"] .rt-title,html[data-theme="dark"] .rt-pinyin-tag.done,html[data-theme="dark"] .rt-cand-char,html[data-theme="dark"] .rt-preview{color:#e8ddd0;}',
            'html[data-theme="dark"] .rt-cand-char{background:rgba(217,154,108,0.15);}',
            'html[data-theme="dark"] .rt-cand-char.selected{background:#d99a6c;color:#fff;}'
        ].join('');
        document.head.appendChild(s);
    }

    function createFloatingWindow() {
        var old = document.getElementById('rt-float-window');
        if (old) old.remove();
        injectCSS();

        var div = document.createElement('div');
        div.id = 'rt-float-window';
        div.className = 'rt-float-window';
        div.style.display = 'none';
        div.innerHTML = ''
            + '<div class="rt-header" id="rt-drag-handle">'
            +   '<div class="rt-header-left">'
            +     '<span class="rt-dot"></span>'
            +     '<span class="rt-title">拼音组句</span>'
            +     '<span class="rt-status" id="rt-status">正在组句…</span>'
            +   '</div>'
            +   '<button class="rt-close" id="rt-btn-close">✕</button>'
            + '</div>'
            + '<div class="rt-pinyin-line" id="rt-pinyin-line"></div>'
            + '<div class="rt-cand-area" id="rt-cand-area"></div>'
            + '<div class="rt-preview" id="rt-preview"><span class="rt-placeholder">组句中…</span></div>'
            + '<div class="rt-speed-row">'
            +   '<span>缓慢</span>'
            +   '<input type="range" id="rt-speed" min="0" max="100" value="50" class="rt-speed-slider">'
            +   '<span>顺滑</span>'
            + '</div>'
            + '<div class="rt-resize-handle" id="rt-resize-handle"></div>';
        document.body.appendChild(div);
        rtWindow = div;

        initDrag();
        initResize();

        document.getElementById('rt-btn-close').onclick = function () {
            _playCancelled = true;
            rtWindow.style.display = 'none';
            isVisible = false;
        };
        document.getElementById('rt-speed').oninput = function (e) {
            _currentSpeed = parseInt(e.target.value, 10);
        };
    }

    function initDrag() {
        var handle = document.getElementById('rt-drag-handle');
        if (!handle || !rtWindow) return;
        function onStart(cx, cy) {
            isDragging = true;
            var rect = rtWindow.getBoundingClientRect();
            startX = cx; startY = cy;
            startLeft = rect.left; startTop = rect.top;
            rtWindow.style.transition = 'none';
        }
        function onMove(cx, cy) {
            if (!isDragging) return;
            var dx = cx - startX, dy = cy - startY;
            rtWindow.style.left = Math.max(0, Math.min(window.innerWidth - rtWindow.offsetWidth, startLeft + dx)) + 'px';
            rtWindow.style.top = Math.max(0, Math.min(window.innerHeight - rtWindow.offsetHeight, startTop + dy)) + 'px';
            rtWindow.style.right = 'auto';
            rtWindow.style.bottom = 'auto';
        }
        function onEnd() { isDragging = false; }

        handle.addEventListener('mousedown', function (e) {
            if (e.target.closest('button')) return;
            onStart(e.clientX, e.clientY);
            e.preventDefault();
        });
        document.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); });
        document.addEventListener('mouseup', onEnd);
        handle.addEventListener('touchstart', function (e) {
            if (e.target.closest('button')) return;
            var t = e.touches[0];
            onStart(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchmove', function (e) {
            if (!isDragging) return;
            var t = e.touches[0];
            onMove(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchend', onEnd);
    }

    function initResize() {
        var handle = document.getElementById('rt-resize-handle');
        if (!handle || !rtWindow) return;
        try {
            var saved = JSON.parse(localStorage.getItem('rt_float_size') || 'null');
            if (saved && saved.w && saved.h) {
                rtWindow.style.width = saved.w + 'px';
                rtWindow.style.height = saved.h + 'px';
            }
        } catch (e) {}
        var isResizing = false, startW, startH, startCX, startCY;
        function onStart(cx, cy) {
            isResizing = true;
            startW = rtWindow.offsetWidth;
            startH = rtWindow.offsetHeight;
            startCX = cx; startCY = cy;
        }
        function onMove(cx, cy) {
            if (!isResizing) return;
            var w = Math.max(220, Math.min(window.innerWidth - 20, startW + (cx - startCX)));
            var h = Math.max(180, Math.min(window.innerHeight - 20, startH + (cy - startCY)));
            rtWindow.style.width = w + 'px';
            rtWindow.style.height = h + 'px';
        }
        function onEnd() {
            if (!isResizing) return;
            isResizing = false;
            try {
                localStorage.setItem('rt_float_size', JSON.stringify({
                    w: rtWindow.offsetWidth,
                    h: rtWindow.offsetHeight
                }));
            } catch (e) {}
        }
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault(); e.stopPropagation();
            onStart(e.clientX, e.clientY);
        });
        document.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); });
        document.addEventListener('mouseup', onEnd);
        handle.addEventListener('touchstart', function (e) {
            e.preventDefault(); e.stopPropagation();
            var t = e.touches[0];
            onStart(t.clientX, t.clientY);
        }, { passive: false });
        document.addEventListener('touchmove', function (e) {
            if (!isResizing) return;
            var t = e.touches[0];
            onMove(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchend', onEnd);
    }

    function clearDisplay() {
        var pinyinLine = document.getElementById('rt-pinyin-line');
        var candArea = document.getElementById('rt-cand-area');
        var preview = document.getElementById('rt-preview');
        var statusEl = document.getElementById('rt-status');
        if (pinyinLine) pinyinLine.innerHTML = '';
        if (candArea) candArea.innerHTML = '';
        if (preview) preview.innerHTML = '<span class="rt-placeholder">组句中…</span>';
        if (statusEl) statusEl.textContent = '正在组句…';
    }

    async function playPinyinAnimation(text) {
    if (!rtWindow) createFloatingWindow();
    rtWindow.style.display = 'flex';
    isVisible = true;
    _playCancelled = false;

    var pinyinLine = document.getElementById('rt-pinyin-line');
    var candArea = document.getElementById('rt-cand-area');
    var preview = document.getElementById('rt-preview');
    var statusEl = document.getElementById('rt-status');

    if (pinyinLine) pinyinLine.innerHTML = '';
    if (candArea) candArea.innerHTML = '';
    if (preview) preview.innerHTML = '';
    if (statusEl) statusEl.textContent = '正在组句…';

    var chars = Array.from(String(text));

    var smooth = _currentSpeed;
    var letterDelay = 130 - smooth * 1.0; if (letterDelay < 30) letterDelay = 30;
    var candShowDelay = 220 - smooth * 1.2; if (candShowDelay < 70) candShowDelay = 70;
    var selectDelay = 280 - smooth * 1.5; if (selectDelay < 80) selectDelay = 80;

    var confirmed = [];

    for (var i = 0; i < chars.length; i++) {
        if (_playCancelled) return;
        var ch = chars[i];
        var py = charToPinyin(ch);

        var baseCands = candidatesMap[py] || [ch];
        var others = baseCands.filter(function (c) { return c !== ch; });
        var pickedOthers = others.slice(0, 4);
        var cands = [ch].concat(pickedOthers);
        for (var k = cands.length - 1; k > 0; k--) {
            var jj = Math.floor(Math.random() * (k + 1));
            var tmp = cands[k]; cands[k] = cands[jj]; cands[jj] = tmp;
        }

        var confirmedHTML = confirmed.map(function (c) {
            return '<span class="rt-pinyin-tag done">' + escapeHtml(c) + '</span>';
        }).join('');

        for (var j = 1; j <= py.length; j++) {
            if (_playCancelled) return;
            var partial = py.slice(0, j);
            pinyinLine.innerHTML = confirmedHTML + '<span class="rt-pinyin-tag active">' + escapeHtml(partial) + '</span>';
            await sleep(letterDelay);
        }

        candArea.innerHTML = '';
        var col = document.createElement('div');
        col.className = 'rt-cand-col';
        col.innerHTML = cands.map(function (c, ci) {
            return '<div class="rt-cand-char" data-ci="' + ci + '">' + escapeHtml(c) + '</div>';
        }).join('');
        candArea.appendChild(col);

        await sleep(candShowDelay);

        var charEls = col.querySelectorAll('.rt-cand-char');
        charEls.forEach(function (el) {
            if (el.textContent === ch) el.classList.add('selected');
        });

        await sleep(selectDelay);

        confirmed.push(ch);
        pinyinLine.innerHTML = confirmed.map(function (c) {
            return '<span class="rt-pinyin-tag done">' + escapeHtml(c) + '</span>';
        }).join('');

        candArea.innerHTML = '';

        await sleep(200);
    }

    if (statusEl) statusEl.textContent = '组句完成';
}

    window.playPartnerTyping = async function (text) {
        if (!text || !String(text).trim()) return;
        if (_isPlaying) return;

        var textStr = String(text).trim();

        if (!isAnimEnabled()) {
            var pn0 = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
            addMessage({ id: Date.now(), sender: pn0, text: textStr, timestamp: new Date(), status: 'received', type: 'normal' });
            if (typeof playSound === 'function') playSound('message');
            if (typeof window._sendPartnerNotification === 'function') window._sendPartnerNotification(pn0, textStr);
            return;
        }

        _isPlaying = true;
        await playPinyinAnimation(textStr);
        if (_playCancelled) { _isPlaying = false; return; }

        var partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        addMessage({
            id: Date.now(),
            sender: partnerName,
            text: textStr,
            timestamp: new Date(),
            status: 'received',
            type: 'normal'
        });
        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(partnerName, textStr);
        }

        setTimeout(function () {
            clearDisplay();
            _isPlaying = false;
        }, 900);
    };

    window.simulatePartnerTypingProcess = async function (text) {
        if (_isPlaying) return;
        _isPlaying = true;
        await playPinyinAnimation(text);
        setTimeout(function () { clearDisplay(); _isPlaying = false; }, 900);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFloatingWindow);
    } else {
        createFloatingWindow();
    }
})();