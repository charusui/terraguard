'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Broadcast, LockSimple, Eye, EyeSlash } from '@phosphor-icons/react';

interface LoginScreenProps {
  onSuccess: (token: string) => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
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
      background: 'var(--canvas-night)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,196,180,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,196,180,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: '400px',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Broadcast size={22} color="#00c4b4" weight="bold" />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--on-primary)',
            }}>TerraGuard</span>
          </div>
          <p className="t-caption" style={{ color: 'var(--ink-mute)' }}>
            Satellite-Based Infrastructure Fraud Detection
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--canvas-section)',
          border: '1px solid var(--hairline)',
          borderRadius: '2px',
          padding: '40px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <LockSimple size={16} color="var(--ink-mute)" />
            <span className="t-micro-cap" style={{ color: 'var(--ink-mute)' }}>Demo Access Required</span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Username */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="t-micro-cap" style={{ color: 'var(--ink-mute)' }}>Username</label>
              <input
                id="tg-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={{
                  background: 'var(--canvas-night)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '2px',
                  padding: '10px 14px',
                  color: 'var(--on-primary)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--hairline)')}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="t-micro-cap" style={{ color: 'var(--ink-mute)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="tg-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    background: 'var(--canvas-night)',
                    border: '1px solid var(--hairline)',
                    borderRadius: '2px',
                    padding: '10px 40px 10px 14px',
                    color: 'var(--on-primary)',
                    fontSize: '14px',
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--hairline)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPass ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="t-caption"
                style={{ color: '#f87171', margin: 0 }}
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-ghost btn-ghost-accent"
              style={{ marginTop: '8px', width: '100%', justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Verifying...' : 'Access TerraGuard'}
            </button>
          </form>
        </div>

        <p className="t-caption" style={{ textAlign: 'center', marginTop: '24px', color: 'var(--ink-mute)' }}>
          Hackathon demo — credentials provided by organizers
        </p>
      </motion.div>
    </div>
  );
}
