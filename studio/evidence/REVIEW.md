# Visual and functional review

Tested on 2026-11-06 in Chromium using software WebGL in the cloud environment. This is a procedural review study, not an approved recreation of the reference.

## Evidence

- `front.png`, `side.png`, `back.png`: inspected model silhouettes and face / hair / outfit geometry. Side-view staging separates the models so both profiles can be examined. Names follow their screen positions.
- `wave.png`, `walk.png`: articulated skeleton poses.
- `mobile.png`: 390px-wide responsive layout, no horizontal overflow.
- `front-intermediate.png`: intermediate geometry for comparison; not the delivered mesh.

## Passed functional checks

- Both characters load as real independent geometry with weighted skeletal meshes.
- Selecting Connor and waving changes Connor's action without changing Victoria's action.
- Wave pose bends the elbow; walking alternates thigh rotations.
- Full 360° turn and 180° target, opposed head turns, completed store-entry movement.
- GLB export includes two unique 17-bone skeletons, skin weights and 12 animation clips.
- Export re-imports with GLTFLoader; skeletons and animation playback have finite, plausible bounds.
- Responsive mobile layout.
- Inactive town adapter mounts inside the existing scene transform, preserves bookstore zoom, supports action dispatch and disposes its canvas.
- No browser JavaScript errors during the functional suite.
- JavaScript syntax checks pass for model, studio and adapter modules.
- Existing production source and illustration files are unchanged.

## Manual assessment against the reference

Necks connect into the torsos and heads. Limbs use continuous skinned surfaces rather than separate capsules. Shoulder blending was inspected in a raised-arm pose. Glasses have real rims, bridges and temples. Hair, clothing, pockets and footwear have depth in side/back views. Outfit palette and relative height are represented. Jeans overlap through the upper-leg seam to avoid a visible gap.

The models do **not** meet the supplied reference's visual quality. Faces remain simplified and more staring than the reference, hair lacks its natural asymmetry and soft sculpted waves, shoulder shapes and garment folds remain artificial, and shoes/accessories need greater accuracy. These are substantial modeling refinements, not merely lighting differences. Do not treat passing functional tests as visual approval. Final production integration remains inactive.

## Practical limits

The pair is approximately 10 MB as a GLB. The studio measured about 381,000 rendered triangles (including rendering passes) and 80 draw calls in the test renderer. Material batching is enabled and pixel ratio is capped, but actual phone/GPU frame rate and memory use have not been benchmarked. There is no IK, collision avoidance, individually rigged fingers, facial animation or cloth simulation. The doorway adapter's clipping plane requires an artist-reviewed mask/alignment against the original illustration before activation.
