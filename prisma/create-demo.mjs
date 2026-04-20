/**
 * Creates a demo account with admin plan + a showcase collection.
 * Run from the project root:
 *   node prisma/create-demo.mjs
 *
 * Reads DATABASE_URL from .env.local (or existing env vars).
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Load .env.local ──────────────────────────────────────────────────────────
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const lines   = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
} catch { /* fall through to existing env */ }

// ── Config ───────────────────────────────────────────────────────────────────
const DEMO_EMAIL    = 'demo@collecttrack.com'
const DEMO_PASSWORD = 'Collect2025!'
const DEMO_NAME     = 'Demo Collector'

const prisma = new PrismaClient()

// ── Demo items ───────────────────────────────────────────────────────────────
// A varied, realistic collection across multiple categories.
// estimatedValue is intentionally set so the dashboard shows a healthy total.
const DEMO_ITEMS = [

  // ── Statues & Busts ──────────────────────────────────────────────────────
  {
    name:           'Batman Premium Format Figure',
    category:       'Statues & Busts',
    manufacturer:   'Sideshow Collectibles',
    edition:        'Exclusive',
    condition:      'Mint',
    paidPrice:      549.99,
    estimatedValue: 875.00,
    description:    'Sideshow\'s iconic Batman PFF in the classic Dark Knight pose. Exclusive edition includes two interchangeable portraits. Polystone, 1:4 scale.',
    notes:          'Purchased at SDCC 2022. Certificate #0412/1250. Original box and outer shipping carton kept.',
  },
  {
    name:           'Spider-Man: Into the Spider-Verse Miles Morales Statue',
    category:       'Statues & Busts',
    manufacturer:   'Iron Studios',
    edition:        'Deluxe Edition',
    condition:      'Mint',
    paidPrice:      329.99,
    estimatedValue: 420.00,
    description:    'Art Scale 1:10 statue capturing Miles mid-swing in his Spider-Man suit. Deluxe edition includes alternate Prowler villain figure.',
    notes:          'Still sealed in original box.',
  },
  {
    name:           'The Mandalorian & Grogu Premium Format Figure',
    category:       'Statues & Busts',
    manufacturer:   'Sideshow Collectibles',
    edition:        'Standard Edition',
    condition:      'Near Mint',
    paidPrice:      699.99,
    estimatedValue: 950.00,
    description:    'Din Djarin kneeling with The Child on his arm. Stunning polystone diorama with incredible paint work on the beskar armor.',
    notes:          'Displayed in climate-controlled room. No sun exposure.',
  },
  {
    name:           'Wolverine Berserker Rage Premium Format Figure',
    category:       'Statues & Busts',
    manufacturer:   'Sideshow Collectibles',
    edition:        'Exclusive',
    condition:      'Mint',
    paidPrice:      499.99,
    estimatedValue: 1100.00,
    description:    'Logan unleashed — claws out, costume torn. One of Sideshow\'s most sought-after X-Men releases. Exclusive adds weathered damage to the costume.',
    notes:          'Hot piece right now. Secondary market trending up.',
  },
  {
    name:           'Joker on Throne Deluxe Art Scale Statue',
    category:       'Statues & Busts',
    manufacturer:   'Iron Studios',
    edition:        'Deluxe Edition',
    condition:      'Mint',
    paidPrice:      279.99,
    estimatedValue: 310.00,
    description:    '1:10 scale Joker seated on his card-suit throne from The Dark Knight. Deluxe includes removable playing-card cape.',
    notes:          '',
  },

  // ── Action Figures ───────────────────────────────────────────────────────
  {
    name:           'Meisho Movie Realization Ronin Batman',
    category:       'Action Figures',
    manufacturer:   'Tamashii Nations / S.H.Figuarts',
    edition:        'Standard Edition',
    condition:      'Near Mint',
    paidPrice:      89.99,
    estimatedValue: 185.00,
    description:    'Feudal Japan reimagining of Batman in full samurai armor. Exceptional articulation and accessories including multiple swords and hands.',
    notes:          'Loose but complete with all accessories. No box.',
  },
  {
    name:           'Ultimate The Crow',
    category:       'Action Figures',
    manufacturer:   'NECA',
    edition:        'Standard Edition',
    condition:      'Near Mint',
    paidPrice:      34.99,
    estimatedValue: 78.00,
    description:    '7" Ultimate action figure of Eric Draven with 25+ points of articulation. Comes with rooftop guitar, crow, and multiple facial expressions.',
    notes:          'Opened for display but complete with all original accessories.',
  },

  // ── Funko Pops ──────────────────────────────────────────────────────────
  {
    name:           'Stan Lee Funko Pop #952',
    category:       'Funko Pops',
    manufacturer:   'Funko',
    edition:        'Standard',
    condition:      'Mint',
    paidPrice:      14.99,
    estimatedValue: 65.00,
    description:    'Stan Lee in his classic sunglasses, suit, and tie. In-box Mint. One of the most beloved Pop! figures ever produced.',
    notes:          'Never opened. Great condition box with no damage.',
  },
  {
    name:           'Thanos on Throne #249 (Metallic)',
    category:       'Funko Pops',
    manufacturer:   'Funko',
    edition:        'Metallic',
    condition:      'Mint',
    paidPrice:      24.99,
    estimatedValue: 110.00,
    description:    'Seated Thanos in his golden armor with full Infinity Gauntlet. Metallic chase variant. Highly sought after.',
    notes:          'Convention exclusive. Box has small crease on back corner.',
  },
  {
    name:           'Venom #82 (Blacklight)',
    category:       'Funko Pops',
    manufacturer:   'Funko',
    edition:        'Glow-in-the-Dark (GITD)',
    condition:      'Mint',
    paidPrice:      19.99,
    estimatedValue: 45.00,
    description:    'Classic Venom pose with tongue out. Glows beautifully in the dark. Target exclusive.',
    notes:          '',
  },

  // ── Trading Cards ────────────────────────────────────────────────────────
  {
    name:           'Charizard Base Set Holo #4/102',
    category:       'Trading Cards (Pokémon, Magic, etc.)',
    manufacturer:   'The Pokémon Company',
    edition:        'Holo / Foil',
    condition:      'Excellent',
    paidPrice:      310.00,
    estimatedValue: 520.00,
    description:    'Shadowless Base Set Charizard. Moderate play wear on corners but strong holo with no scratches. One of the most iconic cards in the hobby.',
    notes:          'PSA submission pending. Expecting a 7.',
  },
  {
    name:           'Black Lotus Alpha Edition',
    category:       'Trading Cards (Pokémon, Magic, etc.)',
    manufacturer:   'Wizards of the Coast',
    edition:        'First Edition',
    condition:      'Good',
    paidPrice:      8500.00,
    estimatedValue: 15000.00,
    description:    'The holy grail of Magic: The Gathering. Alpha Black Lotus with visible play wear. Moderate edge wear and two minor creases but intact and authentic.',
    notes:          'CGC graded 5.0. Certificate on file. Stored in UV-safe hard case.',
  },
  {
    name:           'LeBron James 2003-04 Topps Chrome Rookie #111',
    category:       'Sports Cards',
    manufacturer:   'Topps',
    edition:        'Refractor',
    condition:      'Near Mint',
    paidPrice:      2200.00,
    estimatedValue: 3800.00,
    description:    'LeBron\'s most coveted Topps Chrome rookie card in the Refractor parallel. Excellent centering and sharp corners.',
    notes:          'PSA 8. Bought from PWCC auction 2023.',
  },

  // ── Sneakers ─────────────────────────────────────────────────────────────
  {
    name:           'Air Jordan 1 Retro High OG "Chicago" 2015',
    category:       'Sneakers & Footwear',
    manufacturer:   'Nike',
    edition:        'Limited Edition',
    condition:      'Good',
    paidPrice:      160.00,
    estimatedValue: 650.00,
    description:    'The 2015 retro of the classic Chicago colorway. Red, black, and white leather. Size 10.5. DS (Deadstock) with original box and lace bag.',
    notes:          'Never worn. Original receipt kept. StockX authenticated.',
  },
  {
    name:           'Nike SB Dunk Low "Paris" 2002',
    category:       'Sneakers & Footwear',
    manufacturer:   'Nike',
    edition:        'Limited Edition',
    condition:      'Good',
    paidPrice:      4800.00,
    estimatedValue: 9500.00,
    description:    'One of Nike SB\'s most iconic colorways. Features deconstructed canvas in multiple colors. Extremely rare original 2002 release. Size 9.',
    notes:          'In original box with all accessories. Some yellowing on midsole typical for age. Verified authentic.',
  },

  // ── Watches ──────────────────────────────────────────────────────────────
  {
    name:           'Rolex Submariner Date Ref. 116610LN',
    category:       'Watches & Luxury Timepieces',
    manufacturer:   'Rolex',
    edition:        'Standard',
    condition:      'Excellent',
    paidPrice:      9500.00,
    estimatedValue: 14800.00,
    description:    'The definitive dive watch. 40mm stainless steel case, ceramic bezel, black dial. Purchased 2018, full set with card and box.',
    notes:          'Serviced by authorized dealer June 2024. All links present. Box and papers.',
  },

  // ── Vinyl Records ────────────────────────────────────────────────────────
  {
    name:           'The Beatles - Abbey Road (UK Original Pressing)',
    category:       'Vinyl Records',
    manufacturer:   'Apple Records',
    edition:        '180g / Audiophile',
    condition:      'Near Mint',
    paidPrice:      420.00,
    estimatedValue: 750.00,
    description:    '1969 UK first pressing on Apple Records (PCS 7088). Misaligned "Her Majesty" variant. VG+ vinyl with NM sleeve.',
    notes:          'Matrix: YEX 749-3 / YEX 750-3. Discogs verified.',
  },
  {
    name:           'Daft Punk - Random Access Memories (Original 2013)',
    category:       'Vinyl Records',
    manufacturer:   'Columbia Records',
    edition:        'Standard Black',
    condition:      'Mint',
    paidPrice:      45.00,
    estimatedValue: 120.00,
    description:    '2013 original 2xLP pressing. Sealed. One of the most important electronic albums of the 21st century.',
    notes:          'Still in original shrink with hype sticker intact.',
  },

  // ── Comics ───────────────────────────────────────────────────────────────
  {
    name:           'Amazing Fantasy #15 (Facsimile Edition)',
    category:       'Comics & Graphic Novels',
    manufacturer:   'Marvel',
    edition:        'First Print',
    condition:      'Near Mint',
    paidPrice:      7.99,
    estimatedValue: 12.00,
    description:    'Marvel\'s faithful facsimile reprint of Spider-Man\'s first appearance from 1962. Perfect for display without risking the original.',
    notes:          '',
  },
  {
    name:           'Batman: The Dark Knight Returns #1 (1986)',
    category:       'Comics & Graphic Novels',
    manufacturer:   'DC Comics',
    edition:        'First Print',
    condition:      'Excellent',
    paidPrice:      125.00,
    estimatedValue: 280.00,
    description:    'Frank Miller\'s landmark prestige-format miniseries. First printing with bright cover and white pages. Minor stress marks on spine.',
    notes:          'CGC graded 8.5. One of the most influential comic runs ever written.',
  },

  // ── Preorders (tracked separately, but good to have items) ───────────────
]

