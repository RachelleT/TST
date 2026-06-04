-- Phase 5: Seed interest areas and starter words
-- Run in the Supabase dashboard SQL Editor.
-- NOTE: placeholder data — curate before launch (see docs/build-plan.md Phase 5 open questions)

-- ─── Interest areas ───────────────────────────────────────────────────────────

INSERT INTO public.interest_areas (id, label, active, sort_order) VALUES
  ('variety',    'Just give me variety', true, 0),
  ('literature', 'Literature',           true, 1),
  ('science',    'Science',              true, 2),
  ('nature',     'Nature',               true, 3),
  ('history',    'History',              true, 4),
  ('geography',  'Geography',            true, 5),
  ('arts',       'Arts',                 true, 6),
  ('technology', 'Technology',           true, 7),
  ('philosophy', 'Philosophy',           true, 8),
  ('food',       'Food & Cooking',       true, 9)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, active = EXCLUDED.active;

-- ─── Starter words ────────────────────────────────────────────────────────────

INSERT INTO public.starter_words (interest_area, word, part_of_speech, pronunciation, definition, example_sentence, synonyms) VALUES

-- variety
('variety', 'eloquent',  'adjective', 'el·o·quent',  'Fluent and persuasive in speaking or writing.',
 'She gave an eloquent speech that moved the entire audience.',
 ARRAY['articulate', 'expressive', 'fluent', 'persuasive']),

('variety', 'resilient',  'adjective', 're·sil·ient',  'Able to withstand or recover quickly from difficult conditions.',
 'The resilient community rebuilt itself after the storm.',
 ARRAY['tough', 'adaptable', 'hardy', 'strong']),

('variety', 'pragmatic',  'adjective', 'prag·mat·ic',  'Dealing with things sensibly and practically rather than theoretically.',
 'Her pragmatic approach to problem-solving impressed the team.',
 ARRAY['practical', 'realistic', 'sensible', 'rational']),

('variety', 'benevolent',  'adjective', 'be·nev·o·lent',  'Well-meaning and kindly; generous in spirit.',
 'The benevolent donor gave generously to the school.',
 ARRAY['kind', 'generous', 'charitable', 'magnanimous']),

('variety', 'ephemeral',  'adjective', 'e·phem·er·al',  'Lasting for a very short time; transitory.',
 'The ephemeral beauty of cherry blossoms draws crowds each spring.',
 ARRAY['fleeting', 'transient', 'momentary', 'brief']),

-- literature
('literature', 'hubris',  'noun', 'hu·bris',  'Excessive pride or self-confidence, especially when leading to downfall.',
 'The character''s hubris led to his inevitable ruin.',
 ARRAY['arrogance', 'pride', 'overconfidence', 'vanity']),

('literature', 'denouement',  'noun', 'dé·noue·ment',  'The final resolution of a plot, where all strands are drawn together.',
 'The denouement revealed the true identity of the mysterious stranger.',
 ARRAY['resolution', 'conclusion', 'climax', 'outcome']),

('literature', 'soliloquy',  'noun', 'so·lil·o·quy',  'An act of speaking one''s thoughts aloud, especially in a play.',
 'Hamlet''s soliloquy opens with "To be, or not to be."',
 ARRAY['monologue', 'aside', 'speech', 'address']),

('literature', 'verisimilitude',  'noun', 'ver·i·si·mil·i·tude',  'The appearance of being true or real; believable quality.',
 'The novel''s verisimilitude made it feel like actual memoir.',
 ARRAY['realism', 'authenticity', 'believability', 'plausibility']),

('literature', 'picaresque',  'adjective', 'pic·a·resque',  'Relating to a style of fiction about the episodic adventures of a roguish hero.',
 'The picaresque novel followed its hero''s wandering journey through society.',
 ARRAY['roguish', 'adventurous', 'episodic', 'wandering']),

-- science
('science', 'entropy',  'noun', 'en·tro·py',  'A measure of disorder in a system; the natural tendency toward increasing randomness.',
 'Entropy explains why a tidy room naturally becomes messy over time.',
 ARRAY['disorder', 'chaos', 'randomness', 'disorganization']),

('science', 'catalyst',  'noun', 'cat·a·lyst',  'A substance that speeds up a reaction without being consumed; a person or thing that triggers change.',
 'The new policy acted as a catalyst for widespread reform.',
 ARRAY['accelerator', 'stimulus', 'trigger', 'spark']),

('science', 'symbiosis',  'noun', 'sym·bi·o·sis',  'A close and often beneficial relationship between two different organisms.',
 'The symbiosis between the clownfish and sea anemone is a classic example.',
 ARRAY['mutualism', 'partnership', 'cooperation', 'interdependence']),

('science', 'osmosis',  'noun', 'os·mo·sis',  'The passage of molecules through a membrane into a region of higher concentration.',
 'Plants absorb water from soil through osmosis.',
 ARRAY['diffusion', 'absorption', 'permeation', 'filtration']),

