import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';

function loadLocalEnvironment() {
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match && !process.env[match[1]])
          process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      }
    } catch {}
  }
}

loadLocalEnvironment();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret)
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before seeding.');
const db = createClient(url, secret, {auth: {persistSession: false, autoRefreshToken: false}});

const bilingual = (en, ar) => ({en, ar});
const categories = [
  ['games', null, 'Game top-ups', 'شحن الألعاب', 'Gamepad2', 10],
  ['mobile-games', 'games', 'Mobile games', 'ألعاب الهاتف', 'Smartphone', 10],
  ['battle-royale', 'mobile-games', 'Battle royale', 'ألعاب الباتل رويال', 'Crosshair', 10],
  ['subscriptions', null, 'Subscriptions', 'الاشتراكات', 'PlaySquare', 20],
  ['entertainment', 'subscriptions', 'Entertainment', 'الترفيه', 'Clapperboard', 10],
  ['productivity', 'subscriptions', 'Productivity', 'الإنتاجية', 'Sparkles', 20],
  ['gift-cards', null, 'Gift cards', 'بطاقات الهدايا', 'Gift', 30],
  ['gaming-credit', 'gift-cards', 'Gaming credit', 'رصيد الألعاب', 'Gamepad2', 10],
  ['shopping-credit', 'gift-cards', 'Shopping credit', 'رصيد التسوق', 'ShoppingBag', 20],
  ['social-growth', null, 'Social growth', 'نمو التواصل الاجتماعي', 'TrendingUp', 40],
  ['social-platforms', 'social-growth', 'Social platforms', 'منصات التواصل', 'Users', 10],
  ['digital-services', null, 'Digital services', 'الخدمات الرقمية', 'BriefcaseBusiness', 50],
  [
    'creative-services',
    'digital-services',
    'Creative services',
    'الخدمات الإبداعية',
    'Palette',
    10
  ],
  ['technical-services', 'digital-services', 'Technical services', 'الخدمات التقنية', 'Code2', 20]
];

