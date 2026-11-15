# Third-party assets

## People (src/assets/people)
- **Universal Base Characters [Standard]** by Quaternius — bodies, eyes, eyebrows, hairstyles.
  License: CC0 1.0 Universal (public domain). https://quaternius.com/packs/universalbasecharacters.html
- **Universal Animation Library 1 & 2 [Standard]** by Quaternius — animation clips (same skeleton).
  License: CC0 1.0 Universal (public domain). https://quaternius.com/packs/universalanimationlibrary.html

The web files were produced with `tools/build-characters.mjs` (textures resized to 1024 px JPEG,
unused vertex attributes and animation clips removed, hairstyles converted to static head-attached meshes).
Clothing, skin-tone variation and gestures are added at runtime in `src/three/people/Person.tsx`.
No real person's likeness is used; all characters are original.