('science', 'inertia',  'noun', 'i·ner·tia',  'The tendency of an object to resist changes in its state of motion.',
 'Inertia keeps a rolling ball moving until friction slows it down.',
 ARRAY['resistance', 'sluggishness', 'immobility', 'passivity']),

-- nature
('nature', 'verdant',  'adjective', 'ver·dant',  'Green with grass or other rich vegetation; lush.',
 'The verdant valley stretched out beneath the morning mist.',
 ARRAY['green', 'lush', 'leafy', 'flourishing']),

('nature', 'riparian',  'adjective', 'ri·par·i·an',  'Relating to or situated on the banks of a river.',
 'Riparian plants help prevent soil erosion along riverbanks.',
 ARRAY['riverside', 'fluvial', 'aquatic', 'waterside']),

('nature', 'deciduous',  'adjective', 'de·cid·u·ous',  'Shedding leaves annually; not evergreen.',
 'Deciduous trees display a spectacular show of color each autumn.',
 ARRAY['leafy', 'seasonal', 'broadleaf', 'non-evergreen']),

('nature', 'confluence',  'noun', 'con·flu·ence',  'The junction of two rivers; a coming together of things.',
 'The town was founded at the confluence of two great rivers.',
 ARRAY['junction', 'meeting', 'merging', 'convergence']),

('nature', 'solstice',  'noun', 'sol·stice',  'Either of the two times each year when the sun reaches its farthest point from the equator.',
 'Many cultures celebrate the summer solstice with festivals.',
 ARRAY['equinox', 'turning point', 'midsummer', 'midwinter']),

-- history
('history', 'hegemony',  'noun', 'he·gem·o·ny',  'Leadership or dominance, especially of one country or group over others.',
 'Rome''s hegemony over the Mediterranean lasted for centuries.',
 ARRAY['dominance', 'supremacy', 'authority', 'leadership']),

('history', 'anachronism',  'noun', 'a·nach·ro·nism',  'Something that belongs to a different period of time than the one it appears in.',
 'A knight using a smartphone would be an obvious anachronism.',
 ARRAY['archaism', 'incongruity', 'anomaly', 'relic']),

('history', 'abdicate',  'verb', 'ab·di·cate',  'To formally renounce power, a throne, or a responsibility.',
 'The king chose to abdicate rather than lead his country to war.',
 ARRAY['renounce', 'relinquish', 'surrender', 'resign']),

('history', 'precipitate',  'verb', 'pre·cip·i·tate',  'To cause an event, typically an undesirable one, to happen suddenly.',
 'The economic crisis precipitated a wave of protests.',
 ARRAY['trigger', 'cause', 'hasten', 'provoke']),

('history', 'emissary',  'noun', 'em·is·sar·y',  'A person sent on a special mission as a diplomatic representative.',
 'The emissary arrived bearing a proposal for peace.',
 ARRAY['envoy', 'delegate', 'ambassador', 'representative']),

-- geography
('geography', 'isthmus',  'noun', 'isth·mus',  'A narrow strip of land connecting two larger landmasses, with sea on either side.',
 'The Isthmus of Panama connects North and South America.',
 ARRAY['land bridge', 'neck', 'peninsula', 'strip']),

('geography', 'archipelago',  'noun', 'ar·chi·pel·a·go',  'A group of islands clustered together in a sea or ocean.',
 'Indonesia is the world''s largest archipelago, with over 17,000 islands.',
 ARRAY['island chain', 'island group', 'atoll', 'reef']),

('geography', 'fjord',  'noun', 'fjord',  'A long, narrow, deep inlet of the sea between high cliffs, formed by glacial erosion.',
 'Norway''s fjords attract millions of visitors each year.',
 ARRAY['inlet', 'bay', 'cove', 'estuary']),

('geography', 'plateau',  'noun', 'pla·teau',  'An area of relatively level high ground elevated above surrounding terrain.',
 'The Tibetan Plateau is often called the roof of the world.',
 ARRAY['tableland', 'upland', 'mesa', 'highland']),

('geography', 'meridian',  'noun', 'me·rid·i·an',  'A circle of constant longitude passing through a given place on the earth''s surface.',
 'The Prime Meridian passes through Greenwich, England.',
 ARRAY['longitude', 'line', 'great circle', 'coordinate']),

-- arts
('arts', 'chiaroscuro',  'noun', 'chi·a·ro·scu·ro',  'The use of strong contrasts of light and shadow in drawing and painting.',
 'Caravaggio''s use of chiaroscuro gave his paintings a dramatic intensity.',
 ARRAY['contrast', 'shading', 'shadow play', 'tonal contrast']),

('arts', 'motif',  'noun', 'mo·tif',  'A recurring element, theme, or design in an artistic or literary work.',
 'The water motif runs throughout the entire novel.',
 ARRAY['theme', 'pattern', 'element', 'design']),

