'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { LockSimple, User, Eye, EyeSlash } from '@phosphor-icons/react';

import logo from '../assets/logo.png';
import logoLight from '../assets/logo-light-mode.png';

interface LoginScreenProps {
  onSuccess: (token: string) => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const reduce = useReducedMotion();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
      } else {
        sessionStorage.setItem('tg_token', data.token);
        onSuccess(data.token);
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--canvas)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: '400px',
          position: 'relative',
        }}
      >
        {/* Logo — the real TerraGuard mark, crossfading with the theme */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ position: 'relative', width: '28px', height: '28px', flexShrink: 0 }}>
              <Image src={logo} alt="" fill sizes="28px" style={{ objectFit: 'contain' }} className="logo-mark logo-mark-dark" />
              <Image src={logoLight} alt="" fill sizes="28px" style={{ objectFit: 'contain' }} className="logo-mark logo-mark-light" />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
            }}>TerraGuard</span>
          </div>
          <p className="t-caption" style={{ color: 'var(--mute)' }}>
            Satellite-Based Infrastructure Fraud Detection
          </p>
        </div>

        {/* Card — same breathing corner glow as the home hero asset */}
        <div className="hero-glow-wrap">
          <span className="hero-glow hero-glow-left" />
          <span className="hero-glow hero-glow-right" />
          <span className="hero-glow hero-glow-top" />

          <div className="hero-glow-card" style={{
            background: 'var(--canvas)',
            border: '1px solid var(--hairline-strong)',
            borderRadius: '8px',
            padding: 'clamp(28px, 7vw, 40px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
              <LockSimple size={16} color="var(--mute)" />
              <span className="t-micro-cap" style={{ color: 'var(--mute)' }}>Demo Access Required</span>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Username */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="tg-username" className="t-micro-cap" style={{ color: 'var(--ink)' }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--mute)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    id="tg-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    className="field"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="tg-password" className="t-micro-cap" style={{ color: 'var(--ink)' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <LockSimple size={16} color="var(--mute)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    id="tg-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="field"
                    style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="field-icon-btn"
                  >
                    {showPass ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="t-caption"
                  style={{ color: 'var(--error)', margin: 0 }}
                >
                  {error}
                </motion.p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-ghost btn-ghost-accent"
                style={{ marginTop: '16px', width: '100%', justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Verifying...' : 'Access TerraGuard'}
              </button>
            </form>
          </div>
        </div>

        <p className="t-caption" style={{ textAlign: 'center', marginTop: '24px', color: 'var(--mute)' }}>
          Hackathon demo — credentials provided by organizers
        </p>
      </motion.div>
    </div>
  );
}
