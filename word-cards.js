/**
 * word-cards.js
 * 拼字卡功能（地点 + 心情）
 */

(function () {
    'use strict';

    const KEY = 'wordCardsData_v1';

    let data = {
        locations: [],
        moods: []
    };

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved) data = Object.assign(data, saved);
        } catch (e) { console.warn('[word-cards] load fail', e); }
    }

    async function save() {
        try {
            await localforage.setItem(KEY, data);
        } catch (e) { console.warn('[word-cards] save fail', e); }
    }

    window.getRandomLocation = function () {
        if (data.locations.length === 0) return null;
        return data.locations[Math.floor(Math.random() * data.locations.length)];
    };

    window.getRandomMood = function () {
        if (data.moods.length === 0) return null;
        return data.moods[Math.floor(Math.random() * data.moods.length)];
    };

    window.deleteWordCard = async function (type, index) {
        const key = type === 'location' ? 'locations' : 'moods';
        data[key].splice(index, 1);
        await save();
        renderManager();
    };

    window.batchAddWordCards = async function (type, text) {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) {
            showNotification('请输入至少一行内容', 'warning');
            return 0;
        }
        const key = type === 'location' ? 'locations' : 'moods';
        let added = 0;
        lines.forEach(line => {
            if (!data[key].includes(line)) {
                data[key].push(line);
                added++;
            }
        });
        await save();
        renderManager();
        return added;
    };

    window.showBatchAddWordCard = function (type) {
        const old = document.getElementById('batch-word-card-modal');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'batch-word-card-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;';
        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.4);">'
            + '<div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:12px;">批量添加' + (type === 'location' ? '地点' : '心情') + '卡</div>'
            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">每行一张卡</div>'
            + '<textarea id="batch-word-card-input" rows="8" placeholder="第一张卡&#10;第二张卡&#10;第三张卡" style="width:100%;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-family:var(--font-family);resize:none;outline:none;box-sizing:border-box;"></textarea>'
            + '<div style="display:flex;gap:10px;margin-top:16px;">'
            + '<button id="bwc-cancel" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            + '<button id="bwc-confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">添加</button>'
            + '</div></div>';
        document.body.appendChild(modal);

        document.getElementById('bwc-cancel').onclick = () => modal.remove();
        document.getElementById('bwc-confirm').onclick = async () => {
            const t = document.getElementById('batch-word-card-input').value;
            const added = await window.batchAddWordCards(type, t);
            modal.remove();
            if (added > 0) {
                showNotification('已添加 ' + added + ' 张卡', 'success');
            } else {
                showNotification('没有新增内容（可能都已存在）', 'info');
            }
        };
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    };

    function renderManager() {
        const container = document.getElementById('word-cards-manager');
        if (!container) return;

        const locHTML = data.locations.length === 0
            ? '<span style="font-size:12px;color:var(--text-secondary);opacity:0.6;">暂无地点卡</span>'
            : data.locations.map((loc, i) =>
                '<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(var(--accent-color-rgb),0.1);border-radius:20px;font-size:12px;color:var(--text-primary);margin:3px;">'
                + loc
                + '<span onclick="deleteWordCard(\'location\',' + i + ')" style="cursor:pointer;color:var(--text-secondary);font-size:10px;">✕</span>'
                + '</span>'
            ).join('');

        const moodHTML = data.moods.length === 0
            ? '<span style="font-size:12px;color:var(--text-secondary);opacity:0.6;">暂无心情卡</span>'
            : data.moods.map((mood, i) =>
                '<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(255,107,107,0.1);border-radius:20px;font-size:12px;color:var(--text-primary);margin:3px;">'
                + mood
                + '<span onclick="deleteWordCard(\'mood\',' + i + ')" style="cursor:pointer;color:var(--text-secondary);font-size:10px;">✕</span>'
                + '</span>'
            ).join('');

        container.innerHTML =
            '<div style="display:flex;flex-direction:column;gap:18px;">'

            + '<div>'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
            + '<span style="font-size:13px;font-weight:600;color:var(--text-primary);">'
            + '<i class="fas fa-map-marker-alt" style="color:var(--accent-color);margin-right:6px;"></i>地点卡 (' + data.locations.length + ')</span>'
            + '<button onclick="showBatchAddWordCard(\'location\')" style="padding:5px 12px;border:1px solid var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);">'
            + '<i class="fas fa-plus"></i> 批量添加</button>'
            + '</div>'
            + '<div style="display:flex;flex-wrap:wrap;gap:6px;min-height:40px;padding:10px;background:var(--primary-bg);border-radius:12px;border:1px solid var(--border-color);">'
            + locHTML
            + '</div></div>'

            + '<div>'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
            + '<span style="font-size:13px;font-weight:600;color:var(--text-primary);">'
            + '<i class="fas fa-heart" style="color:#FF6B6B;margin-right:6px;"></i>心情卡 (' + data.moods.length + ')</span>'
            + '<button onclick="showBatchAddWordCard(\'mood\')" style="padding:5px 12px;border:1px solid var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);">'
            + '<i class="fas fa-plus"></i> 批量添加</button>'
            + '</div>'
            + '<div style="display:flex;flex-wrap:wrap;gap:6px;min-height:40px;padding:10px;background:var(--primary-bg);border-radius:12px;border:1px solid var(--border-color);">'
            + moodHTML
            + '</div></div>'

            + '</div>';
    }

    window.openWordCardsPanel = function () {
        const old = document.getElementById('word-cards-panel');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'word-cards-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:90%;max-width:420px;max-height:80vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            + '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">拼字卡管理</span>'
            + '<button id="close-wc-panel" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div id="word-cards-manager"></div>'
            + '</div>';
        document.body.appendChild(modal);
        document.getElementById('close-wc-panel').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        renderManager();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }

})();