const data = {
  topup: [
    ['pubg-mobile-uc', 'PUBG Mobile UC', 'شدات ببجي موبايل'],
    ['free-fire-diamonds', 'Free Fire Diamonds', 'جواهر فري فاير'],
    ['mobile-legends-diamonds', 'Mobile Legends Diamonds', 'جواهر موبايل ليجندز'],
    ['roblox-robux', 'Roblox Robux', 'روبلوكس روبوكس'],
    ['fortnite-v-bucks', 'Fortnite V-Bucks', 'فورتنايت في باكس'],
    ['valorant-points', 'Valorant Points', 'نقاط فالورانت'],
    ['league-of-legends-rp', 'League of Legends RP', 'نقاط ليج أوف ليجندز'],
    ['call-of-duty-mobile-cp', 'Call of Duty Mobile CP', 'نقاط كول أوف ديوتي موبايل'],
    ['genshin-impact-crystals', 'Genshin Impact Crystals', 'كريستالات جينشن إمباكت'],
    ['honor-of-kings-tokens', 'Honor of Kings Tokens', 'توكنز هونر أوف كينغز'],
    ['brawl-stars-gems', 'Brawl Stars Gems', 'جواهر براول ستارز'],
    ['ea-fc-mobile-points', 'EA FC Mobile Points', 'نقاط إي أي إف سي موبايل']
  ],
  subscription: [
    ['netflix-premium', 'Netflix Premium', 'نتفلكس بريميوم'],
    ['spotify-premium', 'Spotify Premium', 'سبوتيفاي بريميوم'],
    ['shahid-vip', 'Shahid VIP', 'شاهد VIP'],
    ['youtube-premium', 'YouTube Premium', 'يوتيوب بريميوم'],
    ['chatgpt-plus', 'ChatGPT Plus', 'شات جي بي تي بلس'],
    ['disney-plus', 'Disney+', 'ديزني بلس'],
    ['osn-plus', 'OSN+', 'أو إس إن بلس'],
    ['canva-pro', 'Canva Pro', 'كانفا برو'],
    ['microsoft-365', 'Microsoft 365', 'مايكروسوفت 365'],
    ['adobe-creative-cloud', 'Adobe Creative Cloud', 'أدوبي كريتيف كلاود'],
    ['crunchyroll-premium', 'Crunchyroll Premium', 'كرانشي رول بريميوم'],
    ['xbox-game-pass', 'Xbox Game Pass', 'إكس بوكس جيم باس']
  ],
  giftcard: [
    ['apple-gift-card-us', 'Apple Gift Card US', 'بطاقة آبل أمريكية'],
    ['google-play-gift-card-us', 'Google Play US', 'بطاقة جوجل بلاي أمريكية'],
    ['playstation-store-us', 'PlayStation Store US', 'بلايستيشن ستور أمريكي'],
    ['steam-wallet-usd', 'Steam Wallet USD', 'ستيم والت دولار'],
    ['amazon-us-gift-card', 'Amazon US Gift Card', 'بطاقة أمازون أمريكية'],
    ['xbox-gift-card-us', 'Xbox Gift Card US', 'بطاقة إكس بوكس أمريكية'],
    ['nintendo-eshop-us', 'Nintendo eShop US', 'نينتندو إي شوب أمريكي'],
    ['razer-gold-usd', 'Razer Gold USD', 'رايزر جولد دولار'],
    ['playstation-store-uae', 'PlayStation Store UAE', 'بلايستيشن ستور إماراتي'],
    ['apple-gift-card-uae', 'Apple Gift Card UAE', 'بطاقة آبل إماراتية'],
    ['steam-wallet-eur', 'Steam Wallet EUR', 'ستيم والت يورو'],
    ['amazon-uae-gift-card', 'Amazon UAE Gift Card', 'بطاقة أمازون الإمارات']
  ],
  smm: [
    ['instagram-followers', 'Instagram Followers', 'متابعو إنستغرام'],
    ['instagram-likes', 'Instagram Likes', 'إعجابات إنستغرام'],
    ['instagram-reel-views', 'Instagram Reel Views', 'مشاهدات ريلز إنستغرام'],
    ['tiktok-followers', 'TikTok Followers', 'متابعو تيك توك'],
    ['tiktok-likes', 'TikTok Likes', 'إعجابات تيك توك'],
    ['tiktok-video-views', 'TikTok Video Views', 'مشاهدات تيك توك'],
    ['youtube-subscribers', 'YouTube Subscribers', 'مشتركو يوتيوب'],
    ['youtube-video-views', 'YouTube Video Views', 'مشاهدات يوتيوب'],
    ['youtube-watch-hours', 'YouTube Watch Hours', 'ساعات مشاهدة يوتيوب'],
    ['facebook-page-followers', 'Facebook Page Followers', 'متابعو صفحة فيسبوك'],
    ['telegram-channel-members', 'Telegram Channel Members', 'أعضاء قناة تيليغرام'],
    ['x-post-impressions', 'X Post Impressions', 'مشاهدات منشور إكس']
  ],
  service: [
    ['logo-identity-sprint', 'Logo Identity Sprint', 'تصميم هوية وشعار'],
    ['social-media-design-pack', 'Social Media Design Pack', 'باقة تصاميم تواصل اجتماعي'],
    ['landing-page-design', 'Landing Page Design', 'تصميم صفحة هبوط'],
    ['nextjs-website-build', 'Next.js Website Build', 'برمجة موقع Next.js'],
    ['ecommerce-setup', 'E-commerce Store Setup', 'إعداد متجر إلكتروني'],
    ['mobile-app-ui-design', 'Mobile App UI Design', 'تصميم واجهة تطبيق'],
    ['short-video-editing', 'Short Video Editing', 'مونتاج فيديو قصير'],
    ['youtube-video-editing', 'YouTube Video Editing', 'مونتاج فيديو يوتيوب'],
    ['arabic-copywriting', 'Arabic Copywriting', 'كتابة محتوى عربي'],
    ['seo-article-pack', 'SEO Article Pack', 'باقة مقالات SEO'],
    ['website-speed-audit', 'Website Speed Audit', 'تدقيق سرعة الموقع'],
    ['automation-consultation', 'Business Automation Consultation', 'استشارة أتمتة الأعمال']
  ]
};

