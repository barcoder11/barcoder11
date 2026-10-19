# Character & art assets

All character art in the app today is **placeholder SVG** (drawn in code, clearly labelled
"Placeholder art" in the UI). It is not meant as final art and doesn't try to imitate your
videos' look. Uploading official assets replaces it per state, with no code changes.

## Slots per animal (upload at `/admin/animals/<id>`)

| State | Used for | Recommended |
|---|---|---|
| `idle` | Default pose everywhere (room, cards, sanctuary) | Transparent PNG/WebP, ~1024×1024, character centred, feet near bottom |
| `happy` | Rescue page hero, adoption screen | Same framing as idle |
| `comforted` | After **Comfort** | Same framing |
| `snacking` | After **Snack** | Same framing |
| `playing` | After **Play** | Same framing |
| `resting` | After **Rest** | Same framing |
| `avatar` | Fallback portrait | Transparent square |
| `cover` | Social/landing imagery | 4:5 or 1:1 JPEG/WebP |
| `poster` | Rescue page poster (when no teaser) | 4:5 JPEG/WebP |
| `teaser` | Rescue page autoplay loop (muted) | 6–12 s MP4/WebM, 4:5 or 9:16, ≤50 MB |

Short looping MP4/WebM clips also work for any animation state. Missing states fall back
to `idle`, then `avatar`, then placeholder art.

Keep framing identical between states (same canvas size and baseline) so switching
states doesn't make the character jump. Add alt text (required) and credits/licence
notes (private) for every upload.

## Consistency

Record each character's distinctive markings in the animal's *Appearance* field (e.g.
Maple: chestnut fur, dark mask, ringed tail, tiny cream forehead spot) and use it as the
reference for both video generation and game sprites.

## Decorations & backgrounds

Decorations (`decor_catalog.art_key`) and habitat backdrops are placeholder SVGs in
`src/components/art/`. To replace them with commissioned art, set
`decor_catalog.asset_path` / `habitats.background_path` and render those images in
`DecorArt` / `SceneBackdrop` (a small code change; deferred until art exists).
