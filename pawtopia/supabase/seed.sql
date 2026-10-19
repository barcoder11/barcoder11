-- Pawtopia seed content. Safe to re-run (upserts by slug/key).
-- Maple is fully playable; Ripple, Pebble, Ember and Acorn are "coming soon".
-- All stories are fictional.

-- ---------------------------------------------------------------- settings
insert into public.app_settings (key, value) values
  ('launch', '{"mode": "open", "featured_animal_slug": "maple"}'),
  ('economy', '{
     "welcome_acorns": 50,
     "actions": {
       "comfort": {"xp": 5, "acorns": 5, "cooldown_seconds": 20},
       "snack":   {"xp": 5, "acorns": 5, "cooldown_seconds": 30},
       "play":    {"xp": 8, "acorns": 5, "cooldown_seconds": 30},
       "rest":    {"xp": 3, "acorns": 5, "cooldown_seconds": 45}
     },
     "daily_acorn_actions": 3,
     "daily_xp_cap": 60,
     "first_care_gift_decor": "soft-blanket",
     "level_thresholds": [0, 15, 40, 75, 120, 180, 250, 330, 420, 520]
   }')
on conflict (key) do nothing;

-- ---------------------------------------------------------------- habitats
-- Slot coordinates are percentages of the scene (x from left, y from top,
-- anchored at the item's base). `category` must match decor slot_category.
insert into public.habitats (slug, name, description, scene_style, slots) values
  ('forest-glade', 'Whispering Forest Glade', 'A sun-dappled clearing with mossy roots, ferns and a babbling creek.', 'forest', '[
    {"id": "large-left",   "category": "large",   "label": "Left meadow",       "x": 16, "y": 70, "z": 10},
    {"id": "large-right",  "category": "large",   "label": "Right meadow",      "x": 84, "y": 68, "z": 10},
    {"id": "hanging-left", "category": "hanging", "label": "Low branch",        "x": 24, "y": 30, "z": 20},
    {"id": "hanging-right","category": "hanging", "label": "Oak branch",        "x": 76, "y": 26, "z": 20},
    {"id": "small-1",      "category": "small",   "label": "Mossy corner",      "x": 24, "y": 86, "z": 30},
    {"id": "small-2",      "category": "small",   "label": "By the roots",      "x": 77, "y": 87, "z": 30},
    {"id": "small-3",      "category": "small",   "label": "Clover patch",      "x": 37, "y": 94, "z": 31},
    {"id": "small-4",      "category": "small",   "label": "Pebble path",       "x": 64, "y": 95, "z": 31}
  ]'),
  ('riverbank', 'Willow Riverbank', 'Cool shallows, smooth stones and willow shade for water-loving friends.', 'river', '[
    {"id": "large-left",   "category": "large",   "label": "Willow bend",       "x": 16, "y": 70, "z": 10},
    {"id": "large-right",  "category": "large",   "label": "Reed bed",          "x": 84, "y": 68, "z": 10},
    {"id": "hanging-left", "category": "hanging", "label": "Willow branch",     "x": 24, "y": 30, "z": 20},
    {"id": "hanging-right","category": "hanging", "label": "Alder branch",      "x": 76, "y": 26, "z": 20},
    {"id": "small-1",      "category": "small",   "label": "Sandy spot",        "x": 24, "y": 86, "z": 30},
    {"id": "small-2",      "category": "small",   "label": "Stepping stones",   "x": 77, "y": 87, "z": 30},
    {"id": "small-3",      "category": "small",   "label": "Pebble beach",      "x": 37, "y": 94, "z": 31},
    {"id": "small-4",      "category": "small",   "label": "Mossy log",         "x": 64, "y": 95, "z": 31}
  ]'),
  ('frosty-cove', 'Frosty Cove', 'A chilly, sparkling cove with snowbanks and a cold, clear pool.', 'snow', '[
    {"id": "large-left",   "category": "large",   "label": "Snowbank",          "x": 16, "y": 70, "z": 10},
    {"id": "large-right",  "category": "large",   "label": "Ice ledge",         "x": 84, "y": 68, "z": 10},
    {"id": "hanging-left", "category": "hanging", "label": "Icicle arch",       "x": 24, "y": 30, "z": 20},
    {"id": "hanging-right","category": "hanging", "label": "Frost pole",        "x": 76, "y": 26, "z": 20},
    {"id": "small-1",      "category": "small",   "label": "Snowy corner",      "x": 24, "y": 86, "z": 30},
    {"id": "small-2",      "category": "small",   "label": "Pool edge",         "x": 77, "y": 87, "z": 30},
    {"id": "small-3",      "category": "small",   "label": "Frost patch",       "x": 37, "y": 94, "z": 31},
    {"id": "small-4",      "category": "small",   "label": "Pebble shore",      "x": 64, "y": 95, "z": 31}
  ]')
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, scene_style = excluded.scene_style, slots = excluded.slots;

-- ---------------------------------------------------------------- animals
insert into public.animals (
  slug, name, species, placeholder_style, habitat_slug, tagline, bio, personality_tags, appearance, colors,
  status, featured, sort_order, release_at
) values
  ('maple', 'Maple', 'Raccoon', 'raccoon', 'forest-glade',
   'A curious, slightly shy raccoon who loves shiny pebbles and warm blankets.',
   'Maple was found (in our fictional story) clinging to a floating crate after a spring flood swept through Hollow Creek. Now safe and dry, she is learning that the world can be gentle again. She is curious about everything, a little shy at first, and absolutely cannot resist a shiny pebble.',
   array['curious', 'a little shy', 'gentle', 'pebble collector'],
   'Chestnut fur, a dark face mask, a ringed tail and a tiny cream spot on her forehead.',
   '{"fur": "#8B5A3C", "mask": "#3B2A25", "accent": "#F3E3C3", "belly": "#D9B48F"}',
   'published', true, 10, now()),
  ('ripple', 'Ripple', 'River otter', 'otter', 'riverbank',
   'A bubbly otter who turns every puddle into a party.',
   'Ripple''s fictional story begins on a muddy riverbank after a storm. Coming soon to Pawtopia.',
   array['playful', 'chatty', 'brave'],
   'Glossy brown coat, pale chin and whiskery grin.',
   '{"fur": "#6B4A33", "mask": "#4A3324", "accent": "#E9D7BF", "belly": "#CDB497"}',
   'coming_soon', false, 20, null),
  ('pebble', 'Pebble', 'Penguin', 'penguin', 'frosty-cove',
   'A tiny penguin with big waddles and an even bigger heart.',
   'Pebble''s fictional cold-water rescue story is coming soon.',
   array['determined', 'sweet', 'clumsy'],
   'Classic tuxedo with a little yellow blush on the cheeks.',
   '{"fur": "#24303A", "mask": "#24303A", "accent": "#F6C445", "belly": "#F8F6F0"}',
   'coming_soon', false, 30, null),
  ('ember', 'Ember', 'Red fox', 'fox', 'forest-glade',
   'A watchful fox with a fluffy tail and a soft spot for sunsets.',
   'Ember''s fictional forest evacuation story is coming soon.',
   array['watchful', 'loyal', 'quick'],
   'Ember-orange coat, white tail tip and dark socks.',
   '{"fur": "#D46A2E", "mask": "#F5E6D3", "accent": "#FFFFFF", "belly": "#F5E6D3"}',
   'coming_soon', false, 40, null),
  ('acorn', 'Acorn', 'Red squirrel', 'squirrel', 'forest-glade',
   'A busy little squirrel who never forgets where the snacks are hidden.',
   'Acorn''s fictional tree-top rescue story is coming soon.',
   array['busy', 'clever', 'cheeky'],
   'Russet fur, tufted ears and a tail like a question mark.',
   '{"fur": "#B5562B", "mask": "#B5562B", "accent": "#F2DDC1", "belly": "#F2DDC1"}',
   'coming_soon', false, 50, null)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------- rescue episodes
insert into public.rescue_stories (
  slug, animal_id, title, synopsis, story_body, season, episode, status, ai_fiction_disclosure
)
select 'maple-flood-rescue', a.id, 'Maple and the Hollow Creek Flood',
  'When spring floodwater rose around Hollow Creek, a tiny raccoon clung to a floating crate — until gentle hands brought her somewhere warm.',
  'In this fictional AI-generated story, rescuers spot a small raccoon riding a wooden crate through the flooded lanes of Hollow Creek. Wrapped in a soft towel and carried to safety, she is given a name that matches her chestnut fur: Maple. Her next chapter starts here, in Pawtopia — where you can virtually adopt her, help her feel safe, and build her a cozy forest home.',
  1, 1, 'published', true
from public.animals a where a.slug = 'maple'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------- Maple's recovery chapters
insert into public.story_chapters (animal_id, ordinal, phase, title, body, unlock_bond_xp)
select a.id, c.ordinal, c.phase::public.recovery_phase, c.title, c.body, c.xp
from public.animals a
cross join (values
  (1, 'arrival', 'A Warm, Dry Corner', 0,
   'The rain has stopped. Maple peeks out from a nest of soft blankets and sniffs the air: pine needles, warm clay, and something sweet. Nobody is rushing her. For the first time in days, her paws are dry. She curls her ringed tail around her nose and listens to the creek — gentle now, just a whisper. Maybe, she thinks, this place is okay.'),
  (2, 'feeling_safe', 'The First Sniff', 25,
   'Today Maple tiptoed all the way to the edge of the clearing and back again — twice! She found a smooth grey pebble by the roots and carried it home like treasure. When you said her name, her ears swivelled toward you. She did not run. She blinked slowly, the way raccoons do when they are starting to feel safe.'),
  (3, 'learning_to_trust', 'Pebble Gifts', 70,
   'Maple has started leaving little gifts by your feet: a pebble, a leaf, one very confused beetle (who was gently returned to the ferns). She chirrs softly when you visit and has decided the blanket corner is officially hers. She is still a little shy, but she trusts you — and that is the bravest thing of all.'),
  (4, 'thriving', 'The Great Acorn Hunt', 140,
   'Maple is unstoppable. She splashes in the shallows, climbs the old oak like it is a staircase, and has organised her pebble collection by size. The other forest critters peek into the glade to watch her play. The flood feels like a story from long ago. Now there is sunshine, snacks, and a friend who always comes back.'),
  (5, 'new_beginning', 'Moonlight on the Creek', 240,
   'On a silver-bright night, Maple sits on the big mossy stone and looks out at the forest. She is strong now — strong enough for adventures of her own. In this fictional story she wanders to the creek''s edge, turns back once to chirr goodbye, and then explores the moonlit woods. But a sanctuary is forever: Maple will always have a home in your Memory Meadow, and she visits whenever you call.')
) as c(ordinal, phase, title, xp, body)
where a.slug = 'maple'
on conflict (animal_id, ordinal) do nothing;

-- ---------------------------------------------------------------- decorations
insert into public.decor_catalog (slug, name, description, price, slot_category, habitat_tags, art_key, sort_order) values
  ('soft-blanket', 'Soft Blanket', 'A cozy quilted blanket for afternoon naps.', 25, 'small', array['forest-glade', 'riverbank', 'frosty-cove'], 'blanket', 10),
  ('food-bowl', 'Woodland Bowl', 'A carved wooden bowl, always mysteriously full of berries.', 15, 'small', array['forest-glade', 'riverbank', 'frosty-cove'], 'bowl', 20),
  ('flower-patch', 'Wildflower Patch', 'A cheerful burst of daisies and bluebells.', 20, 'small', array['forest-glade', 'riverbank'], 'flowers', 30),
  ('toy-ball', 'Bouncy Ball', 'A soft, bouncy ball for zoomies.', 30, 'small', array['forest-glade', 'riverbank', 'frosty-cove'], 'ball', 40),
  ('lantern', 'Firefly Lantern', 'A glowing lantern that hums softly at dusk.', 40, 'hanging', array['forest-glade', 'riverbank', 'frosty-cove'], 'lantern', 50),
  ('leaf-bunting', 'Leaf Bunting', 'A string of felt leaves that flutters in the breeze.', 35, 'hanging', array['forest-glade', 'riverbank'], 'bunting', 60),
  ('small-tree', 'Little Maple Tree', 'A young tree with red-gold leaves. Perfect for climbing practice.', 60, 'large', array['forest-glade', 'riverbank'], 'tree', 70),
  ('cozy-den', 'Cozy Log Den', 'A hollow log lined with moss — the ultimate hideaway.', 70, 'large', array['forest-glade'], 'den', 80),
  ('lily-pond', 'Lily Pond', 'A tiny pond with lily pads and a curious frog.', 80, 'large', array['forest-glade', 'riverbank'], 'pond', 90)
on conflict (slug) do nothing;
