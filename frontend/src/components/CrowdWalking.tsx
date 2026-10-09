'use client';

import { useReducedMotion } from 'motion/react';
import Image from 'next/image';

interface PeepConfig {
  id: string;
  src: string;
  scale: number;
  bottom: number;
  leftPercent: number;
  direction: 'left' | 'right';
  bobDuration: number;
  bobDelay: number;
  driftDistance: number;
  driftDuration: number;
  zIndex: number;
  opacity: number;
}

const PEEPS: PeepConfig[] = [
  // Background layer (subtle, smaller, deep background)
  { id: 'p1', src: '/peeps/peep-standing-3.svg', scale: 0.65, bottom: 60, leftPercent: 2, direction: 'right', bobDuration: 1.1, bobDelay: 0.1, driftDistance: 12, driftDuration: 14, zIndex: 1, opacity: 0.18 },
  { id: 'p2', src: '/peeps/peep-standing-6.svg', scale: 0.68, bottom: 65, leftPercent: 11, direction: 'left', bobDuration: 1.25, bobDelay: 0.4, driftDistance: -14, driftDuration: 16, zIndex: 1, opacity: 0.2 },
  { id: 'p3', src: '/peeps/peep-standing-9.svg', scale: 0.64, bottom: 68, leftPercent: 21, direction: 'right', bobDuration: 1.05, bobDelay: 0.2, driftDistance: 15, driftDuration: 13, zIndex: 1, opacity: 0.16 },
  { id: 'p4', src: '/peeps/peep-standing-12.svg', scale: 0.67, bottom: 62, leftPercent: 32, direction: 'left', bobDuration: 1.2, bobDelay: 0.6, driftDistance: -12, driftDuration: 15, zIndex: 1, opacity: 0.18 },
  { id: 'p5', src: '/peeps/peep-standing-15.svg', scale: 0.65, bottom: 66, leftPercent: 43, direction: 'right', bobDuration: 1.15, bobDelay: 0.15, driftDistance: 16, driftDuration: 14, zIndex: 1, opacity: 0.18 },
  { id: 'p6', src: '/peeps/peep-standing-18.svg', scale: 0.7, bottom: 64, leftPercent: 53, direction: 'left', bobDuration: 1.3, bobDelay: 0.5, driftDistance: -15, driftDuration: 17, zIndex: 1, opacity: 0.2 },
  { id: 'p7', src: '/peeps/peep-standing-21.svg', scale: 0.66, bottom: 68, leftPercent: 64, direction: 'right', bobDuration: 1.08, bobDelay: 0.3, driftDistance: 14, driftDuration: 13.5, zIndex: 1, opacity: 0.18 },
  { id: 'p8', src: '/peeps/peep-standing-24.svg', scale: 0.69, bottom: 62, leftPercent: 75, direction: 'left', bobDuration: 1.22, bobDelay: 0.45, driftDistance: -13, driftDuration: 15.5, zIndex: 1, opacity: 0.19 },
  { id: 'p9', src: '/peeps/peep-standing-27.svg', scale: 0.65, bottom: 65, leftPercent: 85, direction: 'right', bobDuration: 1.12, bobDelay: 0.25, driftDistance: 15, driftDuration: 14, zIndex: 1, opacity: 0.17 },
  { id: 'p10', src: '/peeps/peep-standing-30.svg', scale: 0.68, bottom: 60, leftPercent: 94, direction: 'left', bobDuration: 1.28, bobDelay: 0.7, driftDistance: -14, driftDuration: 16, zIndex: 1, opacity: 0.19 },

  // Midground layer (medium scale, balanced flow)
  { id: 'p11', src: '/peeps/peep-standing-2.svg', scale: 0.82, bottom: 25, leftPercent: 0, direction: 'right', bobDuration: 0.98, bobDelay: 0.05, driftDistance: 22, driftDuration: 11, zIndex: 2, opacity: 0.25 },
  { id: 'p12', src: '/peeps/peep-standing-5.svg', scale: 0.86, bottom: 20, leftPercent: 8, direction: 'left', bobDuration: 1.05, bobDelay: 0.35, driftDistance: -20, driftDuration: 12, zIndex: 2, opacity: 0.27 },
  { id: 'p13', src: '/peeps/peep-standing-8.svg', scale: 0.8, bottom: 28, leftPercent: 17, direction: 'right', bobDuration: 0.95, bobDelay: 0.6, driftDistance: 24, driftDuration: 10.5, zIndex: 2, opacity: 0.24 },
  { id: 'p14', src: '/peeps/peep-standing-11.svg', scale: 0.84, bottom: 22, leftPercent: 26, direction: 'left', bobDuration: 1.02, bobDelay: 0.22, driftDistance: -22, driftDuration: 11.5, zIndex: 2, opacity: 0.26 },
  { id: 'p15', src: '/peeps/peep-standing-14.svg', scale: 0.81, bottom: 26, leftPercent: 37, direction: 'right', bobDuration: 1.0, bobDelay: 0.45, driftDistance: 20, driftDuration: 11, zIndex: 2, opacity: 0.25 },
  { id: 'p16', src: '/peeps/peep-standing-17.svg', scale: 0.87, bottom: 18, leftPercent: 48, direction: 'left', bobDuration: 0.96, bobDelay: 0.12, driftDistance: -25, driftDuration: 12.5, zIndex: 2, opacity: 0.28 },
  { id: 'p17', src: '/peeps/peep-standing-20.svg', scale: 0.83, bottom: 24, leftPercent: 59, direction: 'right', bobDuration: 1.04, bobDelay: 0.4, driftDistance: 22, driftDuration: 11, zIndex: 2, opacity: 0.25 },
  { id: 'p18', src: '/peeps/peep-standing-23.svg', scale: 0.85, bottom: 21, leftPercent: 70, direction: 'left', bobDuration: 0.99, bobDelay: 0.65, driftDistance: -24, driftDuration: 12, zIndex: 2, opacity: 0.27 },
  { id: 'p19', src: '/peeps/peep-standing-26.svg', scale: 0.79, bottom: 27, leftPercent: 80, direction: 'right', bobDuration: 1.03, bobDelay: 0.18, driftDistance: 21, driftDuration: 11.2, zIndex: 2, opacity: 0.24 },
  { id: 'p20', src: '/peeps/peep-standing-29.svg', scale: 0.86, bottom: 19, leftPercent: 90, direction: 'left', bobDuration: 0.97, bobDelay: 0.5, driftDistance: -23, driftDuration: 11.8, zIndex: 2, opacity: 0.27 },

  // Foreground layer (larger, soft presence)
  { id: 'p21', src: '/peeps/peep-standing-1.svg', scale: 1.0, bottom: -8, leftPercent: -3, direction: 'right', bobDuration: 0.92, bobDelay: 0.0, driftDistance: 30, driftDuration: 9.5, zIndex: 3, opacity: 0.32 },
  { id: 'p22', src: '/peeps/peep-standing-4.svg', scale: 1.04, bottom: -14, leftPercent: 14, direction: 'right', bobDuration: 0.88, bobDelay: 0.28, driftDistance: 28, driftDuration: 9.0, zIndex: 3, opacity: 0.34 },
  { id: 'p23', src: '/peeps/peep-standing-7.svg', scale: 0.98, bottom: -6, leftPercent: 29, direction: 'left', bobDuration: 0.94, bobDelay: 0.52, driftDistance: -32, driftDuration: 10.0, zIndex: 3, opacity: 0.31 },
  { id: 'p24', src: '/peeps/peep-standing-10.svg', scale: 1.06, bottom: -18, leftPercent: 42, direction: 'right', bobDuration: 0.86, bobDelay: 0.16, driftDistance: 30, driftDuration: 8.8, zIndex: 3, opacity: 0.35 },
  { id: 'p25', src: '/peeps/peep-standing-13.svg', scale: 0.99, bottom: -7, leftPercent: 56, direction: 'left', bobDuration: 0.93, bobDelay: 0.38, driftDistance: -28, driftDuration: 9.4, zIndex: 3, opacity: 0.32 },
  { id: 'p26', src: '/peeps/peep-standing-16.svg', scale: 1.02, bottom: -12, leftPercent: 67, direction: 'right', bobDuration: 0.9, bobDelay: 0.62, driftDistance: 32, driftDuration: 9.2, zIndex: 3, opacity: 0.33 },
  { id: 'p27', src: '/peeps/peep-standing-19.svg', scale: 1.01, bottom: -10, leftPercent: 83, direction: 'left', bobDuration: 0.91, bobDelay: 0.24, driftDistance: -30, driftDuration: 9.6, zIndex: 3, opacity: 0.32 },
  { id: 'p28', src: '/peeps/peep-standing-22.svg', scale: 1.04, bottom: -16, leftPercent: 96, direction: 'right', bobDuration: 0.89, bobDelay: 0.44, driftDistance: 29, driftDuration: 9.1, zIndex: 3, opacity: 0.34 },
];

