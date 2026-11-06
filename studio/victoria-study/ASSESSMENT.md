# Victoria-only quality gate and pipeline assessment

Status: **no replacement Victoria model has passed the visual gate**. No new avatar is presented as an improvement in this assessment. The existing studio, models, rigs, controls and production artwork were left unchanged.

## Why the current model fails the approved reference

1. The lower face is broad and blunt; the reference has cheek volume flowing into a smaller chin.
2. Eye whites read as surface patches inside the lenses, with insufficient socket and eyelid anatomy.
3. Glasses are tubular ovals; the reference has fitted, shaped tortoiseshell frames and a different bridge/upper contour.
4. Nose structure is reduced to a bump and dots rather than integrated bridge, tip and alar planes.
5. The mouth is a curved incision, missing lip volumes and the cheek interaction of the warm smile.
6. The exposed neck reads as a post with a hard jaw transition rather than a short anatomical neck/shoulder region.
7. The crown is a triangular cap with comb-like ribs and a visibly flat panel, unlike swept centre-part roots.
8. Long hair uses repetitive parallel ribbon masses and similar ends rather than varied overlapping S-waves.
9. The top has squared shoulders, straight sleeve profiles and an artificial hem rather than fitted fabric around soft anatomy.
10. Jeans have rectangular hip shelves and a dark V-shaped seat/crotch; the reference has a coherent pelvis, fly, yoke and seat.
11. Leg volumes and repeated diagonal folds look padded rather than shaped by gravity and pooling over shoes.
12. Hands lack fleshy knuckles, tapered phalanges and a relaxed pose.
13. Sneakers lack the reference's structured vamp, tongue, heel and sole proportions.
14. Materials and lighting do not supply the reference's fine fabric, nuanced skin and polished animated-character finish.

Changing the software from Three.js to Blender while retaining Gaussian heads, ring lofts, voxel unions and repeated sweeps did not fundamentally change the authoring approach. The previous `blender/rebuild.py` must not be used as the basis for another claimed likeness pass.

## Verified alternative foundation

Official MakeHuman / MPFB offers an anatomical, subdivision-compatible base rather than assembled primitives:

- Repository: https://github.com/makehumancommunity/mpfb2
- Inspected revision: `6ff1eb358f6c1959ced77e79e6dd2406d9a71f49`
- Base mesh: `src/mpfb/data/3dobjs/base.obj`
- Visible body: 13,380 vertices and 13,378 quad faces in one connected component, including face, neck, shoulders, hands and individual fingers.
- Hand-authored targets provide facial and body edits; the asset/output license is CC0. The add-on program code is GPLv3 separately: https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md
- Sculpt preparation workflow: https://github.com/makehumancommunity/mpfb2/blob/master/docs/ui/operations/sculpt.md
- Installed Blender 4.3.2 meets MPFB's Blender 4.2+ requirement.

This is a credible anatomy foundation, **not a finished Victoria or a source of automatic reference likeness**. An unmodified base or a few preset morphs would fail the same art-direction requirement. Deliberate sculpting, primary/secondary hair design, separate garment topology/drape, footwear construction and material authoring remain necessary.

Professionally authored Blender Studio Snow/Rain/Ellie assets are candidates for assessment, not yet selected or downloaded. Requests to `studio.blender.org` and `download.blender.org` returned proxy `403 Forbidden` at CONNECT. Their current downloads, licensing and suitability cannot yet be verified. No unverified mirror was substituted. A network configuration draft adds only those two domains, preserving existing presets. Saving the draft does not apply it to the runtime.

## Missing reference input

The original approved image is visible inline in the conversation but is not mounted as an accessible PNG/JPG file. Searches of the repository, `/workspace` upload/download locations, `/tmp` and `/mnt/data` found only generated project images. There is no source image available to place **unchanged** in the left panel of the requested triptych or to register facial/silhouette landmarks against.

The original must be supplied as an actual image file. Do not generate a substitute, use a previous avatar as the reference, or present another old/new comparison as the requested reference comparison.

## Visual pass criteria

1. Reference-registered front and profile silhouette/landmarks: head/chin widths, eye opening and spacing, neck/shoulders, torso, waist and shoe ratios.
2. Clay face closeups: integrated eye sockets/lids, nose/nostril structure, lips and cheek expression before glasses/hair can obscure deficiencies.
3. Hair: reference-specific primary masses, centre part and varying directional layers from front, three-quarter and back; no cap panel or repetitive worm/ribbon silhouette.
4. Garments/anatomy: fitted navy top, anatomically coherent low-rise jeans seat/crotch, gravity-shaped volume/pooling, and credible hands/shoes.
5. Unchanged-original/current/new triptych and face/hair/clothing/shoe closeups at normalized scale; five explicit remaining differences and an aesthetic pass/fail.

The current evidence fails these gates. No rigging, animation, exporting or UI work belongs in the next modeling stage. Blender can support professional character authoring; the unresolved capability is reference-directed sculpting and art direction, not the ability to render or export a mesh. Asset access and reference registration are prerequisites, not promises that the final aesthetic will be achieved.
