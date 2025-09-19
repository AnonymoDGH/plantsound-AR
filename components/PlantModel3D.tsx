import React, { useRef, useEffect } from 'react';
import { PlantPart } from '../types';

interface PlantModel3DProps {
  modelData: PlantPart[];
  audioData: number; // A value from 0 to 1 representing audio energy
}

// A simple 3D vector utility
class Vec3 {
  constructor(public x: number, public y: number, public z: number) {}

  rotateX(angle: number): Vec3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vec3(
      this.x,
      this.y * cos - this.z * sin,
      this.y * sin + this.z * cos
    );
  }

  rotateY(angle: number): Vec3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vec3(
      this.x * cos + this.z * sin,
      this.y,
      -this.x * sin + this.z * cos
    );
  }
}

const PlantModel3D: React.FC<PlantModel3DProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const rotationRef = useRef({ x: 0.3, y: 0 });
  const isDraggingRef = useRef(false);
  const autoRotateRef = useRef(true);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  // FIX: Explicitly initialize useRef with `undefined` to satisfy strict configurations.
  const autoRotateTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handlePointerDown = (clientX: number, clientY: number) => {
      isDraggingRef.current = true;
      autoRotateRef.current = false;
      if (autoRotateTimeoutRef.current) window.clearTimeout(autoRotateTimeoutRef.current);
      lastMousePosRef.current = { x: clientX, y: clientY };
      canvas.style.cursor = 'grabbing';
    };
  
    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      const dx = clientX - lastMousePosRef.current.x;
      const dy = clientY - lastMousePosRef.current.y;
      rotationRef.current.y += dx * 0.01;
      rotationRef.current.x += dy * 0.01;
      rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x));
      lastMousePosRef.current = { x: clientX, y: clientY };
    };
  
    const handlePointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      canvas.style.cursor = 'grab';
      autoRotateTimeoutRef.current = window.setTimeout(() => {
          autoRotateRef.current = true;
      }, 3000);
    };

    let dpr = window.devicePixelRatio || 1;
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || !entries.length) return;
      const { width, height } = entries[0].contentRect;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    });
    resizeObserver.observe(canvas);
    
    const onMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onMouseUp = () => handlePointerUp();
    
    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); handlePointerDown(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); handlePointerMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchEnd = (e: TouchEvent) => { e.preventDefault(); handlePointerUp(); };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    let animationFrameId: number;

    const render = (time: number) => {
      const { modelData, audioData } = propsRef.current;
      if (autoRotateRef.current) {
        rotationRef.current.y += 0.002;
      }

      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      
      const scale = Math.min(width, height) * 0.4;
      const fov = 250;
      const viewDistance = 2;

      const sortedParts = [...modelData].map((part, index) => {
          const avgZ = part.path.reduce((sum, p) => sum + p.z, 0) / part.path.length;
          const point = new Vec3(0, 0, avgZ).rotateX(rotationRef.current.x).rotateY(rotationRef.current.y);
          return { ...part, sortKey: point.z, originalIndex: index };
      }).sort((a, b) => a.sortKey - b.sortKey);

      sortedParts.forEach(part => {
        ctx.beginPath();
        ctx.strokeStyle = part.color;
        ctx.lineWidth = part.thickness * dpr;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        part.path.forEach((p, i) => {
          let point = new Vec3(p.x, p.y, p.z);
          
          const animationIntensity = audioData * 0.2;
          if ((part.type === 'leaf' || part.type === 'petal' || part.type === 'stamen') && animationIntensity > 0.001) {
            const sway = Math.sin(time * 0.002 + part.originalIndex + i * 0.5) * animationIntensity * (Math.abs(point.x) + 0.5);
            const pulse = 1 + Math.cos(time * 0.005 + part.originalIndex) * animationIntensity * 0.2;
            point = new Vec3(point.x + sway, point.y * pulse, point.z);
          }

          point = point.rotateX(rotationRef.current.x).rotateY(rotationRef.current.y);
          
          const perspective = fov / (fov + point.z + viewDistance);
          const screenX = point.x * scale * perspective;
          const screenY = -point.y * scale * perspective;

          if (i === 0) ctx.moveTo(screenX, screenY);
          else ctx.lineTo(screenX, screenY);
        });
        ctx.stroke();
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (autoRotateTimeoutRef.current) window.clearTimeout(autoRotateTimeoutRef.current);
      
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full cursor-grab" aria-label="Interactive 3D plant model" />;
};

export default PlantModel3D;
