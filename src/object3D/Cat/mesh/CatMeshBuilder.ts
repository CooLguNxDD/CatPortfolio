/**
 * CatMeshBuilder.ts
 * Builds stylized 3D Three.js geometry and binds bones from CatRig.
 */

import * as THREE from 'three';
import type { CatRig } from '../rig/CatRig';

export interface CatMeshMaterials {
  fur: THREE.MeshStandardMaterial;
  furCream: THREE.MeshStandardMaterial;
  pink: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
  pupil: THREE.MeshBasicMaterial;
  gold: THREE.MeshStandardMaterial;
  collar: THREE.MeshStandardMaterial;
  whisker: THREE.MeshBasicMaterial;
}

export function createCatDefaultMaterials(): CatMeshMaterials {
  return {
    fur: new THREE.MeshStandardMaterial({
      color: 0x3d2c29, // Warm mocha coat
      roughness: 0.85,
      metalness: 0.05,
    }),
    furCream: new THREE.MeshStandardMaterial({
      color: 0xffeedd, // Cream marshmallow muzzle & chest
      roughness: 0.9,
      metalness: 0.0,
    }),
    pink: new THREE.MeshStandardMaterial({
      color: 0xff99aa, // Pink nose and inner ears
      roughness: 0.6,
      metalness: 0.0,
    }),
    eye: new THREE.MeshStandardMaterial({
      color: 0xffaa00, // Brilliant glowing golden-amber eyes
      emissive: 0xff8800,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
    }),
    pupil: new THREE.MeshBasicMaterial({
      color: 0x050505, // Deep obsidian black pupil
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xffd700, // Shiny golden bell
      metalness: 0.85,
      roughness: 0.25,
    }),
    collar: new THREE.MeshStandardMaterial({
      color: 0xd62828, // Crimson collar
      roughness: 0.7,
    }),
    whisker: new THREE.MeshBasicMaterial({
      color: 0xeeeeee,
      transparent: true,
      opacity: 0.75,
    }),
  };
}

