-- Tiny Wins catalog: quests, decorations, achievements.
-- Safe to re-run: every insert upserts by id.

insert into public.quest_templates (id, title, description, category, minutes, xp, acorns, icon, pip_line) values
  -- fitness
  ('walk-5',        'Walk for 5 minutes',        'Any pace counts. Around the block, the hallway, or the kitchen.', 'fitness', 5, 15, 8, '🚶', 'Fresh air makes my tail extra fluffy!'),
  ('stretch-3',     'Stretch for 3 minutes',     'Reach up high, touch your toes, roll your shoulders.',             'fitness', 3, 10, 6, '🧘', 'Stretchy squirrel mode: activated.'),
  ('water-glass',   'Drink a glass of water',    'One full glass. Your brain will thank you.',                        'fitness', 1, 10, 5, '💧', 'Hydrated and happy!'),
  ('dance-song',    'Dance to one song',         'Pick a song you love and move however you want.',                   'fitness', 4, 15, 8, '🎵', 'Nobody dances like a squirrel in a hoodie.'),
  ('stairs',        'Take the stairs',           'Skip the elevator once today, or do 2 flights at home.',            'fitness', 3, 12, 7, '🪜', 'Up, up, up, like climbing my tree!'),
  ('pushups-5',     'Do 5 push-ups',             'Knees on the ground totally counts.',                               'fitness', 2, 12, 7, '💪', 'Tiny arms, big heart.'),
  ('outside-10',    'Step outside for 10 minutes','Sit on a step, walk, or just look at the sky.',                    'fitness', 10, 20, 10, '🌤️', 'The forest says hi!'),
  -- study
  ('study-10',      'Study for 10 minutes',      'Set a timer. Just 10 minutes of focus.',                            'study', 10, 20, 10, '📚', 'Ten minutes of brain acorns!'),
  ('read-2-pages',  'Read two pages',            'Any book, article, or notes. Two pages is a win.',                  'study', 5, 12, 7, '📖', 'Ooh, what happens next?'),
  ('flashcards-5',  'Review 5 flashcards',       'Quick review of anything you are learning.',                        'study', 5, 12, 7, '🗂️', 'Remembering things is my superpower.'),
  ('learn-word',    'Learn one new word',        'Look up a word you didn''t know and use it once today.',            'study', 2, 10, 5, '🔤', 'Pip is now very erudite. (That''s the word!)'),
  ('notes-1',       'Rewrite one page of notes', 'Tidy up one page of notes in your own words.',                      'study', 10, 18, 9, '✏️', 'Neat notes, happy brain.'),
  ('watch-lesson',  'Watch one short lesson',    'A short educational video on something you''re curious about.',   'study', 10, 15, 8, '🎓', 'Learning snacks are the best snacks.'),
  -- organization
  ('make-bed',      'Make your bed',             'Pull the covers up. Fluff the pillow. Done!',                       'organization', 2, 10, 6, '🛏️', 'A tidy nest is a happy nest.'),
  ('clean-desk',    'Clean your desk',           'Clear off one surface and put things back where they live.',        'organization', 5, 15, 8, '🧹', 'Where did all this space come from?!'),
  ('plan-tomorrow', 'Write tomorrow''s top 3',  'Three small things you want to do tomorrow.',                       'organization', 3, 12, 7, '📝', 'Future Pip says thank you.'),
  ('dishes',        'Wash 5 dishes',             'Or load the dishwasher. Five is plenty.',                           'organization', 5, 12, 7, '🍽️', 'Sparkly bowls for my acorns!'),
  ('inbox-5',       'Clear 5 messages',          'Archive, reply, or delete five emails or texts.',                   'organization', 5, 12, 7, '📥', 'Ding! Ding! Done.'),
  ('declutter-1',   'Put away 5 things',         'Find five things out of place and give them a home.',               'organization', 3, 10, 6, '📦', 'Everything in its cozy spot.'),
  ('laundry',       'Fold one load of laundry',  'Or just fold five items. Small steps!',                             'organization', 10, 18, 9, '🧺', 'Warm laundry is like a hug.'),
  -- money
  ('track-expense', 'Track one expense',         'Write down one thing you spent money on today.',                    'money', 2, 12, 7, '🧾', 'Every acorn counted!'),
  ('no-spend',      'Skip one impulse buy',      'Notice one thing you wanted and decide to wait.',                   'money', 1, 15, 8, '🛑', 'I saved my acorns for later!'),
  ('check-balance', 'Check your balance',        'Peek at your account. Knowing is half the battle.',                 'money', 2, 10, 6, '🏦', 'Brave squirrel moment.'),
  ('save-small',    'Save a little',             'Move any small amount into savings. Even $1.',                      'money', 2, 15, 8, '🐷', 'My acorn stash grows!'),
  ('cancel-sub',    'Review one subscription',   'Check one subscription. Do you still use it?',                      'money', 5, 15, 8, '🔍', 'Sneaky subscriptions, I see you.'),
  ('pack-snack',    'Pack a snack from home',    'Bring something from home instead of buying it.',                   'money', 5, 12, 7, '🥪', 'Homemade snacks taste like victory.'),
  -- kindness
  ('kind-act',      'Do something kind',         'Hold a door, share a compliment, help someone out.',                'kindness', 2, 15, 8, '💛', 'Kindness makes the whole forest glow.'),
  ('text-friend',   'Text a friend hello',       'Send a quick message to someone you care about.',                   'kindness', 2, 12, 7, '💬', 'They''re going to smile so big.'),
  ('thank-you',     'Say thank you',             'Thank someone for something specific.',                             'kindness', 1, 10, 6, '🙏', 'Gratitude is my favorite flavor.'),
  ('gratitude-3',   'Write 3 good things',       'Three things that went okay today. Tiny ones count.',               'kindness', 3, 12, 7, '🌻', 'Look at all these tiny wins!'),
  ('self-kind',     'Be kind to yourself',       'Say one nice thing to yourself out loud. Really.',                  'kindness', 1, 12, 7, '🫶', 'You''re doing better than you think.'),
  ('help-home',     'Help someone at home',      'Do one small chore for someone else.',                              'kindness', 5, 15, 8, '🏡', 'Teamwork makes the treehouse work.')