// ── Preorder records ──────────────────────────────────────────────────────
const DEMO_PREORDERS = [
  {
    name:         'Darth Vader Premium Format Figure (2025 Edition)',
    category:     'Statues & Busts',
    manufacturer: 'Sideshow Collectibles',
    edition:      'Exclusive',
    retailer:     'Sideshow Collectibles',
    totalPrice:   699.99,
    depositPaid:  150.00,
    status:       'preordered',
    notes:        'Expected Q4 2025. Exclusive adds lightsaber light-up feature.',
  },
  {
    name:         'Optimus Prime G1 Bumblebee Studio Series Statue',
    category:     'Statues & Busts',
    manufacturer: 'Prime 1 Studio',
    edition:      'Standard Edition',
    retailer:     'Prime 1 Studio Official',
    totalPrice:   1199.99,
    depositPaid:  300.00,
    status:       'preordered',
    notes:        'Full payment due 30 days before ship. Expected Q2 2026.',
  },
  {
    name:         'Air Jordan 4 Retro "Thunder" 2024',
    category:     'Sneakers & Footwear',
    manufacturer: 'Nike',
    edition:      'Limited Edition',
    retailer:     'SNKRS App',
    totalPrice:   215.00,
    depositPaid:  215.00,
    status:       'shipped',
    notes:        'Size 10.5. Tracking shows arriving Thursday.',
  },
]

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎯  Creating demo account…\n')

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 12)

  // Upsert demo user
  const user = await prisma.user.upsert({
    where:  { email: DEMO_EMAIL },
    update: {
      password:           hashed,
      name:               DEMO_NAME,
      plan:               'admin',
      role:               'user',
      marketLookupCount:  0,
    },
    create: {
      email:              DEMO_EMAIL,
      password:           hashed,
      name:               DEMO_NAME,
      plan:               'admin',
      role:               'user',
      marketLookupCount:  0,
    },
  })

  console.log('✅  User:', user.email, '| Plan:', user.plan)

  // Create collector profile
  await prisma.collectorProfile.upsert({
    where:  { userId: user.id },
    update: { preferredGroups: JSON.stringify(['Toys & Figures', 'Sports Cards', 'Watches & Accessories', 'Sneakers & Footwear']) },
    create: {
      userId:          user.id,
      displayName:     DEMO_NAME,
      preferredGroups: JSON.stringify(['Toys & Figures', 'Sports Cards', 'Watches & Accessories', 'Sneakers & Footwear']),
    },
  })

  // Remove any previously seeded demo items
  await prisma.item.deleteMany({ where: { userId: user.id } })
  await prisma.preorder.deleteMany({ where: { userId: user.id } })

  // Seed collection items
  let created = 0
  for (const item of DEMO_ITEMS) {
    await prisma.item.create({
      data: {
        ...item,
        paidPrice:      item.paidPrice      ? item.paidPrice      : null,
        estimatedValue: item.estimatedValue ? item.estimatedValue : null,
        userId:         user.id,
      },
    })
    created++
    process.stdout.write(`\r   Items created: ${created}/${DEMO_ITEMS.length}`)
  }
  console.log('')

  // Seed preorders
  for (const order of DEMO_PREORDERS) {
    await prisma.preorder.create({
      data: {
        ...order,
        totalPrice:  order.totalPrice  ?? null,
        depositPaid: order.depositPaid ?? null,
        userId:      user.id,
      },
    })
  }
  console.log(`   Preorders created: ${DEMO_PREORDERS.length}`)

  // Summary
  const totalPaid  = DEMO_ITEMS.reduce((s, i) => s + (i.paidPrice      ?? 0), 0)
  const totalValue = DEMO_ITEMS.reduce((s, i) => s + (i.estimatedValue ?? 0), 0)

  console.log('\n──────────────────────────────────────────')
  console.log('  Demo account ready!')
  console.log('──────────────────────────────────────────')
  console.log(`  Email:    ${DEMO_EMAIL}`)
  console.log(`  Password: ${DEMO_PASSWORD}`)
  console.log(`  Plan:     Admin (unlimited)`)
  console.log(`  Items:    ${DEMO_ITEMS.length} collectibles across ${new Set(DEMO_ITEMS.map(i => i.category)).size} categories`)
  console.log(`  Paid:     $${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  console.log(`  Value:    $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  console.log(`  Preorders:${DEMO_PREORDERS.length}`)
  console.log('──────────────────────────────────────────\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
