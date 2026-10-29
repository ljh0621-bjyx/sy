/* ============================================================
 * lyric-cards.js - 歌词字卡
 * 拦截他的回复，概率用歌词代替普通字卡（文字形式）
 * ============================================================ */
(function () {
    'use strict';

    // ========== 歌词字卡库 ==========
    // 你可以随意增加歌曲，sentence 是一句核心词，context 是上下文
    const LYRICS_DB = [
        {
            song: '《水为媒》 - 礼越',
            lyrics: '白头到老也无悔，爱绵长 情珍贵，天涯海角我也愿奉陪，风吹树叶沙沙响，好比情话慢慢讲'
        },
        {
            song: '《思念 (live | 典藏)》 - 礼越',
            lyrics: '有些话还没说破，你懂我想要什么，那爱情的错落 总是很难提，泡的咖啡有苦的滋味，原来这就是爱情的错落'
        },
        {
            song: '《虚拟》 - 陈粒',
            lyrics: '你是我朝夕相伴触手可及的虚拟，陪着我像纸笔像自己像雨滴，看着我坠啊坠啊坠落到云里'
        },
        {
            song: '《十二月的奇迹》 - EXO',
            lyrics: '我望眼欲穿 看我看不到的你，我侧耳倾听 听我听不到的你，看到曾看不见的画面，听到听不见的声线'
        },
        {
            song: '《水星记》 - 郭顶',
            lyrics: '还要多远才能进入你的心，还要多久才能和你接近，咫尺远近却无法靠近的那个人，也等着和你相遇'
        },
        {
            song: '《想见你想见你想见你》 - 八三夭',
            lyrics: '想见你 只想见你 未来过去 我只想见你，穿越了 千个万个 时间线里 人海里相依'
        },
        {
            song: '《特别的人》 - 方大同',
            lyrics: '爱一个人或许要慷慨，若只想要被爱，最后没有了对白，必须有你我的情真，不求计分的平等'
        }
    ];

    // ========== 发送歌词字卡 ==========
    function sendLyricCard() {
        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        
        // 随机抽一首
        const item = LYRICS_DB[Math.floor(Math.random() * LYRICS_DB.length)];
        
        // 把歌词按逗号或句号切开，随机取 1~2 句作为核心内容（模拟截图里只发一两句的效果）
        const lines = item.lyrics.split(/[，。]/).filter(t => t.trim().length > 0);
        const startIdx = Math.floor(Math.random() * Math.max(1, lines.length - 1));
        const takeCount = Math.random() < 0.5 ? 1 : 2; // 发1句或2句
        const selectedLines = lines.slice(startIdx, startIdx + takeCount).join('，');

        // 组合成发送的文字：引号包裹歌词，换行加上出处
        const text = `「${selectedLines}」\n—— ${item.song}`;

        // 发送消息
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: partnerName,
                text: text,
                timestamp: new Date(),
                status: 'received',
                type: 'normal'
            });
        }

        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(partnerName, text);
        }
    }

    // ========== 拦截对方的正常回复 ==========
    function installReplyHook() {
        if (typeof window.simulateReply !== 'function') {
            setTimeout(installReplyHook, 1000);
            return;
        }
        if (window._lyricHookInstalled) return;
        window._lyricHookInstalled = true;

        const originalSimulate = window.simulateReply;
        
        window.simulateReply = function () {
            // 20% 概率触发发歌词（20% 就是 0.2，你可以自己调）
            if (Math.random() < 0.2) {
                // 稍微延迟一下再发，模拟打字
                setTimeout(() => {
                    sendLyricCard();
                }, 1000 + Math.random() * 1500);
                return; 
            }
            
            // 剩下的 80% 概率，走原来的字卡回复
            return originalSimulate.apply(this, arguments);
        };
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(installReplyHook, 2000));
    } else {
        setTimeout(installReplyHook, 2000);
    }

    console.log('[lyric-cards] 歌词字卡拦截器已加载 ✓');
})();