on conflict (id) do update set
  title = excluded.title, description = excluded.description, category = excluded.category,
  minutes = excluded.minutes, xp = excluded.xp, acorns = excluded.acorns,
  icon = excluded.icon, pip_line = excluded.pip_line, active = true;

insert into public.shop_items (id, name, description, category, slot, price, unlock_level, is_starter, sort) values
  -- walls & floors
  ('plank-walls',      'Plank Walls',        'Warm wooden walls. Smells like pine.',              'walls',     'wallpaper', 0,   1, true,  10),
  ('sage-stripes',     'Sage Stripes',       'Soft green striped wallpaper.',                     'walls',     'wallpaper', 40,  1, false, 11),
  ('honey-dots',       'Honey Polka Dots',   'Cheerful honey-colored dots.',                      'walls',     'wallpaper', 60,  2, false, 12),
  ('starry-walls',     'Starry Night Walls', 'Deep blue walls with tiny stars.',                  'walls',     'wallpaper', 120, 5, false, 13),
  ('wood-floor',       'Wooden Floor',       'Sturdy oak planks.',                                'walls',     'floor',     0,   1, true,  20),
  ('moss-floor',       'Mossy Floor',        'Soft as a pillow, green as spring.',                'walls',     'floor',     50,  2, false, 21),
  ('checker-floor',    'Checkered Tiles',    'Honey and cream checkerboard.',                     'walls',     'floor',     80,  3, false, 22),
  ('round-window',     'Round Window',       'A peek at the forest outside.',                     'decor',     'window',    0,   1, true,  30),
  ('flower-window',    'Flower Box Window',  'A window with a little flower box.',                'decor',     'window',    60,  2, false, 31),
  ('stained-window',   'Stained Glass Window','Colorful light on sunny days.',                    'decor',     'window',    150, 6, false, 32),
  -- furniture
  ('leaf-bed',         'Leaf Bed',           'A simple bed of soft leaves.',                      'furniture', 'bed',       0,   1, true,  40),
  ('quilt-bed',        'Patchwork Quilt Bed','A real bed with a cozy patchwork quilt.',           'furniture', 'bed',       90,  2, false, 41),
  ('hammock',          'Hammock',            'Swing gently while you dream.',                     'furniture', 'bed',       160, 5, false, 42),
  ('stump-desk',       'Stump Desk',         'A tree-stump desk for big ideas.',                  'furniture', 'desk',      40,  1, false, 50),
  ('study-desk',       'Study Desk',         'A proper desk with a little drawer and a book.',    'furniture', 'desk',      100, 3, false, 51),
  ('plank-shelf',      'Plank Shelf',        'A simple floating shelf.',                          'furniture', 'shelf',     30,  1, false, 60),
  ('book-shelf',       'Book Shelf',         'Full of tiny books.',                               'furniture', 'shelf',     70,  3, false, 61),
  ('trophy-shelf',     'Trophy Shelf',       'Show off your tiny wins.',                          'furniture', 'shelf',     140, 6, false, 62),
  ('round-rug',        'Round Rug',          'A soft round rug.',                                 'decor',     'rug',       20,  1, false, 70),
  ('mushroom-rug',     'Mushroom Rug',       'A red-capped mushroom rug.',                        'decor',     'rug',       60,  2, false, 71),
  ('cloud-rug',        'Cloud Rug',          'Fluffy like a cloud.',                              'decor',     'rug',       110, 4, false, 72),
  -- art
  ('acorn-poster',     'Acorn Poster',       '"One acorn at a time."',                            'decor',     'wall_art',  25,  1, false, 80),
  ('pip-portrait',     'Pip Portrait',       'A very handsome portrait.',                         'decor',     'wall_art',  45,  2, false, 81),
  ('forest-map',       'Forest Map',         'Map of the whole forest.',                          'decor',     'wall_art',  90,  4, false, 82),
  -- lighting
  ('candle',           'Little Candle',      'A tiny flickering light.',                          'lighting',  'lamp',      15,  1, false, 90),
  ('mushroom-lamp',    'Mushroom Lamp',      'A glowing mushroom.',                               'lighting',  'lamp',      55,  2, false, 91),
  ('moon-lamp',        'Moon Lamp',          'A soft glowing moon.',                              'lighting',  'lamp',      130, 5, false, 92),
  ('string-lights',    'String Lights',      'Twinkly lights across the ceiling.',                'lighting',  'lights',    50,  2, false, 100),
  ('paper-lanterns',   'Paper Lanterns',     'Honey-colored paper lanterns.',                     'lighting',  'lights',    80,  3, false, 101),
  ('firefly-jars',     'Firefly Jars',       'Friendly fireflies (they visit by choice).',        'lighting',  'lights',    120, 5, false, 102),
  -- plants
  ('sprout-pot',       'Sprout Pot',         'A brand new sprout. It believes in you.',           'plants',    'plant_left', 10, 1, false, 110),
  ('fern',             'Fern',               'Lush and leafy.',                                   'plants',    'plant_left', 35, 1, false, 111),
  ('monstera',         'Monstera',           'Big leaves, big energy.',                           'plants',    'plant_left', 85, 3, false, 112),
  ('cactus',           'Tiny Cactus',        'Low maintenance. Very supportive.',                 'plants',    'plant_right', 20, 1, false, 120),
  ('succulents',       'Succulent Trio',     'Three little friends.',                             'plants',    'plant_right', 45, 2, false, 121),
  ('bonsai',           'Bonsai Tree',        'A tree inside a treehouse. Very meta.',             'plants',    'plant_right', 120, 5, false, 122)
