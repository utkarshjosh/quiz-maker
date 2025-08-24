import React, { useMemo } from 'react';

const SHAPE_TYPES = ['circle', 'square', 'triangle'];
const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
const ANIMATIONS = ['float-slow', 'float-medium', 'float-fast'];

const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

const Shape = ({ shape }: { shape: any }) => {
  const style = {
    top: `${shape.y}%`,
    left: `${shape.x}%`,
    width: `${shape.size}px`,
    height: `${shape.size}px`,
    backgroundColor: shape.color,
    animationName: shape.animation,
    animationDuration: `${shape.duration}s`,
    animationDelay: `${shape.delay}s`,
  };

  if (shape.type === 'triangle') {
    return (
      <div
        className="absolute animate-float"
        style={{
          ...style,
          width: 0,
          height: 0,
          borderLeft: `${shape.size / 2}px solid transparent`,
          borderRight: `${shape.size / 2}px solid transparent`,
          borderBottom: `${shape.size}px solid ${shape.color}`,
          backgroundColor: 'transparent',
        }}
      />
    );
  }

  return (
    <div
      className={`absolute animate-float ${shape.type === 'circle' ? 'rounded-full' : ''}`}
      style={style}
    />
  );
};

export default function FloatingShapes() {
  const shapes = useMemo(() => {
    return Array.from({ length: 20 }).map(() => ({
      type: getRandom(SHAPE_TYPES),
      color: getRandom(COLORS),
      size: Math.random() * 80 + 20, // 20px to 100px
      x: Math.random() * 100,
      y: Math.random() * 100,
      animation: getRandom(ANIMATIONS),
      duration: Math.random() * 10 + 10, // 10s to 20s
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-0 opacity-20 overflow-hidden">
      {shapes.map((shape, i) => (
        <Shape key={i} shape={shape} />
      ))}
    </div>
  );
}
