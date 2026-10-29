/* ============================================================
 * parallel-space.js - 他的平行空间（微博风）
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'parallelSpaceData_v1';
    let data = { posts: [], lastPostTime: 0 };

    const POST_POOL = [
        '今天风很大，不知道她有没有多穿衣服。',
        '刚刚看到一只猫，很像她。',
        '其实我很想告诉她，我有点想她了。',
        '今天工作遇到点麻烦，但一想到她，就觉得还能撑下去。',
        '刚才差点说漏嘴，说我想见她。',
        '真希望现在的夜晚能长一点，这样就能多梦到她一会儿。',
        '心里空落落的，可能是因为今天她回消息比较慢吧。'
    ];

    const REPLY_POOL = [
        '……你看到了啊。', '咳，被发现了。', '嗯，其实没什么。', '你少管我。', '（他偷偷红了耳根）', '既然你看到了，那我不装了，我就是想你。'
    ];

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) data = JSON.parse(raw);
        } catch (e) {}
    }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    }

    // 自动生成新动态
    function checkAutoPost() {
        load();
        const now = Date.now();
        if (now - data.lastPostTime > 4 * 3600000 && data.posts.length < 30) {
            data.posts.unshift({
                id: 'ps_' + now,
                time: now,
                content: POST_POOL[Math.floor(Math.random() * POST_POOL.length)],
                likes: false,
                comments: []
            });
            data.lastPostTime = now;
            save();
        }
    }

    window.openParallelSpace = function () {
        load();
        checkAutoPost();

        const old = document.getElementById('parallel-space-panel');
        if (old) old.remove();

        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';

        const listHTML = data.posts.length === 0
            ? '<div style="text-align:center;padding:40px;color:#999;font-size:13px;">这里空荡荡的，他还没有发过碎碎念。</div>'
            : data.posts.map(p => {
                const timeStr = new Date(p.time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                const commentsHTML = p.comments.map(c => `
                    <div style="font-size:12px; margin-top:6px; padding:6px 10px; background:rgba(0,0,0,0.03); border-radius:6px;">
                        <span style="font-weight:600; color:#333;">${c.author}：</span>
                        <span style="color:#666;">${c.text}</span>
                    </div>
                `).join('');

                return `
                <div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                        <div style="width:36px; height:36px; border-radius:50%; background:#f0f0f0; display:flex; align-items:center; justify-content:center; font-size:18px;">🌙</div>
                        <div>
                            <div style="font-size:14px; font-weight:600; color:#333;">${pName}</div>
                            <div style="font-size:11px; color:#999;">${timeStr} 来自平行空间</div>
                        </div>
                    </div>
                    <div style="font-size:14px; color:#222; line-height:1.6; margin-bottom:14px;">${p.content}</div>
                    ${commentsHTML}
                    <div style="display:flex; gap:16px; border-top:1px solid #f0f0f0; padding-top:10px; margin-top:10px;">
                        <button onclick="window._psLike('${p.id}')" style="background:none; border:none; font-size:12px; color:${p.likes ? '#ff6699' : '#999'}; cursor:pointer;">
                            <i class="${p.likes ? 'fas' : 'far'} fa-heart"></i> 赞
                        </button>
                        <button onclick="window._psComment('${p.id}')" style="background:none; border:none; font-size:12px; color:#999; cursor:pointer;">
                            <i class="far fa-comment"></i> 评论
                        </button>
                    </div>
                </div>`;
            }).join('');

        const modal = document.createElement('div');
        modal.id = 'parallel-space-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f2f3f5;display:flex;flex-direction:column;';
        
        modal.innerHTML = `
            <div style="height:56px; background:#fff; display:flex; align-items:center; padding:0 16px; border-bottom:1px solid #eee; flex-shrink:0;">
                <button onclick="document.getElementById('parallel-space-panel').remove()" style="background:none; border:none; font-size:18px; color:#333;"><i class="fas fa-chevron-left"></i></button>
                <div style="flex:1; text-align:center; font-size:16px; font-weight:600; color:#333;">平行空间</div>
                <div style="width:24px;"></div>
            </div>
            <div style="flex:1; overflow-y:auto; padding:16px;">
                ${listHTML}
            </div>
        `;
        document.body.appendChild(modal);
    };

    window._psLike = function (id) {
        load();
        const p = data.posts.find(x => x.id === id);
        if (p) {
            p.likes = !p.likes;
            save();
            window.openParallelSpace();
        }
    };

    window._psComment = function (id) {
        const text = prompt('留下你的评论：');
        if (!text || !text.trim()) return;
        
        load();
        const p = data.posts.find(x => x.id === id);
        if (p) {
            p.comments.push({ author: '我', text: text.trim() });
            save();
            window.openParallelSpace();

            // 模拟他随机回复
            setTimeout(() => {
                if (Math.random() < 0.7) {
                    p.comments.push({ author: (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他', text: REPLY_POOL[Math.floor(Math.random() * REPLY_POOL.length)] });
                    save();
                    if (document.getElementById('parallel-space-panel')) window.openParallelSpace();
                    if (typeof showNotification === 'function') showNotification('他在平行空间回复了你', 'info', 3000);
                }
            }, 3000);
        }
    };

    console.log('[parallel-space] 平行空间已加载 ✓');
})();