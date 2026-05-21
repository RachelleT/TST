# Facts catalog

## Purpose

Every saved word in the user's library is paired with one general-knowledge fact, anchored at save-time. The fact appears in the card's portrait zone and can be expanded to read a one-sentence detail.

The catalog is intentionally global. We actively counterbalance the natural Eurocentric / North-America-centric bias of pop-culture "wonder lists."

## Catalog scale

- **v1 launch target:** ~500 facts (enough for a daily-saver to take >250 days to exhaust their pool)
- **v1 minimum viable:** ~150 facts across all 5 categories (for the first developer build)
- **Easily extensible:** the catalog lives in Supabase. Admin can add/edit without an app release.

## Categories

Five categories, balanced across the catalog:

### 1. Flags (target: 195+)

All UN-recognized countries, plus widely-recognized non-UN entities (Taiwan, Palestine, Kosovo, Vatican).

**Crucially: equal weighting.** Tuvalu, Eswatini, Comoros, Suriname, Kiribati must appear as often as France or Japan in the picker. This is enforced by the picker algorithm (see below), not by listing order.

Each flag entry has:
- The country's flag as SVG
- Country name (English) and `name_local` where applicable
- A one-sentence fact about the country

Example: `flag_bhutan`: *"Bhutan measures national happiness instead of GDP, the first country to do so."*

### 2. Landmarks (target: ~80)

Iconic places, with deliberate regional balance. Composition target:

- **Africa:** Pyramids of Giza, Sphinx, Great Mosque of Djenné, rock-hewn churches of Lalibela, Stone Town of Zanzibar, Mt. Kilimanjaro, Victoria Falls, Sahara, Table Mountain, Ouzoud Falls, Lake Malawi (~11)
- **Asia:** Great Wall, Taj Mahal, Angkor Wat, Borobudur, Petra, Mount Fuji, Forbidden City, Himeji Castle, Persepolis, Bagan temples, Mount Everest, Hagia Sophia, Registan in Samarkand, Potala Palace, Komodo, Ha Long Bay (~16)
- **Oceania:** Uluru, Great Barrier Reef, Milford Sound, Bora Bora, Easter Island Moai, Sydney Opera House, Mount Cook, Rotorua geothermal (~8)
- **Americas (North/Central/South):** Machu Picchu, Chichén Itzá, Christ the Redeemer, Iguazu Falls, Salar de Uyuni, Niagara Falls, Grand Canyon, Statue of Liberty, Teotihuacán, Tikal, Patagonia, Banff Lakes (~12)
- **Caribbean:** Pitons of St. Lucia, El Yunque rainforest, Dunn's River Falls, Blue Hole of Belize, Old Havana, Bioluminescent Bay (Puerto Rico) (~6)
- **Europe:** Colosseum, Eiffel Tower, Acropolis, Stonehenge, Sagrada Família, Northern Lights, Plitvice Lakes, Neuschwanstein (~8 — kept proportional)
- **Polar:** Antarctica's Ross Ice Shelf, Mt. Erebus, the Arctic ice cap (~3)

### 3. Constellations (target: ~30)

Most recognizable constellations and asterisms. Deliberately include non-Western-tradition recognized groupings:

- Universal: Orion, Cassiopeia, Big Dipper / Ursa Major, Ursa Minor, Andromeda, Cygnus, Lyra, Aquila, Scorpius, Sagittarius, Leo, Taurus, Gemini, Cancer
- Southern hemisphere recognized: Crux (Southern Cross), Carina, Centaurus, Phoenix, Tucana
- Cross-cultural: Pleiades (also called Subaru in Japanese, Matariki in Māori, Seven Sisters across many traditions)
- Indigenous astronomies: include where recognizable patterns exist (e.g., the Emu in the Sky — a dark constellation in Aboriginal Australian astronomy)

Each entry has:
- Simple SVG of the star pattern (dots + connecting lines, on dark blue background)
- Constellation name
- A sentence: where in the sky, what it depicts, any cultural note.

### 4. Animals (target: ~80)

Drawn from every continent, biased toward unusual or lesser-known where it serves global representation:

- **Asia:** red panda, pangolin, tarsier, snow leopard, sloth bear, gharial, Komodo dragon, dhole, takin, hoatzin
- **Africa:** fennec fox, aardvark, okapi, shoebill, gerenuk, pangolin, secretary bird, dik-dik
- **Oceania:** quokka, kakapo, kiwi, tuatara, cassowary, platypus, echidna, numbat, lyrebird
- **Americas:** capybara, axolotl, maned wolf, jaguar, vicuña, harpy eagle, three-toed sloth, quetzal, manatee, condor
- **Polar:** narwhal, beluga, snow leopard, polar bear, Adélie penguin, emperor penguin
- **Marine (global):** dugong, manta ray, hammerhead, sunfish, blue whale, leafy seadragon

Each entry has:
- Stylized SVG illustration (silhouette + minimal detail, sage-tinted background)
- Common name
- A sentence noting habitat and one interesting trait.

### 5. Geography (target: ~50)

Rivers, deserts, mountain ranges, seas, lakes:

- **Rivers:** Nile, Amazon, Yangtze, Mississippi, Mekong, Congo, Volga, Indus, Ganges, Niger
- **Deserts:** Sahara, Gobi, Atacama, Kalahari, Patagonian, Arabian, Mojave, Antarctic Polar
- **Mountains:** Himalayas, Andes, Atlas, Rockies, Alps, Drakensberg, Caucasus, Urals
- **Lakes/Seas:** Caspian, Baikal, Titicaca, Tanganyika, Aral, Dead Sea, Great Lakes
- **Forests:** Amazon Rainforest, Congo Basin, Boreal Taiga, Daintree, Sundarbans

