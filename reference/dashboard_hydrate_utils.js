/**
 * MARKET-UP — Dashboard hydration utilities
 * Lightweight helpers that hydrate dashboard pages from window.MARKETUP_DATA / window.MARKETUP_HELPERS.
 *
 * Usage in any dashboard page:
 *   <script src="marketup_seed_data.js"></script>
 *   <script src="dashboard_hydrate_utils.js"></script>
 *   <script>
 *     MARKETUP_HYDRATE.withCurrentUser((me, H) => {
 *       const { set, setHTML, setAttr, getInitials } = MARKETUP_HYDRATE;
 *       set('acc-name', me.data.displayName.fr);
 *       // ...
 *     });
 *   </script>
 *
 * Migration to Next.js:
 *   These functions become standalone helpers / hooks (see SEED_ARCHITECTURE §15).
 *   The page-level hydration block becomes JSX with defaultValue / textContent.
 */
(function () {
  'use strict';

  const HYDRATE = {

    // -----------------------------------------------------------------
    // Element setters — all are no-ops if the element is not found.
    // -----------------------------------------------------------------

    /**
     * Set the value (input/textarea/select) or text content (anything else)
     * of the element matching #id.
     * @param {string} id - DOM id (without "#")
     * @param {string|number} value
     */
    set(id, value) {
      const el = document.getElementById(id);
      if (!el) return;
      const v = (value == null) ? '' : value;
      if (el.matches && el.matches('input, textarea, select')) {
        el.value = v;
      } else {
        el.textContent = v;
      }
    },

    /**
     * Set innerHTML on #id. Use for rich content (badges, icons).
     * Caller is responsible for trusted source.
     */
    setHTML(id, html) {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = html == null ? '' : html;
    },

    /**
     * Set an attribute on #id (e.g. setAttr('lnk-bu', 'href', '/x')).
     */
    setAttr(id, name, value) {
      const el = document.getElementById(id);
      if (!el) return;
      el.setAttribute(name, value);
    },

    /**
     * Set both `value` (for the input) and `data-copy` (for the copy button)
     * on a public-URL input. Used in dashboard_account on BU/TU/LU URL fields.
     */
    setUrlInput(id, url) {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = url;
      el.setAttribute('data-copy', url);
    },

    /**
     * Show or hide #id by toggling the `hidden` attribute.
     */
    setVisible(id, visible) {
      const el = document.getElementById(id);
      if (!el) return;
      if (visible) el.removeAttribute('hidden');
      else el.setAttribute('hidden', '');
    },

    // -----------------------------------------------------------------
    // Repeating templates — for lists (videos, notifs, transactions...)
    // -----------------------------------------------------------------

    /**
     * Render an array into a container by mapping each item through `template`.
     * The container's previous content is replaced.
     * @param {string} containerId
     * @param {Array<*>} items
     * @param {(item: *, index: number) => string} template - returns HTML
     */
    renderList(containerId, items, template) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = (items || []).map(template).join('');
    },

    // -----------------------------------------------------------------
    // Format helpers
    // -----------------------------------------------------------------

    /**
     * Get up to 2-character initials from a full name.
     * "TechnoFab Industries" -> "TI"
     * "Ahmed Mrabet"          -> "AM"
     * "PharmaTN"              -> "PH" (single word: first 2 chars)
     */
    getInitials(name) {
      if (!name) return '??';
      const trimmed = name.trim();
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return trimmed.substring(0, 2).toUpperCase();
    },

    /** Format an ISO date as "24/03/2026". */
    formatDateShort(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    },

    /** Format an ISO date as "24 mars 2026". */
    formatDateLong(iso) {
      if (!iso) return '';
      const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      const d = new Date(iso);
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    },

    // -----------------------------------------------------------------
    // Bootstrap — entry point for every page
    // -----------------------------------------------------------------
    /**
     * Hydrate the common chrome (sidebar bottom + topbar avatar dropdown)
     * shared across all dashboard pages. Each page may declare any of these
     * IDs; missing ones are silently skipped:
     *
     *   Sidebar bottom (user card — variants by page):
     *     - sb-avatar-initials  : company-logo initials (always)
     *     - sb-company-name     : full company name (always)
     *     - sb-company-meta     : "B2B · Sousse" (some pages)
     *     - sb-user-initials    : owner initials "AM" (some pages)
     *     - sb-user-name        : owner full name (always)
     *
     *   Topbar avatar dropdown:
     *     - avd-trigger-initials, avd-initials, avd-company-name, avd-company-meta
     *     - avd-link-brandup, avd-link-traceup, avd-link-linkup
     *
     * @param {object} me - the current user company (from getCurrentUserCompany)
     * @param {object} H  - the MARKETUP_HELPERS namespace
     */
    hydrateCommonChrome(me, H) {
      const fullName = me.data.displayName.fr;
      const initials = this.getInitials(fullName);
      const ownerFullName = me.accountUser
        ? `${me.accountUser.firstName} ${me.accountUser.lastName}`
        : '';
      const ownerInitials = this.getInitials(ownerFullName);
      const govObj = H.getGouvernoratBySlug(me.liveData.gouvernorat);
      const govLabel = govObj ? govObj.name.fr : me.liveData.gouvernorat;

      // Sidebar bottom (user card)
      this.set('sb-avatar-initials', initials);
      this.set('sb-company-name', fullName);
      this.set('sb-company-meta', `${me.type} · ${govLabel}`);
      this.set('sb-user-initials', ownerInitials);
      this.set('sb-user-name', ownerFullName);

      // Topbar avatar dropdown
      this.set('avd-trigger-initials', initials);
      this.set('avd-initials', initials);
      this.set('avd-company-name', fullName);
      this.set('avd-company-meta', `${me.type} · ${govLabel} · ${ownerFullName}`);

      // Profile links in the dropdown
      this.setAttr('avd-link-brandup', 'href', `public_brandup_${me.slug}.html`);
      this.setAttr('avd-link-traceup', 'href', `public_traceup_${me.slug}.html`);
      this.setAttr('avd-link-linkup', 'href', `public_linkup_${me.slug}.html`);
    },

    /**
     * Run `callback(me, helpers)` once the seed is loaded and the current
     * user's company is found. Safely no-ops if either is missing.
     *
     * @param {(me: object, H: object) => void} callback
     */
    withCurrentUser(callback) {
      if (!window.MARKETUP_HELPERS || !window.MARKETUP_DATA) {
        console.warn('[MARKETUP_HYDRATE] Seed not loaded — skipping hydration.');
        return;
      }
      const me = window.MARKETUP_HELPERS.getCurrentUserCompany();
      if (!me) {
        console.warn('[MARKETUP_HYDRATE] No current user company found.');
        return;
      }
      try {
        callback(me, window.MARKETUP_HELPERS);
      } catch (err) {
        console.error('[MARKETUP_HYDRATE] Error during hydration:', err);
      }
    },

    /**
     * Variant that runs the callback after DOMContentLoaded, in case the
     * script is placed in <head> rather than at the end of <body>.
     */
    onReady(callback) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () =>
          this.withCurrentUser(callback));
      } else {
        this.withCurrentUser(callback);
      }
    },

    /**
     * Convenience: shorthand for the most common page bootstrap. Hydrates
     * the common chrome, then runs the page-specific callback.
     */
    bootstrapPage(callback) {
      this.withCurrentUser((me, H) => {
        this.hydrateCommonChrome(me, H);
        if (callback) callback(me, H);
      });
    }
  };

  window.MARKETUP_HYDRATE = HYDRATE;
})();
