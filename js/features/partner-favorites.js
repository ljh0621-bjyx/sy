/* ============================================================
 * partner-favorites.js - TA 的收藏
 * 自动按概率记录你发的内容，被对方"收藏"
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'partnerFavorites_v1';
    const SETTINGS_KEY = 'partnerFavSettings_v1';

    // 默认概率
    let favSettings = {
        text: 30,
        image: 40,
        sticker: 35,
        video: 40,
        music: 50,
        moment: 40
    };

    // 收藏数据
    let favData = {
        text: [],      // [{ text, time, id }]
        image: [],     // [{ url, time, id }]
        sticker: [],
        video: [],
        music: [],
        moment: []
    };

    async function load() {
        try {
            const s = await localforage.getItem(SETTINGS_KEY);
            if (s && typeof s === 'object') Object.assign(favSettings, s);
            const d = await localforage.getItem(KEY);
            if (d && typeof d === 'object') Object.assign(favData, d);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, favData); } catch (e) {}
    }
    async function saveSettings() {
        try { await localforage.setItem(SETTINGS_KEY, favSettings); } catch (e) {}
    }
    load();

    // ========== 生成唯一指纹，用来查重 ==========
    function makeFingerprint(type, content) {
        // 图片/贴纸这种长 URL，取前 80 字符做指纹
        let c = String(content || '').slice(0, 80);
        return type + '::' + c;
    }

    // ========== 判断是否已收藏 ==========
    function isAlreadyFavorited(type, content) {
        const fp = makeFingerprint(type, content);
        const list = favData[type] || [];
        return list.some(item => item._fp === fp);
    }

    // ========== 按概率决定是否收藏 ==========
    function roll(type) {
        const chance = favSettings[type] || 30;
        return Math.random() * 100 < chance;
    }

    // ========== 记录一条收藏 ==========
    async function addFavorite(type, content, extra) {
        if (!content) return false;
        if (isAlreadyFavorited(type, content)) return false;
        if (!roll(type)) return false;

        const item = {
            id: 'fav_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            time: Date.now(),
            _fp: makeFingerprint(type, content)
        };
        if (type === 'text') item.text = String(content).slice(0, 500);
        else if (type === 'image' || type === 'sticker') item.url = content;
        else if (type === 'video') { item.url = content; item.duration = (extra && extra.duration) || 5; }
        else if (type === 'music') { item.title = (extra && extra.title) || '音乐'; item.sub = (extra && extra.sub) || ''; item.url = content; }
        else if (type === 'moment') { item.text = String(content).slice(0, 500); item.url = (extra && extra.url) || null; }

        if (!favData[type]) favData[type] = [];
        favData[type].unshift(item);
        await save();

        // 通知
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        if (typeof showNotification === 'function') {
            const typeName = { text: '一条消息', image: '一张图片', sticker: '一个表情', video: '一段视频', music: '一首音乐', moment: '一条动态' }[type] || '一条内容';
            showNotification(pn + ' 收藏了你的' + typeName + ' ⭐', 'info', 2000);
        }
        return true;
    }

    // ========== 检测新消息（每秒扫一次） ==========
    let _lastMsgCount = 0;
    let _lastMsgId = null;

    function scanMessages() {
        if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
        if (messages.length === _lastMsgCount) return;

        // 只处理新加的（用户发的）
        const newMsgs = messages.slice(_lastMsgCount);
        _lastMsgCount = messages.length;

        newMsgs.forEach(msg => {
            if (!msg || msg.sender !== 'user') return;

            // 视频消息
            if (msg._video && msg._video.src) {
                addFavorite('video', msg._video.src, { duration: msg._video.duration || 5 });
                return;
            }
            // 图片消息
            if (msg.image) {
                // 判断是表情还是图：简单起见，短 URL 当表情，长 URL 当图
                if (msg.image && msg.image.length < 2000 && !msg.image.startsWith('data:image')) {
                    addFavorite('sticker', msg.image);
                } else {
                    addFavorite('image', msg.image);
                }
                return;
            }
            // 音乐分享（检测消息里带音乐的标记）
            if (msg._music && msg._music.url) {
                addFavorite('music', msg._music.url, { title: msg._music.title, sub: msg._music.sub });
                return;
            }
            // 文字
            if (msg.text && msg.text.trim()) {
                addFavorite('text', msg.text.trim());
            }
        });
    }
    setInterval(scanMessages, 1000);
    setTimeout(() => { if (typeof messages !== 'undefined') _lastMsgCount = messages.length; }, 2000);

    // ========== 检测朋友圈发布（监听 functions 调用） ==========
    // 通过钩住 moments.js 里的 addPost 不太容易，改成定时扫 moments 数据
    let _lastMomentCount = 0;
    function scanMoments() {
        try {
            if (typeof localforage === 'undefined') return;
            localforage.getItem('momentsData_v1').then(d => {
                if (!d || !Array.isArray(d.posts)) return;
                if (d.posts.length === _lastMomentCount) return;
                const newPosts = d.posts.slice(_lastMomentCount);
                _lastMomentCount = d.posts.length;
                newPosts.forEach(p => {
                    if (p && p.author === 'me') {
                        // 朋友圈收藏：把文字 + 第一张图都记
                        if (p.text && p.text.trim()) addFavorite('moment', p.text.trim(), { url: p.image || null });
                        if (p.image) addFavorite('image', p.image);
                    }
                });
            }).catch(() => {});
        } catch (e) {}
    }
    setInterval(scanMoments, 3000);
    setTimeout(scanMoments, 3000);

    // ========== 「TA 的收藏」面板 ==========
    window.openPartnerFavorites = function () {
        const old = document.getElementById('partner-favorites-panel');
        if (old) old.remove();

        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        const modal = document.createElement('div');
        modal.id = 'partner-favorites-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;width:94%;max-width:480px;height:88vh;max-height:760px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-color);flex-shrink:0;">'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<div style="width:34px;height:34px;border-radius:10px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">'
            +         '<i class="fas fa-star" style="color:var(--accent-color);font-size:14px;"></i>'
            +       '</div>'
            +       '<span style="font-size:15px;font-weight:700;color:var(--text-primary);">TA 的收藏</span>'
            +     '</div>'
            +     '<div style="display:flex;gap:6px;">'
            +       '<button id="pf-settings" title="概率设置" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;padding:4px 8px;"><i class="fas fa-cog"></i></button>'
            +       '<button id="pf-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;padding:4px 8px;"><i class="fas fa-times"></i></button>'
            +     '</div>'
            +   '</div>'
            +   '<div id="pf-body" style="flex:1;overflow-y:auto;padding:14px 16px;"></div>'
            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#pf-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        modal.querySelector('#pf-settings').onclick = () => {
            close();
            window.openPartnerFavSettings();
        };

        renderPartnerFavBody(modal.querySelector('#pf-body'));
    };

    // ========== 渲染主体 ==========
    function renderPartnerFavBody(container) {
        const typeMeta = [
            { key: 'text',    icon: 'fa-comment',       label: '文字' },
            { key: 'image',   icon: 'fa-image',         label: '图片' },
            { key: 'sticker', icon: 'fa-sticky-note',   label: '表情包' },
            { key: 'video',   icon: 'fa-video',         label: '视频' },
            { key: 'music',   icon: 'fa-music',         label: '音乐' },
            { key: 'moment',  icon: 'fa-camera-retro',  label: '朋友圈' }
        ];

        let html = '';
        let total = 0;
        typeMeta.forEach(m => {
            const list = favData[m.key] || [];
            total += list.length;
        });

        if (total === 0) {
            container.innerHTML =
                '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;color:var(--text-secondary);opacity:0.7;">'
                +   '<i class="fas fa-star" style="font-size:38px;margin-bottom:14px;opacity:0.4;"></i>'
                +   '<div style="font-size:14px;font-weight:600;margin-bottom:6px;">TA 还没有收藏</div>'
                +   '<div style="font-size:12px;">你发消息时，有概率被收藏</div>'
                + '</div>';
            return;
        }

        typeMeta.forEach(m => {
            const list = favData[m.key] || [];
            if (list.length === 0) return;

            html += '<div style="margin-bottom:18px;">';
            html += '<div style="display:flex;align-items:center;gap:7px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border-color);">'
                +   '<i class="fas ' + m.icon + '" style="color:var(--accent-color);font-size:13px;"></i>'
                +   '<span style="font-size:13px;font-weight:700;color:var(--text-primary);">' + m.label + '</span>'
                +   '<span style="font-size:11px;color:var(--text-secondary);opacity:0.7;">(' + list.length + ')</span>'
                + '</div>';

            if (m.key === 'text' || m.key === 'moment') {
                list.forEach(item => {
                    const content = item.text || '';
                    const hasImg = item.url;
                    html += '<div class="pf-item" data-type="' + m.key + '" data-id="' + item.id + '" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--primary-bg);border-radius:12px;margin-bottom:6px;position:relative;">'
                        +   '<div style="flex:1;font-size:13px;color:var(--text-primary);line-height:1.6;word-break:break-word;">'
                        +     (m.key === 'moment' ? '<i class="fas fa-quote-left" style="opacity:0.35;font-size:10px;margin-right:4px;"></i>' : '')
                        +     content.replace(/</g, '&lt;')
                        +     (hasImg ? '<img src="' + hasImg + '" style="max-width:100%;max-height:120px;margin-top:6px;border-radius:8px;display:block;">' : '')
                        +   '</div>'
                        +   '<button class="pf-del" data-type="' + m.key + '" data-id="' + item.id + '" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:13px;padding:2px 4px;opacity:0.5;flex-shrink:0;"><i class="fas fa-times"></i></button>'
                        + '</div>';
                });
            } else if (m.key === 'image' || m.key === 'sticker') {
                html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">';
                list.forEach(item => {
                    html += '<div class="pf-item" data-type="' + m.key + '" data-id="' + item.id + '" style="position:relative;aspect-ratio:1/1;border-radius:10px;overflow:hidden;background:var(--primary-bg);cursor:pointer;">'
                        +   '<img src="' + item.url + '" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy">'
                        +   '<button class="pf-del" data-type="' + m.key + '" data-id="' + item.id + '" style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.6);border:none;color:#fff;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;opacity:0.85;">×</button>'
                        + '</div>';
                });
                html += '</div>';
            } else if (m.key === 'video') {
                list.forEach(item => {
                    const dur = item.duration || 5;
                    const durStr = '0:' + String(dur).padStart(2, '0');
                    html += '<div class="pf-item" data-type="video" data-id="' + item.id + '" style="position:relative;display:inline-block;width:120px;height:80px;border-radius:10px;overflow:hidden;background:#000;margin:0 6px 6px 0;cursor:pointer;">'
                        +   '<img src="' + item.url + '" style="width:100%;height:100%;object-fit:cover;opacity:0.85;">'
                        +   '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:18px;">▶</div>'
                        +   '<div style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.6);color:#fff;font-size:10px;padding:1px 5px;border-radius:8px;font-family:monospace;">' + durStr + '</div>'
                        +   '<button class="pf-del" data-type="video" data-id="' + item.id + '" style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.6);border:none;color:#fff;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;">×</button>'
                        + '</div>';
                });
            } else if (m.key === 'music') {
                list.forEach(item => {
                    html += '<div class="pf-item" data-type="music" data-id="' + item.id + '" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--primary-bg);border-radius:12px;margin-bottom:6px;">'
                        +   '<div style="width:32px;height:32px;border-radius:8px;background:var(--accent-color);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;"><i class="fas fa-music" style="font-size:12px;"></i></div>'
                        +   '<div style="flex:1;min-width:0;">'
                        +     '<div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (item.title || '音乐') + '</div>'
                        +     (item.sub ? '<div style="font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + item.sub + '</div>' : '')
                        +   '</div>'
                        +   '<button class="pf-del" data-type="music" data-id="' + item.id + '" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:13px;padding:2px 4px;opacity:0.5;flex-shrink:0;"><i class="fas fa-times"></i></button>'
                        + '</div>';
                });
            }
            html += '</div>';
        });

        container.innerHTML = html;

        // 绑定删除
        container.querySelectorAll('.pf-del').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const type = btn.getAttribute('data-type');
                const id = btn.getAttribute('data-id');
                if (!type || !id) return;
                if (!confirm('确定从 TA 的收藏里删掉这条吗？')) return;
                favData[type] = (favData[type] || []).filter(it => it.id !== id);
                await save();
                renderPartnerFavBody(container);
                if (typeof showNotification === 'function') showNotification('已删除', 'success', 1500);
            };
        });

        // 图片点击放大
        container.querySelectorAll('.pf-item[data-type="image"], .pf-item[data-type="sticker"]').forEach(el => {
            el.onclick = (e) => {
                if (e.target.closest('.pf-del')) return;
                const img = el.querySelector('img');
                if (img && typeof viewImage === 'function') viewImage(img.src);
            };
        });
    }

    // ========== 概率设置面板 ==========
    window.openPartnerFavSettings = function () {
        const old = document.getElementById('partner-fav-settings');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'partner-fav-settings';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        const rows = [
            { key: 'text',    label: '文字消息' },
            { key: 'image',   label: '图片' },
            { key: 'sticker', label: '表情包' },
            { key: 'video',   label: '视频' },
            { key: 'music',   label: '音乐' },
            { key: 'moment',  label: '朋友圈' }
        ];

        let rowsHTML = '';
        rows.forEach(r => {
            rowsHTML += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">'
                + '<span style="font-size:13px;color:var(--text-primary);width:68px;flex-shrink:0;">' + r.label + '</span>'
                + '<input type="range" data-key="' + r.key + '" min="0" max="100" step="1" value="' + favSettings[r.key] + '" style="flex:1;accent-color:var(--accent-color);">'
                + '<span class="pf-set-val" data-key="' + r.key + '" style="font-size:13px;font-weight:700;color:var(--accent-color);width:48px;text-align:right;">' + favSettings[r.key] + '%</span>'
                + '</div>';
        });

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:90%;max-width:400px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-star" style="color:var(--accent-color);margin-right:8px;"></i>收藏概率</span>'
            +     '<button id="pfs-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">每次你发内容时，有多大概率被 TA 收藏。</div>'
            +   rowsHTML
            +   '<div style="display:flex;gap:10px;margin-top:16px;">'
            +     '<button id="pfs-cancel" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +     '<button id="pfs-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#pfs-close').onclick = close;
        modal.querySelector('#pfs-cancel').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelectorAll('input[type=range]').forEach(slider => {
            slider.oninput = () => {
                const v = slider.value;
                modal.querySelector('.pf-set-val[data-key="' + slider.dataset.key + '"]').textContent = v + '%';
            };
        });

        modal.querySelector('#pfs-save').onclick = async () => {
            modal.querySelectorAll('input[type=range]').forEach(slider => {
                favSettings[slider.dataset.key] = parseInt(slider.value);
            });
            await saveSettings();
            close();
            if (typeof showNotification === 'function') showNotification('✓ 概率已保存', 'success');
        };
    };
    // ========== 供 addMessage 钩子调用 ==========
window._checkFavoriteNow = function (msg) {
    try {
        if (!msg || msg.sender !== 'user') return;

        // 视频
        if (msg._video && msg._video.src) {
            addFavorite('video', msg._video.src, { duration: msg._video.duration || 5 });
            return;
        }
        // 图片
        if (msg.image) {
            if (msg.image.length < 2000 && !msg.image.startsWith('data:image')) {
                addFavorite('sticker', msg.image);
            } else {
                addFavorite('image', msg.image);
            }
            return;
        }
        // 音乐
        if (msg._music && msg._music.url) {
            addFavorite('music', msg._music.url, { title: msg._music.title, sub: msg._music.sub });
            return;
        }
        // 文字
        if (msg.text && msg.text.trim()) {
            addFavorite('text', msg.text.trim());
        }
    } catch (e) {
        console.warn('[partner-favorites] 立即检测失败', e);
    }
};
})();