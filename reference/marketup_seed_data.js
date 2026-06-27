/**
 * MARKETUP_SEED_DATA.JS
 * =====================================================================
 * Single source of truth for HTML mockups data (admin / dashboard / public).
 * Mirrors MongoDB schema 1:1 to enable mechanical migration to Mongoose.
 *
 * Conventions:
 *   - Variables & comments: English (developer convention)
 *   - Content (pitches, names, descriptions): French (Tunisian platform)
 *   - All text fields user-generated: { fr, ar, en } i18n object pattern
 *     V1 = FR populated, AR/EN empty (filled in V1.1)
 *   - Status enums: lowercase plain strings
 *   - Dates: ISO 8601 UTC strings (Mongoose-ready)
 *   - Money: integer DT (TVA computed at runtime via helpers)
 *   - IDs: human-readable in seed (`c-001`), replaced by ObjectId at import
 *
 * Architecture reference: SEED_ARCHITECTURE.md (companion document)
 *
 * Demo password (hashed bcrypt cost 10): "Demo1234!"
 * → Use this password to log in as any company account or admin during dev.
 *
 * @version 1.0
 * @date 2026-04-22
 * @author AGGREGAX SUARL — Ahmed Mrabet
 */

(function() {
  'use strict';

  // =======================================================================
  // SHARED CONSTANTS
  // =======================================================================

  /** Path to the placeholder PDF used for all legal-identity uploads in dev. */
  const SAMPLE_LEGAL_ID_DOC = '/shared/sample-legal-id.pdf';

  /** Path to the placeholder PDF used for all RSE receipt uploads in dev. */
  const SAMPLE_RSE_RECEIPT_DOC = '/shared/sample-rse-receipt.pdf';

  /** Path to the placeholder PDF for association accreditation documents. */
  const SAMPLE_ACCREDITATION_DOC = '/shared/sample-accreditation.pdf';

  /** Path to the placeholder PDF for invoices. */
  const SAMPLE_INVOICE_DOC = '/shared/sample-invoice.pdf';

  /** Bcrypt hash of "Demo1234!" with cost 10. Universal demo password. */
  const DEMO_PASSWORD_HASH = '$2b$10$V5Iv4O6ds6vMoeRRbWndSedtb43uI00BF.a0Kai9ckKUk4LaJzfaa';

  /** "Now" reference timestamp used for relative dates in seed. */
  const NOW = '2026-04-22T10:00:00.000Z';

  // =======================================================================
  // STATUS ENUMS
  // =======================================================================

  const COMPANY_VALIDATION_STATUS = Object.freeze({
    PENDING:   'pending',
    ACTIVE:    'active',
    SUSPENDED: 'suspended',
    REJECTED:  'rejected'
  });

  const PROFILE_STATUS = Object.freeze({
    INCOMPLETE: 'incomplete',
    PENDING:    'pending',
    ACTIVE:     'active',
    REJECTED:   'rejected',
    DISABLED:   'disabled'
  });

  const PROFILE_TYPE = Object.freeze({
    BRANDUP: 'brandup',
    TRACEUP: 'traceup',
    LINKUP:  'linkup'
  });

  const VIDEO_STATUS    = Object.freeze({ PENDING: 'pending', ACTIVE: 'active', REJECTED: 'rejected' });
  const VIDEO_SOURCE    = Object.freeze({ YOUTUBE: 'youtube', DAILYMOTION: 'dailymotion', VIMEO: 'vimeo' });
  const VIDEO_CATEGORY  = Object.freeze({ ACTUALITE: 'actualite', OFFRES: 'offres', ASTUCES: 'astuces', EMPLOIS: 'emplois' });

  const BOOST_STATUS       = Object.freeze({ SCHEDULED: 'scheduled', ACTIVE: 'active', EXPIRED: 'expired', CANCELLED: 'cancelled' });
  const SPONSORING_STATUS  = BOOST_STATUS;

  const TRANSACTION_TYPE   = Object.freeze({ BOOST: 'boost', SPONSORING: 'sponsoring' });
  const TRANSACTION_STATUS = Object.freeze({ PENDING: 'pending', PAID: 'paid', FAILED: 'failed', REFUNDED: 'refunded' });
  const PAYMENT_METHOD     = Object.freeze({ CARD: 'card', BANK_TRANSFER: 'bank_transfer', MANUAL: 'manual' });

  const RSE_RECEIPT_STATUS = Object.freeze({ PENDING: 'pending', VALIDATED: 'validated', REJECTED: 'rejected' });
  const RSE_BADGE_STATUS   = Object.freeze({ NONE: 'none', PENDING: 'pending', VALIDATED: 'validated', REVOKED: 'revoked' });

  const DISPUTE_TYPE     = Object.freeze({ BILLING: 'billing', CONTENT: 'content', ACCOUNT: 'account', RSE: 'rse' });
  const DISPUTE_STATUS   = Object.freeze({ OPEN: 'open', INVESTIGATING: 'investigating', RESOLVED: 'resolved', CLOSED: 'closed' });
  const DISPUTE_PRIORITY = Object.freeze({ LOW: 'low', MEDIUM: 'medium', HIGH: 'high' });

  const COMPANY_TYPE = Object.freeze({ B2B: 'B2B', B2C: 'B2C' });
  const ADMIN_ROLE   = Object.freeze({ SUPER_ADMIN: 'super_admin', MODERATOR: 'moderator' });

  // =======================================================================
  // I18N HELPERS
  // =======================================================================

  /**
   * Build an i18n string object. AR/EN remain empty in V1 (populated in V1.1+).
   * @param {string} fr - French content
   * @param {string} [ar] - Arabic content (optional, default empty)
   * @param {string} [en] - English content (optional, default empty)
   */
  function i18n(fr, ar = '', en = '') {
    return { fr, ar, en };
  }

  /** Empty i18n string (used for incomplete profile defaults). */
  const i18nEmpty = () => ({ fr: '', ar: '', en: '' });

  // =======================================================================
  // ASSET URL HELPERS (deterministic placeholders)
  // =======================================================================

  /** DiceBear initials logo. Background color hex without leading "#". */
  function logoUrl(seed, bgHexNoHash) {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bgHexNoHash}`;
  }

  /** Picsum banner with deterministic seed. */
  function bannerUrl(companyId) {
    return `https://picsum.photos/seed/${companyId}-banner/1200/400`;
  }

  /** Picsum BrandUP gallery image (1-indexed). */
  function galleryUrl(companyId, n) {
    return `https://picsum.photos/seed/${companyId}-brandup-img-${n}/800/600`;
  }

  /** YouTube thumbnail URL from videoId. */
  function ytThumb(videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  /** Dailymotion thumbnail (size: 'thumbnail' or 'thumbnail_large'). */
  function dmThumb(videoId, size = 'thumbnail_large') {
    return `https://www.dailymotion.com/${size}/video/${videoId}`;
  }

  /** Vimeo thumbnail placeholder (real one fetched via oEmbed in prod). */
  function vimeoThumb(videoId) {
    return `https://vumbnail.com/${videoId}.jpg`;
  }

  // =======================================================================
  // REFERENTIALS — B2B SECTORS (25)
  // =======================================================================

  const SECTORS_B2B = [
    { id: 'mecanique',         slug: 'mecanique',         name: i18n('Mécanique'),                 icon: 'settings',          order: 1 },
    { id: 'electronique',      slug: 'electronique',      name: i18n('Électronique'),              icon: 'memory',            order: 2 },
    { id: 'informatique',      slug: 'informatique',      name: i18n('Informatique & IT'),         icon: 'computer',          order: 3 },
    { id: 'btp',               slug: 'btp',               name: i18n('Construction & BTP'),        icon: 'construction',      order: 4 },
    { id: 'architecture',      slug: 'architecture',      name: i18n('Architecture'),              icon: 'architecture',      order: 5 },
    { id: 'agroalimentaire',   slug: 'agroalimentaire',   name: i18n('Industrie agroalimentaire'), icon: 'agriculture',       order: 6 },
    { id: 'textile',           slug: 'textile',           name: i18n('Textile'),                   icon: 'checkroom',         order: 7 },
    { id: 'pharmaceutique',    slug: 'pharmaceutique',    name: i18n('Pharmaceutique'),            icon: 'medication',        order: 8 },
    { id: 'chimie',            slug: 'chimie',            name: i18n('Chimie'),                    icon: 'science',           order: 9 },
    { id: 'energie',           slug: 'energie',           name: i18n('Énergie & Pétrole'),         icon: 'bolt',              order: 10 },
    { id: 'logistique',        slug: 'logistique',        name: i18n('Logistique & Transport'),    icon: 'local_shipping',    order: 11 },
    { id: 'imprimerie',        slug: 'imprimerie',        name: i18n('Imprimerie & Édition'),      icon: 'print',             order: 12 },
    { id: 'conseil',           slug: 'conseil',           name: i18n('Conseil & Audit'),           icon: 'business_center',   order: 13 },
    { id: 'marketing',         slug: 'marketing',         name: i18n('Marketing & Publicité'),     icon: 'campaign',          order: 14 },
    { id: 'juridique',         slug: 'juridique',         name: i18n('Juridique'),                 icon: 'gavel',             order: 15 },
    { id: 'comptabilite',      slug: 'comptabilite',      name: i18n('Comptabilité'),              icon: 'calculate',         order: 16 },
    { id: 'formation-pro',     slug: 'formation-pro',     name: i18n('Formation professionnelle'), icon: 'school',            order: 17 },
    { id: 'sante-pro',         slug: 'sante-pro',         name: i18n('Santé professionnelle'),     icon: 'medical_services',  order: 18 },
    { id: 'environnement',     slug: 'environnement',     name: i18n('Environnement'),             icon: 'eco',               order: 19 },
    { id: 'securite',          slug: 'securite',          name: i18n('Sécurité'),                  icon: 'shield',            order: 20 },
    { id: 'banque-finance',    slug: 'banque-finance',    name: i18n('Banque & Finance'),          icon: 'account_balance',   order: 21 },
    { id: 'assurance',         slug: 'assurance',         name: i18n('Assurance'),                 icon: 'verified_user',     order: 22 },
    { id: 'immobilier-pro',    slug: 'immobilier-pro',    name: i18n('Immobilier professionnel'),  icon: 'business',          order: 23 },
    { id: 'recherche-rd',      slug: 'recherche-rd',      name: i18n('Recherche & R&D'),           icon: 'biotech',           order: 24 },
    { id: 'automobile-pro',    slug: 'automobile-pro',    name: i18n('Industrie automobile'),      icon: 'directions_car',    order: 25 }
  ];

  // =======================================================================
  // REFERENTIALS — B2C CATEGORIES (25)
  // =======================================================================

  const CATEGORIES_B2C = [
    { id: 'alimentation',       slug: 'alimentation',       name: i18n('Alimentation & Épicerie'),   icon: 'storefront',        order: 1 },
    { id: 'restauration',       slug: 'restauration',       name: i18n('Restauration'),              icon: 'restaurant',        order: 2 },
    { id: 'hotellerie',         slug: 'hotellerie',         name: i18n('Hôtellerie & Tourisme'),     icon: 'hotel',             order: 3 },
    { id: 'mode',               slug: 'mode',               name: i18n('Mode & Habillement'),        icon: 'checkroom',         order: 4 },
    { id: 'beaute',             slug: 'beaute',             name: i18n('Beauté & Cosmétique'),       icon: 'spa',               order: 5 },
    { id: 'sante',              slug: 'sante',              name: i18n('Santé & Pharmacie'),         icon: 'local_pharmacy',    order: 6 },
    { id: 'sport',              slug: 'sport',              name: i18n('Sport & Fitness'),           icon: 'fitness_center',    order: 7 },
    { id: 'loisirs',            slug: 'loisirs',            name: i18n('Loisirs & Culture'),         icon: 'theaters',          order: 8 },
    { id: 'education',          slug: 'education',          name: i18n('Éducation'),                 icon: 'school',            order: 9 },
    { id: 'maison-deco',        slug: 'maison-deco',        name: i18n('Maison & Décoration'),       icon: 'chair',             order: 10 },
    { id: 'auto-particulier',   slug: 'auto-particulier',   name: i18n('Automobile particulier'),    icon: 'directions_car',    order: 11 },
    { id: 'telephonie-tech',    slug: 'telephonie-tech',    name: i18n('Téléphonie & Tech'),         icon: 'smartphone',        order: 12 },
    { id: 'commerce',           slug: 'commerce',           name: i18n('Boutique & Commerce'),       icon: 'shopping_cart',     order: 13 },
    { id: 'animaux',            slug: 'animaux',            name: i18n('Animaux'),                   icon: 'pets',              order: 14 },
    { id: 'bijouterie',         slug: 'bijouterie',         name: i18n('Bijouterie & Joaillerie'),   icon: 'diamond',           order: 15 },
    { id: 'optique',            slug: 'optique',            name: i18n('Optique'),                   icon: 'visibility',        order: 16 },
    { id: 'boulangerie',        slug: 'boulangerie',        name: i18n('Boulangerie & Pâtisserie'),  icon: 'bakery_dining',     order: 17 },
    { id: 'cafe',               slug: 'cafe',               name: i18n('Café & Salon de thé'),       icon: 'local_cafe',        order: 18 },
    { id: 'banque-retail',      slug: 'banque-retail',      name: i18n('Banque retail'),             icon: 'account_balance',   order: 19 },
    { id: 'immobilier-part',    slug: 'immobilier-part',    name: i18n('Immobilier particulier'),    icon: 'home',              order: 20 },
    { id: 'voyage',             slug: 'voyage',             name: i18n('Voyage & Agences'),          icon: 'flight',            order: 21 },
    { id: 'coiffure',           slug: 'coiffure',           name: i18n('Salons de coiffure'),        icon: 'content_cut',       order: 22 },
    { id: 'spa-bienetre',       slug: 'spa-bienetre',       name: i18n('Spas & Bien-être'),          icon: 'self_care',         order: 23 },
    { id: 'photo',              slug: 'photo',              name: i18n('Photographie'),              icon: 'photo_camera',      order: 24 },
    { id: 'services-personne',  slug: 'services-personne',  name: i18n('Services à la personne'),    icon: 'support_agent',     order: 25 }
  ];

  // =======================================================================
  // REFERENTIALS — GOUVERNORATS TN (24)
  // =======================================================================

  const GOUVERNORATS = [
    { id: 'tunis',         slug: 'tunis',         name: i18n('Tunis', 'تونس'),         villes: ['Tunis', 'La Marsa', 'Le Bardo', 'Carthage', 'Sidi Bou Said'] },
    { id: 'ariana',        slug: 'ariana',        name: i18n('Ariana', 'أريانة'),       villes: ['Ariana', 'La Soukra', 'Raoued', 'Sidi Thabet'] },
    { id: 'ben-arous',     slug: 'ben-arous',     name: i18n('Ben Arous', 'بن عروس'),   villes: ['Ben Arous', 'Hammam Lif', 'Ezzahra', 'Mégrine', 'Mornag'] },
    { id: 'manouba',       slug: 'manouba',       name: i18n('Manouba', 'منوبة'),       villes: ['Manouba', 'Den Den', 'Douar Hicher', 'Oued Ellil'] },
    { id: 'nabeul',        slug: 'nabeul',        name: i18n('Nabeul', 'نابل'),         villes: ['Nabeul', 'Hammamet', 'Korba', 'Kelibia', 'Menzel Temime'] },
    { id: 'zaghouan',      slug: 'zaghouan',      name: i18n('Zaghouan', 'زغوان'),      villes: ['Zaghouan', 'El Fahs', 'Bir Mcherga', 'Nadhour'] },
    { id: 'bizerte',       slug: 'bizerte',       name: i18n('Bizerte', 'بنزرت'),       villes: ['Bizerte', 'Menzel Bourguiba', 'Mateur', 'Ras Jebel'] },
    { id: 'beja',          slug: 'beja',          name: i18n('Béja', 'باجة'),           villes: ['Béja', 'Medjez el-Bab', 'Testour', 'Téboursouk'] },
    { id: 'jendouba',      slug: 'jendouba',      name: i18n('Jendouba', 'جندوبة'),     villes: ['Jendouba', 'Tabarka', 'Aïn Draham', 'Bou Salem'] },
    { id: 'kef',           slug: 'kef',           name: i18n('Le Kef', 'الكاف'),        villes: ['Le Kef', 'Dahmani', 'Tajerouine', 'Sakiet Sidi Youssef'] },
    { id: 'siliana',       slug: 'siliana',       name: i18n('Siliana', 'سليانة'),      villes: ['Siliana', 'Bou Arada', 'Gaâfour', 'Makthar'] },
    { id: 'kairouan',      slug: 'kairouan',      name: i18n('Kairouan', 'القيروان'),   villes: ['Kairouan', 'Sbikha', 'Hajeb El Ayoun', 'Oueslatia'] },
    { id: 'kasserine',     slug: 'kasserine',     name: i18n('Kasserine', 'القصرين'),   villes: ['Kasserine', 'Sbeitla', 'Foussana', 'Thala'] },
    { id: 'sidi-bouzid',   slug: 'sidi-bouzid',   name: i18n('Sidi Bouzid', 'سيدي بوزيد'), villes: ['Sidi Bouzid', 'Regueb', 'Jelma', 'Bir El Hafey'] },
    { id: 'sousse',        slug: 'sousse',        name: i18n('Sousse', 'سوسة'),         villes: ['Sousse', 'Sahline', 'Kalaa Kebira', 'Hammam Sousse', 'Akouda', 'Msaken'] },
    { id: 'monastir',      slug: 'monastir',      name: i18n('Monastir', 'المنستير'),   villes: ['Monastir', 'Ksar Hellal', 'Moknine', 'Téboulba', 'Jemmal'] },
    { id: 'mahdia',        slug: 'mahdia',        name: i18n('Mahdia', 'المهدية'),      villes: ['Mahdia', 'Chebba', 'El Jem', 'Ksour Essef', 'Sidi Alouane'] },
    { id: 'sfax',          slug: 'sfax',          name: i18n('Sfax', 'صفاقس'),          villes: ['Sfax', 'Sakiet Eddaier', 'Sakiet Ezzit', 'El Ain', 'Thyna'] },
    { id: 'gafsa',         slug: 'gafsa',         name: i18n('Gafsa', 'قفصة'),          villes: ['Gafsa', 'Métlaoui', 'Redeyef', 'Moularès'] },
    { id: 'tozeur',        slug: 'tozeur',        name: i18n('Tozeur', 'توزر'),         villes: ['Tozeur', 'Nefta', 'Degache', 'Tameghza'] },
    { id: 'kebili',        slug: 'kebili',        name: i18n('Kébili', 'قبلي'),         villes: ['Kébili', 'Douz', 'Souk Lahad', 'Faouar'] },
    { id: 'gabes',         slug: 'gabes',         name: i18n('Gabès', 'قابس'),          villes: ['Gabès', 'El Hamma', 'Mareth', 'Matmata'] },
    { id: 'medenine',      slug: 'medenine',      name: i18n('Médenine', 'مدنين'),      villes: ['Médenine', 'Djerba Houmt Souk', 'Zarzis', 'Ben Gardane'] },
    { id: 'tataouine',     slug: 'tataouine',     name: i18n('Tataouine', 'تطاوين'),    villes: ['Tataouine', 'Ghomrassen', 'Remada', 'Bir Lahmar'] }
  ];

  // =======================================================================
  // REFERENTIALS — RSE PARTNER ASSOCIATIONS (5)
  // =======================================================================

  const ASSOCIATIONS = [
    {
      id: 'a-001',
      slug: 'al-ahed',
      name: i18n('Association Al Ahed'),
      description: i18n('Soutien aux familles défavorisées et orphelins en Tunisie. Distribution alimentaire et aide à la scolarisation.'),
      logo: logoUrl('AlAhed', '10B981'),
      website: 'https://al-ahed.tn',
      causes: ['solidarite', 'enfance', 'education'],
      accreditationDocumentUrl: SAMPLE_ACCREDITATION_DOC,
      accreditedSince: '2020-01-01',
      active: true
    },
    {
      id: 'a-002',
      slug: 'tunisie-verte',
      name: i18n('Tunisie Verte'),
      description: i18n('Préservation de l\'environnement et reboisement. Actions de sensibilisation écologique dans les écoles.'),
      logo: logoUrl('TunisieVerte', '059669'),
      website: 'https://tunisie-verte.org',
      causes: ['environnement', 'education'],
      accreditationDocumentUrl: SAMPLE_ACCREDITATION_DOC,
      accreditedSince: '2018-06-15',
      active: true
    },
    {
      id: 'a-003',
      slug: 'croissant-rouge-tunisien',
      name: i18n('Croissant Rouge Tunisien'),
      description: i18n('Aide humanitaire d\'urgence, secourisme et action sociale. Présence sur tout le territoire tunisien.'),
      logo: logoUrl('CRT', 'DC2626'),
      website: 'https://croissantrouge.tn',
      causes: ['sante', 'urgence', 'solidarite'],
      accreditationDocumentUrl: SAMPLE_ACCREDITATION_DOC,
      accreditedSince: '2015-03-01',
      active: true
    },
    {
      id: 'a-004',
      slug: 'sos-villages-enfants',
      name: i18n('SOS Villages d\'Enfants Tunisie'),
      description: i18n('Accueil et accompagnement des enfants privés de soins parentaux. Programmes éducatifs et soutien familial.'),
      logo: logoUrl('SOSVillages', 'F59E0B'),
      website: 'https://sos-villages-enfants.tn',
      causes: ['enfance', 'education', 'famille'],
      accreditationDocumentUrl: SAMPLE_ACCREDITATION_DOC,
      accreditedSince: '2019-09-10',
      active: true
    },
    {
      id: 'a-005',
      slug: 'association-aveugles-tunisie',
      name: i18n('Association des Aveugles de Tunisie'),
      description: i18n('Insertion socio-professionnelle des personnes non-voyantes. Formation et accompagnement adapté.'),
      logo: logoUrl('AAT', '7C3AED'),
      website: 'https://aveugles-tunisie.org',
      causes: ['handicap', 'insertion', 'education'],
      accreditationDocumentUrl: SAMPLE_ACCREDITATION_DOC,
      accreditedSince: '2017-11-22',
      active: true
    }
  ];

  // =======================================================================
  // ADMIN USERS
  // =======================================================================

  const ADMIN_USERS = [
    {
      id: 'u-001',
      firstName: 'Bassem',
      lastName: 'Admin',
      email: 'bassem@vivasky.media',
      role: ADMIN_ROLE.SUPER_ADMIN,
      avatar: { initials: 'BA', backgroundColor: '#5C2D91' },
      languages: ['fr'],
      auth: {
        emailVerified: true,
        passwordHash: DEMO_PASSWORD_HASH,
        lastLoginAt: '2026-04-22T08:00:00.000Z',
        mfaEnabled: false
      },
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ];

  // =======================================================================
  // PLATFORM SETTINGS
  // =======================================================================

  const PLATFORM_SETTINGS = {
    pricing: {
      boostHT:      50,
      sponsoringHT: 100,
      vatRate:      0.19,
      currency:     'DT',
      currencyLabel: 'Dinar Tunisien'
    },
    sla: {
      accountValidationHours:  48,
      profileValidationHours:  48,
      rseValidationHours:      72,
      disputeResponseHours:    24
    },
    durations: {
      boostDays:       30,
      sponsoringDays:  7,
      otpExpiryMinutes: 10,
      passwordResetExpiryHours: 24
    },
    validation: {
      // V1 = "strict" (Option B). Toggle to "lenient" (Option A) in V2.
      // See SEED_ARCHITECTURE.md §3.3 and §16.6 for migration plan.
      rejectionMode: 'strict'
    },
    minContent: {
      brandup: {
        pitchMinLength:    50,
        pitchMaxLength:    500,
        colorRequired:     true,
        logoRequired:      true,
        galleryMinImages:  6,
        galleryMaxImages:  8
      },
      traceup: {
        minVideos:              1,
        maxVideos:              50,
        titleRequiredPerVideo:  true,
        videoTitleMaxLength:    120,
        videoDescriptionMaxLength: 280
      },
      linkup: {
        // Explicit list of required field paths (relative to profile.data)
        requiredFields: [
          'contactCard.fullName',
          'contactCard.title',
          'contactCard.company',
          'contactCard.email',
          'contactCard.phone',
          'contactCard.whatsapp',
          'contactCard.address',
          'contactCard.gpsPosition'
        ]
      }
    },
    limits: {
      maxBrandupLinks:       10,
      maxBrandupServices:    20,
      maxLinkupSocials:      10,
      maxRseReceiptsPerYear: 50
    }
  };

  // =======================================================================
  // COMPANIES
  // =======================================================================

  const COMPANIES = [

    // -----------------------------------------------------------------
    // c-001 — TechnoFab Industries (canonical demo company)
    //   Type: B2B Mécanique, Sousse
    //   Owner: Ahmed Mrabet
    //   States: BrandUP rejected · TraceUP pending · LinkUP active+boost+sponsoring
    //   RSE: 1 receipt pending + 2 validated → badge validated
    //   Boost & sponsoring active on LinkUP
    // -----------------------------------------------------------------
    {
      // Identity (locked)
      id: 'c-001',
      slug: 'technofab-industries',
      type: COMPANY_TYPE.B2B,
      legalId: 'B12345',
      identityDocumentUrl: SAMPLE_LEGAL_ID_DOC,
      accountEmail: 'ahmed@technofab.tn',
      country: 'TN',

      // Account user (single user V1)
      accountUser: {
        id: 'u-c-001',
        firstName: 'Ahmed',
        lastName: 'Mrabet',
        phone: '+216 71 234 567',
        languages: ['fr'],  // V1: only French selectable
        auth: {
          emailVerified: true,
          emailVerifiedAt: '2026-01-15T08:30:00.000Z',
          passwordHash: DEMO_PASSWORD_HASH,
          otpCode: null,
          otpExpiresAt: null
        }
      },

      // Live data (instant edit, no admin validation)
      liveData: {
        contactEmail: 'contact@technofab.tn',
        phone: '+216 73 222 333',
        whatsapp: '+216 20 123 456',
        address: 'Rue de l\'Industrie, ZI Sahline',
        gouvernorat: 'sousse',
        ville: 'Sahline',
        sectorId: 'mecanique',
        languages: ['fr']  // V1: only French selectable. V1.1+: ['fr', 'ar', 'en'] possible.
      },

      // Validated data (published, requires admin approval to modify)
      data: {
        displayName: i18n('TechnoFab Industries'),
        logo: logoUrl('TechnoFab', '0078D4'),
        banner: bannerUrl('c-001')
      },

      // Pending company-level modifications (none currently)
      pendingData: null,

      validationStatus: COMPANY_VALIDATION_STATUS.ACTIVE,

      // Three profiles
      profiles: {

        // BrandUP — rejected by admin
        brandup: {
          type: PROFILE_TYPE.BRANDUP,
          status: PROFILE_STATUS.REJECTED,
          data: {
            pitch: i18n('Spécialiste de la mécanique de précision en Tunisie depuis 2003. Nous concevons et fabriquons des pièces industrielles sur mesure pour les secteurs automobile, aéronautique et énergétique. Notre savoir-faire repose sur un parc machines CNC de dernière génération et une équipe de 45 ingénieurs et techniciens hautement qualifiés.'),
            about: i18n('Fondée en 2010 à Sousse, TechnoFab Industries est spécialisée dans la conception et la fabrication de pièces mécaniques usinées haute précision. Nos ateliers de 4 000 m² intègrent des centres d\'usinage CNC de dernière génération et une équipe de 45 ingénieurs et techniciens certifiés ISO 9001. Nous avons noué des partenariats stratégiques avec les leaders européens de l\'aéronautique et de l\'automobile, et exportons aujourd\'hui plus de 60% de notre production vers la France, l\'Allemagne et l\'Italie.'),
            color: '#0078D4',
            links: [
              { label: i18n('Site web'),    url: 'https://technofab.tn',                    icon: 'language'  },
              { label: i18n('LinkedIn'),    url: 'https://linkedin.com/company/technofab',  icon: 'linkedin'  },
              { label: i18n('Catalogue'),   url: 'https://technofab.tn/catalogue.pdf',      icon: 'download'  }
            ],
            gallery: [],
            projects: [
                        { id: 'proj-c-001-1', name: i18n('Pièces aéronautiques A320'), image: `https://picsum.photos/seed/c-001-proj-1/600/400`, description: i18n('Production de pièces structurelles aluminium pour Airbus A320 — partenariat Stelia Aerospace.'), order: 1 },
                        { id: 'proj-c-001-2', name: i18n('Outillage spécialisé'), image: `https://picsum.photos/seed/c-001-proj-2/600/400`, description: i18n('Conception et fabrication d\'outillage de précision sur cahier des charges client.'), order: 2 },
                        { id: 'proj-c-001-3', name: i18n('Systèmes hydrauliques'), image: `https://picsum.photos/seed/c-001-proj-3/600/400`, description: i18n('Développement de vérins et distributeurs hydrauliques pour engins de chantier.'), order: 3 },
                        { id: 'proj-c-001-4', name: i18n('Moteurs industriels'), image: `https://picsum.photos/seed/c-001-proj-4/600/400`, description: i18n('Pièces de moteurs robustes pour applications minières et énergétiques.'), order: 4 },
                        { id: 'proj-c-001-5', name: i18n('Engrenages haute précision'), image: `https://picsum.photos/seed/c-001-proj-5/600/400`, description: i18n('Engrenages et transmissions pour l\'industrie automobile et ferroviaire.'), order: 5 },
                        { id: 'proj-c-001-6', name: i18n('Robotique d\'atelier'), image: `https://picsum.photos/seed/c-001-proj-6/600/400`, description: i18n('Bras robotisés et automates pour lignes d\'assemblage clients.'), order: 6 },
                        { id: 'proj-c-001-7', name: i18n('Découpe laser CNC'), image: `https://picsum.photos/seed/c-001-proj-7/600/400`, description: i18n('Service de découpe laser et plasma pour tôles techniques.'), order: 7 },
                        { id: 'proj-c-001-8', name: i18n('Maintenance industrielle'), image: `https://picsum.photos/seed/c-001-proj-8/600/400`, description: i18n('Contrats de maintenance préventive et corrective sur sites clients.'), order: 8 },
                        { id: 'proj-c-001-9', name: i18n('R&D Industrie 4.0'), image: `https://picsum.photos/seed/c-001-proj-9/600/400`, description: i18n('Cellule R&D dédiée aux solutions IoT et jumeau numérique.'), order: 9 }
                      ],
            certifications: [
              {
                id: 'cert-c-001-1',
                name: 'ISO 9001:2015',
                label: i18n('Management de la qualité'),
                icon: 'verified',
                image: `https://picsum.photos/seed/c-001-cert-iso9001/200/200`,
                issuedAt: '2024-06-01',
                expiresAt: '2027-06-01'
              },
              {
                id: 'cert-c-001-2',
                name: 'EN 9100:2018',
                label: i18n('Systèmes de management qualité aéronautique'),
                icon: 'flight',
                image: `https://picsum.photos/seed/c-001-cert-en9100/200/200`,
                issuedAt: '2024-09-15',
                expiresAt: '2027-09-15'
              },
              {
                id: 'cert-c-001-3',
                name: 'IATF 16949',
                label: i18n('Qualité automobile'),
                icon: 'directions_car',
                image: `https://picsum.photos/seed/c-001-cert-iatf/200/200`,
                issuedAt: '2023-11-01',
                expiresAt: '2026-11-01'
              },
              {
                id: 'cert-c-001-4',
                name: 'ISO 14001:2015',
                label: i18n('Management environnemental'),
                icon: 'eco',
                image: null,  // pas de logo, fallback sur icon
                issuedAt: '2025-02-01',
                expiresAt: '2028-02-01'
              }
            ],
            services: [
              { name: i18n('Usinage CNC haute précision') },
              { name: i18n('Tôlerie industrielle') },
              { name: i18n('Soudure TIG/MIG') },
              { name: i18n('Fabrication de pièces sur mesure') }
            ]
          },
          pendingData: null,
          rejectionReason: 'Pitch non conforme à la charte de décence — termes inappropriés détectés dans la version soumise. Veuillez reformuler en restant sur un ton professionnel et soumettre à nouveau.',
          rejectedAt: '2026-03-15T11:00:00.000Z',
          rejectedBy: 'u-001',
          publishedAt: null,  // never went active
          lastValidatedAt: null,
          lastValidatedBy: null,
          stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
          boostHistory: [],       // cannot boost rejected profile
          sponsoringHistory: []
        },

        // TraceUP — pending admin validation (first submission)
        traceup: {
          type: PROFILE_TYPE.TRACEUP,
          status: PROFILE_STATUS.PENDING,
          data: {
            videos: [
              {
                id: 'v-c-001-1',
                source: VIDEO_SOURCE.YOUTUBE,
                videoId: 'dQw4w9WgXcQ',
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                thumbnailUrl: ytThumb('dQw4w9WgXcQ'),
                category: VIDEO_CATEGORY.ACTUALITE,
                title: i18n('Visite de notre nouvelle ligne de production CNC'),
                description: i18n('Découvrez l\'inauguration de notre 3e ligne de production CNC dédiée à l\'aéronautique. Investissement de 1,2 M DT pour répondre à la demande croissante.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-03-20T10:00:00.000Z',
                addedAt: '2026-03-20T09:55:00.000Z',
              },
              {
                id: 'v-c-001-2',
                source: VIDEO_SOURCE.VIMEO,
                videoId: '76979871',
                videoUrl: 'https://vimeo.com/76979871',
                thumbnailUrl: vimeoThumb('76979871'),
                category: VIDEO_CATEGORY.ACTUALITE,
                title: i18n('Certification ISO 9001:2015 obtenue'),
                description: i18n('TechnoFab obtient la certification ISO 9001:2015. Une étape majeure dans notre démarche qualité.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-02-15T14:00:00.000Z',
                addedAt: '2026-02-15T13:55:00.000Z',
              },
              {
                id: 'v-c-001-3',
                source: VIDEO_SOURCE.DAILYMOTION,
                videoId: 'x7uqx0b',
                videoUrl: 'https://www.dailymotion.com/video/x7uqx0b',
                thumbnailUrl: dmThumb('x7uqx0b'),
                category: VIDEO_CATEGORY.ACTUALITE,
                title: i18n('Notre participation au Salon Industrie Tunis 2026'),
                description: i18n('Retour en images sur notre stand au Salon Industrie 2026 à la foire de Tunis.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-03-01T10:00:00.000Z',
                addedAt: '2026-03-01T09:50:00.000Z',
              },
              {
                id: 'v-c-001-4',
                source: VIDEO_SOURCE.YOUTUBE,
                videoId: 'jNQXAC9IVRw',
                videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
                thumbnailUrl: ytThumb('jNQXAC9IVRw'),
                category: VIDEO_CATEGORY.OFFRES,
                title: i18n('Promotion -20% sur les pièces standard en avril'),
                description: i18n('Profitez de notre offre de printemps : -20% sur tout notre catalogue de pièces standard, jusqu\'au 30 avril.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-04-01T08:00:00.000Z',
                addedAt: '2026-04-01T07:55:00.000Z',
              },
              {
                id: 'v-c-001-5',
                source: VIDEO_SOURCE.VIMEO,
                videoId: '22439234',
                videoUrl: 'https://vimeo.com/22439234',
                thumbnailUrl: vimeoThumb('22439234'),
                category: VIDEO_CATEGORY.EMPLOIS,
                title: i18n('Recrutement : 3 ingénieurs mécaniciens'),
                description: i18n('TechnoFab recrute 3 ingénieurs mécaniciens (CDI) pour son site de Sahline. Profils junior à confirmé bienvenus.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-04-10T09:00:00.000Z',
                addedAt: '2026-04-10T08:55:00.000Z',
              },
              {
                id: 'v-c-001-6',
                source: VIDEO_SOURCE.YOUTUBE,
                videoId: '9bZkp7q19f0',
                videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
                thumbnailUrl: ytThumb('9bZkp7q19f0'),
                category: VIDEO_CATEGORY.EMPLOIS,
                title: i18n('Stage technicien CNC — été 2026'),
                description: i18n('Stage de 6 mois ouvert aux étudiants en BTS productique mécanique. Encadrement par notre chef d\'atelier.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-04-15T10:00:00.000Z',
                addedAt: '2026-04-15T09:55:00.000Z',
              }
            ]
          },
          // V1 canon: TraceUP videos do NOT use pendingData. See SEED_ARCHITECTURE.md §4.4.1
          pendingData: null,
          submittedAt: '2026-04-19T10:30:00.000Z',  // soumis pour validation admin (FIFO, 48h SLA)
          rejectionReason: null,
          rejectedAt: null,
          rejectedBy: null,
          publishedAt: null,  // not yet activated (first submission pending)
          lastValidatedAt: null,
          lastValidatedBy: null,
          stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
          boostHistory: [],     // cannot boost a non-active profile
          sponsoringHistory: []
        },

        // LinkUP — active with active boost + active sponsoring campaign
        linkup: {
          type: PROFILE_TYPE.LINKUP,
          status: PROFILE_STATUS.ACTIVE,
          data: {
            contactCard: {
              fullName: 'Ahmed Mrabet',
              title: i18n('Directeur Général'),
              company: i18n('TechnoFab Industries'),
              bio: i18n('Passionné par l\'industrie 4.0 et la mécanique de précision. 20 ans d\'expérience dans le secteur. Disponible pour tout projet de partenariat industriel.'),
              email: 'ahmed@technofab.tn',
              phone: '+216 71 234 567',
              whatsapp: '+216 71 234 567',
              website: 'https://technofab.tn',
              address: 'Rue de l\'Industrie, ZI Sahline, Sousse',
              gpsPosition: { type: 'Point', coordinates: [10.5907, 35.7628] }
            },
            qrConfig: {
              style: 'rounded',
              colorForeground: '#000000',
              colorBackground: '#FFFFFF',
              logoOverlay: true
            },
            socials: [
              { platform: 'linkedin',  url: 'https://linkedin.com/in/ahmedmrabet'    },
              { platform: 'facebook',  url: 'https://facebook.com/technofab.tn'      },
              { platform: 'instagram', url: 'https://instagram.com/technofab'        },
              { platform: 'twitter',   url: null                                      },
              { platform: 'youtube',   url: null                                      },
              { platform: 'tiktok',    url: null                                      }
            ]
          },
          pendingData: null,
          rejectionReason: null,
          rejectedAt: null,
          rejectedBy: null,
          publishedAt: '2026-02-10T09:00:00.000Z',
          lastValidatedAt: '2026-02-10T09:00:00.000Z',
          lastValidatedBy: 'u-001',
          stats: { viewsTotal: 260, views30d: 212, clicksTotal: 45 },
          boostHistory: [
            // Active boost (24/03 → 23/04)
            {
              id: 'b-c-001-1',
              from: '2026-03-24T00:00:00.000Z',
              to:   '2026-04-23T23:59:59.000Z',
              durationDays: 30,
              priceHT: 50,
              transactionId: 't-c-001-2',
              viewsAdded: 212,
              clicksAdded: 18,
              status: BOOST_STATUS.ACTIVE
            },
            // Previous expired boost
            {
              id: 'b-c-001-0',
              from: '2026-02-10T00:00:00.000Z',
              to:   '2026-03-12T23:59:59.000Z',
              durationDays: 30,
              priceHT: 50,
              transactionId: 't-c-001-9',
              viewsAdded: 48,
              clicksAdded: 6,
              status: BOOST_STATUS.EXPIRED
            }
          ],
          sponsoringHistory: [
            // Active sponsoring (15/04 → 22/04)
            {
              id: 's-c-001-1',
              from: '2026-04-15T00:00:00.000Z',
              to:   '2026-04-22T23:59:59.000Z',
              durationDays: 7,
              priceHT: 100,
              transactionId: 't-c-001-1',
              targetCategory: 'mecanique',
              impressions: 1250,
              clicks: 45,
              status: SPONSORING_STATUS.ACTIVE
            }
          ]
        }
      },

      // Transactions (12 over 3 months: 8 boosts + 4 sponsorings)
      transactions: [
        {
          id: 't-c-001-1',
          type: TRANSACTION_TYPE.SPONSORING,
          refId: 's-c-001-1',
          profileType: PROFILE_TYPE.LINKUP,
          priceHT: 100, vatRate: 0.19, vatAmount: 19, priceTTC: 119,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-04-15T10:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD,
          paymentReference: 'MP-20260415-001',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0042',
          createdAt: '2026-04-15T09:55:00.000Z'
        },
        {
          id: 't-c-001-2',
          type: TRANSACTION_TYPE.BOOST,
          refId: 'b-c-001-1',
          profileType: PROFILE_TYPE.LINKUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-03-24T08:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD,
          paymentReference: 'MP-20260324-001',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0031',
          createdAt: '2026-03-24T07:55:00.000Z'
        },
        {
          id: 't-c-001-3',
          type: TRANSACTION_TYPE.SPONSORING,
          refId: null, profileType: PROFILE_TYPE.LINKUP,
          priceHT: 100, vatRate: 0.19, vatAmount: 19, priceTTC: 119,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-03-08T11:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
          paymentReference: 'BT-20260308-002',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0024',
          createdAt: '2026-03-08T10:55:00.000Z'
        },
        {
          id: 't-c-001-4',
          type: TRANSACTION_TYPE.BOOST,
          refId: null, profileType: PROFILE_TYPE.LINKUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-03-01T09:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD,
          paymentReference: 'MP-20260301-007',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0019',
          createdAt: '2026-03-01T08:55:00.000Z'
        },
        {
          id: 't-c-001-5',
          type: TRANSACTION_TYPE.SPONSORING,
          refId: null, profileType: PROFILE_TYPE.LINKUP,
          priceHT: 100, vatRate: 0.19, vatAmount: 19, priceTTC: 119,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-02-22T14:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD,
          paymentReference: 'MP-20260222-005',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0015',
          createdAt: '2026-02-22T13:55:00.000Z'
        },
        {
          id: 't-c-001-6',
          type: TRANSACTION_TYPE.BOOST,
          refId: null, profileType: PROFILE_TYPE.LINKUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-02-18T10:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD,
          paymentReference: 'MP-20260218-003',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0012',
          createdAt: '2026-02-18T09:55:00.000Z'
        },
        {
          id: 't-c-001-7',
          type: TRANSACTION_TYPE.BOOST,
          refId: null, profileType: PROFILE_TYPE.LINKUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-02-12T15:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD,
          paymentReference: 'MP-20260212-001',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0008',
          createdAt: '2026-02-12T14:55:00.000Z'
        },
        {
          id: 't-c-001-8',
          type: TRANSACTION_TYPE.SPONSORING,
          refId: null, profileType: PROFILE_TYPE.LINKUP,
          priceHT: 100, vatRate: 0.19, vatAmount: 19, priceTTC: 119,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-02-08T11:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD,
          paymentReference: 'MP-20260208-002',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0005',
          createdAt: '2026-02-08T10:55:00.000Z'
        },
        {
          id: 't-c-001-9',
          type: TRANSACTION_TYPE.BOOST,
          refId: 'b-c-001-0',
          profileType: PROFILE_TYPE.LINKUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-02-10T09:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD,
          paymentReference: 'MP-20260210-001',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0006',
          createdAt: '2026-02-10T08:55:00.000Z'
        },
        {
          id: 't-c-001-10',
          type: TRANSACTION_TYPE.BOOST,
          refId: null, profileType: PROFILE_TYPE.LINKUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-02-04T10:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.MANUAL,
          paymentReference: 'MAN-20260204-001',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0003',
          createdAt: '2026-02-04T09:55:00.000Z'
        },
        {
          id: 't-c-001-11',
          type: TRANSACTION_TYPE.BOOST,
          refId: null, profileType: PROFILE_TYPE.LINKUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-01-28T11:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD,
          paymentReference: 'MP-20260128-002',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0001',
          createdAt: '2026-01-28T10:55:00.000Z'
        },
        {
          id: 't-c-001-12',
          type: TRANSACTION_TYPE.BOOST,
          refId: null, profileType: PROFILE_TYPE.LINKUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-01-22T09:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD,
          paymentReference: 'MP-20260122-001',
          invoiceUrl: SAMPLE_INVOICE_DOC,
          invoiceNumber: 'INV-2026-0000',
          createdAt: '2026-01-22T08:55:00.000Z'
        }
      ],

      // RSE receipts (3: 1 pending + 2 validated)
      rseReceipts: [
        {
          id: 'r-c-001-1',
          associationId: 'a-001',
          associationName: 'Al Ahed',
          amount: 5200,
          donationDate: '2026-04-18',
          receiptDocumentUrl: SAMPLE_RSE_RECEIPT_DOC,
          status: RSE_RECEIPT_STATUS.PENDING,
          submittedAt: '2026-04-18T11:00:00.000Z',
          validatedAt: null,
          validatedBy: null,
          rejectedReason: null
        },
        {
          id: 'r-c-001-2',
          associationId: 'a-002',
          associationName: 'Tunisie Verte',
          amount: 4000,
          donationDate: '2026-01-12',
          receiptDocumentUrl: SAMPLE_RSE_RECEIPT_DOC,
          status: RSE_RECEIPT_STATUS.VALIDATED,
          submittedAt: '2026-01-12T14:00:00.000Z',
          validatedAt: '2026-01-13T09:30:00.000Z',
          validatedBy: 'u-001',
          rejectedReason: null
        },
        {
          id: 'r-c-001-3',
          associationId: 'a-003',
          associationName: 'Croissant Rouge Tunisien',
          amount: 3200,
          donationDate: '2025-12-05',
          receiptDocumentUrl: SAMPLE_RSE_RECEIPT_DOC,
          status: RSE_RECEIPT_STATUS.VALIDATED,
          submittedAt: '2025-12-05T16:00:00.000Z',
          validatedAt: '2025-12-06T10:00:00.000Z',
          validatedBy: 'u-001',
          rejectedReason: null
        }
      ],
      rseBadgeStatus: RSE_BADGE_STATUS.VALIDATED,

      // Timestamps & audit
      registeredAt:    '2026-01-15T08:00:00.000Z',
      validatedAt:     '2026-01-16T10:00:00.000Z',
      validatedBy:     'u-001',
      suspendedAt:     null,
      suspendedReason: null,
      rejectedAt:      null,
      rejectedReason:  null,
      deletedAt:       null
    },

    // -----------------------------------------------------------------
    // c-002 — MediaCom Communication & Stratégie de Marque
    //   Type: B2B Marketing/Pub, Tunis
    //   Owner: Leila Karoui
    //   States: 3 profils ACTIFS, simple, no boost no sponsoring no RSE
    //   Demo: case "tout fonctionne nominalement", visible partout
    // -----------------------------------------------------------------
    {
      id: 'c-002',
      slug: 'mediacom-communication',
      type: COMPANY_TYPE.B2B,
      legalId: 'B98765',
      identityDocumentUrl: SAMPLE_LEGAL_ID_DOC,
      accountEmail: 'leila@mediacom.tn',
      country: 'TN',
      accountUser: {
        id: 'u-c-002', firstName: 'Leila', lastName: 'Karoui',
        phone: '+216 71 555 100', languages: ['fr'],
        auth: { emailVerified: true, emailVerifiedAt: '2026-02-01T09:00:00.000Z',
                passwordHash: DEMO_PASSWORD_HASH, otpCode: null, otpExpiresAt: null }
      },
      liveData: {
        contactEmail: 'contact@mediacom.tn', phone: '+216 71 555 200',
        whatsapp: '+216 20 555 200',
        address: 'Avenue Habib Bourguiba, Tunis Centre',
        gouvernorat: 'tunis', ville: 'Tunis',
        sectorId: 'marketing', languages: ['fr']
      },
      data: {
        displayName: i18n('MediaCom Communication & Stratégie de Marque'),
        logo: logoUrl('MediaCom', '6366F1'),
        banner: bannerUrl('c-002')
      },
      pendingData: null,
      validationStatus: COMPANY_VALIDATION_STATUS.ACTIVE,
      profiles: {
        brandup: {
          type: PROFILE_TYPE.BRANDUP,
          status: PROFILE_STATUS.ACTIVE,
          data: {
            pitch: i18n('Agence de communication 360° basée à Tunis. Nous accompagnons PME et grands comptes dans leur stratégie de marque, leur identité visuelle et leur déploiement digital.'),
            about: i18n('MediaCom est une agence de communication et de stratégie de marque fondée en 2015 à Tunis. Notre équipe pluridisciplinaire de 18 spécialistes (stratégistes, créatifs, développeurs, social media managers) accompagne aussi bien des PME tunisiennes que des grands comptes nord-africains. Nous croyons aux marques qui ont du sens et travaillons exclusivement sur des projets alignés à nos valeurs.'),
            color: '#6366F1',
            links: [
              { label: i18n('Site web'), url: 'https://mediacom.tn', icon: 'language' },
              { label: i18n('Behance'), url: 'https://behance.net/mediacom', icon: 'palette' }
            ],
            gallery: [],
            projects: [
                        { id: 'proj-c-002-1', name: i18n('Rebranding BIAT 2025'), image: `https://picsum.photos/seed/c-002-proj-1/600/400`, description: i18n('Refonte complète de l\'identité visuelle de la BIAT — guideline, signalétique, digital.'), order: 1 },
                        { id: 'proj-c-002-2', name: i18n('Campagne TikTok Délice'), image: `https://picsum.photos/seed/c-002-proj-2/600/400`, description: i18n('Campagne sociale ciblée 16-25 ans pour Délice avec influenceurs locaux.'), order: 2 },
                        { id: 'proj-c-002-3', name: i18n('Plateforme Tunisie Telecom'), image: `https://picsum.photos/seed/c-002-proj-3/600/400`, description: i18n('Refonte UX du site corporate Tunisie Telecom.'), order: 3 },
                        { id: 'proj-c-002-4', name: i18n('Carrefour Tunisie'), image: `https://picsum.photos/seed/c-002-proj-4/600/400`, description: i18n('Campagnes saisonnières + activations magasins.'), order: 4 },
                        { id: 'proj-c-002-5', name: i18n('Salwa cosmétiques'), image: `https://picsum.photos/seed/c-002-proj-5/600/400`, description: i18n('Lancement gamme premium — packaging et campagne digitale.'), order: 5 },
                        { id: 'proj-c-002-6', name: i18n('Office National du Tourisme'), image: `https://picsum.photos/seed/c-002-proj-6/600/400`, description: i18n('Campagne \'Découvrez la Tunisie\' — vidéo, social, OOH.'), order: 6 },
                        { id: 'proj-c-002-7', name: i18n('Ooredoo Wave'), image: `https://picsum.photos/seed/c-002-proj-7/600/400`, description: i18n('Activation mobile-first jeunes 18-30 ans.'), order: 7 },
                        { id: 'proj-c-002-8', name: i18n('Coca-Cola Ramadan'), image: `https://picsum.photos/seed/c-002-proj-8/600/400`, description: i18n('Campagne Ramadan multi-canal pour Coca-Cola Tunisie.'), order: 8 },
                        { id: 'proj-c-002-9', name: i18n('Maxula Festival'), image: `https://picsum.photos/seed/c-002-proj-9/600/400`, description: i18n('Direction artistique et communication du festival Maxula.'), order: 9 }
                      ],
            certifications: [
              { id: 'cert-c-002-1', name: 'Google Partner Premier', label: i18n('Certification Google Ads'), icon: 'verified', image: `https://picsum.photos/seed/c-002-cert-google/200/200`, issuedAt: '2025-01-15', expiresAt: '2026-01-15' },
              { id: 'cert-c-002-2', name: 'Meta Business Partner', label: i18n('Certification Meta Ads'), icon: 'verified', image: null, issuedAt: '2024-06-01', expiresAt: '2026-06-01' }
            ],
            services: [
              { name: i18n('Identité visuelle & branding') },
              { name: i18n('Stratégie de communication') },
              { name: i18n('Production audiovisuelle') },
              { name: i18n('Social media management') }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2026-02-15T10:00:00.000Z',
          lastValidatedAt: '2026-02-15T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 432, views30d: 87, clicksTotal: 28 },
          boostHistory: [], sponsoringHistory: []
        },
        traceup: {
          type: PROFILE_TYPE.TRACEUP,
          status: PROFILE_STATUS.ACTIVE,
          data: {
            videos: [
              {
                id: 'v-c-002-1', source: VIDEO_SOURCE.YOUTUBE, videoId: 'kJQP7kiw5Fk',
                videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
                thumbnailUrl: ytThumb('kJQP7kiw5Fk'),
                category: VIDEO_CATEGORY.ACTUALITE,
                title: i18n('Rebranding BIAT — making of'),
                description: i18n('Coulisses du rebranding de la BIAT, de la recherche créative au lancement.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-03-01T10:00:00.000Z', addedAt: '2026-03-01T09:50:00.000Z'
              },
              {
                id: 'v-c-002-2', source: VIDEO_SOURCE.VIMEO, videoId: '148751763',
                videoUrl: 'https://vimeo.com/148751763',
                thumbnailUrl: vimeoThumb('148751763'),
                category: VIDEO_CATEGORY.ASTUCES,
                title: i18n('5 erreurs à éviter en branding'),
                description: i18n('Les pièges classiques à éviter pour bâtir une marque forte.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-03-15T14:00:00.000Z', addedAt: '2026-03-15T13:55:00.000Z'
              },
              {
                id: 'v-c-002-3', source: VIDEO_SOURCE.YOUTUBE, videoId: 'tgbNymZ7vqY',
                videoUrl: 'https://www.youtube.com/watch?v=tgbNymZ7vqY',
                thumbnailUrl: ytThumb('tgbNymZ7vqY'),
                category: VIDEO_CATEGORY.EMPLOIS,
                title: i18n('Recrutement : Senior Art Director'),
                description: i18n('Nous cherchons un(e) Senior Art Director pour rejoindre notre équipe créative.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-04-05T10:00:00.000Z', addedAt: '2026-04-05T09:55:00.000Z'
              }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2026-02-15T10:00:00.000Z',
          lastValidatedAt: '2026-02-15T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 892, views30d: 156, clicksTotal: 42 },
          boostHistory: [], sponsoringHistory: []
        },
        linkup: {
          type: PROFILE_TYPE.LINKUP,
          status: PROFILE_STATUS.ACTIVE,
          data: {
            contactCard: {
              fullName: 'Leila Karoui',
              title: i18n('Directrice Associée'),
              company: i18n('MediaCom Communication'),
              bio: i18n('15 ans d\'expérience en communication. Passionnée par les marques qui osent.'),
              email: 'leila@mediacom.tn',
              phone: '+216 71 555 100',
              whatsapp: '+216 71 555 100',
              website: 'https://mediacom.tn',
              address: 'Avenue Habib Bourguiba, Tunis Centre',
              gpsPosition: { type: 'Point', coordinates: [10.1815, 36.8065] }
            },
            qrConfig: { style: 'rounded', colorForeground: '#000000', colorBackground: '#FFFFFF', logoOverlay: true },
            socials: [
              { platform: 'linkedin', url: 'https://linkedin.com/in/leilakaroui' },
              { platform: 'facebook', url: 'https://facebook.com/mediacom.tn' },
              { platform: 'instagram', url: 'https://instagram.com/mediacom.tn' },
              { platform: 'twitter', url: null },
              { platform: 'youtube', url: null },
              { platform: 'tiktok', url: null }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2026-02-15T10:00:00.000Z',
          lastValidatedAt: '2026-02-15T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 178, views30d: 32, clicksTotal: 15 },
          boostHistory: [], sponsoringHistory: []
        }
      },
      transactions: [],
      rseReceipts: [
        // Reçu RSE pending : MediaCom soumet un don à Tunisie Verte (le 2e en attente, narration cohérente)
        {
          id: 'r-c-002-1',
          associationId: 'a-002',
          associationName: 'Tunisie Verte',
          amount: 2800,
          donationDate: '2026-04-22',
          receiptDocumentUrl: SAMPLE_RSE_RECEIPT_DOC,
          status: RSE_RECEIPT_STATUS.PENDING,
          submittedAt: '2026-04-22T14:15:00.000Z',
          validatedAt: null,
          validatedBy: null,
          rejectedReason: null
        }
      ],
      rseBadgeStatus: RSE_BADGE_STATUS.NONE,
      // Demande de modifs profil entreprise en attente de revalidation admin
      // → apparaîtra dans admin_validation-comptes.html onglet "Modifs en attente"
      pendingUpdates: {
        submittedAt: '2026-04-20T16:00:00.000Z',
        fields: [
          { key: 'phone',   currentValue: '+216 71 555 100',                                newValue: '+216 71 555 200' },
          { key: 'address', currentValue: 'Rue Mohamed V, Tunis',                           newValue: 'Avenue Habib Bourguiba, Tunis-Centre' }
        ],
        note: i18n('Déménagement du siège — nouveaux locaux et nouvelle ligne directe.')
      },
      registeredAt: '2026-02-01T09:00:00.000Z',
      validatedAt:  '2026-02-02T11:00:00.000Z', validatedBy: 'u-001',
      suspendedAt: null, suspendedReason: null,
      rejectedAt: null, rejectedReason: null, deletedAt: null
    },

    // -----------------------------------------------------------------
    // c-003 — GreenLife (Bio & Naturel)
    //   Type: B2C alimentation, Sousse
    //   Owner: Karim Slim
    //   States: BU active+boost · TU incomplete · LU active
    //   RSE: 1 receipt validated (Tunisie Verte)
    //   Demo: B2C card with active boost on BU, partial profile completion
    // -----------------------------------------------------------------
    {
      id: 'c-003',
      slug: 'greenlife-bio',
      type: COMPANY_TYPE.B2C,
      legalId: 'B33445',
      identityDocumentUrl: SAMPLE_LEGAL_ID_DOC,
      accountEmail: 'karim@greenlife.tn',
      country: 'TN',
      accountUser: {
        id: 'u-c-003', firstName: 'Karim', lastName: 'Slim',
        phone: '+216 73 411 222', languages: ['fr'],
        auth: { emailVerified: true, emailVerifiedAt: '2025-11-20T10:00:00.000Z',
                passwordHash: DEMO_PASSWORD_HASH, otpCode: null, otpExpiresAt: null }
      },
      liveData: {
        contactEmail: 'hello@greenlife.tn', phone: '+216 73 411 333',
        whatsapp: '+216 20 411 333',
        address: 'Avenue Mohamed V, Sousse',
        gouvernorat: 'sousse', ville: 'Sousse',
        sectorId: 'alimentation', languages: ['fr']
      },
      data: {
        displayName: i18n('GreenLife — Bio & Naturel'),
        logo: logoUrl('GreenLife', '10B981'),
        banner: bannerUrl('c-003')
      },
      pendingData: null,
      validationStatus: COMPANY_VALIDATION_STATUS.ACTIVE,
      profiles: {
        brandup: {
          type: PROFILE_TYPE.BRANDUP,
          status: PROFILE_STATUS.ACTIVE,
          data: {
            pitch: i18n('Épicerie bio et naturelle à Sousse. Nous sélectionnons des produits 100% bio, locaux quand c\'est possible, sans intermédiaires inutiles. Plus de 800 références.'),
            about: i18n('GreenLife est née d\'une conviction simple : manger bon, sain et juste. Depuis 2020, nous tissons un réseau de producteurs locaux engagés et proposons une sélection rigoureuse de produits biologiques, sans additifs ni emballages superflus. Notre boutique de Sousse accueille chaque semaine des centaines de familles soucieuses de leur alimentation.'),
            color: '#10B981',
            links: [
              { label: i18n('Site web'), url: 'https://greenlife.tn', icon: 'language' },
              { label: i18n('Instagram'), url: 'https://instagram.com/greenlife.tn', icon: 'photo_camera' }
            ],
            gallery: [],
            projects: [
                        { id: 'proj-c-003-1', name: i18n('Huile d\'olive bio extra vierge'), image: `https://picsum.photos/seed/c-003-proj-1/600/400`, description: i18n('Notre huile premium issue de petits producteurs du Cap Bon.'), order: 1 },
                        { id: 'proj-c-003-2', name: i18n('Miel naturel d\'oliveraie'), image: `https://picsum.photos/seed/c-003-proj-2/600/400`, description: i18n('Miel pur récolté dans nos oliveraies à Béja.'), order: 2 },
                        { id: 'proj-c-003-3', name: i18n('Tisanes artisanales'), image: `https://picsum.photos/seed/c-003-proj-3/600/400`, description: i18n('Mélanges de plantes locales — verveine, menthe, thym.'), order: 3 },
                        { id: 'proj-c-003-4', name: i18n('Confitures bio maison'), image: `https://picsum.photos/seed/c-003-proj-4/600/400`, description: i18n('Figues, abricots, oranges amères — sans sucre ajouté.'), order: 4 },
                        { id: 'proj-c-003-5', name: i18n('Légumes frais de saison'), image: `https://picsum.photos/seed/c-003-proj-5/600/400`, description: i18n('Paniers hebdomadaires de légumes bio livrés à domicile.'), order: 5 },
                        { id: 'proj-c-003-6', name: i18n('Produits ménagers écologiques'), image: `https://picsum.photos/seed/c-003-proj-6/600/400`, description: i18n('Savons et nettoyants naturels biodégradables.'), order: 6 },
                        { id: 'proj-c-003-7', name: i18n('Cosmétiques bio'), image: `https://picsum.photos/seed/c-003-proj-7/600/400`, description: i18n('Huiles essentielles, savons à l\'huile d\'olive.'), order: 7 },
                        { id: 'proj-c-003-8', name: i18n('Compléments alimentaires'), image: `https://picsum.photos/seed/c-003-proj-8/600/400`, description: i18n('Spiruline, gelée royale, propolis tunisienne.'), order: 8 },
                        { id: 'proj-c-003-9', name: i18n('Paniers découverte'), image: `https://picsum.photos/seed/c-003-proj-9/600/400`, description: i18n('Sélection mensuelle de produits locaux artisanaux.'), order: 9 }
                      ],
            certifications: [
              { id: 'cert-c-003-1', name: 'AB Tunisie', label: i18n('Agriculture biologique tunisienne'), icon: 'eco', image: `https://picsum.photos/seed/c-003-cert-ab/200/200`, issuedAt: '2023-01-01', expiresAt: '2026-01-01' }
            ],
            services: [
              { name: i18n('Vente en boutique') },
              { name: i18n('Livraison Sousse') },
              { name: i18n('Paniers hebdomadaires') }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-12-10T09:00:00.000Z',
          lastValidatedAt: '2025-12-10T09:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 1543, views30d: 421, clicksTotal: 89 },
          boostHistory: [
            {
              id: 'b-c-003-1',
              from: '2026-04-01T00:00:00.000Z', to: '2026-05-01T23:59:59.000Z',
              durationDays: 30, priceHT: 50, transactionId: 't-c-003-1',
              viewsAdded: 312, clicksAdded: 24,
              status: BOOST_STATUS.ACTIVE
            }
          ],
          sponsoringHistory: []
        },
        traceup: {
          type: PROFILE_TYPE.TRACEUP,
          status: PROFILE_STATUS.INCOMPLETE,
          data: {
            videos: []
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: null, lastValidatedAt: null, lastValidatedBy: null,
          stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
          boostHistory: [], sponsoringHistory: []
        },
        linkup: {
          type: PROFILE_TYPE.LINKUP,
          status: PROFILE_STATUS.ACTIVE,
          data: {
            contactCard: {
              fullName: 'Karim Slim',
              title: i18n('Fondateur & Gérant'),
              company: i18n('GreenLife'),
              bio: i18n('Passionné par l\'alimentation saine et durable.'),
              email: 'karim@greenlife.tn',
              phone: '+216 73 411 222',
              whatsapp: '+216 73 411 222',
              website: 'https://greenlife.tn',
              address: 'Avenue Mohamed V, Sousse',
              gpsPosition: { type: 'Point', coordinates: [10.6411, 35.8254] }
            },
            qrConfig: { style: 'square', colorForeground: '#10B981', colorBackground: '#FFFFFF', logoOverlay: true },
            socials: [
              { platform: 'instagram', url: 'https://instagram.com/greenlife.tn' },
              { platform: 'facebook', url: 'https://facebook.com/greenlife.tn' },
              { platform: 'linkedin', url: null },
              { platform: 'twitter', url: null },
              { platform: 'youtube', url: null },
              { platform: 'tiktok', url: null }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-12-10T09:00:00.000Z',
          lastValidatedAt: '2025-12-10T09:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 245, views30d: 67, clicksTotal: 18 },
          boostHistory: [], sponsoringHistory: []
        }
      },
      transactions: [
        {
          id: 't-c-003-1', type: TRANSACTION_TYPE.BOOST, refId: 'b-c-003-1',
          profileType: PROFILE_TYPE.BRANDUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID,
          paidAt: '2026-04-01T08:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD,
          paymentReference: 'MP-20260401-003',
          invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: 'INV-2026-0036',
          createdAt: '2026-04-01T07:55:00.000Z'
        }
      ],
      rseReceipts: [
        {
          id: 'r-c-003-1', associationId: 'a-002', associationName: 'Tunisie Verte',
          amount: 1500, donationDate: '2026-02-20',
          receiptDocumentUrl: SAMPLE_RSE_RECEIPT_DOC,
          status: RSE_RECEIPT_STATUS.VALIDATED,
          submittedAt: '2026-02-20T11:00:00.000Z',
          validatedAt: '2026-02-21T09:00:00.000Z', validatedBy: 'u-001',
          rejectedReason: null
        }
      ],
      rseBadgeStatus: RSE_BADGE_STATUS.VALIDATED,
      // Demande de modifs profil entreprise en attente de revalidation admin
      // → 2e demande dans la file (postérieure à MediaCom)
      pendingUpdates: {
        submittedAt: '2026-04-23T09:30:00.000Z',
        fields: [
          { key: 'logo', currentValue: 'logo-greenlife-v1.png', newValue: 'logo-greenlife-v2-rebrand.png' }
        ],
        note: i18n('Refonte de l\'identité visuelle — nouveau logo plus moderne. Le reste des informations est inchangé.')
      },
      registeredAt: '2025-11-20T10:00:00.000Z',
      validatedAt:  '2025-11-21T09:00:00.000Z', validatedBy: 'u-001',
      suspendedAt: null, suspendedReason: null,
      rejectedAt: null, rejectedReason: null, deletedAt: null
    },

    // -----------------------------------------------------------------
    // c-004 — BuildTech Construction
    //   Type: B2B BTP, Tunis
    //   Owner: Sami Bouazizi
    //   States: BU incomplete · TU disabled · LU active
    //   PendingData: company-level banner waiting for admin
    //   Demo: company-level pending modif (cascade hides all 3 profiles)
    // -----------------------------------------------------------------
    {
      id: 'c-004',
      slug: 'buildtech-construction',
      type: COMPANY_TYPE.B2B,
      legalId: 'B77123',
      identityDocumentUrl: SAMPLE_LEGAL_ID_DOC,
      accountEmail: 'sami@buildtech.tn',
      country: 'TN',
      accountUser: {
        id: 'u-c-004', firstName: 'Sami', lastName: 'Bouazizi',
        phone: '+216 71 877 555', languages: ['fr'],
        auth: { emailVerified: true, emailVerifiedAt: '2026-03-15T11:00:00.000Z',
                passwordHash: DEMO_PASSWORD_HASH, otpCode: null, otpExpiresAt: null }
      },
      liveData: {
        contactEmail: 'contact@buildtech.tn', phone: '+216 71 877 600',
        whatsapp: '+216 20 877 600',
        address: 'Z.I. Charguia II, Tunis',
        gouvernorat: 'tunis', ville: 'Tunis',
        sectorId: 'btp', languages: ['fr']
      },
      data: {
        displayName: i18n('BuildTech Construction'),
        logo: logoUrl('BuildTech', 'F59E0B'),
        banner: bannerUrl('c-004')
      },
      // Company-level pending: user uploaded a new banner, awaiting admin
      pendingData: {
        banner: `https://picsum.photos/seed/c-004-banner-v2/1200/400`,
        modifiedFields: ['banner'],
        submittedAt: '2026-04-19T15:00:00.000Z'
      },
      validationStatus: COMPANY_VALIDATION_STATUS.PENDING,
      profiles: {
        brandup: {
          type: PROFILE_TYPE.BRANDUP,
          status: PROFILE_STATUS.INCOMPLETE,
          data: {
            pitch: i18nEmpty(),
            about: i18nEmpty(),
            color: '#F59E0B',
            links: [], gallery: [],
            projects: [], certifications: [],
            services: []
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: null, lastValidatedAt: null, lastValidatedBy: null,
          stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
          boostHistory: [], sponsoringHistory: []
        },
        traceup: {
          type: PROFILE_TYPE.TRACEUP,
          status: PROFILE_STATUS.DISABLED,
          data: {
            videos: [
              {
                id: 'v-c-004-1', source: VIDEO_SOURCE.YOUTUBE, videoId: 'fJ9rUzIMcZQ',
                videoUrl: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
                thumbnailUrl: ytThumb('fJ9rUzIMcZQ'),
                category: VIDEO_CATEGORY.ACTUALITE,
                title: i18n('Avancement chantier Lac 2'),
                description: i18nEmpty(),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-02-20T10:00:00.000Z', addedAt: '2026-02-20T09:55:00.000Z'
              }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2026-02-25T10:00:00.000Z',
          lastValidatedAt: '2026-02-25T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 124, views30d: 0, clicksTotal: 8 },
          boostHistory: [], sponsoringHistory: []
        },
        linkup: {
          type: PROFILE_TYPE.LINKUP,
          status: PROFILE_STATUS.ACTIVE,
          data: {
            contactCard: {
              fullName: 'Sami Bouazizi',
              title: i18n('Directeur Général'),
              company: i18n('BuildTech Construction'),
              bio: i18n('20 ans d\'expérience BTP en Tunisie.'),
              email: 'sami@buildtech.tn',
              phone: '+216 71 877 555',
              whatsapp: '+216 71 877 555',
              website: null,
              address: 'Z.I. Charguia II, Tunis',
              gpsPosition: { type: 'Point', coordinates: [10.2274, 36.8485] }
            },
            qrConfig: { style: 'rounded', colorForeground: '#F59E0B', colorBackground: '#FFFFFF', logoOverlay: true },
            socials: [
              { platform: 'linkedin', url: 'https://linkedin.com/in/samibouazizi' },
              { platform: 'facebook', url: null }, { platform: 'instagram', url: null },
              { platform: 'twitter', url: null }, { platform: 'youtube', url: null }, { platform: 'tiktok', url: null }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2026-03-20T10:00:00.000Z',
          lastValidatedAt: '2026-03-20T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 87, views30d: 23, clicksTotal: 6 },
          boostHistory: [], sponsoringHistory: []
        }
      },
      transactions: [],
      rseReceipts: [], rseBadgeStatus: RSE_BADGE_STATUS.NONE,
      registeredAt: '2026-03-15T11:00:00.000Z',
      validatedAt:  '2026-03-16T09:00:00.000Z', validatedBy: 'u-001',
      suspendedAt: null, suspendedReason: null,
      rejectedAt: null, rejectedReason: null, deletedAt: null
    },

    // -----------------------------------------------------------------
    // c-005 — FoodCorner Restaurant
    //   Type: B2C restauration, Sfax
    //   Owner: Mehdi Trabelsi
    //   States: All 3 profiles ACTIVE but invisible (cascade from suspension)
    //   validationStatus = SUSPENDED (after billing dispute)
    //   1 open dispute (billing)
    //   Demo: cascade invisibility from suspension, revoked RSE badge
    // -----------------------------------------------------------------
    {
      id: 'c-005',
      slug: 'foodcorner-restaurant',
      type: COMPANY_TYPE.B2C,
      legalId: 'B55678',
      identityDocumentUrl: SAMPLE_LEGAL_ID_DOC,
      accountEmail: 'mehdi@foodcorner.tn',
      country: 'TN',
      accountUser: {
        id: 'u-c-005', firstName: 'Mehdi', lastName: 'Trabelsi',
        phone: '+216 74 222 100', languages: ['fr'],
        auth: { emailVerified: true, emailVerifiedAt: '2025-09-10T08:00:00.000Z',
                passwordHash: DEMO_PASSWORD_HASH, otpCode: null, otpExpiresAt: null }
      },
      liveData: {
        contactEmail: 'contact@foodcorner.tn', phone: '+216 74 222 200',
        whatsapp: '+216 20 222 200',
        address: 'Avenue Hedi Chaker, Sfax',
        gouvernorat: 'sfax', ville: 'Sfax',
        sectorId: 'restauration', languages: ['fr']
      },
      data: {
        displayName: i18n('FoodCorner — Cuisine Tunisienne'),
        logo: logoUrl('FoodCorner', 'EF4444'),
        banner: bannerUrl('c-005')
      },
      pendingData: null,
      validationStatus: COMPANY_VALIDATION_STATUS.SUSPENDED,
      profiles: {
        brandup: {
          type: PROFILE_TYPE.BRANDUP,
          status: PROFILE_STATUS.ACTIVE,  // status unchanged, only cascade hides it
          data: {
            pitch: i18n('Restaurant familial à Sfax. Spécialités tunisiennes traditionnelles et plats du jour. Salle de 60 couverts, terrasse en saison.'),
            about: i18n('FoodCorner est un restaurant familial fondé en 2018 à Sfax. Nous proposons une cuisine tunisienne authentique avec des produits frais du marché central.'),
            color: '#EF4444',
            links: [
              { label: i18n('Site web'), url: 'https://foodcorner.tn', icon: 'language' }
            ],
            gallery: [],
            projects: [
                        { id: 'proj-c-005-1', name: i18n('Couscous Royal aux 7 légumes'), image: `https://picsum.photos/seed/c-005-proj-1/600/400`, description: i18n('Notre couscous traditionnel revisité avec agneau et merguez.'), order: 1 },
                        { id: 'proj-c-005-2', name: i18n('Tajine de poulet aux olives'), image: `https://picsum.photos/seed/c-005-proj-2/600/400`, description: i18n('Plat signature mijoté lentement avec citron confit.'), order: 2 },
                        { id: 'proj-c-005-3', name: i18n('Brick au thon'), image: `https://picsum.photos/seed/c-005-proj-3/600/400`, description: i18n('Croustillant à la tunisienne, œuf coulant et thon frais.'), order: 3 },
                        { id: 'proj-c-005-4', name: i18n('Lablabi maison'), image: `https://picsum.photos/seed/c-005-proj-4/600/400`, description: i18n('Soupe de pois chiches au cumin et harissa traditionnelle.'), order: 4 },
                        { id: 'proj-c-005-5', name: i18n('Salade Mechouia'), image: `https://picsum.photos/seed/c-005-proj-5/600/400`, description: i18n('Légumes grillés au charbon, recette de grand-mère.'), order: 5 },
                        { id: 'proj-c-005-6', name: i18n('Ojja merguez'), image: `https://picsum.photos/seed/c-005-proj-6/600/400`, description: i18n('Œufs brouillés à la tomate et merguez épicée.'), order: 6 },
                        { id: 'proj-c-005-7', name: i18n('Gâteaux orientaux'), image: `https://picsum.photos/seed/c-005-proj-7/600/400`, description: i18n('Sélection de baklawas, makroudhs et samsas.'), order: 7 },
                        { id: 'proj-c-005-8', name: i18n('Loup de mer grillé'), image: `https://picsum.photos/seed/c-005-proj-8/600/400`, description: i18n('Pêche du jour, grillé entier, accompagné de tastira.'), order: 8 },
                        { id: 'proj-c-005-9', name: i18n('Plateau Mezze tunisien'), image: `https://picsum.photos/seed/c-005-proj-9/600/400`, description: i18n('Assortiment de mezzes pour 4 personnes.'), order: 9 }
                      ], certifications: [],
            services: [
              { name: i18n('Restaurant sur place') },
              { name: i18n('À emporter') },
              { name: i18n('Événements privés') }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-10-01T10:00:00.000Z',
          lastValidatedAt: '2025-10-01T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 2105, views30d: 0, clicksTotal: 187 },
          boostHistory: [], sponsoringHistory: []
        },
        traceup: {
          type: PROFILE_TYPE.TRACEUP, status: PROFILE_STATUS.ACTIVE,
          data: {
            videos: [
              {
                id: 'v-c-005-1', source: VIDEO_SOURCE.YOUTUBE, videoId: 'L_jWHffIx5E',
                videoUrl: 'https://www.youtube.com/watch?v=L_jWHffIx5E',
                thumbnailUrl: ytThumb('L_jWHffIx5E'),
                category: VIDEO_CATEGORY.ASTUCES,
                title: i18n('Recette : Couscous royal traditionnel'),
                description: i18n('Notre chef partage les secrets du couscous royal.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2025-12-15T10:00:00.000Z', addedAt: '2025-12-15T09:55:00.000Z'
              }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-11-15T10:00:00.000Z',
          lastValidatedAt: '2025-11-15T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 567, views30d: 0, clicksTotal: 34 },
          boostHistory: [], sponsoringHistory: []
        },
        linkup: {
          type: PROFILE_TYPE.LINKUP, status: PROFILE_STATUS.ACTIVE,
          data: {
            contactCard: {
              fullName: 'Mehdi Trabelsi',
              title: i18n('Chef & Propriétaire'),
              company: i18n('FoodCorner Restaurant'),
              bio: i18n('Passionné de cuisine tunisienne depuis 25 ans.'),
              email: 'mehdi@foodcorner.tn', phone: '+216 74 222 100', whatsapp: '+216 74 222 100',
              website: 'https://foodcorner.tn',
              address: 'Avenue Hedi Chaker, Sfax',
              gpsPosition: { type: 'Point', coordinates: [10.7603, 34.7406] }
            },
            qrConfig: { style: 'rounded', colorForeground: '#EF4444', colorBackground: '#FFFFFF', logoOverlay: true },
            socials: [
              { platform: 'instagram', url: 'https://instagram.com/foodcorner.tn' },
              { platform: 'facebook', url: 'https://facebook.com/foodcorner.tn' },
              { platform: 'linkedin', url: null }, { platform: 'twitter', url: null },
              { platform: 'youtube', url: null }, { platform: 'tiktok', url: null }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-10-01T10:00:00.000Z',
          lastValidatedAt: '2025-10-01T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 412, views30d: 0, clicksTotal: 67 },
          boostHistory: [], sponsoringHistory: []
        }
      },
      transactions: [
        // Past transactions before suspension
        { id: 't-c-005-1', type: TRANSACTION_TYPE.BOOST, refId: null, profileType: PROFILE_TYPE.BRANDUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID, paidAt: '2026-02-10T10:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD, paymentReference: 'MP-20260210-005',
          invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: 'INV-2026-0011',
          createdAt: '2026-02-10T09:55:00.000Z' },
        { id: 't-c-005-2', type: TRANSACTION_TYPE.BOOST, refId: null, profileType: PROFILE_TYPE.BRANDUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.REFUNDED, paidAt: '2026-03-15T10:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD, paymentReference: 'MP-20260315-002',
          invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: 'INV-2026-0027',
          createdAt: '2026-03-15T09:55:00.000Z' }
      ],
      rseReceipts: [],
      rseBadgeStatus: RSE_BADGE_STATUS.REVOKED,
      registeredAt: '2025-09-10T08:00:00.000Z',
      validatedAt:  '2025-09-12T09:00:00.000Z', validatedBy: 'u-001',
      suspendedAt: '2026-04-01T10:00:00.000Z',
      suspendedReason: 'Suspension suite à litige de facturation non résolu (boost facturé en double, dispute en cours).',
      rejectedAt: null, rejectedReason: null, deletedAt: null
    },

    // -----------------------------------------------------------------
    // c-006 — ArchStudio Architecture
    //   Type: B2B Architecture, Tunis
    //   Owner: Salma Ben Aissa
    //   States: 3 profiles active, but company-level pending (logo modif)
    //   RSE: 2 receipts validated
    //   Demo: company-level pendingData (logo modif) cascading invisibility
    // -----------------------------------------------------------------
    {
      id: 'c-006',
      slug: 'archstudio-architecture',
      type: COMPANY_TYPE.B2B,
      legalId: 'B66890',
      identityDocumentUrl: SAMPLE_LEGAL_ID_DOC,
      accountEmail: 'salma@archstudio.tn',
      country: 'TN',
      accountUser: {
        id: 'u-c-006', firstName: 'Salma', lastName: 'Ben Aissa',
        phone: '+216 71 333 100', languages: ['fr'],
        auth: { emailVerified: true, emailVerifiedAt: '2025-12-05T09:00:00.000Z',
                passwordHash: DEMO_PASSWORD_HASH, otpCode: null, otpExpiresAt: null }
      },
      liveData: {
        contactEmail: 'studio@archstudio.tn', phone: '+216 71 333 200',
        whatsapp: '+216 20 333 200',
        address: 'Rue de Marseille, Tunis',
        gouvernorat: 'tunis', ville: 'Tunis',
        sectorId: 'architecture', languages: ['fr']
      },
      data: {
        displayName: i18n('ArchStudio'),
        logo: logoUrl('ArchStudio', '8B5CF6'),
        banner: bannerUrl('c-006')
      },
      pendingData: {
        logo: logoUrl('ArchStudioNew', '7C3AED'),
        modifiedFields: ['logo'],
        submittedAt: '2026-04-15T14:00:00.000Z'
      },
      validationStatus: COMPANY_VALIDATION_STATUS.PENDING,
      profiles: {
        brandup: {
          type: PROFILE_TYPE.BRANDUP, status: PROFILE_STATUS.ACTIVE,
          data: {
            pitch: i18n('Cabinet d\'architecture spécialisé dans les projets résidentiels haut de gamme et les espaces commerciaux. Approche durable et matériaux locaux.'),
            about: i18n('Fondé en 2017, ArchStudio est un cabinet d\'architecture indépendant basé à Tunis. Notre équipe de 8 architectes et designers conçoit des projets sur mesure, avec une attention particulière portée à l\'intégration paysagère et à la performance énergétique.'),
            color: '#8B5CF6',
            links: [
              { label: i18n('Site web'), url: 'https://archstudio.tn', icon: 'language' },
              { label: i18n('Instagram'), url: 'https://instagram.com/archstudio.tn', icon: 'photo_camera' }
            ],
            gallery: [],
            projects: [
                        { id: 'proj-c-006-1', name: i18n('Villa Sidi Bou Saïd'), image: `https://picsum.photos/seed/c-006-proj-1/600/400`, description: i18n('Villa contemporaine à Sidi Bou Saïd avec patio et piscine.'), order: 1 },
                        { id: 'proj-c-006-2', name: i18n('Résidence Carthage'), image: `https://picsum.photos/seed/c-006-proj-2/600/400`, description: i18n('Résidence de standing de 24 appartements à Carthage.'), order: 2 },
                        { id: 'proj-c-006-3', name: i18n('Bureau Berges du Lac'), image: `https://picsum.photos/seed/c-006-proj-3/600/400`, description: i18n('Tour de bureaux R+8 aux Berges du Lac II.'), order: 3 },
                        { id: 'proj-c-006-4', name: i18n('Hôtel boutique Hammamet'), image: `https://picsum.photos/seed/c-006-proj-4/600/400`, description: i18n('Réhabilitation d\'un dar traditionnel en hôtel boutique.'), order: 4 },
                        { id: 'proj-c-006-5', name: i18n('Loft urbain Tunis Centre'), image: `https://picsum.photos/seed/c-006-proj-5/600/400`, description: i18n('Conversion d\'un atelier industriel en loft contemporain.'), order: 5 },
                        { id: 'proj-c-006-6', name: i18n('Centre commercial Sousse'), image: `https://picsum.photos/seed/c-006-proj-6/600/400`, description: i18n('Extension d\'un centre commercial à Sousse — 8 000 m².'), order: 6 },
                        { id: 'proj-c-006-7', name: i18n('Riad Médina de Tunis'), image: `https://picsum.photos/seed/c-006-proj-7/600/400`, description: i18n('Restauration d\'un riad du XVIIIe siècle.'), order: 7 },
                        { id: 'proj-c-006-8', name: i18n('Maison contemporaine Gammarth'), image: `https://picsum.photos/seed/c-006-proj-8/600/400`, description: i18n('Maison familiale 5 chambres avec vue mer.'), order: 8 },
                        { id: 'proj-c-006-9', name: i18n('Showroom design'), image: `https://picsum.photos/seed/c-006-proj-9/600/400`, description: i18n('Espace d\'exposition pour mobilier design contemporain.'), order: 9 }
                      ],
            certifications: [
              { id: 'cert-c-006-1', name: 'Ordre des Architectes TN', label: i18n('Inscription ordinale'), icon: 'verified', image: null, issuedAt: '2017-09-01', expiresAt: null }
            ],
            services: [
              { name: i18n('Architecture résidentielle') },
              { name: i18n('Architecture commerciale') },
              { name: i18n('Réhabilitation patrimoniale') },
              { name: i18n('Design d\'intérieur') }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2026-01-10T10:00:00.000Z',
          lastValidatedAt: '2026-01-10T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 678, views30d: 145, clicksTotal: 41 },
          boostHistory: [], sponsoringHistory: []
        },
        traceup: {
          type: PROFILE_TYPE.TRACEUP, status: PROFILE_STATUS.ACTIVE,
          data: {
            videos: [
              {
                id: 'v-c-006-1', source: VIDEO_SOURCE.VIMEO, videoId: '124540516',
                videoUrl: 'https://vimeo.com/124540516',
                thumbnailUrl: vimeoThumb('124540516'),
                category: VIDEO_CATEGORY.ACTUALITE,
                title: i18n('Visite Villa Belvedere'),
                description: i18n('Visite virtuelle de la Villa Belvedere à Gammarth.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-02-01T10:00:00.000Z', addedAt: '2026-02-01T09:55:00.000Z'
              },
              {
                id: 'v-c-006-2', source: VIDEO_SOURCE.YOUTUBE, videoId: 'OPf0YbXqDm0',
                videoUrl: 'https://www.youtube.com/watch?v=OPf0YbXqDm0',
                thumbnailUrl: ytThumb('OPf0YbXqDm0'),
                category: VIDEO_CATEGORY.ASTUCES,
                title: i18n('Bien choisir son architecte : 5 conseils'),
                description: i18n('Conseils pour bien choisir son architecte pour un projet réussi.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-03-10T10:00:00.000Z', addedAt: '2026-03-10T09:55:00.000Z'
              }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2026-01-15T10:00:00.000Z',
          lastValidatedAt: '2026-01-15T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 423, views30d: 78, clicksTotal: 19 },
          boostHistory: [], sponsoringHistory: []
        },
        linkup: {
          type: PROFILE_TYPE.LINKUP, status: PROFILE_STATUS.ACTIVE,
          data: {
            contactCard: {
              fullName: 'Salma Ben Aissa',
              title: i18n('Architecte fondatrice'),
              company: i18n('ArchStudio'),
              bio: i18n('Architecte DPLG · Diplômée ENSA Paris-La Villette.'),
              email: 'salma@archstudio.tn', phone: '+216 71 333 100', whatsapp: '+216 71 333 100',
              website: 'https://archstudio.tn',
              address: 'Rue de Marseille, Tunis',
              gpsPosition: { type: 'Point', coordinates: [10.1815, 36.8005] }
            },
            qrConfig: { style: 'dots', colorForeground: '#8B5CF6', colorBackground: '#FFFFFF', logoOverlay: true },
            socials: [
              { platform: 'linkedin', url: 'https://linkedin.com/in/salmabenaissa' },
              { platform: 'instagram', url: 'https://instagram.com/archstudio.tn' },
              { platform: 'facebook', url: null }, { platform: 'twitter', url: null },
              { platform: 'youtube', url: null }, { platform: 'tiktok', url: null }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2026-01-10T10:00:00.000Z',
          lastValidatedAt: '2026-01-10T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 156, views30d: 38, clicksTotal: 12 },
          boostHistory: [], sponsoringHistory: []
        }
      },
      transactions: [],
      rseReceipts: [
        {
          id: 'r-c-006-1', associationId: 'a-002', associationName: 'Tunisie Verte',
          amount: 2500, donationDate: '2026-01-20',
          receiptDocumentUrl: SAMPLE_RSE_RECEIPT_DOC,
          status: RSE_RECEIPT_STATUS.VALIDATED,
          submittedAt: '2026-01-20T11:00:00.000Z',
          validatedAt: '2026-01-21T09:00:00.000Z', validatedBy: 'u-001',
          rejectedReason: null
        },
        {
          id: 'r-c-006-2', associationId: 'a-005', associationName: 'Association des Aveugles de Tunisie',
          amount: 1800, donationDate: '2025-12-10',
          receiptDocumentUrl: SAMPLE_RSE_RECEIPT_DOC,
          status: RSE_RECEIPT_STATUS.VALIDATED,
          submittedAt: '2025-12-10T11:00:00.000Z',
          validatedAt: '2025-12-11T10:00:00.000Z', validatedBy: 'u-001',
          rejectedReason: null
        }
      ],
      rseBadgeStatus: RSE_BADGE_STATUS.VALIDATED,
      registeredAt: '2025-12-05T09:00:00.000Z',
      validatedAt:  '2025-12-06T11:00:00.000Z', validatedBy: 'u-001',
      suspendedAt: null, suspendedReason: null,
      rejectedAt: null, rejectedReason: null, deletedAt: null
    },

    // -----------------------------------------------------------------
    // c-007 — AutoPlus
    //   Type: B2B automobile-pro, Sousse
    //   Owner: Omar Belhaj
    //   States: BU active · TU active (with 1 rejected video) · LU active
    //   Past EXPIRED boost on TraceUP
    //   Demo: per-video rejection state, expired boost in history
    // -----------------------------------------------------------------
    {
      id: 'c-007',
      slug: 'autoplus',
      type: COMPANY_TYPE.B2B,
      legalId: 'B22334',
      identityDocumentUrl: SAMPLE_LEGAL_ID_DOC,
      accountEmail: 'omar@autoplus.tn',
      country: 'TN',
      accountUser: {
        id: 'u-c-007', firstName: 'Omar', lastName: 'Belhaj',
        phone: '+216 73 600 100', languages: ['fr'],
        auth: { emailVerified: true, emailVerifiedAt: '2025-10-22T10:00:00.000Z',
                passwordHash: DEMO_PASSWORD_HASH, otpCode: null, otpExpiresAt: null }
      },
      liveData: {
        contactEmail: 'contact@autoplus.tn', phone: '+216 73 600 200',
        whatsapp: '+216 20 600 200',
        address: 'Route de Sahline, Sousse',
        gouvernorat: 'sousse', ville: 'Sousse',
        sectorId: 'automobile-pro', languages: ['fr']
      },
      data: {
        displayName: i18n('AutoPlus'),
        logo: logoUrl('AutoPlus', 'DC2626'),
        banner: bannerUrl('c-007')
      },
      pendingData: null,
      validationStatus: COMPANY_VALIDATION_STATUS.ACTIVE,
      profiles: {
        brandup: {
          type: PROFILE_TYPE.BRANDUP, status: PROFILE_STATUS.ACTIVE,
          data: {
            pitch: i18n('Distributeur de pièces automobiles et équipements professionnels pour garages et carrossiers. Plus de 15 000 références en stock.'),
            about: i18n('AutoPlus est le distributeur de référence en pièces automobiles et équipements professionnels du Sahel tunisien depuis 2008. Nous fournissons garages indépendants, concessions et carrossiers avec un stock de plus de 15 000 références et un service livraison express dans toute la Tunisie.'),
            color: '#DC2626',
            links: [
              { label: i18n('Catalogue en ligne'), url: 'https://autoplus.tn/catalogue', icon: 'description' },
              { label: i18n('Site web'), url: 'https://autoplus.tn', icon: 'language' }
            ],
            gallery: [],
            projects: [
                        { id: 'proj-c-007-1', name: i18n('Pneumatiques Premium'), image: `https://picsum.photos/seed/c-007-proj-1/600/400`, description: i18n('Distribution exclusive Michelin, Continental et Pirelli.'), order: 1 },
                        { id: 'proj-c-007-2', name: i18n('Pièces moteur OEM'), image: `https://picsum.photos/seed/c-007-proj-2/600/400`, description: i18n('Pièces d\'origine pour Renault, Peugeot, Citroën, Volkswagen.'), order: 2 },
                        { id: 'proj-c-007-3', name: i18n('Système de freinage'), image: `https://picsum.photos/seed/c-007-proj-3/600/400`, description: i18n('Disques, plaquettes et étriers pour véhicules légers et utilitaires.'), order: 3 },
                        { id: 'proj-c-007-4', name: i18n('Suspensions et amortisseurs'), image: `https://picsum.photos/seed/c-007-proj-4/600/400`, description: i18n('Gamme complète de suspensions pour tous types de véhicules.'), order: 4 },
                        { id: 'proj-c-007-5', name: i18n('Diagnostic électronique'), image: `https://picsum.photos/seed/c-007-proj-5/600/400`, description: i18n('Outils de diagnostic OBD2 et logiciels professionnels.'), order: 5 },
                        { id: 'proj-c-007-6', name: i18n('Lubrifiants moteur'), image: `https://picsum.photos/seed/c-007-proj-6/600/400`, description: i18n('Huiles moteur synthétiques et semi-synthétiques.'), order: 6 },
                        { id: 'proj-c-007-7', name: i18n('Filtration auto'), image: `https://picsum.photos/seed/c-007-proj-7/600/400`, description: i18n('Filtres à air, à huile, à carburant et habitacle.'), order: 7 },
                        { id: 'proj-c-007-8', name: i18n('Pièces de carrosserie'), image: `https://picsum.photos/seed/c-007-proj-8/600/400`, description: i18n('Pare-chocs, phares, rétroviseurs — pièces neuves et reconditionnées.'), order: 8 },
                        { id: 'proj-c-007-9', name: i18n('Audio et multimédia'), image: `https://picsum.photos/seed/c-007-proj-9/600/400`, description: i18n('Autoradios, GPS, caméras de recul, haut-parleurs.'), order: 9 }
                      ],
            certifications: [
              { id: 'cert-c-007-1', name: 'Bosch Service Partner', label: i18n('Partenaire officiel Bosch'), icon: 'verified', image: `https://picsum.photos/seed/c-007-cert-bosch/200/200`, issuedAt: '2023-01-01', expiresAt: '2026-01-01' }
            ],
            services: [
              { name: i18n('Pièces détachées toutes marques') },
              { name: i18n('Équipements garage') },
              { name: i18n('Livraison express') }
            ]
          },
          // pendingData : AutoPlus demande à modifier son pitch + ajouter un nouveau service
          //                (profil reste invisible publiquement jusqu'à validation admin — modèle B strict)
          pendingData: {
            submittedAt: '2026-04-21T11:00:00.000Z',
            note: i18n('Mise à jour suite à l\'ouverture de notre nouveau centre de service rapide.'),
            fields: [
              { key: 'pitch',     label: 'Pitch',            currentValue: 'Centre auto multi-marques · Service rapide · Pneus · Vidange · Climatisation.',                                                                                                                       newValue: 'Centre auto multi-marques · 2 sites Tunis & Sousse · Service rapide express · Pneus toutes marques · Vidange · Climatisation · Diagnostic électronique.' },
              { key: 'addServiceCount', label: '+ 1 service ajouté', currentValue: '4 services',  newValue: '5 services (ajout : Diagnostic électronique)' }
            ]
          },
          rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-11-05T10:00:00.000Z',
          lastValidatedAt: '2025-11-05T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 1287, views30d: 234, clicksTotal: 76 },
          boostHistory: [], sponsoringHistory: []
        },
        traceup: {
          type: PROFILE_TYPE.TRACEUP, status: PROFILE_STATUS.ACTIVE,
          data: {
            videos: [
              {
                id: 'v-c-007-1', source: VIDEO_SOURCE.YOUTUBE, videoId: 'YQHsXMglC9A',
                videoUrl: 'https://www.youtube.com/watch?v=YQHsXMglC9A',
                thumbnailUrl: ytThumb('YQHsXMglC9A'),
                category: VIDEO_CATEGORY.ASTUCES,
                title: i18n('Comment changer ses plaquettes de frein'),
                description: i18n('Tutoriel pas à pas pour changer ses plaquettes de frein.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-01-20T10:00:00.000Z', addedAt: '2026-01-20T09:55:00.000Z'
              },
              {
                id: 'v-c-007-2', source: VIDEO_SOURCE.DAILYMOTION, videoId: 'x8a3kf9',
                videoUrl: 'https://www.dailymotion.com/video/x8a3kf9',
                thumbnailUrl: dmThumb('x8a3kf9'),
                category: VIDEO_CATEGORY.OFFRES,
                title: i18n('Promo printemps -15% pneumatiques'),
                description: i18n('Offre spéciale jusqu\'au 30 mai sur tous les pneumatiques.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-04-01T10:00:00.000Z', addedAt: '2026-04-01T09:55:00.000Z'
              },
              // Video signaled and rejected by admin (kept but hidden)
              {
                id: 'v-c-007-3', source: VIDEO_SOURCE.YOUTUBE, videoId: 'WMweEpGlu_U',
                videoUrl: 'https://www.youtube.com/watch?v=WMweEpGlu_U',
                thumbnailUrl: ytThumb('WMweEpGlu_U'),
                category: VIDEO_CATEGORY.ACTUALITE,
                title: i18n('Test live nouvelle Volkswagen Polo'),
                description: i18n('Essai en direct de la nouvelle Polo dans nos locaux.'),
                status: VIDEO_STATUS.REJECTED,  // signaled by user, hidden but kept
                publishedAt: '2026-03-12T10:00:00.000Z', addedAt: '2026-03-12T09:55:00.000Z'
              }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-11-15T10:00:00.000Z',
          lastValidatedAt: '2025-11-15T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 4567, views30d: 856, clicksTotal: 234 },
          // Past EXPIRED boost
          boostHistory: [
            {
              id: 'b-c-007-0',
              from: '2026-02-15T00:00:00.000Z', to: '2026-03-17T23:59:59.000Z',
              durationDays: 30, priceHT: 50, transactionId: 't-c-007-1',
              viewsAdded: 1456, clicksAdded: 87,
              status: BOOST_STATUS.EXPIRED
            }
          ],
          sponsoringHistory: []
        },
        linkup: {
          type: PROFILE_TYPE.LINKUP, status: PROFILE_STATUS.ACTIVE,
          data: {
            contactCard: {
              fullName: 'Omar Belhaj',
              title: i18n('Directeur Commercial'),
              company: i18n('AutoPlus'),
              bio: i18n('15 ans dans la distribution automobile en Tunisie.'),
              email: 'omar@autoplus.tn', phone: '+216 73 600 100', whatsapp: '+216 73 600 100',
              website: 'https://autoplus.tn',
              address: 'Route de Sahline, Sousse',
              gpsPosition: { type: 'Point', coordinates: [10.6411, 35.8254] }
            },
            qrConfig: { style: 'rounded', colorForeground: '#DC2626', colorBackground: '#FFFFFF', logoOverlay: true },
            socials: [
              { platform: 'linkedin', url: 'https://linkedin.com/in/omarbelhaj' },
              { platform: 'facebook', url: 'https://facebook.com/autoplus.tn' },
              { platform: 'instagram', url: null }, { platform: 'twitter', url: null },
              { platform: 'youtube', url: 'https://youtube.com/@autoplus.tn' }, { platform: 'tiktok', url: null }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-11-05T10:00:00.000Z',
          lastValidatedAt: '2025-11-05T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 234, views30d: 45, clicksTotal: 18 },
          boostHistory: [], sponsoringHistory: []
        }
      },
      transactions: [
        { id: 't-c-007-1', type: TRANSACTION_TYPE.BOOST, refId: 'b-c-007-0', profileType: PROFILE_TYPE.TRACEUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID, paidAt: '2026-02-15T08:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD, paymentReference: 'MP-20260215-008',
          invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: 'INV-2026-0014',
          createdAt: '2026-02-15T07:55:00.000Z' }
      ],
      rseReceipts: [], rseBadgeStatus: RSE_BADGE_STATUS.NONE,
      registeredAt: '2025-10-22T10:00:00.000Z',
      validatedAt:  '2025-10-23T09:00:00.000Z', validatedBy: 'u-001',
      suspendedAt: null, suspendedReason: null,
      rejectedAt: null, rejectedReason: null, deletedAt: null
    },

    // -----------------------------------------------------------------
    // c-008 — PharmaTN
    //   Type: B2C santé, Tunis
    //   Owner: Nadia Saidi
    //   States: All 3 profiles INCOMPLETE (just registered)
    //   validationStatus: PENDING (initial registration, never validated)
    //   Demo: brand new account awaiting first admin approval
    // -----------------------------------------------------------------
    {
      id: 'c-008',
      slug: 'pharmatn',
      type: COMPANY_TYPE.B2C,
      legalId: 'B11225',
      identityDocumentUrl: SAMPLE_LEGAL_ID_DOC,
      accountEmail: 'nadia@pharmatn.tn',
      country: 'TN',
      accountUser: {
        id: 'u-c-008', firstName: 'Nadia', lastName: 'Saidi',
        phone: '+216 71 999 100', languages: ['fr'],
        auth: { emailVerified: true, emailVerifiedAt: '2026-04-20T14:00:00.000Z',
                passwordHash: DEMO_PASSWORD_HASH, otpCode: null, otpExpiresAt: null }
      },
      liveData: {
        contactEmail: 'contact@pharmatn.tn', phone: '+216 71 999 200',
        whatsapp: '+216 20 999 200',
        address: 'Avenue de la Liberté, Tunis',
        gouvernorat: 'tunis', ville: 'Tunis',
        sectorId: 'sante', languages: ['fr']
      },
      data: {
        displayName: i18n('PharmaTN'),
        logo: logoUrl('PharmaTN', '0EA5E9'),
        banner: bannerUrl('c-008')
      },
      pendingData: null,
      validationStatus: COMPANY_VALIDATION_STATUS.PENDING,
      profiles: {
        brandup: {
          type: PROFILE_TYPE.BRANDUP, status: PROFILE_STATUS.INCOMPLETE,
          data: {
            color: '#0EA5E9',
            links: [], gallery: [],
            projects: [], certifications: [], services: []
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: null, lastValidatedAt: null, lastValidatedBy: null,
          stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
          boostHistory: [], sponsoringHistory: []
        },
        traceup: {
          type: PROFILE_TYPE.TRACEUP, status: PROFILE_STATUS.INCOMPLETE,
          data: { videos: [] },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: null, lastValidatedAt: null, lastValidatedBy: null,
          stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
          boostHistory: [], sponsoringHistory: []
        },
        linkup: {
          type: PROFILE_TYPE.LINKUP, status: PROFILE_STATUS.INCOMPLETE,
          data: {
            contactCard: {
              fullName: '', title: i18nEmpty(), company: i18nEmpty(), bio: i18nEmpty(),
              email: '', phone: '', whatsapp: '',
              website: null, address: '', gpsPosition: null
            },
            qrConfig: { style: 'rounded', colorForeground: '#000000', colorBackground: '#FFFFFF', logoOverlay: false },
            socials: []
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: null, lastValidatedAt: null, lastValidatedBy: null,
          stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
          boostHistory: [], sponsoringHistory: []
        }
      },
      transactions: [],
      rseReceipts: [], rseBadgeStatus: RSE_BADGE_STATUS.NONE,
      registeredAt: '2026-04-20T14:00:00.000Z',
      validatedAt: null, validatedBy: null,
      suspendedAt: null, suspendedReason: null,
      rejectedAt: null, rejectedReason: null, deletedAt: null
    },

    // -----------------------------------------------------------------
    // c-009 — EduPro
    //   Type: B2B formation-pro, Tunis
    //   Owner: Hatem Gharbi
    //   States: BU active+boost+sponsoring · TU active · LU disabled
    //   RSE: 1 receipt validated (SOS Villages d'Enfants)
    //   Demo: simultaneous active boost+sponsoring on BrandUP, disabled LinkUP
    // -----------------------------------------------------------------
    {
      id: 'c-009',
      slug: 'edupro',
      type: COMPANY_TYPE.B2B,
      legalId: 'B44556',
      identityDocumentUrl: SAMPLE_LEGAL_ID_DOC,
      accountEmail: 'hatem@edupro.tn',
      country: 'TN',
      accountUser: {
        id: 'u-c-009', firstName: 'Hatem', lastName: 'Gharbi',
        phone: '+216 71 444 100', languages: ['fr'],
        auth: { emailVerified: true, emailVerifiedAt: '2025-08-05T10:00:00.000Z',
                passwordHash: DEMO_PASSWORD_HASH, otpCode: null, otpExpiresAt: null }
      },
      liveData: {
        contactEmail: 'contact@edupro.tn', phone: '+216 71 444 200',
        whatsapp: '+216 20 444 200',
        address: 'Avenue Mohamed V, Tunis',
        gouvernorat: 'tunis', ville: 'Tunis',
        sectorId: 'formation-pro', languages: ['fr']
      },
      data: {
        displayName: i18n('EduPro Formation'),
        logo: logoUrl('EduPro', '7C3AED'),
        banner: bannerUrl('c-009')
      },
      pendingData: null,
      validationStatus: COMPANY_VALIDATION_STATUS.ACTIVE,
      profiles: {
        brandup: {
          type: PROFILE_TYPE.BRANDUP, status: PROFILE_STATUS.ACTIVE,
          data: {
            pitch: i18n('Centre de formation professionnelle agréé. Formations courtes et longues en management, IT, langues et soft skills. Plus de 5 000 stagiaires formés.'),
            about: i18n('EduPro est un centre de formation professionnelle agréé par l\'État tunisien depuis 2014. Nous proposons un large catalogue de formations en management, IT, langues étrangères et compétences comportementales. Nos formateurs sont des professionnels actifs et notre méthode pédagogique privilégie la mise en pratique.'),
            color: '#7C3AED',
            links: [
              { label: i18n('Catalogue formations'), url: 'https://edupro.tn/catalogue', icon: 'school' },
              { label: i18n('Site web'), url: 'https://edupro.tn', icon: 'language' }
            ],
            gallery: [],
            projects: [
                        { id: 'proj-c-009-1', name: i18n('Formation Management'), image: `https://picsum.photos/seed/c-009-proj-1/600/400`, description: i18n('Cursus complet en management d\'équipe et leadership.'), order: 1 },
                        { id: 'proj-c-009-2', name: i18n('Certification PMP'), image: `https://picsum.photos/seed/c-009-proj-2/600/400`, description: i18n('Préparation à la certification Project Management Professional.'), order: 2 },
                        { id: 'proj-c-009-3', name: i18n('Marketing Digital'), image: `https://picsum.photos/seed/c-009-proj-3/600/400`, description: i18n('Formation SEO, SEA, social media et content marketing.'), order: 3 },
                        { id: 'proj-c-009-4', name: i18n('Excel avancé'), image: `https://picsum.photos/seed/c-009-proj-4/600/400`, description: i18n('Formation tableaux croisés, VBA, Power Query, Power BI.'), order: 4 },
                        { id: 'proj-c-009-5', name: i18n('Ressources Humaines'), image: `https://picsum.photos/seed/c-009-proj-5/600/400`, description: i18n('Recrutement, droit du travail, gestion de la paie.'), order: 5 },
                        { id: 'proj-c-009-6', name: i18n('Finance d\'entreprise'), image: `https://picsum.photos/seed/c-009-proj-6/600/400`, description: i18n('Analyse financière, contrôle de gestion, IFRS.'), order: 6 },
                        { id: 'proj-c-009-7', name: i18n('Soft skills professionnels'), image: `https://picsum.photos/seed/c-009-proj-7/600/400`, description: i18n('Communication, gestion du stress, prise de parole.'), order: 7 },
                        { id: 'proj-c-009-8', name: i18n('Anglais professionnel'), image: `https://picsum.photos/seed/c-009-proj-8/600/400`, description: i18n('Anglais des affaires, TOEIC, IELTS.'), order: 8 },
                        { id: 'proj-c-009-9', name: i18n('Comptabilité tunisienne'), image: `https://picsum.photos/seed/c-009-proj-9/600/400`, description: i18n('Plan comptable tunisien, fiscalité, déclarations sociales.'), order: 9 }
                      ],
            certifications: [
              { id: 'cert-c-009-1', name: 'Agrément CNFCPP', label: i18n('Agrément formation continue Tunisie'), icon: 'verified', image: null, issuedAt: '2014-09-01', expiresAt: null },
              { id: 'cert-c-009-2', name: 'Pearson VUE Test Center', label: i18n('Centre d\'examens Pearson VUE'), icon: 'verified', image: `https://picsum.photos/seed/c-009-cert-pearson/200/200`, issuedAt: '2020-03-15', expiresAt: '2026-03-15' }
            ],
            services: [
              { name: i18n('Formations management') },
              { name: i18n('Formations IT & développement') },
              { name: i18n('Langues étrangères') },
              { name: i18n('Soft skills & leadership') }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-09-01T10:00:00.000Z',
          lastValidatedAt: '2025-09-01T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 3421, views30d: 678, clicksTotal: 198 },
          // Active boost AND active sponsoring on BrandUP simultaneously
          boostHistory: [
            {
              id: 'b-c-009-1',
              from: '2026-04-05T00:00:00.000Z', to: '2026-05-05T23:59:59.000Z',
              durationDays: 30, priceHT: 50, transactionId: 't-c-009-1',
              viewsAdded: 487, clicksAdded: 32,
              status: BOOST_STATUS.ACTIVE
            }
          ],
          sponsoringHistory: [
            {
              id: 's-c-009-1',
              from: '2026-04-18T00:00:00.000Z', to: '2026-04-25T23:59:59.000Z',
              durationDays: 7, priceHT: 100, transactionId: 't-c-009-2',
              targetCategory: 'formation-pro',
              impressions: 2870, clicks: 76,
              status: SPONSORING_STATUS.ACTIVE
            }
          ]
        },
        traceup: {
          type: PROFILE_TYPE.TRACEUP, status: PROFILE_STATUS.ACTIVE,
          data: {
            videos: [
              {
                id: 'v-c-009-1', source: VIDEO_SOURCE.YOUTUBE, videoId: 'V4M_e2wwSUE',
                videoUrl: 'https://www.youtube.com/watch?v=V4M_e2wwSUE',
                thumbnailUrl: ytThumb('V4M_e2wwSUE'),
                category: VIDEO_CATEGORY.ASTUCES,
                title: i18n('5 conseils pour réussir une certification PMP'),
                description: i18n('Notre formateur senior partage ses meilleurs conseils.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2026-02-10T10:00:00.000Z', addedAt: '2026-02-10T09:55:00.000Z'
              },
              {
                id: 'v-c-009-2', source: VIDEO_SOURCE.VIMEO, videoId: '347119375',
                videoUrl: 'https://vimeo.com/347119375',
                thumbnailUrl: vimeoThumb('347119375'),
                category: VIDEO_CATEGORY.ACTUALITE,
                title: i18n('Cérémonie de remise des certifications 2025'),
                description: i18n('Retour sur la cérémonie de remise des certifications 2025.'),
                status: VIDEO_STATUS.ACTIVE,
                publishedAt: '2025-12-20T10:00:00.000Z', addedAt: '2025-12-20T09:55:00.000Z'
              }
            ]
          },
          pendingData: null,
          rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-09-15T10:00:00.000Z',
          lastValidatedAt: '2025-09-15T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 1824, views30d: 234, clicksTotal: 87 },
          boostHistory: [], sponsoringHistory: []
        },
        linkup: {
          type: PROFILE_TYPE.LINKUP, status: PROFILE_STATUS.DISABLED,  // user deactivated
          data: {
            contactCard: {
              fullName: 'Hatem Gharbi',
              title: i18n('Directeur Pédagogique'),
              company: i18n('EduPro Formation'),
              bio: i18n('Passionné par la formation et le développement des compétences.'),
              email: 'hatem@edupro.tn', phone: '+216 71 444 100', whatsapp: '+216 71 444 100',
              website: 'https://edupro.tn',
              address: 'Avenue Mohamed V, Tunis',
              gpsPosition: { type: 'Point', coordinates: [10.1816, 36.8001] }
            },
            qrConfig: { style: 'rounded', colorForeground: '#7C3AED', colorBackground: '#FFFFFF', logoOverlay: true },
            socials: [
              { platform: 'linkedin', url: 'https://linkedin.com/in/hatemgharbi' },
              { platform: 'facebook', url: null }, { platform: 'instagram', url: null },
              { platform: 'twitter', url: null }, { platform: 'youtube', url: null }, { platform: 'tiktok', url: null }
            ]
          },
          pendingData: null, rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-09-01T10:00:00.000Z',
          lastValidatedAt: '2025-09-01T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 156, views30d: 0, clicksTotal: 11 },
          boostHistory: [], sponsoringHistory: []
        }
      },
      transactions: [
        { id: 't-c-009-1', type: TRANSACTION_TYPE.BOOST, refId: 'b-c-009-1', profileType: PROFILE_TYPE.BRANDUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID, paidAt: '2026-04-05T08:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD, paymentReference: 'MP-20260405-009',
          invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: 'INV-2026-0038',
          createdAt: '2026-04-05T07:55:00.000Z' },
        { id: 't-c-009-2', type: TRANSACTION_TYPE.SPONSORING, refId: 's-c-009-1', profileType: PROFILE_TYPE.BRANDUP,
          priceHT: 100, vatRate: 0.19, vatAmount: 19, priceTTC: 119,
          status: TRANSACTION_STATUS.PAID, paidAt: '2026-04-18T09:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD, paymentReference: 'MP-20260418-002',
          invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: 'INV-2026-0044',
          createdAt: '2026-04-18T08:55:00.000Z' }
      ],
      rseReceipts: [
        {
          id: 'r-c-009-1', associationId: 'a-004', associationName: 'SOS Villages d\'Enfants Tunisie',
          amount: 3500, donationDate: '2026-03-05',
          receiptDocumentUrl: SAMPLE_RSE_RECEIPT_DOC,
          status: RSE_RECEIPT_STATUS.VALIDATED,
          submittedAt: '2026-03-05T11:00:00.000Z',
          validatedAt: '2026-03-06T09:00:00.000Z', validatedBy: 'u-001',
          rejectedReason: null
        }
      ],
      rseBadgeStatus: RSE_BADGE_STATUS.VALIDATED,
      registeredAt: '2025-08-05T10:00:00.000Z',
      validatedAt:  '2025-08-06T11:00:00.000Z', validatedBy: 'u-001',
      suspendedAt: null, suspendedReason: null,
      rejectedAt: null, rejectedReason: null, deletedAt: null
    },

    // -----------------------------------------------------------------
    // c-010 — TextilTunis
    //   Type: B2B textile, Monastir
    //   Owner: Ali Ben Amor
    //   States: BU rejected · TU rejected · LU active (only)
    //   LU had EXPIRED boost
    //   1 open dispute (content rejection contested)
    //   Demo: multiple rejections + dispute + residual active profile
    // -----------------------------------------------------------------
    {
      id: 'c-010',
      slug: 'textiltunis',
      type: COMPANY_TYPE.B2B,
      legalId: 'B88990',
      identityDocumentUrl: SAMPLE_LEGAL_ID_DOC,
      accountEmail: 'ali@textiltunis.tn',
      country: 'TN',
      accountUser: {
        id: 'u-c-010', firstName: 'Ali', lastName: 'Ben Amor',
        phone: '+216 73 700 100', languages: ['fr'],
        auth: { emailVerified: true, emailVerifiedAt: '2025-11-08T09:00:00.000Z',
                passwordHash: DEMO_PASSWORD_HASH, otpCode: null, otpExpiresAt: null }
      },
      liveData: {
        contactEmail: 'contact@textiltunis.tn', phone: '+216 73 700 200',
        whatsapp: '+216 20 700 200',
        address: 'Z.I. Ksar Hellal, Monastir',
        gouvernorat: 'monastir', ville: 'Ksar Hellal',
        sectorId: 'textile', languages: ['fr']
      },
      data: {
        displayName: i18n('TextilTunis'),
        logo: logoUrl('TextilTunis', '0891B2'),
        banner: bannerUrl('c-010')
      },
      pendingData: null,
      validationStatus: COMPANY_VALIDATION_STATUS.ACTIVE,
      profiles: {
        brandup: {
          type: PROFILE_TYPE.BRANDUP, status: PROFILE_STATUS.REJECTED,
          data: {
            pitch: i18n('Atelier de confection textile spécialisé dans le prêt-à-porter féminin et la sous-traitance pour marques européennes.'),
            about: i18n('TextilTunis est un atelier de confection installé à Ksar Hellal depuis 2010. Nous travaillons en sous-traitance pour des marques européennes de prêt-à-porter féminin avec une capacité de production de 50 000 pièces/mois.'),
            color: '#0891B2',
            links: [
              { label: i18n('Site web'), url: 'https://textiltunis.tn', icon: 'language' }
            ],
            gallery: [],
            projects: [
                        { id: 'proj-c-010-1', name: i18n('Robe traditionnelle tunisienne'), image: `https://picsum.photos/seed/c-010-proj-1/600/400`, description: i18n('Création de robes traditionnelles brodées main.'), order: 1 },
                        { id: 'proj-c-010-2', name: i18n('Caftan moderne'), image: `https://picsum.photos/seed/c-010-proj-2/600/400`, description: i18n('Caftans contemporains pour cérémonies et soirées.'), order: 2 },
                        { id: 'proj-c-010-3', name: i18n('Linge de maison haut de gamme'), image: `https://picsum.photos/seed/c-010-proj-3/600/400`, description: i18n('Draps, taies, couettes en coton égyptien.'), order: 3 },
                        { id: 'proj-c-010-4', name: i18n('Uniformes professionnels'), image: `https://picsum.photos/seed/c-010-proj-4/600/400`, description: i18n('Tenues sur mesure pour hôtellerie, restauration, santé.'), order: 4 },
                        { id: 'proj-c-010-5', name: i18n('Vêtements enfant'), image: `https://picsum.photos/seed/c-010-proj-5/600/400`, description: i18n('Layette et prêt-à-porter enfant 0-12 ans.'), order: 5 },
                        { id: 'proj-c-010-6', name: i18n('Nappes brodées'), image: `https://picsum.photos/seed/c-010-proj-6/600/400`, description: i18n('Nappes traditionnelles pour table et événements.'), order: 6 },
                        { id: 'proj-c-010-7', name: i18n('Étoles et foulards'), image: `https://picsum.photos/seed/c-010-proj-7/600/400`, description: i18n('Foulards en soie naturelle imprimés à la main.'), order: 7 },
                        { id: 'proj-c-010-8', name: i18n('Coussins décoratifs'), image: `https://picsum.photos/seed/c-010-proj-8/600/400`, description: i18n('Coussins ethniques tissés et brodés.'), order: 8 },
                        { id: 'proj-c-010-9', name: i18n('Sacs en textile'), image: `https://picsum.photos/seed/c-010-proj-9/600/400`, description: i18n('Sacs cabas, pochettes et accessoires en tissus locaux.'), order: 9 }
                      ], certifications: [],
            services: [
              { name: i18n('Confection prêt-à-porter') },
              { name: i18n('Sous-traitance Europe') }
            ]
          },
          pendingData: null,
          rejectionReason: 'Le pitch contient des affirmations commerciales non vérifiables (capacité 50 000 pièces/mois). Veuillez préciser les sources ou retirer cette mention.',
          rejectedAt: '2026-04-08T10:00:00.000Z', rejectedBy: 'u-001',
          publishedAt: null, lastValidatedAt: null, lastValidatedBy: null,
          stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
          boostHistory: [], sponsoringHistory: []
        },
        traceup: {
          type: PROFILE_TYPE.TRACEUP, status: PROFILE_STATUS.REJECTED,
          data: {
            videos: [
              {
                id: 'v-c-010-1', source: VIDEO_SOURCE.YOUTUBE, videoId: 'gPp-ckcBwfA',
                videoUrl: 'https://www.youtube.com/watch?v=gPp-ckcBwfA',
                thumbnailUrl: ytThumb('gPp-ckcBwfA'),
                category: VIDEO_CATEGORY.ACTUALITE,
                title: i18n('Visite atelier TextilTunis'),
                description: i18n('Visite guidée de notre atelier de confection.'),
                status: VIDEO_STATUS.PENDING,
                publishedAt: null, addedAt: '2026-04-05T09:55:00.000Z'
              }
            ]
          },
          pendingData: null,
          rejectionReason: 'Vidéo refusée : la qualité d\'image est trop basse pour une publication publique. Veuillez fournir une vidéo HD (minimum 720p).',
          rejectedAt: '2026-04-09T11:00:00.000Z', rejectedBy: 'u-001',
          publishedAt: null, lastValidatedAt: null, lastValidatedBy: null,
          stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
          boostHistory: [], sponsoringHistory: []
        },
        linkup: {
          type: PROFILE_TYPE.LINKUP, status: PROFILE_STATUS.ACTIVE,
          data: {
            contactCard: {
              fullName: 'Ali Ben Amor',
              title: i18n('Gérant'),
              company: i18n('TextilTunis'),
              bio: i18n('25 ans d\'expérience dans le textile tunisien.'),
              email: 'ali@textiltunis.tn', phone: '+216 73 700 100', whatsapp: '+216 73 700 100',
              website: 'https://textiltunis.tn',
              address: 'Z.I. Ksar Hellal, Monastir',
              gpsPosition: { type: 'Point', coordinates: [10.8917, 35.6483] }
            },
            qrConfig: { style: 'rounded', colorForeground: '#0891B2', colorBackground: '#FFFFFF', logoOverlay: true },
            socials: [
              { platform: 'linkedin', url: 'https://linkedin.com/in/alibenamor' },
              { platform: 'facebook', url: null }, { platform: 'instagram', url: null },
              { platform: 'twitter', url: null }, { platform: 'youtube', url: null }, { platform: 'tiktok', url: null }
            ]
          },
          // pendingData : TextilTunis renouvelle le titre de son contact LinkUP
          pendingData: {
            submittedAt: '2026-04-23T17:45:00.000Z',
            note: i18n('Mise à jour suite à la prise de fonction comme PDG.'),
            fields: [
              { key: 'title',    label: 'Titre du contact',  currentValue: 'Gérant',                                                            newValue: 'Président Directeur Général' },
              { key: 'bio',      label: 'Biographie',         currentValue: '25 ans d\'expérience dans le textile tunisien.',                    newValue: '25 ans d\'expérience dans le textile tunisien. PDG depuis 2026 — pilotage de la transformation export du groupe.' },
              { key: 'whatsapp', label: 'WhatsApp',           currentValue: '+216 73 700 100',                                                  newValue: '+216 98 700 100' }
            ]
          },
          rejectionReason: null, rejectedAt: null, rejectedBy: null,
          publishedAt: '2025-12-01T10:00:00.000Z',
          lastValidatedAt: '2025-12-01T10:00:00.000Z', lastValidatedBy: 'u-001',
          stats: { viewsTotal: 167, views30d: 28, clicksTotal: 9 },
          // Past expired boost on LinkUP
          boostHistory: [
            {
              id: 'b-c-010-0',
              from: '2026-01-15T00:00:00.000Z', to: '2026-02-14T23:59:59.000Z',
              durationDays: 30, priceHT: 50, transactionId: 't-c-010-1',
              viewsAdded: 78, clicksAdded: 5,
              status: BOOST_STATUS.EXPIRED
            }
          ],
          sponsoringHistory: []
        }
      },
      transactions: [
        { id: 't-c-010-1', type: TRANSACTION_TYPE.BOOST, refId: 'b-c-010-0', profileType: PROFILE_TYPE.LINKUP,
          priceHT: 50, vatRate: 0.19, vatAmount: 9.5, priceTTC: 59.5,
          status: TRANSACTION_STATUS.PAID, paidAt: '2026-01-15T08:00:00.000Z',
          paymentMethod: PAYMENT_METHOD.CARD, paymentReference: 'MP-20260115-010',
          invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: 'INV-2026-0002',
          createdAt: '2026-01-15T07:55:00.000Z' }
      ],
      rseReceipts: [], rseBadgeStatus: RSE_BADGE_STATUS.NONE,
      registeredAt: '2025-11-08T09:00:00.000Z',
      validatedAt:  '2025-11-09T10:00:00.000Z', validatedBy: 'u-001',
      suspendedAt: null, suspendedReason: null,
      rejectedAt: null, rejectedReason: null, deletedAt: null
    }

    // c-011 to c-020 — could be added later for matrix completeness

  ];

  // =======================================================================
  // DISPUTES (cross-company collection)
  //   - d-001: c-005 FoodCorner — billing dispute (refunded boost double-billing)
  //   - d-002: c-010 TextilTunis — content dispute (BrandUP rejection contested)
  // =======================================================================

  const DISPUTES = [
    {
      id: 'd-001',
      companyId: 'c-005',
      companyName: 'FoodCorner — Cuisine Tunisienne',
      type: DISPUTE_TYPE.BILLING,
      priority: DISPUTE_PRIORITY.HIGH,
      status: DISPUTE_STATUS.INVESTIGATING,
      subject: i18n('Facturation en double — Boost BrandUP mars 2026'),
      description: i18n('Le client signale que le boost BrandUP de mars 2026 a été facturé deux fois (transaction t-c-005-2). Demande de remboursement et levée de la suspension du compte.'),
      relatedTransactionIds: ['t-c-005-2'],
      relatedReceiptIds: [],
      messages: [
        {
          id: 'msg-d-001-1',
          author: 'company',
          authorId: 'u-c-005',
          authorName: 'Mehdi Trabelsi',
          content: i18n('Bonjour, j\'ai été facturé deux fois pour le boost BrandUP de mars. Merci de procéder au remboursement.'),
          createdAt: '2026-03-20T10:00:00.000Z'
        },
        {
          id: 'msg-d-001-2',
          author: 'admin',
          authorId: 'u-001',
          authorName: 'Bassem Admin',
          content: i18n('Bonjour Mehdi, nous vérifions vos transactions et revenons vers vous sous 24h.'),
          createdAt: '2026-03-20T14:00:00.000Z'
        },
        {
          id: 'msg-d-001-3',
          author: 'admin',
          authorId: 'u-001',
          authorName: 'Bassem Admin',
          content: i18n('Le remboursement de la transaction t-c-005-2 a été effectué. Concernant la suspension du compte, elle est maintenue le temps de finaliser le dossier.'),
          createdAt: '2026-03-22T09:30:00.000Z'
        }
      ],
      openedAt: '2026-03-20T10:00:00.000Z',
      lastActivityAt: '2026-03-22T09:30:00.000Z',
      assignedTo: 'u-001',
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: null
    },
    {
      id: 'd-002',
      companyId: 'c-010',
      companyName: 'TextilTunis',
      type: DISPUTE_TYPE.CONTENT,
      priority: DISPUTE_PRIORITY.MEDIUM,
      status: DISPUTE_STATUS.OPEN,
      subject: i18n('Contestation refus profil BrandUP'),
      description: i18n('Le client conteste le refus de son profil BrandUP. Il affirme que la capacité de production de 50 000 pièces/mois est documentée et propose de fournir des justificatifs.'),
      relatedTransactionIds: [],
      relatedReceiptIds: [],
      messages: [
        {
          id: 'msg-d-002-1',
          author: 'company',
          authorId: 'u-c-010',
          authorName: 'Ali Ben Amor',
          content: i18n('Bonjour, je conteste le refus de mon profil BrandUP. La capacité que je mentionne est réelle et documentée par nos rapports d\'activité 2024 et 2025. Je peux fournir les pièces justificatives.'),
          createdAt: '2026-04-12T11:00:00.000Z'
        }
      ],
      openedAt: '2026-04-12T11:00:00.000Z',
      lastActivityAt: '2026-04-12T11:00:00.000Z',
      assignedTo: null,
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: null
    }
  ];

  // =======================================================================
  // NOTIFICATIONS (cross-recipient collection)
  //   3 canonical unread notifications for c-001 (TechnoFab) — match topbar bell.
  //   See PROJET_CLAUDE_TRANSFERT.md "Cloche topbar canon" for the spec.
  // =======================================================================

  const NOTIFICATIONS = [
    // -------- c-001 TechnoFab — 3 unread canonical --------
    {
      id: 'n-001',
      recipientType: 'company',
      recipientId: 'c-001',
      type: 'boost_expiring',
      icon: 'trending_up',
      color: 'primary',
      title: i18n('Votre boost LinkUP'),
      body:  i18n('expire dans 3 jours'),
      actionUrl: '/dashboard/boost',
      read: false,
      createdAt: '2026-04-19T10:00:00.000Z',
      readAt: null
    },
    {
      id: 'n-002',
      recipientType: 'company',
      recipientId: 'c-001',
      type: 'sponsoring_metrics',
      icon: 'campaign',
      color: 'primary',
      title: i18n('Votre campagne Sponsoring'),
      body:  i18n('a généré 1\u00A0250 impressions'),
      actionUrl: '/dashboard/sponsoring',
      read: false,
      createdAt: '2026-04-21T14:00:00.000Z',
      readAt: null
    },
    {
      id: 'n-003',
      recipientType: 'company',
      recipientId: 'c-001',
      type: 'rse_receipt_submitted',
      icon: 'volunteer_activism',
      color: 'gold',
      title: i18n('Reçu RSE soumis'),
      body:  i18n('Association Al Ahed en attente de validation'),
      actionUrl: '/dashboard/rse',
      read: false,
      createdAt: '2026-04-18T11:05:00.000Z',
      readAt: null
    },
    // -------- c-001 TechnoFab — older read notifications --------
    {
      id: 'n-004',
      recipientType: 'company',
      recipientId: 'c-001',
      type: 'profile_rejected',
      icon: 'cancel',
      color: 'danger',
      title: i18n('Profil BrandUP refusé'),
      body:  i18n('Pitch non conforme à la charte de décence'),
      actionUrl: '/dashboard/brandup',
      read: true,
      createdAt: '2026-03-15T11:05:00.000Z',
      readAt: '2026-03-15T15:30:00.000Z'
    },
    {
      id: 'n-005',
      recipientType: 'company',
      recipientId: 'c-001',
      type: 'rse_receipt_validated',
      icon: 'verified',
      color: 'success',
      title: i18n('Don RSE validé'),
      body:  i18n('Tunisie Verte — 4\u00A0000 DT'),
      actionUrl: '/dashboard/rse',
      read: true,
      createdAt: '2026-01-13T09:35:00.000Z',
      readAt: '2026-01-13T10:00:00.000Z'
    },
    {
      id: 'n-006',
      recipientType: 'company',
      recipientId: 'c-001',
      type: 'account_validated',
      icon: 'how_to_reg',
      color: 'success',
      title: i18n('Compte validé'),
      body:  i18n('Bienvenue sur MARKET-UP'),
      actionUrl: '/dashboard',
      read: true,
      createdAt: '2026-01-16T10:00:00.000Z',
      readAt: '2026-01-16T10:15:00.000Z'
    },

    // -------- Admin notifications (for u-001 Bassem) --------
    {
      id: 'n-101',
      recipientType: 'admin',
      recipientId: 'u-001',
      type: 'profile_submitted',
      icon: 'upload',
      color: 'primary',
      title: i18n('Nouveau profil TraceUP soumis'),
      body:  i18n('TechnoFab Industries — en attente de validation'),
      actionUrl: '/admin/validation/profils',
      read: false,
      createdAt: '2026-04-18T16:00:00.000Z',
      readAt: null
    },
    {
      id: 'n-102',
      recipientType: 'admin',
      recipientId: 'u-001',
      type: 'rse_receipt_submitted',
      icon: 'volunteer_activism',
      color: 'gold',
      title: i18n('Nouveau reçu RSE'),
      body:  i18n('TechnoFab — Al Ahed — 5\u00A0200 DT'),
      actionUrl: '/admin/validation/rse',
      read: false,
      createdAt: '2026-04-18T11:00:00.000Z',
      readAt: null
    },
    {
      id: 'n-103',
      recipientType: 'admin',
      recipientId: 'u-001',
      type: 'company_pending_validation',
      icon: 'how_to_reg',
      color: 'primary',
      title: i18n('Nouveau compte à valider'),
      body:  i18n('PharmaTN — inscription du 20 avril'),
      actionUrl: '/admin/validation/comptes',
      read: false,
      createdAt: '2026-04-20T14:00:00.000Z',
      readAt: null
    },
    {
      id: 'n-104',
      recipientType: 'admin',
      recipientId: 'u-001',
      type: 'company_pending_modification',
      icon: 'edit',
      color: 'primary',
      title: i18n('Modification compte à valider'),
      body:  i18n('BuildTech — nouvelle bannière soumise'),
      actionUrl: '/admin/validation/comptes',
      read: false,
      createdAt: '2026-04-19T15:00:00.000Z',
      readAt: null
    },
    {
      id: 'n-105',
      recipientType: 'admin',
      recipientId: 'u-001',
      type: 'company_pending_modification',
      icon: 'edit',
      color: 'primary',
      title: i18n('Modification compte à valider'),
      body:  i18n('ArchStudio — nouveau logo soumis'),
      actionUrl: '/admin/validation/comptes',
      read: false,
      createdAt: '2026-04-15T14:00:00.000Z',
      readAt: null
    },
    {
      id: 'n-106',
      recipientType: 'admin',
      recipientId: 'u-001',
      type: 'dispute_opened',
      icon: 'gavel',
      color: 'danger',
      title: i18n('Nouveau litige ouvert'),
      body:  i18n('TextilTunis — contestation refus BrandUP'),
      actionUrl: '/admin/litiges',
      read: false,
      createdAt: '2026-04-12T11:00:00.000Z',
      readAt: null
    },
    // -------- Notifications c-003 GreenLife --------
    {
      id: 'n-201',
      recipientType: 'company',
      recipientId: 'c-003',
      type: 'boost_started',
      icon: 'trending_up',
      color: 'success',
      title: i18n('Boost activé'),
      body:  i18n('Votre boost BrandUP est actif jusqu\'au 1er mai'),
      actionUrl: '/dashboard/boost',
      read: true,
      createdAt: '2026-04-01T08:05:00.000Z',
      readAt: '2026-04-01T09:00:00.000Z'
    },
    // -------- Notifications c-005 FoodCorner --------
    {
      id: 'n-301',
      recipientType: 'company',
      recipientId: 'c-005',
      type: 'account_suspended',
      icon: 'block',
      color: 'danger',
      title: i18n('Compte suspendu'),
      body:  i18n('Suite au litige de facturation — contactez le support'),
      actionUrl: '/dashboard/litiges',
      read: false,
      createdAt: '2026-04-01T10:00:00.000Z',
      readAt: null
    },
    // -------- Notifications c-010 TextilTunis --------
    {
      id: 'n-401',
      recipientType: 'company',
      recipientId: 'c-010',
      type: 'profile_rejected',
      icon: 'cancel',
      color: 'danger',
      title: i18n('Profil BrandUP refusé'),
      body:  i18n('Affirmations commerciales non vérifiables'),
      actionUrl: '/dashboard/brandup',
      read: true,
      createdAt: '2026-04-08T10:05:00.000Z',
      readAt: '2026-04-08T15:00:00.000Z'
    },
    {
      id: 'n-402',
      recipientType: 'company',
      recipientId: 'c-010',
      type: 'profile_rejected',
      icon: 'cancel',
      color: 'danger',
      title: i18n('Profil TraceUP refusé'),
      body:  i18n('Qualité d\'image insuffisante'),
      actionUrl: '/dashboard/traceup',
      read: true,
      createdAt: '2026-04-09T11:05:00.000Z',
      readAt: '2026-04-09T16:00:00.000Z'
    }
  ];

  // =======================================================================
  // KPIs GLOBAL (snapshot — used by admin dashboard overview cards)
  //   Computed from the 10 companies above. Can be re-derived at runtime via
  //   MARKETUP_HELPERS.getKpiSnapshot() — kept here for fast initial render.
  // =======================================================================

  const KPIS_GLOBAL = {
    companiesTotal:        10,
    companiesActive:       6,
    companiesPending:      3,    // c-004 (modif), c-006 (modif), c-008 (initial)
    companiesSuspended:    1,    // c-005
    companiesRejected:     0,
    monthlyRevenueHT:      300,  // April 2026 paid transactions (c-001×150 + c-003×50 + c-009×150)
    monthlyRevenueTTC:     357,
    yearRevenueHT:         1150, // total paid 2026 to date
    yearRevenueTTC:        1368.50,
    rseDonationsValidated: 16500, // c-001 (7200) + c-003 (1500) + c-006 (4300) + c-009 (3500)
    rseReceiptsPending:    1,    // c-001 Al Ahed
    profilesPendingCount:  1,    // c-001 TraceUP first submission
    disputesOpenCount:     2,    // d-001 (c-005 investigating) + d-002 (c-010 open)
    notificationsTotal:    16,
    adminUnreadNotifications: 6
  };

  // =======================================================================
  // EXPOSE TO WINDOW
  // =======================================================================

  window.MARKETUP_DATA = {
    _meta: {
      version: '1.0',
      schemaUpdatedAt: '2026-04-22T00:00:00.000Z',
      demoAdminId: 'u-001',
      currentUserCompanyId: 'c-001',
      demoPasswordPlain: 'Demo1234!',  // dev-only, never expose in prod
      now: NOW
    },
    companies:        COMPANIES,
    disputes:         DISPUTES,
    notifications:    NOTIFICATIONS,
    adminUsers:       ADMIN_USERS,
    sectorsB2B:       SECTORS_B2B,
    categoriesB2C:    CATEGORIES_B2C,
    gouvernorats:     GOUVERNORATS,
    associations:     ASSOCIATIONS,
    platformSettings: PLATFORM_SETTINGS,
    kpisGlobal:       KPIS_GLOBAL,
    // Status enums exposed for use in components
    enums: {
      COMPANY_VALIDATION_STATUS,
      PROFILE_STATUS,
      PROFILE_TYPE,
      VIDEO_STATUS,
      VIDEO_SOURCE,
      VIDEO_CATEGORY,
      BOOST_STATUS,
      SPONSORING_STATUS,
      TRANSACTION_TYPE,
      TRANSACTION_STATUS,
      PAYMENT_METHOD,
      RSE_RECEIPT_STATUS,
      RSE_BADGE_STATUS,
      DISPUTE_TYPE,
      DISPUTE_STATUS,
      DISPUTE_PRIORITY,
      COMPANY_TYPE,
      ADMIN_ROLE
    }
  };

  // =======================================================================
  // HELPERS — read-only, pure functions
  // =======================================================================

  const D = window.MARKETUP_DATA;

  window.MARKETUP_HELPERS = {
    // -------- Lookups --------

    /** @returns {Object|null} */
    getCompanyBySlug(slug) {
      return D.companies.find(c => c.slug === slug) || null;
    },

    /** @returns {Object|null} */
    getCompanyById(id) {
      return D.companies.find(c => c.id === id) || null;
    },

    /** @returns {Object|null} The company associated with the demo "logged" user (TechnoFab by default). */
    getCurrentUserCompany() {
      return this.getCompanyById(D._meta.currentUserCompanyId);
    },

    /** @returns {Object|null} */
    getSectorBySlug(slug) {
      return D.sectorsB2B.find(s => s.slug === slug) || null;
    },

    /** @returns {Object|null} */
    getCategoryBySlug(slug) {
      return D.categoriesB2C.find(c => c.slug === slug) || null;
    },

    /** @returns {Object|null} */
    getGouvernoratBySlug(slug) {
      return D.gouvernorats.find(g => g.slug === slug) || null;
    },

    /** @returns {Object|null} */
    getAssociationById(id) {
      return D.associations.find(a => a.id === id) || null;
    },

    /** @returns {Object|null} */
    getAdminById(id) {
      return D.adminUsers.find(a => a.id === id) || null;
    },

    // -------- Visibility (computed at read-time, never stored) --------

    /**
     * Determines if a profile is visible to the public.
     * Implements cascade rules from SEED_ARCHITECTURE.md §10.1.
     *
     * @param {Object} company - the company document
     * @param {string} profileType - 'brandup' | 'traceup' | 'linkup'
     * @returns {boolean}
     */
    isProfileVisible(company, profileType) {
      if (!company) return false;
      if (company.validationStatus !== COMPANY_VALIDATION_STATUS.ACTIVE) return false;
      if (company.pendingData) return false;
      if (company.deletedAt) return false;

      const profile = company.profiles && company.profiles[profileType];
      if (!profile) return false;
      if (profile.status !== PROFILE_STATUS.ACTIVE) return false;
      if (profile.pendingData) return false;

      return true;
    },

    /** @returns {Object[]} Companies whose given profile type is publicly visible. */
    getVisibleProfiles(profileType) {
      return D.companies.filter(c => this.isProfileVisible(c, profileType));
    },

    // -------- Filters --------

    filterByGouvernorat(companies, gouvernoratSlug) {
      return companies.filter(c => c.liveData.gouvernorat === gouvernoratSlug);
    },

    filterBySector(companies, sectorSlug) {
      return companies.filter(c => c.liveData.sectorId === sectorSlug);
    },

    filterByCompanyType(companies, type) {
      return companies.filter(c => c.type === type);
    },

    // -------- Computed boost / sponsoring --------

    /** @returns {Object|null} The currently-active boost on a profile, or null. */
    getActiveBoost(profile) {
      if (!profile || !profile.boostHistory) return null;
      const now = new Date(D._meta.now);
      return profile.boostHistory.find(b => {
        return new Date(b.from) <= now && now <= new Date(b.to) && b.status === BOOST_STATUS.ACTIVE;
      }) || null;
    },

    /** @returns {Object|null} */
    getActiveSponsoring(profile) {
      if (!profile || !profile.sponsoringHistory) return null;
      const now = new Date(D._meta.now);
      return profile.sponsoringHistory.find(s => {
        return new Date(s.from) <= now && now <= new Date(s.to) && s.status === SPONSORING_STATUS.ACTIVE;
      }) || null;
    },

    hasActiveBoost(profile) {
      return this.getActiveBoost(profile) !== null;
    },

    hasActiveSponsoring(profile) {
      return this.getActiveSponsoring(profile) !== null;
    },

    // -------- Money formatting --------

    /** @returns {number} */
    computeTTC(priceHT, vatRate) {
      const rate = (typeof vatRate === 'number') ? vatRate : D.platformSettings.pricing.vatRate;
      return priceHT * (1 + rate);
    },

    /** @returns {number} */
    computeVATAmount(priceHT, vatRate) {
      const rate = (typeof vatRate === 'number') ? vatRate : D.platformSettings.pricing.vatRate;
      return priceHT * rate;
    },

    /** @returns {string} e.g. "50,00 DT HT" */
    formatMoneyHT(price) {
      return `${price.toFixed(2).replace('.', ',')} DT HT`;
    },

    /** @returns {string} e.g. "59,50 DT TTC" */
    formatMoneyTTC(price, vatRate) {
      return `${this.computeTTC(price, vatRate).toFixed(2).replace('.', ',')} DT TTC`;
    },

    /** @returns {string} Plain number formatted French-style with non-breaking space thousands separator. */
    formatNumber(n) {
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
    },

    // -------- Aggregations for admin --------

    getCompaniesByValidationStatus(status) {
      return D.companies.filter(c => c.validationStatus === status);
    },

    /** @returns {number} Number of RSE receipts pending across all companies. */
    getRsePendingCount() {
      return D.companies.reduce((sum, c) =>
        sum + (c.rseReceipts || []).filter(r => r.status === RSE_RECEIPT_STATUS.PENDING).length, 0
      );
    },

    /** @returns {number} Number of profile-level submissions pending admin review. */
    getProfilesPendingCount() {
      let count = 0;
      D.companies.forEach(c => {
        if (!c.profiles) return;
        ['brandup', 'traceup', 'linkup'].forEach(type => {
          const p = c.profiles[type];
          if (!p) return;
          // First-time submission (incomplete → pending) OR modifs pending
          if (p.status === PROFILE_STATUS.PENDING || p.pendingData) count++;
        });
      });
      return count;
    },

    /** @returns {number} Number of company-level pendings (initial registration OR modif review). */
    getCompanyPendingCount() {
      return D.companies.filter(c =>
        c.validationStatus === COMPANY_VALIDATION_STATUS.PENDING
      ).length;
    },

    /** @returns {Object} KPI snapshot computed from current data. */
    getKpiSnapshot() {
      const companies = D.companies;
      const totalRevenueHT = companies.reduce((sum, c) =>
        sum + (c.transactions || [])
          .filter(t => t.status === TRANSACTION_STATUS.PAID)
          .reduce((s, t) => s + t.priceHT, 0), 0
      );
      const validatedDonations = companies.reduce((sum, c) =>
        sum + (c.rseReceipts || [])
          .filter(r => r.status === RSE_RECEIPT_STATUS.VALIDATED)
          .reduce((s, r) => s + r.amount, 0), 0
      );

      return {
        companiesTotal:     companies.length,
        companiesActive:    companies.filter(c => c.validationStatus === 'active').length,
        companiesPending:   companies.filter(c => c.validationStatus === 'pending').length,
        companiesSuspended: companies.filter(c => c.validationStatus === 'suspended').length,
        companiesRejected:  companies.filter(c => c.validationStatus === 'rejected').length,
        totalRevenueHT,
        totalRevenueTTC:    totalRevenueHT * (1 + D.platformSettings.pricing.vatRate),
        rseDonationsValidated: validatedDonations,
        rsePendingCount:    this.getRsePendingCount(),
        profilesPendingCount: this.getProfilesPendingCount()
      };
    },

    // -------- Notifications --------

    /** @returns {Object[]} Notifications targeting a specific recipient. */
    getNotificationsFor(recipientType, recipientId) {
      return D.notifications.filter(n =>
        n.recipientType === recipientType && n.recipientId === recipientId
      );
    },

    /** @returns {number} Unread notifications count for recipient. */
    getUnreadNotificationsCount(recipientType, recipientId) {
      return this.getNotificationsFor(recipientType, recipientId).filter(n => !n.read).length;
    }
  };

})();