('arts', 'repertoire',  'noun', 'rep·er·toire',  'The range of works that a performer or company regularly performs.',
 'The pianist''s repertoire spans three centuries of classical music.',
 ARRAY['collection', 'range', 'stock', 'selection']),

('arts', 'melancholy',  'adjective', 'mel·an·chol·y',  'Having or expressing a feeling of pensive sadness; thoughtfully sorrowful.',
 'The painting had a melancholy beauty that was difficult to describe.',
 ARRAY['somber', 'wistful', 'pensive', 'sorrowful']),

('arts', 'impresario',  'noun', 'im·pre·sa·ri·o',  'A person who organizes and finances entertainment or performances.',
 'The impresario assembled the finest musicians for the concert.',
 ARRAY['producer', 'promoter', 'organizer', 'director']),

-- technology
('technology', 'algorithm',  'noun', 'al·go·rithm',  'A set of rules or instructions for solving a problem or completing a task.',
 'The recommendation algorithm learns from your listening history.',
 ARRAY['procedure', 'process', 'formula', 'method']),

('technology', 'iterate',  'verb', 'it·er·ate',  'To repeat a process, often refining it toward a desired result.',
 'Engineers iterate on their designs until they find the best solution.',
 ARRAY['repeat', 'cycle', 'refine', 'loop']),

('technology', 'latency',  'noun', 'la·ten·cy',  'The delay before a transfer of data begins; response time in a system.',
 'High latency made the video call feel sluggish and delayed.',
 ARRAY['delay', 'lag', 'pause', 'response time']),

('technology', 'recursion',  'noun', 're·cur·sion',  'A process that calls itself as part of its own operation.',
 'The function uses recursion to work through a tree of nested items.',
 ARRAY['repetition', 'nesting', 'feedback', 'self-reference']),

('technology', 'syntax',  'noun', 'syn·tax',  'The rules governing the structure of statements in a language.',
 'A missing semicolon caused a syntax error that stopped the program.',
 ARRAY['grammar', 'structure', 'form', 'rules']),

-- philosophy
('philosophy', 'dialectic',  'noun', 'di·a·lec·tic',  'The art of investigating truth through discussion and debate; the tension between opposing forces.',
 'Hegel''s dialectic describes history as a series of conflicts and resolutions.',
 ARRAY['debate', 'discourse', 'reasoning', 'logic']),

('philosophy', 'axiom',  'noun', 'ax·i·om',  'A statement regarded as self-evidently true and used as a starting point for reasoning.',
 '"A thing cannot both be and not be" is a foundational axiom of logic.',
 ARRAY['principle', 'truth', 'postulate', 'maxim']),

('philosophy', 'empiricism',  'noun', 'em·pir·i·cism',  'The theory that knowledge comes primarily from sensory experience.',
 'Locke''s empiricism held that the mind begins as a blank slate.',
 ARRAY['observation', 'experience', 'pragmatism', 'experiment']),

('philosophy', 'solipsism',  'noun', 'sol·ip·sism',  'The view that only one''s own mind is certain to exist.',
 'His solipsism made it impossible for him to consider others'' perspectives.',
 ARRAY['self-absorption', 'egocentrism', 'narcissism', 'subjectivism']),

('philosophy', 'sophistry',  'noun', 'soph·is·try',  'The use of clever but misleading arguments; plausible but fallacious reasoning.',
 'The politician''s sophistry convinced many voters but crumbled under scrutiny.',
 ARRAY['fallacy', 'deception', 'manipulation', 'casuistry']),

-- food
('food', 'umami',  'noun', 'u·ma·mi',  'A savory taste sensation found in foods like mushrooms, soy sauce, and aged cheese.',
 'The deep umami of miso soup comes from fermented soybean paste.',
 ARRAY['savory', 'richness', 'depth', 'savoriness']),

('food', 'fermentation',  'noun', 'fer·men·ta·tion',  'The chemical breakdown of a substance by microorganisms, used to make food and drink.',
 'Fermentation transforms simple grapes into complex wine.',
 ARRAY['culturing', 'brewing', 'curing', 'transformation']),

('food', 'gastronomy',  'noun', 'gas·tron·o·my',  'The practice and study of cooking and eating good food.',
 'French gastronomy has been recognized by UNESCO as cultural heritage.',
 ARRAY['cuisine', 'cookery', 'culinary art', 'epicurism']),

('food', 'confit',  'noun', 'con·fit',  'A method of cooking in which food is slowly cooked in fat at low temperature.',
 'Duck confit is a classic of French country cooking.',
 ARRAY['preserve', 'cure', 'braise', 'slow-cook']),

('food', 'provenance',  'noun', 'prov·e·nance',  'The place of origin or history of something; the record of ownership.',
 'The restaurant proudly displays the provenance of each ingredient on the menu.',
 ARRAY['origin', 'source', 'history', 'derivation']);
