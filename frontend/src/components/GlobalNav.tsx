'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import ThemeToggle from './ThemeToggle';

import logo from '../assets/logo.png';
import logoLight from '../assets/logo-light-mode.png';

export default function GlobalNav() {
  const pathname = usePathname();

  return (
    <nav className="nav-overlay" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {/* Left: Logo — dark-mode and light-mode marks stacked, crossfaded via [data-theme] */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none', height: '40px', width: '40px'}}>
        <div style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
          <Image src={logo} alt="" fill sizes="40px" style={{ objectFit: 'contain' }} className="logo-mark logo-mark-dark" />
          <Image src={logoLight} alt="" fill sizes="40px" style={{ objectFit: 'contain' }} className="logo-mark logo-mark-light" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '18px',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
        }}>TerraGuard</span>
      </Link>

      {/* Middle: Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--canvas-soft)', padding: '4px', borderRadius: '9999px', border: '1px solid var(--hairline)' }}>
        {[
          { path: '/', label: 'Home' },
          { path: '/dashboard', label: 'Dashboard' },
          { path: '/guide', label: 'Guide' }
        ].map(link => {
          const isActive = pathname === link.path;
          return (
            <Link 
              key={link.path}
              href={link.path} 
              className={`tab-pill ${isActive ? 'active' : ''}`}
              style={{ position: 'relative', textDecoration: 'none' }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--canvas-soft-2)',
                    border: '1px solid var(--hairline-strong)',
                    borderRadius: '9999px',
                    zIndex: 0
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Right: Status & Theme */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <span className="t-caption hidden md:inline" style={{ color: 'var(--mute)' }}>Philippines · DPWH</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
          <span className="t-caption" style={{ color: 'var(--ink)', fontWeight: 500 }}>Live</span>
        </div>
        <ThemeToggle />
      </div>
    </nav>
  );
}
