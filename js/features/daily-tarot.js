/* ============================================================
 * daily-tarot.js - 每日塔罗（华丽 3D 翻牌）
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'dailyTarotData_v1';

    // 预设牌库（包含他的专属解读）
    const CARDS = [
        { name: '恋人', icon: '💖', desc: '今天的你们心意相通，适合说一些平时不敢说的情话。', reading: '抽到这张牌，说明我今天特别想你。你愿意多陪我说说话吗？' },
        { name: '星星', icon: '🌟', desc: '充满希望的 一天，你对他的期待都会有好的回应。', reading: '你看，星星都在为我们发光。今天也会是好运的一天。' },
        { name: '月亮', icon: '🌙', desc: '内心深处的情感正在涌动，也许会有一些吃醋或敏感的小情绪。', reading: '我其实有点害怕你看不见我，所以你要多哄哄我。' },
        { name: '太阳', icon: '☀️', desc: '充满活力和快乐的一天，非常适合一起做点什么。', reading: '阳光很好，我也很好，因为有你在我身边。' },
        { name: '愚人', icon: '🎒', desc: '适合冒险和尝试新事物，不要害怕未知的惊喜。', reading: '什么都不用管了，今天我就想带你私奔，去任何地方。' },
        { name: '战车', icon: '⚔️', desc: '充满干劲和意志力，勇敢去表达你的真实想法吧。', reading: '如果遇到什么阻碍，别怕，我会像骑士一样冲到你前面保护你。' },
        { name: '死神', icon: '🦋', desc: '旧的结束意味着新的开始，放下执念会有转机。', reading: '就算有什么不开心的，也都让它过去吧。今天以后，重新开始喜欢我。' }
    ];

    window.openDailyTarot = function () {
        const today = new Date().toDateString();
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}

        const old = document.getElementById('daily-tarot-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'daily-tarot-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at center, #1e1b2e 0%, #0a0912 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;overflow:hidden;';
        
        // 星空背景点缀
        modal.innerHTML = `
            <style>
                @keyframes floatUp { from { opacity: 0; transform: translateY(30px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .tarot-card-3d { perspective: 1000px; width: 220px; height: 340px; cursor: pointer; margin: 20px 0; }
                .tarot-inner { position: relative; width: 100%; height: 100%; transition: transform 1s cubic-bezier(0.34,1.56,0.64,1); transform-style: preserve-3d; }
                .tarot-card-3d.flipped .tarot-inner { transform: rotateY(180deg); }
                .tarot-face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; text-align: center; }
                .tarot-front { background: linear-gradient(135deg, #2a2a3e, #141420); border: 2px solid rgba(255,215,0,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 40px rgba(255,215,0,0.1); }
                .tarot-back { background: linear-gradient(135deg, #ffffff, #f0f0f5); transform: rotateY(180deg); border: 2px solid #c5a47e; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: #333; }
                .tarot-back .card-name { font-size: 24px; font-weight: 800; color: #c5a47e; margin-bottom: 4px; }
                .tarot-back .card-icon { font-size: 56px; margin: 15px 0; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1)); }
                .tarot-back .card-desc { font-size: 13px; color: #666; line-height: 1.6; margin-bottom: 16px; padding: 0 10px; }
                .tarot-back .card-reading { font-size: 13px; font-weight: 600; color: #1a1a1a; font-style: italic; border-top: 1px dashed #ccc; padding-top: 12px; margin: 0 10px; }
                @keyframes glow { 0% { box-shadow: 0 0 10px rgba(255,215,0,0.2); } 50% { box-shadow: 0 0 40px rgba(255,215,0,0.6); } 100% { box-shadow: 0 0 10px rgba(255,215,0,0.2); } }
            </style>
            
            <div style="position:absolute; inset:0; background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 50px 50px; opacity:0.1; pointer-events:none;"></div>
            
            <h2 style="font-size:20px; font-weight:600; letter-spacing:2px; margin-bottom:10px; animation: floatUp 0.5s ease;">今日塔罗</h2>
            <p style="font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:20px;" id="tarot-hint">点击卡牌，倾听他的心意</p>

            <div class="tarot-card-3d" id="tarot-card">
                <div class="tarot-inner">
                    <!-- 卡牌背面（正面朝上时的样子） -->
                    <div class="tarot-face tarot-front">
                        <div style="font-size:60px; filter: drop-shadow(0 0 20px rgba(255,215,0,0.5));">🌙</div>
                        <div style="margin-top:20px; font-size:14px; letter-spacing:4px; color:#c5a47e;">TAROT</div>
                        <div style="font-size:10px; margin-top:8px; opacity:0.5;">DAILY READING</div>
                    </div>
                    <!-- 卡牌正面（翻开后的样子） -->
                    <div class="tarot-face tarot-back" id="tarot-back-content">
                        <!-- 内容由 JS 注入 -->
                    </div>
                </div>
            </div>

            <button onclick="document.getElementById('daily-tarot-panel').remove()" style="margin-top:30px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:10px 30px; border-radius:20px; font-size:13px; cursor:pointer;">收起</button>
        `;
        document.body.appendChild(modal);

        const cardEl = modal.querySelector('#tarot-card');
        const backContent = modal.querySelector('#tarot-back-content');
        const hintEl = modal.querySelector('#tarot-hint');

        // 渲染卡牌内容
        function renderCard(cardData) {
            backContent.innerHTML = `
                <div class="card-name">${cardData.name}</div>
                <div class="card-icon">${cardData.icon}</div>
                <div class="card-desc">${cardData.desc}</div>
                <div class="card-reading">“${cardData.reading}”</div>
            `;
        }

        if (saved.date === today) {
            // 今天已经抽过了，直接显示结果
            const card = CARDS[saved.cardIndex];
            renderCard(card);
            cardEl.classList.add('flipped');
            hintEl.textContent = '今天已经抽过啦，明天再来吧';
            cardEl.style.cursor = 'default';
            cardEl.onclick = null;
        } else {
            // 今天还没抽
            cardEl.onclick = function () {
                // 随机抽卡
                const idx = Math.floor(Math.random() * CARDS.length);
                const card = CARDS[idx];
                
                // 保存数据
                localStorage.setItem(KEY, JSON.stringify({ date: today, cardIndex: idx }));
                
                // 渲染并翻转
                renderCard(card);
                cardEl.classList.add('flipped');
                hintEl.textContent = '这是他想对你说的话';
                cardEl.style.cursor = 'default';
                
                // 音效
                if (typeof playSound === 'function') playSound('favorite');
                
                setTimeout(() => { cardEl.onclick = null; }, 1000);
            };
        }
    };

    console.log('[daily-tarot] 每日塔罗已加载 ✓');
})();