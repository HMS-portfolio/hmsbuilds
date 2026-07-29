# Arena photos (About · constellation)

Drop a photo in here using the exact filename below and it appears automatically —
no code change needed. Hovering that star on the About page washes the photo in
behind the constellation.

| Star                                | Filename                                                           | Status     |
|-------------------------------------|--------------------------------------------------------------------|------------|
| Horsemanship                        | `horsemanship-4/-5/-6.webp` then `horsemanship.webp` · `-2` · `-3`  | live (6)   |
| Wrestling · Jiu-jitsu · Kickboxing  | `mma.webp` · `mma-2.webp`                                           | live (2)   |
| Wildlife & Outdoors                 | `outdoors.webp` · `-2` · `-3` · `-4` · `-5`                         | live (5)   |
| Hunting                             | `hunting.webp` · `hunting-2.webp`                                   | live (2)   |
| Archery                             | `archery.webp`                                                      | empty slot |
| Soccer                              | `soccer.webp`                                                       | empty slot |
| Golf                                | `golf.webp`                                                         | empty slot |
| Tennis                              | `tennis.webp`                                                       | empty slot |

Two stars on the **work** side now carry photos too. Those live with their
projects rather than here, and are named directly in `index.html`:

| Star                | Files                                                      |
|---------------------|------------------------------------------------------------|
| AI native builds    | `assets/paperly/paperly-1.jpeg` · `paperly-2.jpeg`          |
| STEM & engineering  | `assets/misti/misti-1.jpg` · `misti-9.jpg` · `misti-4.jpg`  |

**The three combat stars share the `mma.*` photos.** They are one pursuit, and both photos are
team shots of the gym rather than of a single discipline, so assigning one to each would invent
a distinction the images do not contain. Useful side effect: `about.js` keys its rotation
counter on the *first* filename in the list, so all three share one counter and moving between
them alternates the photos instead of repeating the same frame.

An empty slot is invisible to visitors: `js/about.js` checks whether the file
loads and simply skips the photo wash if it is missing, so the star still lights
normally. Slots can stay empty indefinitely.
**List only files that exist** — a missing name still takes its turn in the
rotation, so that hover would show nothing at all.

## Several photos for one star

A star can hold more than one photo. Each hover shows the next one in the list,
so a second look is rewarded with a different frame. Horsemanship runs six.
To give another star the same treatment, list the files comma-separated in that
star's `data-photo` in `index.html`:

```html
data-photo="assets/arenas/archery.webp, assets/arenas/archery-2.webp"
```

Order matters: the **first file is the first hover**, so lead with the frame
that holds up best.

## Preparing a photo

These are the numbers that make the difference between sharp and soft here, and
they are not obvious:

- **The wash renders at most 1166 × 784 CSS px**, which is **2332 × 1568 device
  pixels** on a retina screen. That is the ceiling. Pixels beyond it cannot be
  displayed; a source below it gets stretched.
- **`background-size: cover` on a landscape box makes WIDTH the binding
  dimension for a portrait photo.** A 1536px-wide portrait is stretched 1.5×; a
  788px-wide one is stretched 3×. This, not compression, is what reads as
  blur — so **the width of the original is the number that matters**, and a
  photo exported at "medium" size from Photos, or sent through AirDrop or
  Messages, has usually already lost it. Export originals.
- **Files here are pre-cropped to the wash's 1.487 aspect ratio**, framed on the
  subject, so `cover` has nothing left to crop. That is why the skulls in
  `hunting.webp` sit centred rather than falling out of the bottom of the frame,
  which is where a plain centre crop would have left them.
- **Where in the source you take that crop is a decision, not a default.**
  `horsemanship-6.webp` was first cut off the TOP of its 1179×1469 original,
  which put the mountain in shot and severed the horse at the knees; riding is
  the subject, so it is now taken bottom-aligned (y 676–1469) and reaches the
  hooves. `hunting-2.webp` is y 160–779 of its portrait original, which holds
  the horns and the full quiver and drops a foreground of grass that reads as
  mush at 30% opacity anyway.
- **WebP, quality 92**, encoded once from the camera original — visually
  indistinguishable from the source on photographic content, at roughly half the
  bytes of the equivalent JPEG.
- Nothing is ever upscaled: enlarging a small source adds bytes, not detail.
- **Strip EXIF orientation by applying it.** `Outdoors.jpeg` was stored 1179×2189
  with orientation tag 8, meaning it *displays* as 2189×1179. Re-encoding without
  honouring the tag first bakes in a 90° rotation.

Camera originals are kept in `_originals/`, which is excluded from both git and
the Vercel deploy — so a future re-crop never has to go back to the phone.

## Notes

- It renders as a dim, edge-faded wash (30% opacity, radial mask) — atmosphere
  behind the stars, not a gallery. Fine detail never reads.
- **Hidden below 720px wide.** On phones the constellation drops to a plain grid
  and the wash is switched off entirely, so these files never load on mobile.
- Photos load lazily, one per hover, and are cached after the first look, so the
  folder's total size is not a page-load cost.
