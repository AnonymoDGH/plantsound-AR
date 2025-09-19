import React, { useState, useEffect, useRef } from 'react';
import { PlantPart } from '../types';

interface PlantModel3DProps {
  modelData: PlantPart[];
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Point2D {
  x: number;
  y: number;
}

const VIEW_BOX_SIZE = 300;
const CENTER = VIEW_BOX_SIZE / 2;
const PERSPECTIVE = VIEW_BOX_SIZE * 0.8;
const SCALE = 100;

// Helper function to project a 3D point to 2D
const project = (point: Point3D): Point2D => {
  const scaleProjected = PERSPECTIVE / (PERSPECTIVE + point.z);
  return {
    x: point.x * scaleProjected * SCALE + CENTER,
    y: -point.y * scaleProjected * SCALE + CENTER, // Invert Y-axis for screen coordinates
  };
};

// Helper function to rotate a 3D point around the Y axis
const rotateY = (point: Point3D, angle: number): Point3D => {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return {
    x: point.x * cos - point.z * sin,
    y: point.y,
    z: point.x * sin + point.z * cos,
  };
};

const PlantModel3D: React.FC<PlantModel3DProps> = ({ modelData = [] }) => {
  const [rotation, setRotation] = useState(0);
  // FIX: Initialize useRef with null for type safety.
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    let lastTimestamp = 0;
    const animate = (timestamp: number) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      setRotation(prev => prev + deltaTime * 0.0003);
      animationFrameId.current = requestAnimationFrame(animate);
    };
    animationFrameId.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const renderedParts = modelData
    .map(part => {
      const rotatedPath = part.path.map(p => rotateY(p, rotation));
      const projectedPath = rotatedPath.map(project);
      
      // Calculate average depth for z-sorting
      const avgZ = rotatedPath.reduce((sum, p) => sum + p.z, 0) / rotatedPath.length;

      // Convert path points to a string for the SVG path 'd' attribute
      const pathString = projectedPath
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`)
        .join(' ');
      
      const isClosedShape = part.type === 'leaf' || part.type === 'petal';

      return { ...part, pathString, avgZ, isClosedShape };
    })
    .sort((a, b) => a.avgZ - b.avgZ); // Sort parts by depth (draw back to front)

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`} className="w-full h-full max-w-md max-h-md">
        {renderedParts.map((part, index) => (
          <path
            key={index}
            d={part.pathString + (part.isClosedShape ? ' Z' : '')}
            stroke={part.color}
            strokeWidth={part.thickness}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={part.isClosedShape ? part.color : 'none'}
            fillOpacity={part.isClosedShape ? 0.7 : 1}
          />
        ))}
      </svg>
    </div>
  );
};

export default PlantModel3D;