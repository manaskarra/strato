'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ArrowRight, CloudSun } from 'lucide-react';

const EnergyBeam = dynamic(() => import('@/components/ui/energy-beam'), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-black" />,
});

interface LandingPageProps {
  onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const [hovering, setHovering] = useState(false);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Energy Beam Background */}
      <div className="absolute inset-0 z-0">
        <EnergyBeam />
      </div>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full px-6">
        {/* Logo */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center glow-blue">
            <CloudSun className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display text-7xl md:text-9xl font-semibold text-white tracking-tight text-center italic">
          Strato
        </h1>

        {/* Tagline */}
        <p className="text-base md:text-lg text-blue-200/70 mt-5 tracking-[0.3em] uppercase font-light">
          Above the Market Noise
        </p>

        {/* Description */}
        <p className="text-sm text-white/40 mt-8 max-w-lg text-center leading-relaxed">
          AI-powered financial intelligence. Daily market briefs, portfolio analysis,
          and interactive learning — all in one place.
        </p>

        {/* Enter Button */}
        <button
          onClick={onEnter}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className="mt-14 group relative px-10 py-4 rounded-full font-medium text-white transition-all duration-300 overflow-hidden"
        >
          {/* Button glow background */}
          <div className={`absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full transition-all duration-300 ${hovering ? 'opacity-100 glow-blue' : 'opacity-80'}`} />
          <div className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-opacity duration-500 ${hovering ? 'opacity-30' : 'opacity-0'}`} />

          <span className="relative z-10 flex items-center gap-2.5 text-sm tracking-wide">
            Enter Platform
            <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${hovering ? 'translate-x-1' : ''}`} />
          </span>
        </button>

        {/* Bottom features hint */}
        <div className="absolute bottom-12 flex items-center gap-8 text-[11px] text-white/25 uppercase tracking-[0.2em]">
          <span>Intelligence</span>
          <span className="w-1 h-1 rounded-full bg-blue-500/40" />
          <span>Portfolio</span>
          <span className="w-1 h-1 rounded-full bg-blue-500/40" />
          <span>Learning</span>
          <span className="w-1 h-1 rounded-full bg-blue-500/40" />
          <span>Polymarket</span>
        </div>
      </div>
    </div>
  );
}
