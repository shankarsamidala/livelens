// src/components/onboarding/PermissionsToaster.tsx
//
// REINIT-branded first-launch permissions screen.
// Matches the REINIT dashboard design system:
//   — dot background (light #F5F5F5 + gray radial dots)
//   — brand orange #D97757 for accents and CTA
//   — dark right column #1A1A1A with value props
//   — Inter typography

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Monitor, Mic, CheckCircle, AlertCircle, ExternalLink, ArrowRight, Check } from 'lucide-react';
import logoAsset from '../../assets/logo.png';

const STORAGE_KEY      = 'natively_perms_shown_v1';
const STARTUP_DELAY_MS = 1_400;

const BRAND   = '#D97757';
const INK_900 = '#1A1A1A';

const dotBgStyle: React.CSSProperties = {
  backgroundColor:  '#F5F5F5',
  backgroundImage:  'radial-gradient(circle, rgba(200,200,200,0.6) 2px, transparent 2px)',
  backgroundSize:   '36px 36px',
};

const VALUE_PROPS = [
  'Capture every meeting — automatic and private',
  'Real-time AI coaching during interviews',
  'Your career history, always at your fingertips',
];

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';

type PermStatus = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'loading';

interface Props {
  isOpen:    boolean;
  onDismiss: () => void;
}

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const ITEM    = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as any } },
};

export const PermissionsToaster: React.FC<Props> = ({ isOpen, onDismiss }) => {
  const [visible,    setVisible]    = useState(false);
  const [platform,   setPlatform]   = useState<string>('darwin');
  const [micStatus,  setMicStatus]  = useState<PermStatus>('loading');
  const [scrStatus,  setScrStatus]  = useState<PermStatus>('loading');
  const [requesting, setRequesting] = useState(false);
  const reduced = useReducedMotion() ?? false;

  const refreshStatus = useCallback(async () => {
    try {
      const p = await window.electronAPI?.checkPermissions?.();
      if (!p) return;
      setPlatform(p.platform);
      setMicStatus(p.microphone as PermStatus);
      setScrStatus(p.screen     as PermStatus);
    } catch {
      setMicStatus('not-determined');
      setScrStatus('not-determined');
    }
  }, []);

  useEffect(() => {
    if (!isOpen) { setVisible(false); return; }
    const t = setTimeout(async () => {
      await refreshStatus();
      setVisible(true);
    }, STARTUP_DELAY_MS);
    return () => clearTimeout(t);
  }, [isOpen, refreshStatus]);

  useEffect(() => {
    if (!visible) return;
    const onFocus = () => refreshStatus();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [visible, refreshStatus]);

  const handleMicRequest = async () => {
    setRequesting(true);
    await window.electronAPI?.requestMicPermission?.();
    await refreshStatus();
    setRequesting(false);
  };

  const openScreenSettings = () => {
    window.electronAPI?.openExternal?.('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    onDismiss();
  };

  if (!visible) return null;

  const allGranted = micStatus === 'granted' && scrStatus === 'granted';

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="perm-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.52)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        } as React.CSSProperties}
        onClick={e => { if (e.target === e.currentTarget) handleDismiss(); }}
      >
        {/* Two-column card */}
        <motion.div
          key="perm-card"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1,    y: 0  }}
          exit={   reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.8 }}
          style={{
            display: 'flex',
            width: '760px',
            maxWidth: 'calc(100vw - 48px)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.38), 0 0 0 1px rgba(0,0,0,0.07)',
            fontFamily: FONT,
          }}
        >
          {/* ── Left column: dot background + form ── */}
          <div style={{ ...dotBgStyle, flex: 1, padding: '32px 32px 28px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={logoAsset} alt="REINIT" style={{ height: '26px', width: 'auto' }} />
                <span style={{ fontSize: '16px', fontWeight: 700, color: INK_900, letterSpacing: '-0.02em', fontFamily: FONT }}>
                  reinit.in
                </span>
              </div>
              <button
                onClick={handleDismiss}
                aria-label="Dismiss"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', color: 'rgba(26,26,26,0.38)', padding: 0,
                  transition: 'background 150ms, color 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.07)'; e.currentTarget.style.color = INK_900; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(26,26,26,0.38)'; }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

            <motion.div variants={STAGGER} initial="hidden" animate="show" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Headline */}
              <motion.div variants={ITEM}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: INK_900, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 6px', fontFamily: FONT }}>
                  One-time setup
                </h2>
                <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'rgba(26,26,26,0.52)', margin: 0, fontFamily: FONT }}>
                  {platform === 'darwin'
                    ? 'REINIT needs screen and microphone access to capture meetings and coach you in real time.'
                    : 'Click "Allow" if Windows asks for microphone or screen access when you start a meeting.'}
                </p>
              </motion.div>

              {/* Permission rows */}
              <motion.div variants={ITEM} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <PermRow
                  icon={Monitor}
                  label="Screen Recording"
                  description="Required to capture meeting content"
                  status={scrStatus}
                  platform={platform}
                  actionLabel="Open Settings"
                  actionIcon={ExternalLink}
                  onAction={platform === 'darwin' ? openScreenSettings : undefined}
                />
                <PermRow
                  icon={Mic}
                  label="Microphone"
                  description="Required for speech transcription"
                  status={micStatus}
                  platform={platform}
                  actionLabel={requesting ? 'Requesting…' : 'Request Access'}
                  onAction={micStatus !== 'granted' && !requesting ? handleMicRequest : undefined}
                />
              </motion.div>

              {/* CTA */}
              <motion.div variants={ITEM} style={{ marginTop: 'auto' }}>
                <button
                  onClick={handleDismiss}
                  style={{
                    width: '100%', height: '48px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    borderRadius: '12px', border: 'none', cursor: 'pointer',
                    fontFamily: FONT, fontSize: '14px', fontWeight: 600, letterSpacing: '-0.01em',
                    background: allGranted ? BRAND : 'rgba(26,26,26,0.08)',
                    color:      allGranted ? '#fff' : 'rgba(26,26,26,0.45)',
                    boxShadow:  allGranted
                      ? '0 0 0 1px rgba(217,119,87,0.35), 0 4px 12px -4px rgba(217,119,87,0.45)'
                      : 'none',
                    transition: 'background 0.25s, box-shadow 0.25s, color 0.25s',
                  }}
                  onMouseEnter={e => {
                    if (allGranted) { e.currentTarget.style.opacity = '0.9'; }
                    else { e.currentTarget.style.background = 'rgba(26,26,26,0.12)'; }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = '1';
                    if (!allGranted) e.currentTarget.style.background = 'rgba(26,26,26,0.08)';
                  }}
                >
                  {allGranted ? 'All set — continue' : 'Continue'}
                  <ArrowRight size={15} strokeWidth={2.2} />
                </button>
                {!allGranted && (
                  <p style={{ fontSize: '11px', color: 'rgba(26,26,26,0.35)', textAlign: 'center', marginTop: '8px', fontFamily: FONT }}>
                    You can grant permissions later in System Preferences.
                  </p>
                )}
              </motion.div>

            </motion.div>
          </div>

          {/* ── Right column: dark + value props ── */}
          <div style={{
            width: '272px', flexShrink: 0,
            background: INK_900,
            padding: '32px 28px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <p style={{
                  fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: BRAND, margin: '0 0 10px', fontFamily: FONT,
                }}>
                  Your AI Career Copilot
                </p>
                <h3 style={{
                  fontSize: '21px', fontWeight: 700, color: '#fff',
                  letterSpacing: '-0.03em', lineHeight: 1.22, margin: 0, fontFamily: FONT,
                }}>
                  Local. Private.<br />Always on.
                </h3>
              </div>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', padding: 0, margin: 0 }}>
                {VALUE_PROPS.map(prop => (
                  <li key={prop} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                      background: 'rgba(217,119,87,0.14)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={10} strokeWidth={2.8} color={BRAND} />
                    </div>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.52, fontFamily: FONT }}>
                      {prop}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.32)', lineHeight: 1.55, margin: 0, fontFamily: FONT }}>
                Built from a real career restart story. Everything stays on your machine — private by design.
              </p>
            </div>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Single permission row ─────────────────────────────────────
