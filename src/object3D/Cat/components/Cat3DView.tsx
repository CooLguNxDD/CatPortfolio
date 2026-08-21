/**
 * Cat3DView.tsx
 * React Three.js Canvas component hosting the interactive Modular Cat Rig.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CatRig } from '../rig/CatRig';
import { CatAnimationEngine } from '../animations/CatAnimationEngine';
import { buildCat3DMesh } from '../mesh/CatMeshBuilder';
import { PurrReactionLayer } from '../animations/PurrReactionLayer';

export interface Cat3DViewProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  scale?: number;
  sensitivity?: number;
  onPurr?: () => void;
  interactive?: boolean;
}

export const Cat3DView: React.FC<Cat3DViewProps> = ({
  className = '',
  width = '100%',
  height = '100%',
  scale = 1.0,
  sensitivity = 1.0,
  onPurr,
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPurring, setIsPurring] = useState(false);
  const onPurrRef = useRef(onPurr);

  useEffect(() => {
    onPurrRef.current = onPurr;
  }, [onPurr]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 300;
    const h = container.clientHeight || 300;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.3, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xfff0e6, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    const eyeLight = new THREE.PointLight(0xffaa00, 1.5, 3.0);
    eyeLight.position.set(0, 0.6, 0.8);
    scene.add(eyeLight);

    // 3. Modular Rig & Animation Engine
    const rig = new CatRig();
    const engine = new CatAnimationEngine(rig).initDefaultLayers();

    const purrLayer = engine.getLayer<PurrReactionLayer>('PurrReaction');
    if (purrLayer) {
      (purrLayer as any).config.onPurrStart = () => {
        setIsPurring(true);
        if (onPurrRef.current) onPurrRef.current();
      };
      (purrLayer as any).config.onPurrEnd = () => {
        setIsPurring(false);
      };
    }

    // 4. Mesh
    const catMesh = buildCat3DMesh(rig);
    catMesh.scale.set(scale, scale, scale);
    catMesh.position.set(0, -0.4, 0);
    scene.add(catMesh);

    // 5. Pointer Tracking
    let cachedRect = container.getBoundingClientRect();
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2(0, 0);
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const planeIntersect = new THREE.Vector3();

    const handlePointerMove = (e: PointerEvent) => {
      if (!interactive) return;
      const rect = cachedRect;
      // Calculate Normalized Device Coordinates [-1, 1] relative to viewport
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      mouseNDC.set(x, y);
      raycaster.setFromCamera(mouseNDC, camera);
      raycaster.ray.intersectPlane(planeZ, planeIntersect);

      engine.updateCursor(x * sensitivity, y * sensitivity, planeIntersect);
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = cachedRect;
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(mouseNDC, camera);
      const intersects = raycaster.intersectObjects(catMesh.children, true);

      if (intersects.length > 0) {
        engine.pet(1.2);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!interactive) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        engine.pet(1.2);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('click', handlePointerDown);
    container.addEventListener('keydown', handleKeyDown);

    // 6. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          cachedRect = container.getBoundingClientRect();
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 7. Animation Tick Loop
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      const dt = clock.getDelta();
      engine.update(dt, camera);
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('click', handlePointerDown);
      container.removeEventListener('keydown', handleKeyDown);
      resizeObserver.disconnect();
      engine.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scale, sensitivity, interactive]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden ${className}`}
      style={{ width, height }}
      tabIndex={interactive ? 0 : -1}
      role="button"
      aria-label="Interactive 3D Cat. Click or press Enter to pet."
    >
      {isPurring && (
        <div className="absolute top-2 right-2 pointer-events-none text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
          ✨ Purring...
        </div>
      )}
    </div>
  );
};