on conflict (id) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  slot = excluded.slot, price = excluded.price, unlock_level = excluded.unlock_level,
  is_starter = excluded.is_starter, sort = excluded.sort;

insert into public.achievements (id, title, description, icon, metric, category, threshold, acorn_reward, sort) values
  ('first-win',      'First Tiny Win',     'Complete your first quest.',              '🌱', 'quests_completed', null, 1,   10, 10),
  ('quests-10',      'Getting Going',      'Complete 10 quests.',                     '🌿', 'quests_completed', null, 10,  25, 11),
  ('quests-50',      'Acorn Collector',    'Complete 50 quests.',                     '🌳', 'quests_completed', null, 50,  60, 12),
  ('quests-150',     'Forest Legend',      'Complete 150 quests.',                    '🏆', 'quests_completed', null, 150, 150, 13),
  ('days-3',         'Coming Back',        'Show up on 3 different days.',            '☀️', 'days_active',      null, 3,   20, 20),
  ('days-14',        'Part of the Forest', 'Show up on 14 different days.',           '🌤️', 'days_active',      null, 14,  50, 21),
  ('days-30',        'Treehouse Regular',  'Show up on 30 different days.',           '🏡', 'days_active',      null, 30,  100, 22),
  ('rhythm-3',       'Cozy Rhythm',        'Show up 3 days in a row.',                '🎶', 'best_streak',      null, 3,   20, 30),
  ('rhythm-7',       'Week of Wins',       'Show up 7 days in a row.',                '🌈', 'best_streak',      null, 7,   50, 31),
  ('level-3',        'Growing Up',         'Help Pip reach level 3.',                 '⭐', 'level',            null, 3,   15, 40),
  ('level-5',        'Big Little Squirrel','Help Pip reach level 5.',                 '🌟', 'level',            null, 5,   30, 41),
  ('level-10',       'Treehouse Hero',     'Help Pip reach level 10.',                '💫', 'level',            null, 10,  80, 42),
  ('decorator-1',    'Home Sweet Home',    'Buy your first decoration.',              '🪴', 'items_purchased',  null, 1,   10, 50),
  ('decorator-10',   'Interior Designer',  'Buy 10 decorations.',                     '🛋️', 'items_purchased',  null, 10,  60, 51),
  ('fitness-10',     'Zoomies',            'Complete 10 fitness quests.',             '🏃', 'category_quests', 'fitness', 10, 30, 60),
  ('study-10',       'Bookworm',           'Complete 10 study quests.',               '📚', 'category_quests', 'study', 10, 30, 61),
  ('organization-10','Tidy Nest',          'Complete 10 organization quests.',        '🧹', 'category_quests', 'organization', 10, 30, 62),
  ('money-10',       'Acorn Saver',        'Complete 10 money quests.',               '🐷', 'category_quests', 'money', 10, 30, 63),
  ('kindness-10',    'Kind Heart',         'Complete 10 kindness quests.',            '💛', 'category_quests', 'kindness', 10, 30, 64)
on conflict (id) do update set
  title = excluded.title, description = excluded.description, icon = excluded.icon,
  metric = excluded.metric, category = excluded.category, threshold = excluded.threshold,
  acorn_reward = excluded.acorn_reward, sort = excluded.sort;