export default function CrowdWalking() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className="crowd-walking-backdrop"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      {/* Top and vertical fade mask so text remains legible and crowd blends seamlessly */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 50% at 50% 40%, transparent 20%, var(--canvas) 90%), linear-gradient(to bottom, var(--canvas) 0%, transparent 25%, transparent 75%, var(--canvas) 100%)',
          zIndex: 4,
          pointerEvents: 'none',
        }}
      />

      {/* The crowd characters */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {PEEPS.map(peep => {
          const isLeft = peep.direction === 'left';
          const flipScale = isLeft ? -1 : 1;
          const baseHeight = 330 * peep.scale;
          const baseWidth = (baseHeight * 213) / 715;

          return (
            <div
              key={peep.id}
              style={{
                position: 'absolute',
                left: `${peep.leftPercent}%`,
                bottom: `${peep.bottom}px`,
                width: `${baseWidth}px`,
                height: `${baseHeight}px`,
                zIndex: peep.zIndex,
                opacity: peep.opacity,
                transformOrigin: 'bottom center',
              }}
            >
              {/* Outer container: horizontal walking drift back & forth */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  transform: `scaleX(${flipScale})`,
                  animationName: shouldReduceMotion ? 'none' : 'peep-drift',
                  animationDuration: `${peep.driftDuration}s`,
                  animationTimingFunction: 'easeInOut',
                  animationIterationCount: 'infinite',
                  animationDirection: 'alternate',
                  animationDelay: `${peep.bobDelay}s`,
                }}
              >
                {/* Inner container: rhythmic walking gait bob & sway */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    animationName: shouldReduceMotion ? 'none' : 'peep-gait',
                    animationDuration: `${peep.bobDuration}s`,
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDelay: `${peep.bobDelay}s`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <Image
                    src={peep.src}
                    alt=""
                    width={213}
                    height={715}
                    priority={peep.zIndex >= 3}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'bottom center',
                      filter: 'contrast(0.9) brightness(0.95)',
                    }}
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes peep-gait {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-5px) rotate(1.2deg);
          }
          50% {
            transform: translateY(0px) rotate(0deg);
          }
          75% {
            transform: translateY(-5px) rotate(-1.2deg);
          }
          100% {
            transform: translateY(0px) rotate(0deg);
          }
        }

        @keyframes peep-drift {
          0% {
            transform: translateX(0px);
          }
          100% {
            transform: translateX(28px);
          }
        }
      `}</style>
    </div>
  );
}
