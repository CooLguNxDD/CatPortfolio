/**
 * CatGLTFLoader.ts
 * Adapter and Binding Infrastructure for loading Blender (.glb / .gltf) models
 * and binding them to the Forward Kinematics CatRig & AnimationEngine.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CatRig } from '../rig/CatRig';
import type { BoneName } from '../rig/types';

export interface CatModelBindingOptions {
  /**
   * Custom mapping from Blender bone/object names to CatRig standard BoneNames.
   * e.g. { "Bone.Head": "head", "Cat_Tail.001": "tail0" }
   */
  boneMapping?: Record<string, BoneName>;

  /**
   * Auto-prefix or regex matching to map common Blender naming conventions.
   * Defaults to true.
   */
  autoFuzzyMatch?: boolean;

  /**
   * Optional scaling factor applied to the root model.
   */
  scale?: number;
}

export interface LoadedCatModel {
  /** Root Three.js Object3D scene from the GLTF */
  scene: THREE.Group;
  /** Initialized and bound CatRig ready to be driven by CatAnimationEngine */
  rig: CatRig;
  /** Map of standard BoneNames to bound Three.js Object3D nodes */
  boundNodes: Map<BoneName, THREE.Object3D>;
  /** Discovered morph target meshes (e.g. for shape key driven blinks / smiles) */
  morphMeshes: Map<string, THREE.Mesh>;
}

const DEFAULT_BLENDER_BONE_SYNONYMS: Record<string, BoneName> = {
  // Head & Neck
  head: 'head',
  head_bone: 'head',
  'bone.head': 'head',
  head_pivot: 'head',
  cranium: 'head',

  // Spine & Chest
  root: 'root',
  base: 'root',
  spine: 'spine',
  pelvis: 'spine',
  hips: 'spine',
  chest: 'chest',
  torso: 'chest',
  body: 'chest',

  // Eyes & Pupils
  eyel: 'eyeL',
  eye_l: 'eyeL',
  'eye.l': 'eyeL',
  'bone.eye.l': 'eyeL',
  eyer: 'eyeR',
  eye_r: 'eyeR',
  'eye.r': 'eyeR',
  'bone.eye.r': 'eyeR',
  pupill: 'pupilL',
  pupil_l: 'pupilL',
  'pupil.l': 'pupilL',
  pupilr: 'pupilR',
  pupil_r: 'pupilR',
  'pupil.r': 'pupilR',
  eyelidl: 'eyelidL',
  eyelid_l: 'eyelidL',
  'eyelid.l': 'eyelidL',
  eyelidr: 'eyelidR',
  eyelid_r: 'eyelidR',
  'eyelid.r': 'eyelidR',

  // Ears
  earl: 'earL',
  ear_l: 'earL',
  'ear.l': 'earL',
  'bone.ear.l': 'earL',
  earr: 'earR',
  ear_r: 'earR',
  'ear.r': 'earR',
  'bone.ear.r': 'earR',

  // Snout
  snout: 'snout',
  muzzle: 'snout',
  nose: 'snout',

  // Paws / Limbs
  pawl: 'pawL',
  paw_l: 'pawL',
  'paw.l': 'pawL',
  pawactive: 'pawL',
  pawr: 'pawR',
  paw_r: 'pawR',
  'paw.r': 'pawR',
  pawsupport: 'pawR',

  // Tail segments
  tail0: 'tail0',
  tail_0: 'tail0',
  'tail.000': 'tail0',
  'tail.001': 'tail1',
  tail1: 'tail1',
  tail_1: 'tail1',
  'tail.002': 'tail2',
  tail2: 'tail2',
  tail_2: 'tail2',
  'tail.003': 'tail3',
  tail3: 'tail3',
  tail_3: 'tail3',
  'tail.004': 'tail4',
  tail4: 'tail4',
  tail_4: 'tail4',
  'tail.005': 'tail5',
  tail5: 'tail5',
  tail_5: 'tail5',
  'tail.006': 'tail6',
  tail6: 'tail6',
  tail_6: 'tail6',
};

/**
 * Normalizes a bone name for fuzzy dictionary lookup.
 */
