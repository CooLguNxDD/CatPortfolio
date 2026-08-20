/**
 * CatDOMCompanion.tsx
 * Floating, draggable, interactive Cat Companion component for web apps and browser extensions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Cat3DView } from './Cat3DView';

export interface CatDOMCompanionProps {
  initialPosition?: { x: number; y: number };
  defaultOpen?: boolean;
}

export const CatDOMCompanion: React.FC<CatDOMCompanionProps> = ({
  initialPosition = { x: 24, y: 24 },
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [pos, setPos] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [purrCount, setPurrCount] = useState(0);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPos({
        x: Math.max(10, Math.min(window.innerWidth - 180, e.clientX - dragOffset.current.x)),
        y: Math.max(10, Math.min(window.innerHeight - 220, e.clientY - dragOffset.current.y)),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <aside
      role="complementary"
      aria-label="Interactive Cat Companion"
      className="fixed z-50 flex flex-col items-center select-none filter drop-shadow-2xl transition-shadow"
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    >
      {/* Header bar / Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-3 py-1.5 w-44 bg-neutral-900/90 backdrop-blur-md border border-neutral-700/60 rounded-t-2xl cursor-grab active:cursor-grabbing text-neutral-300 text-xs font-mono"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Cat Rig</span>
        </span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-neutral-400 hover:text-white transition-colors"
        >
          {isOpen ? '−' : '+'}
        </button>
      </div>

      {/* 3D Cat Canvas Area */}
      {isOpen && (
        <div className="w-44 h-52 bg-neutral-950/80 backdrop-blur-lg border-x border-b border-neutral-700/60 rounded-b-2xl p-1 flex flex-col items-center justify-between overflow-hidden">
          <Cat3DView
            width={160}
            height={160}
            scale={0.9}
            sensitivity={1.1}
            onPurr={() => setPurrCount((c) => c + 1)}
          />

          <div className="flex items-center justify-between w-full px-2 py-1 text-[11px] text-neutral-400 border-t border-neutral-800">
            <span>Pets: {purrCount}</span>
            <span className="text-amber-400/80 text-[10px]">Click cat to pet</span>
          </div>
        </div>
      )}
    </aside>
  );
};
