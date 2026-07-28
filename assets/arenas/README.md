# Arena photos (About · constellation)

Drop a photo in here using the exact filename below and it appears automatically —
no code change needed. Hovering that sport's star on the About page washes the
photo in behind the constellation.

| Star                                | Filename                                                  | Status     |
|-------------------------------------|-----------------------------------------------------------|------------|
| Horsemanship                        | `horsemanship.jpg` · `horsemanship-2.jpg` · `horsemanship-3.jpg` | live       |
| Wrestling · Jiu-jitsu · Kickboxing  | `mma.jpg` · `mma-2.jpg`                                   | live       |
| Archery                             | `archery.jpg`                                             | empty slot |
| Hunting                             | `hunting.jpg`                                             | empty slot |
| Wildlife                            | `wildlife.jpg`                                            | empty slot |
| Soccer                              | `soccer.jpg`                                              | empty slot |
| Golf                                | `golf.jpg`                                                | empty slot |
| Tennis                              | `tennis.jpg`                                              | empty slot |

**The three combat stars share the `mma.*` photos.** They are one pursuit, and both photos are
team shots of the gym rather than of a single discipline, so assigning one to each would invent
a distinction the images do not contain. Useful side effect: `about.js` keys its rotation
counter on the *first* filename in the list, so all three share one counter and moving between
them alternates the photos instead of repeating the same frame.

To give one discipline its own photo later, point that star's `data-photo` at a new file.
**List only files that exist** — a missing name still takes its turn in the rotation, so that
hover would show nothing at all.

An empty slot is invisible to visitors: `js/about.js` checks whether the file
loads and simply skips the photo wash if it is missing, so the star still lights
normally. Slots can stay empty indefinitely.

## Several photos for one star

A star can hold more than one photo. Each hover shows the next one in the list,
so a second look is rewarded with a different frame. Horsemanship already does
this with three. To give another sport the same treatment, list the files
comma-separated in that star's `data-photo` in `index.html`:

```html
data-photo="assets/arenas/archery.jpg, assets/arenas/archery-2.jpg"
```

## Notes

- **The middle third is what shows.** The wash is a wide band, so a portrait
  photo is cropped to roughly 33%–67% of its height, centred. Keep the subject
  near the vertical middle. Landscape photos lose the least.
- It renders as a dim, edge-faded wash (30% opacity, radial mask) — atmosphere
  behind the stars, not a gallery. Fine detail never reads.
- **Hidden below 720px wide.** On phones the constellation drops to a plain
  grid and the wash is switched off entirely.
- **`.jpg` only**, named exactly as above. HEIC and PNG will not be picked up;
  convert first (Preview → File → Export → JPEG).
- **Resize before adding.** ~1400px on the long edge at quality ~70 is plenty
  and keeps the page fast. `sips -s format jpeg -s formatOptions 72 -Z 1400 in.png --out out.jpg`
