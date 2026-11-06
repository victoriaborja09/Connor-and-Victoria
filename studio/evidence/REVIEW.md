# Visual rebuild review

The current revision replaces the previous runtime surface generator with Blender-authored character meshes. It preserves the existing 17-bone skeletons, bone rest positions, action functions, controls and studio interface. The original storefront source and illustration are unchanged.

## Visual evidence

- `sculpt-front.png`: full-body front view, actual browser WebGL pixels.
- `sculpt-three-quarter.png`, `sculpt-side.png`, `sculpt-back.png`: additional required views.
- `sculpt-faces.png`: facial close-up.
- `before-after.png`: previous and rebuilt models with the same orthographic review camera and lights.
- `before-blender-front.png`, `before-blender-faces.png`: original geometry rendered through a test-only module override; no application files were reverted.
- `sculpt-intermediate-front.png`: an intermediate Blender pass, not the final mesh.
- `wave.png`, `walk.png`, `mobile.png`: the existing studio regression views.
- `REFERENCE-COMPARISON.md`: 14 initial differences, reference-specific comparison and remaining limitations.

The orthographic review camera exists only in the capture script; no presets, UI controls or animation features were added to the website. The comparison image contains previous versus rebuilt meshes. The original chat reference is not mounted as a source image file, so its pixels are not included in the composite.

## Rebuild verification

JavaScript syntax checks pass. Source comparison confirms that `setAction` and `animateCharacter` are unchanged and all original bones, parents and rest positions are retained. Skin weights were reassigned to the rebuilt surfaces; continuous four-influence blending across the shirt armpit and upper trouser seam removes hard deformation boundaries. The raised-arm screenshot was inspected after that correction.

The browser suite verifies the existing independent action dispatch, weighted geometry, articulated elbow and alternating leg poses, 180/360 turns, opposed head turns, entry completion, GLB export, unique skeletons and 12 clips, GLB re-import/playback, finite bounds, mobile layout, and inactive town-adapter mounting/zoom/disposal. The final command output is saved in `validation.txt` after successful completion. Tests run in software-rendered Chromium; the timeout allows for that renderer and failed runs also close their browsers. Passing these checks is not an aesthetic approval or a device performance benchmark.

## Practical limits and visual assessment

The source-surface GLB contains 744,534 triangles across both characters and is approximately 19 MB. The rigged GLB is approximately 24 MB. This is heavier than the previous prototype; actual phone/GPU frame rates and memory use remain unbenchmarked. The editable compressed Blender source is included separately and is not downloaded by the running studio.

After multiple browser-reviewed passes, eye/glasses scale, joined shoulders, finger shapes, hip coverage, baggy folds, denim color, sneaker construction and hair depth differ materially from the previous meshes. Front/profile/back views were inspected. Necks and limbs are present and the garments no longer use the old overlapping seat-panel construction.

The approved reference's personal facial likeness and premium animated-film appearance have **not** been reproduced fully. Hair still shows procedural clump structure and crown ridges; facial features remain simplified; shirt and denim drape are authored approximations. The result needs further individual sculpting and material refinement before it should be described as a finished, faithful character design. It is not approved for production integration.