export function buildCat3DMesh(rig: CatRig, customMaterials?: Partial<CatMeshMaterials>): THREE.Group {
  const materials = { ...createCatDefaultMaterials(), ...customMaterials };
  const rootGroup = new THREE.Group();
  rootGroup.name = 'Cat_Avatar_Root';

  // 1. Root / Spine Group
  const spineGroup = new THREE.Group();
  spineGroup.name = 'Spine_Node';
  rootGroup.add(spineGroup);
  const spineBone = rig.getBone('spine');
  if (spineBone) spineBone.targetObject = spineGroup;

  // 2. Chest & Body Geometry
  const chestGroup = new THREE.Group();
  chestGroup.name = 'Chest_Node';
  spineGroup.add(chestGroup);
  const chestBone = rig.getBone('chest');
  if (chestBone) chestBone.targetObject = chestGroup;

  const bodyGeo = new THREE.SphereGeometry(0.48, 24, 20);
  bodyGeo.scale(1.0, 1.15, 0.95);
  const bodyMesh = new THREE.Mesh(bodyGeo, materials.fur);
  chestGroup.add(bodyMesh);

  // Marshmallow Chest Patch
  const chestPatchGeo = new THREE.SphereGeometry(0.36, 20, 16);
  chestPatchGeo.scale(0.85, 0.95, 0.4);
  const chestPatchMesh = new THREE.Mesh(chestPatchGeo, materials.furCream);
  chestPatchMesh.position.set(0, -0.05, 0.32);
  chestGroup.add(chestPatchMesh);

  // Collar & Bell
  const collarGeo = new THREE.TorusGeometry(0.38, 0.04, 12, 32);
  collarGeo.rotateX(Math.PI / 2);
  const collarMesh = new THREE.Mesh(collarGeo, materials.collar);
  collarMesh.position.set(0, 0.42, 0.05);
  chestGroup.add(collarMesh);

  const bellGeo = new THREE.SphereGeometry(0.07, 16, 16);
  const bellMesh = new THREE.Mesh(bellGeo, materials.gold);
  bellMesh.position.set(0, 0.35, 0.42);
  chestGroup.add(bellMesh);

  // 3. Head Group & Geometry
  const headGroup = new THREE.Group();
  headGroup.name = 'Head_Node';
  chestGroup.add(headGroup);
  const headBone = rig.getBone('head');
  if (headBone) headBone.targetObject = headGroup;

  const headGeo = new THREE.SphereGeometry(0.42, 28, 24);
  headGeo.scale(1.1, 0.96, 1.0);
  const headMesh = new THREE.Mesh(headGeo, materials.fur);
  headGroup.add(headMesh);

  // Chubby Cheeks
  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), materials.furCream);
  cheekL.scale.set(1.1, 0.9, 0.8);
  cheekL.position.set(-0.2, -0.1, 0.22);
  headGroup.add(cheekL);

  const cheekR = cheekL.clone();
  cheekR.position.x = 0.2;
  headGroup.add(cheekR);

  // Pink Kitten Nose & Snout
  const snoutGroup = new THREE.Group();
  headGroup.add(snoutGroup);
  const snoutBone = rig.getBone('snout');
  if (snoutBone) snoutBone.targetObject = snoutGroup;

  const noseGeo = new THREE.ConeGeometry(0.04, 0.04, 3);
  noseGeo.rotateX(Math.PI);
  const noseMesh = new THREE.Mesh(noseGeo, materials.pink);
  noseMesh.position.set(0, 0, 0.02);
  snoutGroup.add(noseMesh);

  // Whiskers
  const whiskerGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.35, 6);
  whiskerGeo.rotateZ(Math.PI / 2);
  const whiskerL1 = new THREE.Mesh(whiskerGeo, materials.whisker);
  whiskerL1.position.set(-0.25, 0, 0.05);
  whiskerL1.rotation.z = 0.12;
  snoutGroup.add(whiskerL1);

  const whiskerL2 = whiskerL1.clone();
  whiskerL2.position.y = -0.05;
  whiskerL2.rotation.z = -0.08;
  snoutGroup.add(whiskerL2);

  const whiskerR1 = whiskerL1.clone();
  whiskerR1.position.x = 0.25;
  whiskerR1.rotation.z = -0.12;
  snoutGroup.add(whiskerR1);

  const whiskerR2 = whiskerR1.clone();
  whiskerR2.position.y = -0.05;
  whiskerR2.rotation.z = 0.08;
  snoutGroup.add(whiskerR2);

  // 4. Ears
  const earGeo = new THREE.ConeGeometry(0.18, 0.32, 4);
  earGeo.scale(0.9, 1.0, 0.4);

  const earLGroup = new THREE.Group();
  headGroup.add(earLGroup);
  const earLBone = rig.getBone('earL');
  if (earLBone) earLBone.targetObject = earLGroup;
  const earLMesh = new THREE.Mesh(earGeo, materials.fur);
  earLGroup.add(earLMesh);
  const earLPink = new THREE.Mesh(earGeo, materials.pink);
  earLPink.scale.set(0.65, 0.65, 0.65);
  earLPink.position.set(0, -0.02, 0.04);
  earLGroup.add(earLPink);

  const earRGroup = new THREE.Group();
  headGroup.add(earRGroup);
  const earRBone = rig.getBone('earR');
  if (earRBone) earRBone.targetObject = earRGroup;
  const earRMesh = new THREE.Mesh(earGeo, materials.fur);
  earRGroup.add(earRMesh);
  const earRPink = new THREE.Mesh(earGeo, materials.pink);
  earRPink.scale.set(0.65, 0.65, 0.65);
  earRPink.position.set(0, -0.02, 0.04);
  earRGroup.add(earRPink);

  // 5. Eyes, Pupils, and Eyelids
  const eyeGeo = new THREE.SphereGeometry(0.12, 20, 20);
  eyeGeo.scale(0.95, 1.15, 0.6);

  // Left Eye
  const eyeLGroup = new THREE.Group();
  headGroup.add(eyeLGroup);
  const eyeLBone = rig.getBone('eyeL');
  if (eyeLBone) eyeLBone.targetObject = eyeLGroup;
  const eyeLMesh = new THREE.Mesh(eyeGeo, materials.eye);
  eyeLGroup.add(eyeLMesh);

  // Left Eyelid
  const eyelidLGroup = new THREE.Group();
  eyeLGroup.add(eyelidLGroup);
  const eyelidLBone = rig.getBone('eyelidL');
  if (eyelidLBone) eyelidLBone.targetObject = eyelidLGroup;

  // Left Pupil
  const pupilGeo = new THREE.CapsuleGeometry(0.035, 0.08, 12, 16);
  pupilGeo.scale(1.0, 1.0, 0.3);
  const pupilLMesh = new THREE.Mesh(pupilGeo, materials.pupil);
  eyelidLGroup.add(pupilLMesh);
  const pupilLBone = rig.getBone('pupilL');
  if (pupilLBone) pupilLBone.targetObject = pupilLMesh;

  // Right Eye
  const eyeRGroup = new THREE.Group();
  headGroup.add(eyeRGroup);
  const eyeRBone = rig.getBone('eyeR');
  if (eyeRBone) eyeRBone.targetObject = eyeRGroup;
  const eyeRMesh = new THREE.Mesh(eyeGeo, materials.eye);
  eyeRGroup.add(eyeRMesh);

  // Right Eyelid
  const eyelidRGroup = new THREE.Group();
  eyeRGroup.add(eyelidRGroup);
  const eyelidRBone = rig.getBone('eyelidR');
  if (eyelidRBone) eyelidRBone.targetObject = eyelidRGroup;

  // Right Pupil
  const pupilRMesh = new THREE.Mesh(pupilGeo, materials.pupil);
  eyelidRGroup.add(pupilRMesh);
  const pupilRBone = rig.getBone('pupilR');
  if (pupilRBone) pupilRBone.targetObject = pupilRMesh;

  // 6. 7-Segment Tail Chain
  let parentTailGroup = spineGroup;
  for (let i = 0; i < 7; i++) {
    const tailSegmentGroup = new THREE.Group();
    tailSegmentGroup.name = `TailSegment_${i}`;
    parentTailGroup.add(tailSegmentGroup);

    const radius = 0.08 * (1.0 - i * 0.08);
    const segGeo = new THREE.SphereGeometry(radius, 12, 12);
    segGeo.scale(1.0, 1.4, 1.0);
    const segMesh = new THREE.Mesh(segGeo, i === 6 ? materials.furCream : materials.fur);
    tailSegmentGroup.add(segMesh);

    const tailBone = rig.getBone(`tail${i}` as any);
    if (tailBone) tailBone.targetObject = tailSegmentGroup;

    parentTailGroup = tailSegmentGroup;
  }

  // 7. Interactive Click HitBox for Petting/Purring
  const hitBoxGeo = new THREE.SphereGeometry(0.8, 12, 12);
  const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
  hitBox.name = 'Cat_Pet_HitBox';
  hitBox.position.set(0, 0.4, 0);
  rootGroup.add(hitBox);

  return rootGroup;
}
