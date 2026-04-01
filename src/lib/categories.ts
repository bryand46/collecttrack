export const CATEGORY_GROUPS: { group: string; categories: string[] }[] = [
  {
    group: 'Cards & Paper',
    categories: [
      'Sports Cards', 'Trading Cards (Pokémon, Magic, etc.)', 'Comics & Graphic Novels',
      'Stamps', 'Postcards', 'Autographs', 'Books & First Editions',
      'Magazines', 'Movie & Concert Posters', 'Political Memorabilia', 'Historical Documents',
    ],
  },
  {
    group: 'Coins & Currency',
    categories: ['Coins', 'Currency & Banknotes', 'Tokens & Medals', 'Bullion (Gold / Silver)'],
  },
  {
    group: 'Toys & Figures',
    categories: [
      'Toys', 'Action Figures', 'Statues & Busts', 'Funko Pops', 'LEGO Sets',
      'Model Trains', 'Die-Cast Cars & Vehicles', 'Dolls & Plush', 'Board Games & Puzzles',
    ],
  },
  {
    group: 'Video Games & Tech',
    categories: ['Video Games & Consoles', 'Arcade & Pinball Machines', 'Vintage Electronics', 'Handheld Consoles'],
  },
  {
    group: 'Music',
    categories: ['Vinyl Records', 'Musical Instruments', 'Amplifiers & Audio Gear', 'Concert Memorabilia', 'Signed Music Items', 'CDs & Cassettes'],
  },
  {
    group: 'Art & Décor',
    categories: [
      'Art (Paintings & Prints)', 'Photography', 'Sculptures', 'Ceramics & Pottery',
      'Glass & Crystal', 'Clocks & Timepieces', 'Antique Furniture', 'Rugs & Tapestries',
    ],
  },
  {
    group: 'Watches & Accessories',
    categories: ['Jewelry', 'Watches & Luxury Timepieces', 'Sneakers & Footwear', 'Luxury Handbags', 'Vintage Clothing', 'Hats & Headwear'],
  },
  {
    group: 'Sports & Memorabilia',
    categories: ['Sports Memorabilia', 'Game-Used Equipment', 'Signed Sports Items', 'Trophies & Awards', 'Sports Apparel'],
  },
  {
    group: 'Entertainment & Pop Culture',
    categories: ['Movie Props & Costumes', 'TV Memorabilia', 'Anime & Manga', 'Movie & TV Memorabilia', 'Celebrity Memorabilia', 'Space & NASA Memorabilia'],
  },
  {
    group: 'Historical & Military',
    categories: ['Military Memorabilia', 'Weapons & Armor (Antique)', 'War Medals & Insignia', 'Maps & Cartography'],
  },
  {
    group: 'Natural Collectibles',
    categories: ['Fossils & Dinosaur Bones', 'Minerals & Gemstones', 'Meteorites', 'Shells & Natural Specimens'],
  },
  {
    group: 'Food & Drink',
    categories: ['Wine & Spirits', 'Beer Cans & Bottles', 'Vintage Advertising'],
  },
  {
    group: 'Other',
    categories: ['Rocks & Minerals', 'Science & Medical Antiques', 'Religious Artifacts', 'Holiday & Seasonal', 'Other'],
  },
]

export const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap((g) => g.categories).sort()
