/**
 * ═══════════════════════════════════════════════════════════════
 *  ADMIN NOTIFICATIONS DROPDOWN
 *  ───────────────────────────────────────────────────────────────
 *  Auto-mounts a narrative notifications dropdown next to the
 *  admin topbar bell button on every admin page.
 *
 *  Dependencies (must be loaded BEFORE this script) :
 *      <script src="marketup_seed_data.js"></script>
 *      <script src="admin_data_bridge.js"></script>
 *      <script src="admin_notifications_dropdown.js"></script>
 *
 *  Behavior :
 *   - Reads `window.MARKETUP_DATA` (legacy admin shape post-bridge)
 *   - Collects pending events : new accounts, pending updates,
 *     pending profiles (BrandUP/TraceUP/LinkUP), pending RSE receipts
 *   - Sorts FIFO (oldest first = most urgent at top)
 *   - Renders the 3 oldest in a 340px dropdown next to the bell
 *   - Updates the bell badge with the TOTAL pending count
 *   - Handles open / close (click, click-outside, Escape)
 *
 *  Mock layer — the click on an item navigates to the relevant
 *  admin queue page. In production (Next.js), each event will carry
 *  a deep link to the specific item.
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    // ─── Utils ─────────────────────────────────────────────────
    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function formatNumber(n) {
        return Number(n || 0).toLocaleString('fr-FR').replace(/\u202F/g, '\u00A0');
    }

    function timeAgo(ts) {
        if (!ts) return '';
        var now = new Date();
        var then = new Date(ts);
        if (isNaN(then.getTime())) return '';
        var diffMs = Math.max(0, now - then);
        var diffMin = Math.floor(diffMs / 60000);
        var diffH = Math.floor(diffMs / 3600000);
        var diffD = Math.floor(diffMs / 86400000);
        if (diffMin < 1) return 'À l\'instant';
        if (diffH < 1) return 'Il y a ' + diffMin + ' min';
        if (diffH < 24) return 'Il y a ' + diffH + ' h';
        if (diffD < 7) return 'Il y a ' + diffD + ' j';
        return then.toLocaleDateString('fr-FR');
    }

    // ─── Collect pending events from seed ──────────────────────
    function collectPendingEvents(data) {
        var events = [];
        if (!data || !Array.isArray(data.companies)) return events;

        var PROFILE_LABEL = { brandup: 'Profil BrandUP', traceup: 'Profil TraceUP', linkup: 'Profil LinkUP' };

        data.companies.forEach(function (c) {
            // 1) Nouveau compte en attente de validation
            if (c.status === 'pending') {
                events.push({
                    label: 'Nouveau compte',
                    detail: c.name || '—',
                    href: 'admin_validation-comptes.html',
                    icon: 'person_add',
                    color: '#5C2D91',
                    ts: c.registered_at,
                });
            }

            // 2) Modifs profil entreprise en attente
            if (c.pending_updates) {
                events.push({
                    label: 'Modifs entreprise',
                    detail: c.name || '—',
                    href: 'admin_validation-comptes.html',
                    icon: 'edit_note',
                    color: '#5C2D91',
                    ts: c.pending_updates.submitted_at,
                });
            }

            // 3) Profils BrandUP / TraceUP / LinkUP en attente
            ['brandup', 'traceup', 'linkup'].forEach(function (k) {
                var p = c.profiles && c.profiles[k];
                if (p && p.status === 'pending') {
                    events.push({
                        label: PROFILE_LABEL[k] + ' soumis',
                        detail: c.name || '—',
                        href: 'admin_validation-profils.html',
                        icon: 'description',
                        color: '#5C2D91',
                        ts: p.submitted_at || c.registered_at,
                    });
                }
            });
        });

        // 4) Reçus RSE en attente
        if (Array.isArray(data.rse_receipts)) {
            data.rse_receipts.forEach(function (r) {
                if (r.status !== 'pending') return;
                var c = data.companies.find(function (cc) { return cc.id === r.company_id; });
                var assoc = r.association_name || '';
                events.push({
                    label: 'Reçu RSE ' + formatNumber(r.amount_tnd) + ' DT',
                    detail: (c ? c.name : 'Entreprise') + (assoc ? ' × ' + assoc : ''),
                    href: 'admin_validation-rse.html',
                    icon: 'volunteer_activism',
                    color: '#C5A059',
                    ts: r.submitted_at,
                });
            });
        }

        // FIFO : plus ancien en premier (= plus urgent à traiter)
        events.sort(function (a, b) {
            var da = a.ts ? new Date(a.ts).getTime() : 0;
            var db = b.ts ? new Date(b.ts).getTime() : 0;
            return da - db;
        });

        return events;
    }

    // ─── Render HTML ───────────────────────────────────────────
    function buildItemHtml(ev) {
        return '<a href="' + escapeHtml(ev.href) + '" class="flex items-start gap-3 px-4 py-3 border-b border-[#F5F5F5] last:border-b-0 hover:bg-[#FAFAFA] transition-colors">' +
            '<span class="block w-2 h-2 rounded-full mt-1.5 shrink-0" style="background:' + ev.color + '"></span>' +
            '<div class="min-w-0 flex-1">' +
                '<div class="text-[13px] text-[#242424] leading-snug"><span class="font-medium">' + escapeHtml(ev.label) + '</span> · ' + escapeHtml(ev.detail) + '</div>' +
                '<div class="text-[11px] text-[#8A8886] mt-0.5">' + escapeHtml(timeAgo(ev.ts)) + '</div>' +
            '</div>' +
            '<span class="material-symbols-outlined shrink-0 mt-0.5" style="font-size:16px; color:' + ev.color + '">' + escapeHtml(ev.icon) + '</span>' +
        '</a>';
    }

    function buildDropdownHtml(events, total) {
        var items = events.slice(0, 3);
        var itemsHtml = items.length === 0
            ? '<div class="px-4 py-8 text-center text-[#8A8886] text-[12px]">Aucune notification en attente</div>'
            : items.map(buildItemHtml).join('');

        var counterText = total === 0
            ? '0 en attente'
            : (total === 1 ? '1 action en attente' : total + ' actions en attente');

        return '<div id="bellDropdown" class="hidden absolute right-0 top-[calc(100%+6px)] w-[340px] max-w-[calc(100vw-24px)] bg-white border border-[#E0E0E0] rounded-xl z-50" style="box-shadow:0 8px 32px rgba(0,0,0,0.16)" role="dialog" aria-label="Notifications admin">' +
            '<div class="flex items-center justify-between px-4 py-3 border-b border-[#E0E0E0]">' +
                '<span class="text-[13px] font-semibold text-[#242424]">Notifications</span>' +
                '<span class="text-[11px] text-[#616161]" id="bellDropdownCounter">' + counterText + '</span>' +
            '</div>' +
            '<div class="max-h-[320px] overflow-y-auto">' + itemsHtml + '</div>' +
            '<a href="admin_dashboard.html" class="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-medium text-[#5C2D91] hover:bg-[#F3EFFA] transition-colors border-t border-[#E0E0E0] rounded-b-xl">' +
                'Voir le tableau de bord' +
                '<span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span>' +
            '</a>' +
        '</div>';
    }

    // ─── Badge management ──────────────────────────────────────
    function updateBadge(bellBtn, count) {
        var badge = bellBtn.querySelector('span.absolute');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // ─── Toggle / open / close ─────────────────────────────────
    function attachToggle(bellBtn, dropdown) {
        bellBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', function (e) {
            if (dropdown.classList.contains('hidden')) return;
            if (dropdown.contains(e.target) || bellBtn.contains(e.target)) return;
            dropdown.classList.add('hidden');
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') dropdown.classList.add('hidden');
        });
    }

    // ─── Main init ─────────────────────────────────────────────
    function init() {
        var data = window.MARKETUP_DATA;
        if (!data) {
            console.warn('[admin-notifications] window.MARKETUP_DATA not found — seed not loaded yet');
            return;
        }

        // Locate the bell button (tolerate either id or aria-label fallback)
        var bellBtn = document.getElementById('bellBtn');
        if (!bellBtn) {
            bellBtn = document.querySelector('button[aria-label="Notifications admin"]');
            if (bellBtn) bellBtn.id = 'bellBtn';
        }
        if (!bellBtn) return;

        // Don't double-mount
        if (document.getElementById('bellDropdown')) return;

        // Make sure the immediate parent is positioned so the dropdown anchors right
        var parent = bellBtn.parentElement;
        if (parent && getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }
        // The bell button itself can be the anchor — set its position too
        if (getComputedStyle(bellBtn).position === 'static') {
            bellBtn.style.position = 'relative';
        }

        var events = collectPendingEvents(data);
        var total = events.length;

        updateBadge(bellBtn, total);

        bellBtn.insertAdjacentHTML('afterend', buildDropdownHtml(events, total));
        var dropdown = document.getElementById('bellDropdown');
        if (dropdown) attachToggle(bellBtn, dropdown);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