function normalizeBoneName(name: string): string {
  return name.toLowerCase().replace(/[-_\s.]+/g, '');
}

/**
 * Binds an existing Three.js Object3D / Armature hierarchy to a CatRig.
 */
export function bindObjectHierarchyToCatRig(
  root: THREE.Object3D,
  options: CatModelBindingOptions = {}
): {
  rig: CatRig;
  boundNodes: Map<BoneName, THREE.Object3D>;
  morphMeshes: Map<string, THREE.Mesh>;
} {
  const rig = new CatRig();
  const boundNodes = new Map<BoneName, THREE.Object3D>();
  const morphMeshes = new Map<string, THREE.Mesh>();

  // 1. Traverse and index all objects and morph target meshes
  const objectPool = new Map<string, THREE.Object3D>();
  root.traverse((obj) => {
    if (obj.name) {
      objectPool.set(obj.name, obj);
      objectPool.set(normalizeBoneName(obj.name), obj);
    }
    if ((obj as THREE.Mesh).isMesh && (obj as THREE.Mesh).morphTargetInfluences) {
      morphMeshes.set(obj.name, obj as THREE.Mesh);
    }
  });

  // 2. Resolve bone mappings
  const combinedMapping = { ...DEFAULT_BLENDER_BONE_SYNONYMS, ...(options.boneMapping ?? {}) };

  const allBoneNames: BoneName[] = [
    'root', 'spine', 'chest', 'head',
    'earL', 'earR', 'eyeL', 'eyeR',
    'pupilL', 'pupilR', 'eyelidL', 'eyelidR',
    'snout', 'pawL', 'pawR',
    'tail0', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5', 'tail6',
  ];

  for (const boneName of allBoneNames) {
    let matchedNode: THREE.Object3D | undefined;

    // A. Direct exact match
    if (objectPool.has(boneName)) {
      matchedNode = objectPool.get(boneName);
    }

    // B. Custom or default synonyms match
    if (!matchedNode) {
      for (const [pattern, targetName] of Object.entries(combinedMapping)) {
        if (targetName === boneName) {
          if (objectPool.has(pattern) || objectPool.has(normalizeBoneName(pattern))) {
            matchedNode = objectPool.get(pattern) ?? objectPool.get(normalizeBoneName(pattern));
            break;
          }
        }
      }
    }

    // C. Fuzzy contains match (if enabled)
    if (!matchedNode && options.autoFuzzyMatch !== false) {
      const normBone = normalizeBoneName(boneName);
      for (const [normKey, obj] of objectPool.entries()) {
        if (normKey.includes(normBone) || normBone.includes(normKey)) {
          matchedNode = obj;
          break;
        }
      }
    }

    // Bind to CatRig if resolved
    if (matchedNode) {
      const rigBone = rig.getBone(boneName);
      if (rigBone) {
        rigBone.targetObject = matchedNode;
        rigBone.initialPosition.copy(matchedNode.position);
        rigBone.initialRotation.copy(matchedNode.rotation);
        rigBone.initialScale.copy(matchedNode.scale);
        rigBone.resetPose();
        boundNodes.set(boneName, matchedNode);
      }
    }
  }

  return { rig, boundNodes, morphMeshes };
}

/**
 * Loads a .glb or .gltf Blender model from a URL or ArrayBuffer and binds it to a CatRig.
 */
export async function loadBlenderCatModel(
  source: string | ArrayBuffer,
  options: CatModelBindingOptions = {}
): Promise<LoadedCatModel> {
  const loader = new GLTFLoader();

  const gltf = await new Promise<any>((resolve, reject) => {
    if (typeof source === 'string') {
      loader.load(source, resolve, undefined, reject);
    } else {
      loader.parse(source, '', resolve, reject);
    }
  });

  const scene = gltf.scene as THREE.Group;
  if (options.scale) {
    scene.scale.setScalar(options.scale);
  }

  const { rig, boundNodes, morphMeshes } = bindObjectHierarchyToCatRig(scene, options);

  return {
    scene,
    rig,
    boundNodes,
    morphMeshes,
  };
}
