/**
 * ═══════════════════════════════════════════════════════════════
 *  ADMIN DATA BRIDGE
 *  ───────────────────────────────────────────────────────────────
 *  Transforms `window.MARKETUP_DATA` from the unified seed
 *  (marketup_seed_data.js, modern shape) into the legacy admin
 *  shape that admin_data.js used to expose.
 *
 *  Why : admin pages were originally written against admin_data.js
 *  (flat, snake_case, separate top-level lists). Migrating each page
 *  to the unified seed schema is a big chunk of work, so this bridge
 *  lets us delete admin_data.js without touching the admin page JS.
 *
 *  Usage in admin pages :
 *      <script src="marketup_seed_data.js"></script>
 *      <script src="admin_data_bridge.js"></script>
 *      // window.MARKETUP_DATA is now in legacy admin shape
 *
 *  Long term : refactor admin pages page-by-page to the modern shape
 *  and remove this bridge.
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
    const seed = window.MARKETUP_DATA;
    if (!seed || !seed.companies) {
        console.error('admin_data_bridge: marketup_seed_data.js must be loaded first');
        return;
    }

    // ─── Lookup helpers (built once for speed) ─────────────────
    const sectorById = {};
    (seed.sectorsB2B || []).forEach(s => { sectorById[s.id] = s; });
    const categoryById = {};
    (seed.categoriesB2C || []).forEach(c => { categoryById[c.id] = c; });
    const gouvById = {};
    (seed.gouvernorats || []).forEach(g => { gouvById[g.id] = g; });
    const associationById = {};
    (seed.associations || []).forEach(a => { associationById[a.id] = a; });

    const fmtName = (i18n) => (i18n && (i18n.fr || i18n.ar || i18n.en)) || '—';

    // ─── Transform companies (modern → legacy flat shape) ──────
    const companies = seed.companies.map(c => {
        const sector = c.type === 'B2B'
            ? sectorById[c.liveData.sectorId]
            : categoryById[c.liveData.sectorId];
        const gouv = gouvById[c.liveData.gouvernorat];
        const ownerInitials = (c.accountUser.firstName[0] || '') + (c.accountUser.lastName[0] || '');

        // Map profile statuses + flatten dates (legacy uses submitted_at / reviewed_at / reject_reason)
        // Convertit une valeur potentiellement i18n ({fr,ar,en}) en string FR, ou retourne la string telle quelle
        const pickFr = (v) => {
            if (v == null) return '';
            if (typeof v === 'string') return v;
            if (typeof v === 'number' || typeof v === 'boolean') return String(v);
            return v.fr || v.ar || v.en || '';
        };

        // Normalise un objet pendingData (modifs profil en attente) : extrait les strings FR pour la UI admin
        const normPendingData = (pd) => {
            if (!pd) return null;
            return {
                submittedAt: pd.submittedAt || null,
                note:        pickFr(pd.note),
                fields:      (pd.fields || []).map(f => ({
                    key:          f.key || '',
                    label:        pickFr(f.label) || f.key || '',
                    currentValue: pickFr(f.currentValue),
                    newValue:     pickFr(f.newValue),
                })),
            };
        };

        // Build profile.content — flatten the seed's nested data into the shape
        // expected by admin detail pages (snake_case, FR strings, simple flat fields).
        // companyName is used as fallback for logo_initials.
        const buildContent = (p, profileTypeKey, companyName) => {
            if (!p || !p.data) return {};
            const data = p.data;
            const initials = (companyName || '?')
                .split(/\s+/).filter(Boolean).slice(0, 2)
                .map(w => w[0]).join('').toUpperCase();

            if (profileTypeKey === 'brandup') {
                const links = Array.isArray(data.links) ? data.links : [];
                return {
                    pitch:         pickFr(data.pitch) || '',
                    about:         pickFr(data.about) || '',
                    color:         data.color || '#0078D4',
                    logo_bg:       data.color || '#0078D4',
                    logo_initials: initials,
                    keywords: (data.services || []).slice(0, 6).map(s => pickFr(s && s.name)).filter(Boolean),
                    gallery_bgs: (Array.isArray(data.gallery) && data.gallery.length > 0
                        ? data.gallery.slice(0, 4).map(g => g.image || g)
                        : ['#EFF6FC', '#F3EFFA', '#FEFCE8', '#F0FDF4']),
                    services:      (data.services || []).map(s => pickFr(s && s.name)).filter(Boolean),
                    links:         links.map(l => ({ label: pickFr(l.label), url: l.url, icon: l.icon })),
                    projects_count: Array.isArray(data.projects) ? data.projects.length : 0,
                    certifications_count: Array.isArray(data.certifications) ? data.certifications.length : 0,
                };
            }

            if (profileTypeKey === 'traceup') {
                const videos = Array.isArray(data.videos) ? data.videos : [];
                return {
                    channel_name:        pickFr(data.channelName) || (companyName || ''),
                    channel_description: pickFr(data.channelDescription) || '',
                    pitch:               pickFr(data.channelDescription) || '',
                    logo_bg:             '#8764B8',
                    logo_initials:       initials,
                    videos: videos.map(v => ({
                        id:           v.id,
                        source:       v.source || 'youtube',
                        video_id:     v.videoId,
                        video_url:    v.videoUrl,
                        thumbnail:    v.thumbnailUrl,
                        category:     v.category,
                        title:        pickFr(v.title),
                        description:  pickFr(v.description),
                        status:       v.status,
                        published_at: v.publishedAt,
                    })),
                };
            }

            if (profileTypeKey === 'linkup') {
                const cc = data.contactCard || {};
                const contact_methods = [];
                if (cc.email)    contact_methods.push({ kind: 'email',    value: cc.email,    icon: 'mail'      });
                if (cc.phone)    contact_methods.push({ kind: 'phone',    value: cc.phone,    icon: 'call'      });
                if (cc.whatsapp) contact_methods.push({ kind: 'whatsapp', value: cc.whatsapp, icon: 'chat'      });
                if (cc.website)  contact_methods.push({ kind: 'website',  value: cc.website,  icon: 'language'  });
                if (cc.address)  contact_methods.push({ kind: 'address',  value: cc.address,  icon: 'location_on' });
                const socials = Array.isArray(data.socials) ? data.socials.filter(s => s.url) : [];
                return {
                    card_name:       pickFr(cc.fullName) || cc.fullName || (companyName || ''),
                    card_title:      pickFr(cc.title) || cc.title || '',
                    card_company:    pickFr(cc.company) || cc.company || (companyName || ''),
                    card_bio:        pickFr(cc.bio) || cc.bio || '',
                    photo:           cc.photo || '',
                    logo_bg:         '#000000',
                    logo_initials:   initials,
                    contact_methods: contact_methods,
                    socials:         socials.map(s => ({ platform: s.platform, url: s.url })),
                };
            }

            return {};
        };

        const profileShape = (p, profileTypeKey, companyName) => ({
            status: p.status,
            submitted_at: p.submittedAt || null,
            reviewed_at:  p.lastValidatedAt || p.rejectedAt || null,
            reject_reason: typeof p.rejectionReason === 'string'
                ? p.rejectionReason
                : (p.rejectionReason && p.rejectionReason.fr) || null,
            // Modifs de profil en attente de revalidation admin (profil reste invisible publiquement pendant la revue — modèle B strict)
            pending_data: normPendingData(p.pendingData),
            // Contenu du profil mappé pour les pages admin (snake_case, FR strings, structure flat)
            content: buildContent(p, profileTypeKey, companyName),
        });

        // Compute boost / sponsoring activity from profiles' history
        let boostActive = false, sponsoringActive = false;
        Object.values(c.profiles || {}).forEach(p => {
            if (Array.isArray(p.boostHistory)) {
                p.boostHistory.forEach(b => {
                    if (b.endDate && new Date(b.endDate) > new Date()) boostActive = true;
                });
            }
            if (Array.isArray(p.sponsoringHistory)) {
                p.sponsoringHistory.forEach(s => {
                    if (s.endDate && new Date(s.endDate) > new Date()) sponsoringActive = true;
                });
            }
        });

        return {
            id: c.id,
            name: fmtName(c.data && c.data.displayName),
            slug: c.slug,
            type: c.type,
            sector: sector ? fmtName(sector.name) : '—',
            sector_key: c.liveData.sectorId,
            city: c.liveData.ville || '—',
            governorate: gouv ? fmtName(gouv.name) : (c.liveData.gouvernorat || '—'),
            rne: c.legalId,
            vat: c.liveData.vatNumber || '—',
            email: c.accountEmail,
            phone: c.liveData.phone || '—',
            address: c.liveData.address || '—',
            registered_at: c.registeredAt,
            validated_at:  c.validatedAt || null,
            owner: {
                firstName: c.accountUser.firstName,
                lastName:  c.accountUser.lastName,
                email:     c.accountEmail,
                phone:     c.accountUser.phone || '—',
                avatar_initials: ownerInitials.toUpperCase(),
            },
            status: c.validationStatus,    // active | pending | rejected | suspended | deleted
            pending_updates: c.pendingUpdates || null,  // demandes de modif compte (logo, contact, adresse...) en attente de revalidation admin
            profiles: {
                brandup: profileShape(c.profiles.brandup, 'brandup', fmtName(c.data && c.data.displayName)),
                traceup: profileShape(c.profiles.traceup, 'traceup', fmtName(c.data && c.data.displayName)),
                linkup:  profileShape(c.profiles.linkup,  'linkup',  fmtName(c.data && c.data.displayName)),
            },
            boost_active: boostActive,
            sponsoring_active: sponsoringActive,
            rse_badge: c.rseBadgeStatus || 'none',
        };
    });

    // ─── Aggregate top-level rse_receipts (from companies) ─────
    const rse_receipts = [];
    seed.companies.forEach(c => {
        (c.rseReceipts || []).forEach(r => {
            const assoc = associationById[r.associationId];
            rse_receipts.push({
                id: r.id,
                company_id: c.id,
                company_name: fmtName(c.data && c.data.displayName),
                association_id: r.associationId,
                association_name: assoc ? fmtName(assoc.name) : (r.associationName || '—'),
                amount: r.amount,
                date: r.donationDate,
                proof_file: r.receiptDocumentUrl,
                status: r.status,                       // pending | validated | rejected
                submitted_at: r.submittedAt || null,
                reviewed_at:  r.validatedAt || null,
            });
        });
    });

    // ─── Aggregate top-level transactions (from companies) ─────
    const transactions = [];
    seed.companies.forEach(c => {
        (c.transactions || []).forEach(t => {
            // Build a description from type + profile + (sector if B2B)
            const profileLabel = ({ brandup: 'BrandUP', traceup: 'TraceUP', linkup: 'LinkUP' })[t.profileType] || t.profileType;
            const typeLabel = t.type === 'sponsoring' ? 'Sponsoring' : 'Boost';
            const duration = t.type === 'sponsoring' ? '7 jours' : '30 jours';
            transactions.push({
                id: t.id,
                company_id: c.id,
                company_name: fmtName(c.data && c.data.displayName),
                type: t.type,
                description: `${typeLabel} ${profileLabel} · ${duration}`,
                amount_ht:  t.priceHT,
                vat:        t.vatAmount,
                amount_ttc: t.priceTTC,
                date: (t.paidAt || '').substring(0, 10),
                status: t.status,                       // paid | pending | refunded
                receipt_id: t.invoiceNumber || t.id,
            });
        });
    });

    // Sort transactions desc by date for admin display
    transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // ─── Transform associations ────────────────────────────────
    const associations = (seed.associations || []).map(a => ({
        id: a.id,
        name: fmtName(a.name),
        domain: fmtName(a.domain),
        email: a.contactEmail || a.email || '—',
        iban: a.iban || '—',
        active: a.active !== false,
        partnered_since: a.partneredSince || a.createdAt || null,
    }));

    // ─── Sectors / categories (camelCase → snake_case) ─────────
    const sectors_b2b = (seed.sectorsB2B || []).map(s => ({
        id: s.id,
        key: s.id,
        name: fmtName(s.name),
        b2b_count: s.companyCount || 0,
    }));
    const categories_b2c = (seed.categoriesB2C || []).map(c => ({
        id: c.id,
        key: c.id,
        name: fmtName(c.name),
        b2c_count: c.companyCount || 0,
    }));

    // ─── KPIs / settings / disputes / meta (passthrough) ───────
    // ─── KPIs globaux enrichis ─────────────────────────────────
    // Computed on top of the legacy companies / transactions / rse_receipts arrays,
    // so admin pages can rely on a single source of truth.
    const VAT_RATE = 0.19;
    const computed_kpis = {
        companies_total:     companies.length,
        companies_active:    companies.filter(c => c.status === 'active').length,
        companies_pending:   companies.filter(c => c.status === 'pending').length,
        companies_suspended: companies.filter(c => c.status === 'suspended').length,
        companies_rejected:  companies.filter(c => c.status === 'rejected').length,
        monthly_revenue_ht:  transactions.reduce((s, t) => s + (t.amount_ht || 0), 0),
        monthly_revenue_ttc: transactions.reduce((s, t) => s + (t.amount_ttc || t.amount_ht * (1 + VAT_RATE) || 0), 0),
        vat_collected:       transactions.reduce((s, t) => s + (t.vat || (t.amount_ht || 0) * VAT_RATE), 0),
        rse_total:           rse_receipts.reduce((s, r) => r.status === 'validated' ? s + r.amount : s, 0),
        rse_pending_count:   rse_receipts.filter(r => r.status === 'pending').length,
        rse_validated_count: rse_receipts.filter(r => r.status === 'validated').length,
        disputes_open:       (seed.disputes || []).filter(d => d.status === 'open').length,
    };
    // Seed-provided KPIs win over computed ones (allow manual overrides), but missing keys are filled in
    const kpis_global = Object.assign({}, computed_kpis, seed.kpisGlobal || {});
    const platform_settings = seed.platformSettings || {};
    const disputes = seed.disputes || [];

    // ─── Build _meta.demo_admin from demoAdminId + adminUsers lookup ───
    // Le seed expose _meta.demoAdminId (juste l'ID) et adminUsers[] (les détails).
    // Les pages admin attendent _meta.demo_admin (objet enrichi) → on le construit ici.
    const _meta = Object.assign({}, seed._meta || {});
    if (_meta.demoAdminId && Array.isArray(seed.adminUsers)) {
        const adm = seed.adminUsers.find(a => a.id === _meta.demoAdminId);
        if (adm) {
            const initials = (adm.avatar && adm.avatar.initials)
                || ((adm.firstName || '?')[0] + (adm.lastName || '?')[0]).toUpperCase();
            _meta.demo_admin = {
                id:               adm.id,
                firstName:        adm.firstName,
                lastName:         adm.lastName,
                fullName:         (adm.firstName || '') + ' ' + (adm.lastName || ''),
                email:            adm.email,
                role:             adm.role,
                avatar_initials:  initials,
                avatar_bg:        (adm.avatar && adm.avatar.backgroundColor) || '#5C2D91',
                languages:        adm.languages || ['fr'],
                last_login_at:    adm.auth && adm.auth.lastLoginAt,
            };
        }
    }

    // ─── Override window.MARKETUP_DATA with the legacy shape ───
    window.MARKETUP_DATA = {
        _meta,
        companies,
        rse_receipts,
        associations,
        transactions,
        disputes,
        sectors_b2b,
        categories_b2c,
        kpis_global,
        platform_settings,
    };
})();
