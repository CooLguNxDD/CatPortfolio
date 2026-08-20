/**
 * Modular Cat Rig & Animation Subsystem
 *
 * Provides Forward Kinematics 2D/3D linear transformations, cursor gaze tracking,
 * stochastic interval blinking, and click-reactive purring resonance.
 */

// 1. Math & Kinematics
export * from './math/LinearTransform';
export * from './math/SpringDamper';

// 2. Skeletal Rig & Bones
export * from './rig/types';
export * from './rig/RigBone';
export * from './rig/CatRig';

// 3. Modular Animation Engine & Layers
export * from './animations/AnimationLayer';
export * from './animations/GazeTrackingLayer';
export * from './animations/BlinkLayer';
export * from './animations/PurrReactionLayer';
export * from './animations/BreathingLayer';
export * from './animations/CatAnimationEngine';

// 4. Mesh & UI Components
export * from './mesh/CatMeshBuilder';
export * from './mesh/catGiantMesh';
export * from './components/Cat3DView';
export * from './components/CatDOMCompanion';
