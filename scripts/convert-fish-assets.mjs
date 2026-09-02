import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Polyfill minimal browser globals for Node.js
if (typeof self === 'undefined') globalThis.self = globalThis;
if (typeof window === 'undefined') globalThis.window = globalThis;
if (typeof document === 'undefined') {
  globalThis.document = {
    createElementNS: () => ({ style: {}, addEventListener: () => {}, removeEventListener: () => {} }),
    createElement: () => ({ style: {}, addEventListener: () => {}, removeEventListener: () => {} })
  };
}
if (typeof FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
        if (this.onload) this.onload({ target: this });
      });
    }
  };
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TARGET_BASE = path.resolve(SCRIPT_DIR, '..');
const SOURCE_BASE = path.resolve(TARGET_BASE, '..', '3D Characters-Fish');
const FBX_DIR = path.join(SOURCE_BASE, 'Fish', 'FBX');
const ANI_DIR = path.join(SOURCE_BASE, 'Fish', 'Ani');
const TEX_DIR = path.join(SOURCE_BASE, 'Fish', 'Texture');

const OUT_FISH_DIR = path.join(TARGET_BASE, 'public', 'models', 'fish');
const OUT_PROP_DIR = path.join(TARGET_BASE, 'public', 'models', 'props');
const OUT_TEX_DIR = path.join(TARGET_BASE, 'public', 'models', 'textures');

// Ensure target directories exist
fs.mkdirSync(OUT_FISH_DIR, { recursive: true });
fs.mkdirSync(OUT_PROP_DIR, { recursive: true });
fs.mkdirSync(OUT_TEX_DIR, { recursive: true });

// Copy texture atlas
const srcTex = path.join(TEX_DIR, 'Color.png');
const destTex = path.join(OUT_TEX_DIR, 'color.png');
if (fs.existsSync(srcTex)) {
  fs.copyFileSync(srcTex, destTex);
  console.log(`[Texture] Copied ${srcTex} -> ${destTex}`);
}

// Pre-load animation clips from Fish/Ani
const loader = new FBXLoader();
const animationMap = new Map();

const aniFiles = [
  { rig: 'fish', file: 'fish@idle.FBX' },
  { rig: 'shark', file: 'shark@idle.FBX' },
  { rig: 'dolphin', file: 'dolphin@idle.FBX' },
  { rig: 'seahorse', file: 'seahorse@idle.FBX' },
  { rig: 'turtle', file: 'turtle@idle.FBX' },
  { rig: 'lobster', file: 'lobster@idle.FBX' },
  { rig: 'ray', file: 'ray@idle.FBX' }
];

console.log('[Animations] Pre-loading animation clips...');
for (const item of aniFiles) {
  const aniPath = path.join(ANI_DIR, item.file);
  if (fs.existsSync(aniPath)) {
    const buf = fs.readFileSync(aniPath);
    const aniGroup = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
    if (aniGroup.animations && aniGroup.animations.length > 0) {
      const clip = aniGroup.animations[0];
      clip.name = 'idle';
      animationMap.set(item.rig, clip);
      console.log(`  ✓ Loaded rig clip: ${item.rig} (${clip.duration.toFixed(2)}s, ${clip.tracks.length} tracks)`);
    }
  }
}

// Determine rig for each model
function determineRig(name, boneCount) {
  const n = name.toLowerCase();
  if (boneCount === 0) return 'Static';
  if (n.includes('turtle') || boneCount === 14) return 'turtle';
  if (n.includes('lobster') || boneCount === 13) return 'lobster';
  if (n.includes('ray') || boneCount === 19 || boneCount === 11) return 'ray';
  if (n.includes('seahorse') || boneCount === 17) return 'seahorse';
  if (n.includes('shark') || boneCount === 7 || boneCount === 9) return 'shark';
  if (n.includes('dolphin') || n.includes('dophin') || boneCount === 7) return 'dolphin';
  return 'fish';
}

function exportToGlb(group, animations) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      group,
      (gltf) => resolve(Buffer.from(gltf)),
      (err) => reject(err),
      { binary: true, animations: animations || [] }
    );
  });
}

