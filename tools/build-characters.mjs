/**
 * Builds the web character assets from Quaternius CC0 packs:
 *  - Universal Base Characters [Standard]   (bodies, eyes, brows, hairstyles)
 *  - Universal Animation Library 1 + 2 [Standard] (animation clips, same skeleton)
 * Usage: node tools/build-characters.mjs <ubc-dir> <UAL1_Standard.glb> <UAL2_Standard.glb> <out-dir>
 * (run with @gltf-transform/core|extensions|functions and sharp installed)
 * <ubc-dir> must contain base/*.gltf (Godot - UE export), hair/*.gltf (rigged to head bone) and tex/*.png.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, textureCompress, weld, mergeDocuments, unpartition } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const [UBC, UAL1, UAL2, OUT] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
fs.mkdirSync(OUT, { recursive: true });

const KEEP_ATTR = new Set(['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0']);
function stripAttributes(doc) {
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives())
      for (const s of p.listSemantics()) if (!KEEP_ATTR.has(s)) p.setAttribute(s, null);
}

async function compress(doc, size) {
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [size, size], quality: 86 }));
}

/* ---------- bodies ---------- */
for (const [name, file] of [['ubc-male', 'Superhero_Male_FullBody.gltf'], ['ubc-female', 'Superhero_Female_FullBody.gltf']]) {
  const doc = await io.read(path.join(UBC, 'base', file));
  stripAttributes(doc);
  await doc.transform(weld(), dedup(), prune());
  await compress(doc, 1024);
  await io.write(path.join(OUT, `${name}.glb`), doc);
  console.log('wrote', name, (fs.statSync(path.join(OUT, `${name}.glb`)).size / 1e6).toFixed(2), 'MB');
}

/* ---------- alternative skin tones (light) ---------- */
for (const [src, dst] of [['T_Superhero_Male_Ligh.png', 'skin-male-light.jpg'], ['T_Superhero_Female_Light_BaseColor.png', 'skin-female-light.jpg']]) {
  await sharp(path.join(UBC, 'tex', src)).resize(1024, 1024).jpeg({ quality: 86 }).toFile(path.join(OUT, dst));
}

/* ---------- hairstyles: un-skinned static meshes in model space (female head reference) ---------- */
{
  const files = fs.readdirSync(path.join(UBC, 'hair')).filter((f) => f.endsWith('.gltf'));
  const named = async (f) => {
    const d = await io.read(path.join(UBC, 'hair', f));
    for (const m of d.getRoot().listMeshes()) m.setName(f.replace('.gltf', ''));
    return d;
  };
  const hairDoc = await named(files[0]);
  for (const f of files.slice(1)) mergeDocuments(hairDoc, await named(f));
  const root = hairDoc.getRoot();
  const fresh = hairDoc.createScene('Hair');
  for (const m of root.listMeshes()) {
    for (const p of m.listPrimitives()) {
      p.setAttribute('JOINTS_0', null);
      p.setAttribute('WEIGHTS_0', null);
    }
    fresh.addChild(hairDoc.createNode(m.getName()).setMesh(m));
  }
  for (const n of root.listNodes()) if (!fresh.listChildren().includes(n)) n.dispose();
  for (const sk of root.listSkins()) sk.dispose();
  for (const sc of root.listScenes()) if (sc !== fresh) sc.dispose();
  root.setDefaultScene(fresh);
  stripAttributes(hairDoc);
  await hairDoc.transform(unpartition(), weld(), dedup(), prune());
  await compress(hairDoc, 1024);
  await io.write(path.join(OUT, 'ubc-hair.glb'), hairDoc);
  console.log('wrote hair', root.listMeshes().map((m) => m.getName()).join(', '), (fs.statSync(path.join(OUT, 'ubc-hair.glb')).size / 1e6).toFixed(2), 'MB');
}

/* ---------- animations ---------- */
const CLIPS1 = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Dance_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Idle_Talking_Loop', 'Sitting_Idle_Loop', 'Driving_Loop', 'Interact', 'Walk_Formal_Loop', 'Spell_Simple_Idle_Loop'];
const CLIPS2 = ['Idle_FoldArms_Loop', 'Idle_TalkingPhone_Loop', 'Yes', 'Idle_No_Loop', 'Idle_Rail_Call'];
for (const [file, keep, out] of [[UAL1, CLIPS1, 'ual1-anims.glb'], [UAL2, CLIPS2, 'ual2-anims.glb']]) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  for (const a of root.listAnimations())
    if (!keep.includes(a.getName())) {
      for (const c of a.listChannels()) c.dispose();
      for (const sm of a.listSamplers()) sm.dispose();
      a.dispose();
    }
  // animation-only file: drop meshes, keep the skeleton nodes the channels target
  for (const n of root.listNodes()) {
    n.setMesh(null);
    n.setSkin(null);
  }
  for (const m of root.listMeshes()) m.dispose();
  await doc.transform(unpartition(), resample({ tolerance: 0.0005 }), dedup(), prune({ keepLeaves: true }));
  await io.write(path.join(OUT, out), doc);
  console.log('wrote', out, root.listAnimations().map((a) => a.getName()).join(', '), (fs.statSync(path.join(OUT, out)).size / 1e6).toFixed(2), 'MB');
}
fs.copyFileSync(path.join(UBC, 'License_Standard.txt'), path.join(OUT, 'LICENSE-Quaternius-CC0.txt'));