function PermRow({
  icon: Icon, label, description, status, platform,
  actionLabel, actionIcon: ActionIcon, onAction,
}: {
  icon:         React.ElementType;
  label:        string;
  description:  string;
  status:       PermStatus;
  platform:     string;
  actionLabel:  string;
  actionIcon?:  React.ElementType;
  onAction?:    () => void;
}) {
  const isGranted = status === 'granted';
  const isDenied  = status === 'denied' || status === 'restricted';
  const isPending = status === 'loading' || status === 'not-determined';

  const GREEN = '#10b981';
  const RED   = '#ef4444';

  const statusLabel = platform !== 'darwin'
    ? 'System handles this'
    : isGranted  ? 'Granted'
    : isDenied   ? 'Denied — re-enable in Settings'
    : 'Not yet granted';

  const iconWellBg     = isGranted ? 'rgba(16,185,129,0.10)'  : isDenied ? 'rgba(239,68,68,0.08)'   : 'rgba(217,119,87,0.10)';
  const iconWellBorder = isGranted ? 'rgba(16,185,129,0.20)'  : isDenied ? 'rgba(239,68,68,0.15)'   : 'rgba(217,119,87,0.20)';
  const iconColor      = isGranted ? GREEN                     : isDenied ? RED                      : BRAND;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '13px 16px', borderRadius: '12px',
      background: 'rgba(255,255,255,0.72)',
      border: `1px solid ${isGranted ? 'rgba(16,185,129,0.20)' : 'rgba(0,0,0,0.08)'}`,
      transition: 'border-color 0.3s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Icon well */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: iconWellBg, border: `1px solid ${iconWellBorder}`,
      }}>
        <Icon size={16} strokeWidth={1.75} color={iconColor} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: INK_900, letterSpacing: '-0.01em', fontFamily: FONT }}>
          {label}
        </div>
        <div style={{ fontSize: '11.5px', color: 'rgba(26,26,26,0.48)', marginTop: '2px', fontFamily: FONT }}>
          {isPending || platform !== 'darwin' ? description : statusLabel}
        </div>
      </div>

      {/* Status badge + action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Dot indicator */}
        {platform === 'darwin' && !isPending && (
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: isGranted ? GREEN : isDenied ? RED : BRAND,
            boxShadow: `0 0 6px ${isGranted ? 'rgba(16,185,129,0.4)' : isDenied ? 'rgba(239,68,68,0.4)' : 'rgba(217,119,87,0.4)'}`,
          }} />
        )}

        {/* Action button (only when not granted) */}
        {onAction && !isGranted && (
          <button
            onClick={onAction}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: 'rgba(217,119,87,0.12)',
              fontSize: '11.5px', fontWeight: 600, color: BRAND,
              fontFamily: FONT, transition: 'background 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,119,87,0.20)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(217,119,87,0.12)'}
          >
            {ActionIcon && <ActionIcon size={11} strokeWidth={2} />}
            {actionLabel}
          </button>
        )}

        {/* Status icons */}
        {isGranted && <CheckCircle size={16} strokeWidth={1.75} color={GREEN} />}
        {isDenied && platform === 'darwin' && <AlertCircle size={16} strokeWidth={1.75} color={RED} />}
      </div>
    </div>
  );
}