async function convertAll() {
  const fbxFiles = fs.readdirSync(FBX_DIR).filter(f => f.endsWith('.fbx')).sort();
  console.log(`[Batch] Converting ${fbxFiles.length} FBX models to GLB...`);

  let convertedCreatures = 0;
  let convertedProps = 0;
  const manifest = {};

  for (const fbxFile of fbxFiles) {
    const name = path.basename(fbxFile, '.fbx');
    const fbxPath = path.join(FBX_DIR, fbxFile);
    const buf = fs.readFileSync(fbxPath);
    
    let group;
    try {
      group = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
    } catch (e) {
      console.error(`  ✗ Error parsing FBX for ${name}:`, e.message);
      continue;
    }

    // Inspect bones and meshes
    let boneCount = 0;
    let isSkinned = false;
    let vertexCount = 0;
    let faceCount = 0;

    group.traverse((obj) => {
      if (obj.isBone) boneCount++;
      if (obj.isSkinnedMesh) {
        isSkinned = true;
      }
      if (obj.isMesh || obj.isSkinnedMesh) {
        if (obj.geometry) {
          vertexCount += obj.geometry.attributes.position?.count || 0;
          faceCount += obj.geometry.index ? obj.geometry.index.count / 3 : (obj.geometry.attributes.position?.count || 0) / 3;
        }
        // Normalize materials to MeshStandardMaterial with default white (tinted by texture in Three.js runtime)
        obj.material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.8,
          metalness: 0.1
        });
      }
    });

    const rig = determineRig(name, boneCount);
    const isCreature = rig !== 'Static';
    const outDir = isCreature ? OUT_FISH_DIR : OUT_PROP_DIR;
    const outGlbPath = path.join(outDir, `${name}.glb`);

    // Attach animation if rigged creature and idle tracks actually name bones
    // on this mesh. Three's GLTFExporter silently drops clips whose targets
    // are a different object graph — baking those is dead weight.
    const animations = [];
    if (isCreature && animationMap.has(rig)) {
      const clip = animationMap.get(rig);
      const boneNames = new Set();
      group.traverse((obj) => {
        if (obj.isBone) boneNames.add(obj.name);
      });
      const trackRoots = new Set(
        (clip.tracks || []).map((t) => String(t.name).split('.')[0]),
      );
      let hits = 0;
      for (const root of trackRoots) {
        if (boneNames.has(root)) hits += 1;
      }
      if (hits > 0) {
        animations.push(clip);
      } else {
        console.warn(
          `\n  ⚠ Idle clip for ${name} (${rig}) has no bone-name overlap; skipping bake`,
        );
      }
    }

    try {
      const glbBuffer = await exportToGlb(group, animations);
      fs.writeFileSync(outGlbPath, glbBuffer);
      
      const relPath = isCreature ? `models/fish/${name}.glb` : `models/props/${name}.glb`;
      manifest[name] = {
        id: name,
        path: relPath,
        type: isCreature ? 'creature' : 'prop',
        rig,
        vertices: vertexCount,
        triangles: Math.round(faceCount),
        bones: boneCount,
        sizeBytes: glbBuffer.byteLength
      };

      if (isCreature) convertedCreatures++;
      else convertedProps++;

      process.stdout.write(`\r  [${convertedCreatures + convertedProps}/${fbxFiles.length}] Converted ${name}.glb (${Math.round(glbBuffer.byteLength / 1024)} KB)`);
    } catch (e) {
      console.error(`\n  ✗ Error exporting GLB for ${name}:`, e.message);
    }
  }

  console.log('\n\n========================================');
  console.log('CONVERSION COMPLETE SUMMARY:');
  console.log(`  - Total Models: ${convertedCreatures + convertedProps}`);
  console.log(`  - Animated Creatures: ${convertedCreatures} (public/models/fish/*.glb)`);
  console.log(`  - Static Props: ${convertedProps} (public/models/props/*.glb)`);
  console.log('========================================');

  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestPath = path.join(TARGET_BASE, 'public', 'models', 'fish-manifest.json');
  const bundledPath = path.join(TARGET_BASE, 'src', 'fish', 'generated', 'fish-manifest.json');
  fs.mkdirSync(path.dirname(bundledPath), { recursive: true });
  fs.writeFileSync(manifestPath, manifestJson);
  fs.writeFileSync(bundledPath, manifestJson);
  console.log(`[Manifest] Saved ${manifestPath}`);
  console.log(`[Manifest] Bundled ${bundledPath} (imported by src/fish/assetRegistry.ts)`);
}

convertAll().catch(err => {
  console.error('Fatal batch conversion error:', err);
  process.exit(1);
});
