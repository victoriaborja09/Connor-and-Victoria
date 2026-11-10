# Sabbtical · Connor & Victoria

An interactive, editable scrapbook landing page built with **HTML, CSS, and JavaScript**, matching the user's original reference photos. No bundler, design subscription, or AI credits needed.

## Playable illustrated boardwalk (preview)

Open `world3d.html` (or `/Connor-and-Victoria/world3d.html` on GitHub Pages). This preview preserves the original `assets/storefront-scene.webp` **pixel for pixel**, including all three storefronts, signage, awnings, mountains, and sea. The artwork is a fixed perspective, not a freely rotating 3D environment.

Victoria and Connor are **real, animated Three.js 3D meshes** composited over the original illustration. Use **left/right arrows** or **A/D** to walk along the bounded boardwalk, and use the on-screen left/right buttons on touchscreens. The other character follows. **View town** reveals the full original illustration; **Return to street** returns to the walkable close-up. Switch between the characters using the top-right control. Approach a store and press **E** or click **Explore** to open its placeholder content. In overview, the three storefronts can be clicked directly.

The 3D avatars are early prototypes and not yet a final artistic match to the illustrated town. The storefronts are **not 3D meshes**: this is an intentional 2.5D composition to preserve the original design. No interior has been implemented yet. The original `index.html` and its existing street navigation remain unchanged. The page loads version-pinned Three.js from jsDelivr and needs WebGL/network access.

To preview locally, run `python3 -m http.server 8000` and visit `http://localhost:8000/world3d.html`.

## Run locally

Open `index.html` in your browser, or serve the folder locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## What is editable today?

Press the discreet **Edit page** button at the bottom-right of the page.

- Change the two editable title lines and their font size.
- Replace each of the three blank scrapbook photo areas with your own photograph.
- Adjust crop/zoom of each photograph.
- Give each photo-frame a destination URL and accessible name.
- Optionally show a navigation label (off by default).
- Replace the burgundy fabric background, then restore the original texture.
- Download and import a backup of your settings and photographs.

The navigation frames lift on hover. Everything remains blank until the user supplies photos.

### Important: browser-only persistence

**This first version intentionally saves to `localStorage` on each device, not to a shared database.** Edits are browser-local and are not visible to Connor or other devices. Export a backup before clearing browser data. The editor does not have authentication and should not be mistaken for private cloud storage. In the next milestone, add Supabase Auth and a separate Sabbtical database with row-level security, plus image uploads into a private storage bucket. Do not store bookings, addresses, personal itineraries or other private travel information in a public GitHub repository or public JSON file.

## Deploy

This source lives in `victoriaborja09/Connor-and-Victoria`, which is currently a public repository. For free personal hosting, import this repo into Vercel (Hobby) or a similar static host and deploy from `main`; no build command is necessary. Static hosting does **not** make the page private; only deploy after choosing whether it may be publicly accessible. Do not upload private travel data to the static site.

**Important:** The in-browser editor is currently *local-only* and not access-controlled. Any visitor with access to the site can open Edit Mode, but changes remain isolated to their browser. Private shared editing will require Supabase Auth and row-level security.

Once a new GitHub repo exists, ChatGPT's connected GitHub tools can maintain the code in that repository without needing Figma.

## Assets

- `assets/burgundy-fabric.webp`: repeated fabric texture derived from the real burgundy fabric in the provided photo. Not AI-generated.
- `assets/photo_frame_*_photo_window.webp`: transparent paper + star border cutouts from the user's reference, with real material texture and transparent windows for future photographs.
- `assets/kraft-paper.webp`: brown paper grain from the original photograph.
- `assets/gold_star_*.webp`: individually extracted metallic gold stickers with transparent surroundings.

## Next milestones

1. Connect a **separate Sabbtical Supabase project**, with approved member access for Victoria and Connor (email magic links / invitation flow), row-level security, and secure image storage.
2. Sync edits between the two accounts. Keep the public homepage separate from their private planning content.
3. Add the eventual trip planning/calendar pages one by one.

## File layout

- `index.html` — scrapbook markup + Edit Mode form
- `styles.css` — responsive visual design, texture and hover effects
- `app.js` — image upload, cropping, editing, local saving, and backups
- `assets/` — source-photo-based textures, cutout frames, gold stars