async function one(table, key, value) {
  const {data: row, error} = await db
    .from(table)
    .select('id')
    .eq(key, value)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return row;
}

async function upsertSoft(table, key, payload) {
  const existing = await one(table, key, payload[key]);
  const query = existing
    ? db.from(table).update(payload).eq('id', existing.id)
    : db.from(table).insert(payload);
  const {data: row, error} = await query.select('id').single();
  if (error) throw error;
  return row.id;
}

const categoryIds = new Map();
for (const [slug, parentSlug, en, ar, icon, order] of categories) {
  const id = await upsertSoft('categories', 'slug', {
    slug,
    parent_id: parentSlug ? categoryIds.get(parentSlug) : null,
    name: bilingual(en, ar),
    description: bilingual(
      `Explore trusted ${en.toLowerCase()} with clear delivery details.`,
      `اكتشف ${ar} الموثوقة مع تفاصيل تسليم واضحة.`
    ),
    icon_name: icon,
    sort_order: order,
    active: true,
    seo: {
      title: bilingual(en, ar),
      description: bilingual(`Shop ${en} on Nexora.`, `تسوّق ${ar} على نكسورا.`)
    },
    deleted_at: null
  });
  categoryIds.set(slug, id);
}

const productIdsByType = new Map();
for (const [type, items] of Object.entries(data)) {
  const ids = [];
  for (const [index, [slug, en, ar]] of items.entries()) {
    const status =
      index === 9
        ? 'draft'
        : index === 10
          ? 'coming_soon'
          : index === 11
            ? 'out_of_stock'
            : 'active';
    const categorySlug =
      type === 'topup'
        ? 'battle-royale'
        : type === 'subscription'
          ? index % 3 === 1
            ? 'productivity'
            : 'entertainment'
          : type === 'giftcard'
            ? index % 2
              ? 'shopping-credit'
              : 'gaming-credit'
            : type === 'smm'
              ? 'social-platforms'
              : index % 3
                ? 'creative-services'
                : 'technical-services';
    const fieldSchema =
      type === 'topup'
        ? [
            {
              key: 'player_id',
              type: 'player_id',
              label: bilingual('Player ID', 'معرّف اللاعب'),
              help: bilingual(
                'Enter the ID shown inside your game profile.',
                'أدخل المعرّف الظاهر داخل ملفك في اللعبة.'
              ),
              required: true,
              regex: '^[A-Za-z0-9_-]{5,24}$'
            }
          ]
        : type === 'subscription'
          ? [
              {
                key: 'email',
                type: 'email',
                label: bilingual('Account email', 'بريد الحساب'),
                help: bilingual(
                  'We use this only to configure delivery.',
                  'نستخدمه فقط لإعداد التسليم.'
                ),
                required: true
              }
            ]
          : type === 'smm'
            ? [
                {
                  key: 'profile_url',
                  type: 'profile_url',
                  label: bilingual('Target URL', 'الرابط المستهدف'),
                  help: bilingual(
                    'Use a public profile or post URL.',
                    'استخدم رابط حساب أو منشور عام.'
                  ),
                  required: true
                },
                {
                  key: 'quantity',
                  type: 'quantity',
                  label: bilingual('Quantity', 'الكمية'),
                  help: bilingual('Choose in increments of 100.', 'اختر بمضاعفات 100.'),
                  required: true,
                  min: 100,
                  max: 100000,
                  step: 100
                }
              ]
            : [];
    const id = await upsertSoft('products', 'slug', {
      category_id: categoryIds.get(categorySlug),
      product_type_code: type,
      slug,
      name: bilingual(en, ar),
      short_description: bilingual(
        `Verified ${en} with transparent options and live delivery status.`,
        `${ar} موثوقة مع خيارات واضحة وتتبع مباشر للتسليم.`
      ),
      description: bilingual(
        `Choose the option that fits you. Every requirement is validated before checkout and delivery is protected by Nexora.`,
        `اختر الخيار المناسب لك. نتحقق من جميع المتطلبات قبل الدفع ونحمي عملية التسليم عبر نكسورا.`
      ),
      badges: [bilingual(index < 3 ? 'Popular' : 'Verified', index < 3 ? 'الأكثر طلباً' : 'موثوق')],
      status,
      fulfillment_mode:
        type === 'service' ? 'manual' : index % 4 === 0 ? 'auto_then_manual' : 'auto',
      warranty_text: bilingual(
        type === 'service'
          ? 'Protected milestones and included revisions'
          : 'Replacement guarantee according to delivery terms',
        type === 'service' ? 'مراحل محمية وتعديلات مشمولة' : 'ضمان استبدال وفق شروط التسليم'
      ),
      delivery_estimate: bilingual(
        type === 'service'
          ? '2–7 business days'
          : status === 'coming_soon'
            ? 'Launching soon'
            : 'Usually within minutes',
        type === 'service'
          ? 'من يومين إلى 7 أيام عمل'
          : status === 'coming_soon'
            ? 'سيتوفر قريباً'
            : 'عادة خلال دقائق'
      ),
      input_schema: fieldSchema,
      seo: {
        title: bilingual(`${en} | Nexora`, `${ar} | نكسورا`),
        description: bilingual(
          `Buy ${en} securely with clear delivery tracking.`,
          `اشترِ ${ar} بأمان مع تتبع واضح للتسليم.`
        )
      },
      featured: index < 2,
      sort_order: index * 10,
      published_at:
        status === 'draft' ? null : new Date(Date.now() - index * 86400000).toISOString(),
      deleted_at: null
    });
    ids.push(id);

    const basePrice =
      type === 'service'
        ? 7900 + index * 1300
        : type === 'giftcard'
          ? 1000 + index * 500
          : type === 'subscription'
            ? 699 + index * 175
            : type === 'smm'
              ? 390 + index * 35
              : 499 + index * 120;
    const variants =
      type === 'giftcard'
        ? [
            {
              label: bilingual('$10', '10 دولار'),
              price: basePrice,
              region: slug.includes('uae') ? 'AE' : slug.includes('eur') ? 'EU' : 'US',
              denomination: 1000
            },
            {
              label: bilingual('$25', '25 دولار'),
              price: basePrice + 1500,
              region: slug.includes('uae') ? 'AE' : slug.includes('eur') ? 'EU' : 'US',
              denomination: 2500
            }
          ]
        : type === 'subscription'
          ? [
              {
                label: bilingual('1 month · Private', 'شهر · خاص'),
                price: basePrice,
                duration: 30,
                account: 'private'
              },
              {
                label: bilingual('3 months · Private', '3 أشهر · خاص'),
                price: basePrice * 3 - 100,
                duration: 90,
                account: 'private'
              }
            ]
          : type === 'service'
            ? [
                {label: bilingual('Standard project', 'مشروع قياسي'), price: basePrice},
                {label: bilingual('Priority project', 'مشروع أولوية'), price: basePrice + 4500}
              ]
            : [
                {label: bilingual('Standard', 'قياسي'), price: basePrice},
                {label: bilingual('Plus', 'بلس'), price: basePrice * 2 - 50}
              ];
    for (const [variantIndex, variant] of variants.entries()) {
      const sku = `${type.slice(0, 4).toUpperCase()}-${String(index + 1).padStart(2, '0')}-${variantIndex + 1}`;
      const variantId = await upsertSoft('product_variants', 'sku', {
        product_id: id,
        sku,
        name: variant.label,
        price_amount: variant.price,
        currency_code: 'USD',
        stock_quantity: status === 'out_of_stock' ? 0 : 250,
        unlimited_stock: type === 'smm' || type === 'service',
        region_code: variant.region ?? null,
        duration_days: variant.duration ?? null,
        denomination_amount: variant.denomination ?? null,
        denomination_currency_code: variant.denomination ? 'USD' : null,
        account_type: variant.account ?? null,
        attributes: {},
        active: true,
        sort_order: variantIndex * 10,
        deleted_at: null
      });
      const {error: costError} = await db.from('product_variant_costs').upsert(
        {
          variant_id: variantId,
          cost_amount: Math.floor(variant.price * 0.68),
          currency_code: 'USD',
          source: 'demo_supplier'
        },
        {onConflict: 'variant_id'}
      );
      if (costError) throw costError;
      if (type === 'smm') {
        const {error: smmError} = await db.from('smm_product_configs').upsert(
          {
            variant_id: variantId,
            min_quantity: 100,
            max_quantity: 100000,
            quantity_step: 100,
            price_per_1000_amount: variant.price,
            currency_code: 'USD',
            drip_feed_enabled: variantIndex === 1,
            max_drip_runs: variantIndex === 1 ? 10 : null,
            min_drip_interval_minutes: variantIndex === 1 ? 60 : null
          },
          {onConflict: 'variant_id'}
        );
        if (smmError) throw smmError;
      }
    }
    const {error: mediaError} = await db.from('product_media').delete().eq('product_id', id);
    if (mediaError) throw mediaError;
    const {error: mediaInsertError} = await db.from('product_media').insert({
      product_id: id,
      kind: 'image',
      url: '/icons/icon-512.png',
      alt_text: bilingual(en, ar),
      is_primary: true,
      sort_order: 0
    });
    if (mediaInsertError) throw mediaInsertError;
    if (type === 'service') {
      const requirements = [
        {
          key: 'notes',
          type: 'notes',
          label: bilingual('Project brief', 'ملخص المشروع'),
          help: bilingual(
            'Tell us the goal, audience, and preferred style.',
            'أخبرنا عن الهدف والجمهور والأسلوب المفضل.'
          ),
          required: true,
          min: 20,
          max: 2000
        },
        {
          key: 'file_upload',
          type: 'file_upload',
          label: bilingual('Reference file', 'ملف مرجعي'),
          help: bilingual('Optional PDF or image reference.', 'ملف PDF أو صورة اختيارية.'),
          required: false,
          acceptedTypes: ['image/png', 'image/jpeg', 'application/pdf']
        }
      ];
      const {error: serviceError} = await db.from('service_product_configs').upsert(
        {
          product_id: id,
          requirement_schema: requirements,
          milestone_templates: [
            {title: bilingual('Discovery', 'الاستكشاف'), percentage: 20},
            {title: bilingual('First delivery', 'التسليم الأول'), percentage: 50},
            {title: bilingual('Final approval', 'الموافقة النهائية'), percentage: 30}
          ],
          included_revisions: 2 + (index % 3),
          custom_quote_required: true
        },
        {onConflict: 'product_id'}
      );
      if (serviceError) throw serviceError;
    }
  }
  productIdsByType.set(type, ids);
}

for (const ids of productIdsByType.values()) {
  for (let index = 0; index < ids.length; index += 1) {
    const {error} = await db.from('product_relations').upsert(
      {
        product_id: ids[index],
        related_product_id: ids[(index + 1) % ids.length],
        relation_type: 'related',
        score: 100 - index,
        sort_order: 0
      },
      {onConflict: 'product_id,related_product_id,relation_type'}
    );
    if (error) throw error;
  }
}

console.log('Catalog seed complete: 60 bilingual products across 5 product domains.');
