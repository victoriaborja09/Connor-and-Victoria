# Sabbtical · Connor & Victoria

An interactive, editable scrapbook landing page built with **HTML, CSS, and JavaScript**, matching the user's original reference photos. No bundler, design subscription, or AI credits needed.

## Bounded 3D boardwalk (preview)

Visit `world3d.html` for a perspective Three.js environment with **actual 3D boardwalk, two articulated 3D walking characters, camera tilt, limited side-to-side camera yaw, zoom, and finite world boundaries**. Walk with WASD or arrows; drag to look up/down or slightly left/right; scroll to zoom. Mobile has a four-direction D-pad. Switch characters, toggle town overview, and approach a store to explore its placeholder content.

The **original approved `assets/storefront-scene.webp` artwork** is used as the visible front-only world-space facade behind the walkable 3D ground. This preserves the storefront art instead of replacing it with generic procedural buildings. The sides and backs of the stores are intentionally not modeled; camera yaw is bounded to the playable frontage. The facades are presently projected artwork rather than individually sculpted meshes; this is a visual prototype, not yet the final detailed 3D architecture. The original `index.html` remains unchanged.

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