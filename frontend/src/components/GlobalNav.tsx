'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { List, X } from '@phosphor-icons/react';
import ThemeToggle from './ThemeToggle';
import { useHideOnScroll } from '@/shared/hooks/useHideOnScroll';

import logo from '../assets/logo.png';
import logoLight from '../assets/logo-light-mode.png';

const LINKS = [
  { path: '/', label: 'Home' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/map', label: 'Map' },
  { path: '/guide', label: 'Guide' },
];

export default function GlobalNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  // Pinned open while the dropdown is expanded — otherwise scrolling the page
  // behind an open menu would slide the menu off-screen with the bar.
  const { isVisible } = useHideOnScroll({ isDisabled: menuOpen });

  return (
    <nav
      className={`nav-overlay ${isVisible ? '' : 'nav-hidden'}`}
      // No `position` here on purpose: .nav-overlay sets `position: fixed`, and an
      // inline value would override it and drop the bar back into normal flow. The
      // dropdown still anchors to the nav — `fixed` is a containing block too.
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
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

      {/* Middle: Links — collapses into the mobile menu below md */}
      <div className="hidden md:flex" style={{ alignItems: 'center', gap: '8px', background: 'var(--canvas-soft)', padding: '4px', borderRadius: '9999px', border: '1px solid var(--hairline)' }}>
        {LINKS.map(link => {
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

      {/* Right: Status, Theme, mobile menu toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span className="t-caption hidden lg:inline" style={{ color: 'var(--mute)' }}>Philippines · DPWH</span>
        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
          <span className="t-caption" style={{ color: 'var(--ink)', fontWeight: 500 }}>Live</span>
        </div>
        <ThemeToggle />
        <button
          type="button"
          className="nav-menu-btn"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={16} weight="bold" /> : <List size={16} weight="bold" />}
        </button>
      </div>

      {/* Mobile dropdown — same three links, revealed below md */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="nav-mobile-menu"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {LINKS.map(link => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setMenuOpen(false)}
                  className={`nav-mobile-link ${isActive ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="hairline" style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
              <span className="t-caption" style={{ color: 'var(--ink)', fontWeight: 500 }}>Live · Philippines · DPWH</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
