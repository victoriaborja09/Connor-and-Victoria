# Reference comparison — Blender visual rebuild

The original custom-cartoon reference in the conversation is the design source. The source image is visible in the conversation but is not available as a file in this workspace. `before-after.png` therefore compares the **previous and rebuilt 3D meshes**, not the reference pixels. The table below directly compares the reference's visible design with the rebuilt meshes. No generated image is substituted for the reference.

## Initial comparison, before editing

1. The previous eye openings were oversized circular surfaces with an exposed, staring appearance.
2. Glasses were too broad and thick, dominating the faces.
3. Connor's lower head and chin were flat/box-like instead of softly elongated.
4. Victoria lacked the reference's cheek volume and small oval chin.
5. Nose, cheek and brow surfaces did not flow into one sculpted face.
6. Lips and smile lines read as attached tubes.
7. Stubble appeared as scattered floating dots rather than short hair seated on skin.
8. Connor's repeated upright hair pieces had a rigid, spiked/worm-like silhouette.
9. Victoria's hair read as a smooth hood, missing centre-part flow and temple layering.
10. Necks appeared post-like and shoulder/sleeve joins had abrupt corners.
11. Arms had uniform straight silhouettes and hands lacked relaxed, separate finger shapes.
12. Jeans had overlapping seat panels, gaps and straight tube-shaped legs.
13. Garments lacked clear collar/cuff/waistband construction and local compression folds.
14. Sneakers had inflated toes and obscured/weak stripes, laces and sole construction.

## Rebuild and iteration

The runtime surface generator was replaced with Blender-authored mesh assets. Browser front/profile/back reviews drove multiple rebuilds: face length and eye stand-off were corrected; female sleeve clearance was increased; baked denim color space was corrected; fingers were separated from voxel smoothing; hair roots/tips, rear coverage, crown layering and shadow artifacts were reworked; the crotch surface and leg separation were refined; sneaker stripes and laces were fitted to the upper surface.

| Reference feature                               | Rebuilt mesh / remaining difference                                                                                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connor: soft, slightly elongated head           | Closed sculpted surface with a broader soft jaw and a distinct male head aspect ratio; personal facial likeness remains approximate.                                                                                |
| Victoria: oval face, defined cheeks, small chin | Distinct oval dimensions and chin taper, cheek displacement and restrained cheek color; still simpler than the approved sculpt.                                                                                     |
| Smaller brown eyes, fitted glasses              | Recessed almond surfaces, shaped lids, restrained brown irises, smaller rectangular black and brown frames; the exact expression and frame contour still differ.                                                    |
| Dimensional nose and gentle smile               | Nose bridge/tip are part of the head surface; thin seated lip surfaces and an asymmetric smile replace the previous tubes. The facial sculpt remains less nuanced than the reference.                               |
| Subtle stubble                                  | Fine short geometry follows the head surface, supported by a muted lower-face color gradient.                                                                                                                       |
| Connor: thick tousled waves                     | Continuous cap with unequal, embedded curved locks and an irregular hairline. The distribution is still procedural and does not exactly match the reference's swept curls.                                          |
| Victoria: centre part, voluminous long waves    | Fitted combed crown, face-framing and temple layers, S-shaped rear waves; sculpted clump flow still requires individual refinement.                                                                                 |
| Connected necks and soft shoulders              | Joined shirt shoulder topology and shaped neck surfaces; the neckline and upper-body proportions remain stylized approximations.                                                                                    |
| Natural arms and hands                          | Shaped upper arm/elbow/forearm/wrist profiles, joined palms, separate curved fingers and thumbs. The original rig is retained; no finger rig was added.                                                             |
| Relaxed white tee / fitted cropped navy top     | Connected sleeves, collar/cuff geometry, shaped waist and small fabric displacements; cloth drape is authored rather than simulated.                                                                                |
| Baggy brown / low-rise pale-blue denim          | One joined trouser mesh per character, modeled knee/ankle folds, lower crotch and separated legs, embedded woven texture, curved pockets and fine stitching. Individual reference folds are not reproduced exactly. |
| Brown/green sneakers with white stripes         | Low-profile shaped upper, layered outsole, toe stitching, curved stripes, exposed laces and tongue; exact branded shoe construction is not claimed.                                                                 |
| Gold necklace                                   | Thin dimensional chain and small star pendant retained.                                                                                                                                                             |
| Premium soft rendering                          | Smooth subdivided/relaxed geometry, warm vertex-colored skin, restrained hair materials and reduced facial shadow artifacts. Real-time rendering still falls short of the supplied film-quality shading.            |

## Readiness

This is a substantial model rebuild with real geometry and retained interactive behavior. It is **not a reference-faithful finished likeness**. The facial individuality, sophisticated hair design, cloth drape and final material/shading polish remain the principal limitations. Functional tests do not establish aesthetic approval. Production art and the original studio interface remain unchanged.
