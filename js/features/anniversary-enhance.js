/* ============================================================
 * anniversary-enhance.js - 纪念日增强
 * 顶部横幅 + 每日提醒 + 里程碑动画
 * ============================================================ */
(function () {
    'use strict';

    const SEEN_KEY = 'annMilestoneSeen_v1';
    const BANNER_HIDE_KEY = 'annBannerHidden_v1';
    const DAILY_SHOW_KEY = 'annDailyShown_v1';

    const MILESTONES = [7, 30, 50, 100, 200, 365, 500, 730, 1000, 1500, 2000, 3000, 5000, 10000];

    function getAnnDays(ann) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const target = new Date(ann.date);
        target.setHours(0, 0, 0, 0);
        if (ann.type === 'countdown') {
            return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
        }
        return Math.max(0, Math.floor((now - target) / (1000 * 60 * 60 * 24)));
    }

    function nextMilestone(days) {
        for (let i = 0; i < MILESTONES.length; i++) {
            if (MILESTONES[i] > days) return MILESTONES[i];
        }
        return null;
    }

    function findNearestAnniversary() {
        if (typeof anniversaries === 'undefined' || !Array.isArray(anniversaries) || anniversaries.length === 0) return null;
        var list = anniversaries.map(function(a) {
            var days = getAnnDays(a);
            var isCountdown = a.type === 'countdown';
            var nextMs = isCountdown ? null : nextMilestone(days);
            var toNext = nextMs ? nextMs - days : Infinity;
            return { ann: a, days: days, isCountdown: isCountdown, nextMs: nextMs, toNext: toNext };
        });
        list.sort(function(a, b) {
            if (a.isCountdown && a.days === 0 && !(b.isCountdown && b.days === 0)) return -1;
            if (b.isCountdown && b.days === 0 && !(a.isCountdown && a.days === 0)) return 1;
            return a.toNext - b.toNext;
        });
        return list[0];
    }

    // ========== 顶部横幅 ==========
    function renderTopBanner() {
        var old = document.getElementById('ann-top-banner');
        if (old) old.remove();

        if (localStorage.getItem(BANNER_HIDE_KEY) === '1') return;

        var nearest = findNearestAnniversary();
        if (!nearest) return;

        var ann = nearest.ann;
        var days = nearest.days;
        var isCountdown = nearest.isCountdown;
        var nextMs = nearest.nextMs;
        var toNext = nearest.toNext;

        var isToday = (isCountdown && days === 0);
        var soonMilestone = (!isCountdown && toNext <= 3 && toNext >= 0);
        var soonCountdown = (isCountdown && days <= 3 && days > 0);

        if (!isToday && !soonMilestone && !soonCountdown) return;

        var text = '';
        if (isToday) {
            text = '🎉 今天是「' + ann.name + '」';
        } else if (soonCountdown) {
            text = '⏳ 距离「' + ann.name + '」还有 ' + days + ' 天';
        } else if (soonMilestone) {
            text = '✦ 距「' + ann.name + '」的 ' + nextMs + ' 天还有 ' + toNext + ' 天';
        }

        var banner = document.createElement('div');
        banner.id = 'ann-top-banner';
        banner.style.cssText =
            'position:fixed;top:0;left:0;right:0;z-index:95;' +
            'display:flex;align-items:center;gap:10px;padding:9px 14px;' +
            'background:linear-gradient(90deg, rgba(var(--accent-color-rgb),0.14), rgba(var(--accent-color-rgb),0.04));' +
            'border-bottom:1px solid rgba(var(--accent-color-rgb),0.2);' +
            'font-size:12px;color:var(--text-primary);' +
            'backdrop-filter:blur(10px);' +
            'animation:annBannerSlide 0.4s cubic-bezier(0.34,1.56,0.64,1);' +
            'cursor:pointer;';

        banner.innerHTML =
            '<i class="fas fa-heart" style="color:var(--accent-color);font-size:12px;flex-shrink:0;"></i>' +
            '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + text + '</span>' +
            '<button id="ann-banner-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:12px;padding:2px 6px;flex-shrink:0;"><i class="fas fa-times"></i></button>';

        document.body.appendChild(banner);

        banner.addEventListener('click', function(e) {
            if (e.target.closest('#ann-banner-close')) return;
            var adv = document.getElementById('advanced-modal');
            if (adv && typeof hideModal === 'function') hideModal(adv);
            var am = document.getElementById('anniversary-modal');
            if (am && typeof showModal === 'function') {
                if (typeof renderAnniversariesList === 'function') renderAnniversariesList();
                showModal(am);
            }
        });

        banner.querySelector('#ann-banner-close').onclick = function(e) {
            e.stopPropagation();
            banner.remove();
            localStorage.setItem(BANNER_HIDE_KEY, '1');
            if (typeof showNotification === 'function') {
                showNotification('已隐藏纪念日横幅', 'info', 2000);
            }
        };

        if (!document.getElementById('ann-enhance-anim')) {
            var s = document.createElement('style');
            s.id = 'ann-enhance-anim';
            s.textContent =
                '@keyframes annBannerSlide{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}' +
                '@keyframes annMilestonePop{from{opacity:0;transform:scale(0.6)}to{opacity:1;transform:scale(1)}}';
            document.head.appendChild(s);
        }
    }

    // ========== 每日首次打开提醒 ==========
    function showDailyReminderIfNeeded() {
        var today = new Date().toDateString();
        if (localStorage.getItem(DAILY_SHOW_KEY) === today) return;

        var nearest = findNearestAnniversary();
        if (!nearest) return;

        var ann = nearest.ann;
        var days = nearest.days;
        var isCountdown = nearest.isCountdown;
        var nextMs = nearest.nextMs;
        var toNext = nearest.toNext;

        var isToday = (isCountdown && days === 0);
        var soonMilestone = (!isCountdown && toNext <= 7 && toNext >= 0);
        var soonCountdown = (isCountdown && days <= 7 && days > 0);

        if (!isToday && !soonMilestone && !soonCountdown) return;

        localStorage.setItem(DAILY_SHOW_KEY, today);

        var title = '', subtitle = '';
        if (isToday) {
            title = '纪念日快乐 🎉';
            subtitle = '今天是「' + ann.name + '」，别忘了和梦角一起庆祝～';
        } else if (soonCountdown) {
            title = '快到啦 ⏳';
            subtitle = '距离「' + ann.name + '」还有 ' + days + ' 天';
        } else if (soonMilestone) {
            title = '里程碑预警 ✦';
            subtitle = '距「' + ann.name + '」的 ' + nextMs + ' 天还有 ' + toNext + ' 天';
        }

        setTimeout(function() {
            showAnnReminderCard(title, subtitle, ann);
        }, 5000);
    }

    function showAnnReminderCard(title, subtitle) {
        var old = document.getElementById('ann-daily-reminder');
        if (old) old.remove();

        var card = document.createElement('div');
        card.id = 'ann-daily-reminder';
        card.style.cssText =
            'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:99998;' +
            'width:88%;max-width:340px;' +
            'background:linear-gradient(135deg, var(--secondary-bg), rgba(var(--accent-color-rgb),0.06));' +
            'border:1.5px solid rgba(var(--accent-color-rgb),0.3);border-radius:18px;' +
            'padding:18px 20px;' +
            'box-shadow:0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(var(--accent-color-rgb),0.1);' +
            'animation:annMilestonePop 0.5s cubic-bezier(0.34,1.56,0.64,1);';

        card.innerHTML =
            '<div style="display:flex;align-items:flex-start;gap:14px;">' +
                '<div style="width:44px;height:44px;border-radius:14px;background:rgba(var(--accent-color-rgb),0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                    '<i class="fas fa-heart" style="color:var(--accent-color);font-size:18px;"></i>' +
                '</div>' +
                '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">' + title + '</div>' +
                    '<div style="font-size:12.5px;color:var(--text-secondary);line-height:1.6;">' + subtitle + '</div>' +
                '</div>' +
                '<button id="ann-reminder-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:2px 6px;flex-shrink:0;"><i class="fas fa-times"></i></button>' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-top:14px;">' +
                '<button id="ann-reminder-later" style="flex:1;padding:9px;border:1px solid var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);">稍后</button>' +
                '<button id="ann-reminder-view" style="flex:1.5;padding:9px;border:none;border-radius:10px;background:var(--accent-color);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-family);">查看纪念日</button>' +
            '</div>';

        document.body.appendChild(card);

        var close = function() { card.remove(); };
        card.querySelector('#ann-reminder-close').onclick = close;
        card.querySelector('#ann-reminder-later').onclick = close;
        card.querySelector('#ann-reminder-view').onclick = function() {
            card.remove();
            var adv = document.getElementById('advanced-modal');
            if (adv && typeof hideModal === 'function') hideModal(adv);
            var am = document.getElementById('anniversary-modal');
            if (am && typeof showModal === 'function') {
                if (typeof renderAnniversariesList === 'function') renderAnniversariesList();
                showModal(am);
            }
        };

        setTimeout(function() { if (document.body.contains(card)) card.remove(); }, 15000);
    }

    // ========== 里程碑动画 ==========
    function checkMilestoneCelebration() {
        var seenRaw = localStorage.getItem(SEEN_KEY) || '[]';
        var seen = [];
        try { seen = JSON.parse(seenRaw); } catch (e) { seen = []; }

        if (typeof anniversaries === 'undefined' || !Array.isArray(anniversaries)) return;

        for (var i = 0; i < anniversaries.length; i++) {
            var ann = anniversaries[i];
            var days = getAnnDays(ann);
            if (ann.type === 'countdown') continue;
            if (MILESTONES.indexOf(days) === -1) continue;
            var key = ann.id + '::' + days;
            if (seen.indexOf(key) !== -1) continue;

            seen.push(key);
            try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) {}

            setTimeout(function() {
                showMilestoneCelebration(ann, days);
            }, 3000);
            return;
        }
    }

    function showMilestoneCelebration(ann, days) {
        var old = document.getElementById('ann-milestone-celebration');
        if (old) old.remove();

        var el = document.createElement('div');
        el.id = 'ann-milestone-celebration';
        el.style.cssText =
            'position:fixed;inset:0;z-index:999999;' +
            'background:radial-gradient(circle at center, rgba(var(--accent-color-rgb),0.25), rgba(0,0,0,0.85));' +
            'backdrop-filter:blur(14px);' +
            'display:flex;align-items:center;justify-content:center;' +
            'animation:annBannerSlide 0.4s ease;';

        el.innerHTML =
            '<div style="text-align:center;color:#fff;padding:30px;max-width:340px;">' +
                '<div style="font-size:72px;line-height:1;margin-bottom:20px;animation:annMilestonePop 0.8s cubic-bezier(0.34,1.56,0.64,1);">✦</div>' +
                '<div style="font-size:14px;letter-spacing:4px;text-transform:uppercase;opacity:0.7;margin-bottom:12px;">MILESTONE</div>' +
                '<div style="font-size:22px;font-weight:700;margin-bottom:20px;line-height:1.4;">' +
                    '你和梦角的<br>' +
                    '<span style="color:var(--accent-color);font-size:32px;font-family:Georgia,serif;">' + days + '</span>' +
                    ' 天里程碑' +
                '</div>' +
                '<div style="font-size:13px;opacity:0.75;line-height:1.8;margin-bottom:24px;">' +
                    '「' + ann.name + '」<br>又一起走过了一段' +
                '</div>' +
                '<button id="ann-ms-close" style="padding:12px 40px;border:none;border-radius:14px;background:var(--accent-color);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font-family);box-shadow:0 10px 30px rgba(var(--accent-color-rgb),0.5);">' +
                    '继续陪伴 ✦' +
                '</button>' +
            '</div>';

        document.body.appendChild(el);

        var close = function() { el.remove(); };
        el.querySelector('#ann-ms-close').onclick = close;
        el.addEventListener('click', function(e) { if (e.target === el) close(); });

        if (typeof playSound === 'function') playSound('favorite');

        setTimeout(function() {
            if (document.body.contains(el)) close();
        }, 12000);
    }

    // ========== 恢复横幅按钮 ==========
    window.restoreAnnBanner = function () {
        localStorage.removeItem(BANNER_HIDE_KEY);
        renderTopBanner();
        if (typeof showNotification === 'function') showNotification('纪念日横幅已恢复', 'success');
    };

    // ========== 初始化 ==========
    window.initAnniversaryEnhance = function () {
        setTimeout(renderTopBanner, 1500);
        setTimeout(showDailyReminderIfNeeded, 5500);
        setTimeout(checkMilestoneCelebration, 2500);

        setInterval(renderTopBanner, 5 * 60 * 1000);
    };

})();