Each entry has:
- Stylized SVG (silhouette of the land/water feature on a regional-color background)
- Name
- A one-sentence fact (length, region, notable feature).

## Region tags

The picker uses region tags to balance assignments. Tag set:

```
africa_north, africa_west, africa_east, africa_south, africa_central
americas_north, americas_central, americas_south, caribbean
asia_east, asia_south, asia_southeast, asia_central, asia_west
europe_west, europe_east, europe_north, europe_south
oceania_australia, oceania_pacific, oceania_newzealand
polar
global  // for constellations visible everywhere; some marine animals
```

Some facts span multiple regions (e.g., the Sahara crosses several). Pick the *most representative* single region, since multi-region tags complicate the picker without much benefit.

## Fact data file

The catalog ships as JSON in `supabase/seed/facts.json`:

```json
[
  {
    "id": "flag_japan",
    "category": "flag",
    "region": "asia_east",
    "name": "Japan",
    "name_local": "日本",
    "illustration_path": "flags/japan.svg",
    "fact_sentence": "Japan is an island nation of about 14,000 islands in East Asia, known for cherry blossoms and Mount Fuji."
  },
  {
    "id": "landmark_machu_picchu",
    "category": "landmark",
    "region": "americas_south",
    "name": "Machu Picchu",
    "illustration_path": "landmarks/machu_picchu.svg",
    "fact_sentence": "Machu Picchu is a 15th-century Inca citadel high in the Andes of Peru, built without mortar."
  }
]
```

On first launch, the app pulls this data from Supabase and stores it locally in SQLite. The catalog refreshes daily (or on app foreground after 24h+).

## Illustrations

All SVGs live in `app/assets/facts/` organized by category:

```
app/assets/facts/
├── flags/
│   ├── japan.svg
│   ├── bhutan.svg
│   └── ...
├── landmarks/
├── constellations/
├── animals/
└── geography/
```

Style rules:
- Flat, no gradients, no shadows.
- Limited palette: each illustration uses 2–4 colors max.
- Simple, recognizable silhouettes — these will be viewed at thumbnail size.
- ViewBox `0 0 200 120` standard. Centered subject with breathing room.
- Each SVG is **<10kb**. Optimize via SVGO.

For v1 build: ship with placeholder illustrations (simple colored shapes + text labels). Real illustration work happens during the catalog expansion phase.

## Picker algorithm

When the user saves a word, the system assigns one fact. The logic:

```
function assignFact(userId, savedWordId):
    // 1. Get the set of fact_ids the user has already been assigned
    assigned = SELECT fact_id FROM fact_assignments WHERE user_id = userId

    // 2. Get all active facts not yet assigned to this user
    available = SELECT * FROM facts
                WHERE active = true
                AND id NOT IN assigned

    // 3. If available is empty (user has all facts), allow recycling — but prefer least-recently-assigned
    if available is empty:
        available = SELECT * FROM facts WHERE active = true
        // weight recycled picks downward by recency

    // 4. Build a region-count map from the user's existing assignments
    regionCounts = group assigned facts by region, count
    // and a category-count map
    categoryCounts = group assigned facts by category, count

    // 5. Compute a score for each available fact: lower = better
    // Penalize over-represented regions and categories in the user's history
    for fact in available:
        regionScore = regionCounts.get(fact.region, 0)
        categoryScore = categoryCounts.get(fact.category, 0) * 0.5  // weight categories less than regions
        fact.score = regionScore + categoryScore + random(0, 0.5)  // small randomness

    // 6. Pick the lowest-scored fact
    return available.sortBy(score).first()
```

Notes:

- The randomness keeps the picker from being perfectly predictable while still trending toward balance.
- The `* 0.5` weighting on category means region balance is prioritized over category balance — we'd rather hit "different continents" than "always different categories." Tunable.
- When recycling (user has saved 500+ words), prefer facts last assigned > N days ago. This is a rare case but should be graceful.

The picker logic lives in `app/lib/fact-picker.ts` and is unit-tested with a fixture catalog and a fixture assignment history.

## When facts are added later

When the admin adds new facts to the catalog (via admin dashboard):

- Existing users' next assignments will favor the new facts (since they're under-represented in everyone's history).
- This is intentional: catalog expansions feel like discoveries for existing users.

## When facts are reported and removed

If a fact is reported and the admin deactivates it (`active = false`):

- Existing fact_assignments referencing it are NOT modified. Users keep their card-fact pairing.
- But if the admin chooses, they can run a re-assignment for that fact_id: the system reassigns each affected `fact_assignment` to a new fact using the picker. Users will see their card update on next sync, with no notification (silent fix).

## When facts are edited

Editing the `fact_sentence`, `illustration_path`, or other display fields propagates immediately to all users on next catalog refresh (within 24h, or sooner if they reopen the app). No re-assignment needed since the `fact_id` is unchanged.

## V1 build seed

For the first developer build, ship with ~100 facts:
- 30 flags (broadly distributed, including small countries)
- 25 landmarks (geographically balanced)
- 15 constellations
- 20 animals
- 10 geography

Enough to validate the picker, the card layout, and the region-balancing math without requiring a full illustration pipeline. Expansion follows.
