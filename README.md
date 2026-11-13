# Concert Studio 3D

A touch-first 3D concert design & production simulator for iPad Safari (works on desktop too).

**Flow:** Main menu → choose an arena → build the stage → add lighting → Live Mode.

## Features
- **8 venues** generated in 3D: indoor arena, mega dome, festival field, football stadium, theater, amphitheater, warehouse, empty space — each previewable with rotate/zoom/camera presets.
- **Stage builder:** parametric main stage (rect / round / hex / thrust / T / wings, width, depth, height, levels, runway, B-stage, stairs) plus 37 editable pieces (platforms, runways, stairs, ramps, catwalks, LED walls/pillars/floors/curved/circular/hanging screens, trusses, towers, beams, arches, scaffolds, curtains, glass, fabric sails, shapes).
- **Editing:** tap to select, drag to move / rotate / scale, sliders and nudge arrows, exact numeric input in Advanced mode, duplicate, mirror (symmetry), group/ungroup, hide, lock, reset, rename, multi-select, undo/redo, snap-to-grid, snap-to-objects with alignment guides, distance read-outs.
- **Views:** 3D perspective, top-down plan, front & side elevations, audience view — all the same live scene. 10 camera presets, double-tap to focus.
- **Materials:** 20 PBR presets (gloss/matte black, aluminum, steel, chrome, mirror, glass, frosted, wood, concrete, fabric, rubber, LED, gold…), color wheel / RGB / HEX, metallic, roughness, reflectiveness, opacity, emission, textures, saved custom materials and colors.
- **Lighting:** 12 fixture types (moving spot/beam, wash, LED bar/tube, strobe, laser, follow spot, floor/ceiling, audience blinder, pixel). Volumetric beams + a pool of real spot lights that actually illuminate the stage, haze, low fog, movement patterns, effects (pulse, strobe, chase, color chase, rainbow, fade, flicker).
- **Lighting desk:** Simple mode (big controls, presets) and Console mode (fixtures & groups, colors, faders, movement pad, effects, scenes, timeline with durations/fades, atmosphere).
- **LED designer:** 19 real-time visuals (gradients, plasma, geometry, neon grid, particles, fire, water, spectrum, tunnel, night city, eclipse, clouds, typography…), per-screen colors/brightness/speed/pixel pitch, image & video upload.
- **Live Mode:** play/pause/next/blackout, scene pads, LED visual pads, camera director, color/effect overrides, master fader, pyro/confetti/CO₂/flash, animated crowd, synthesized backing beat.
- **Artist Stages:** 20 original designs *inspired by* the visual style of 10 artists (not exact tour recreations), loadable and editable.
- **Projects:** IndexedDB autosave + manual save, recovery copy, rename/duplicate/delete, JSON export/import (media embedded).
- **Performance:** shared unit geometries, instanced crowd, fixed light pool (no shader recompiles), Low/Medium/High/Auto graphics, adaptive quality, FPS monitor.

## Develop
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
SINGLE=1 npx vite build   # single self-contained dist/index.html
```

## Code map
- `src/three/` — rendering: viewport, camera rig, arena generator, stage objects, LED shader, fixtures & light pool, lighting engine, crowd, effects, touch interaction
- `src/state/` — project store with undo/redo, UI, settings, show playback
- `src/data/` — arenas, object & fixture library, materials, visuals, templates, artist designs, auto scenes
- `src/storage/` — IndexedDB + autosave
- `src/ui/` — screens, editor panels, lighting desk, live mode, tutorial
