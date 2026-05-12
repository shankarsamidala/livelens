// src/components/trial/TrialPromoToaster.tsx
//
// Premium Apple-inspired trial offer card.
// Shows 10s after launcher is visible on non-first launches,
// when no LiveLens API key is stored and no trial is active.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, ArrowRight, Zap, Mic, Search } from 'lucide-react';

const STORAGE_KEY      = 'natively_trial_promo_ts';
const PERMS_KEY        = 'natively_perms_shown_v1';
const STARTUP_DELAY_MS = 10_000;
const COOLDOWN_DAYS    = 7;

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } } };
const ITEM    = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any } },
};

interface Props {
  isOpen:         boolean;
  hasLiveLensKey: boolean;
  hasTrialToken:  boolean;
  onDismiss:      () => void;
  onStartTrial:   () => Promise<void>;
  onManualSetup:  () => void;
}

export const TrialPromoToaster: React.FC<Props> = ({
  isOpen, hasLiveLensKey, hasTrialToken, onDismiss, onStartTrial, onManualSetup,
}) => {
  const [visible,  setVisible]  = useState(false);
  const [starting, setStarting] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    if (!isOpen) { setVisible(false); return; }
    if (hasLiveLensKey || hasTrialToken) return;
    const permsShown = localStorage.getItem(PERMS_KEY);
    if (!permsShown) return;
    const lastShown = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    if (lastShown && Date.now() - lastShown < COOLDOWN_DAYS * 86_400_000) return;
    const t = setTimeout(() => setVisible(true), STARTUP_DELAY_MS);
    return () => clearTimeout(t);
  }, [isOpen, hasLiveLensKey, hasTrialToken]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
    onDismiss();
  };

  const handleStartTrial = async () => {
    setStarting(true);
    setError(null);
    try {
      await onStartTrial();
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setVisible(false);
    } catch (e: any) {
      setError(e.message || 'Could not start trial. Check your connection.');
      setStarting(false);
    }
  };

  const handleManual = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
    onManualSetup();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <style>{`
        @keyframes trial-border-flow {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
        .trial-border {
          background: linear-gradient(145deg,
            rgba(217,119,87,0.80),
            rgba(180,85,48,0.65),
            rgba(240,163,130,0.72),
            rgba(217,119,87,0.80)
          );
          background-size: 300% 300%;
          animation: trial-border-flow 6s ease infinite;
        }
        .trial-border-reduced {
          background: linear-gradient(145deg, rgba(217,119,87,0.65), rgba(180,85,48,0.5), rgba(240,163,130,0.58));
        }
      `}</style>

      {/* Backdrop */}
      <motion.div
        key="trial-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.24 }}
        className="fixed inset-0 z-[9998] flex items-center justify-center backdrop-blur-[8px]"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(217,119,87,0.08) 0%, rgba(0,0,0,0.84) 100%)' }}
        onClick={e => { if (e.target === e.currentTarget) handleDismiss(); }}
      >
        {/* Border wrapper */}
        <motion.div
          key="trial-card"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.93, y: 22, filter: 'blur(10px)' }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1,    y: 0,  filter: 'blur(0px)' }}
          exit={   reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 14, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 290, damping: 25, mass: 0.82 }}
          className={`p-[1.5px] rounded-[23px] ${reduced ? 'trial-border-reduced' : 'trial-border'}`}
          style={{ boxShadow: '0 48px 120px -20px rgba(0,0,0,0.95), 0 0 80px rgba(217,119,87,0.07)' }}
        >
          <div className="relative w-[452px] rounded-[22px] overflow-hidden bg-[linear-gradient(155deg,rgba(11,8,20,0.99)_0%,rgba(6,5,12,1)_100%)] font-sans">
            {/* Catch-light */}
            <div aria-hidden className="absolute top-0 left-0 right-0 h-px bg-white/[0.12] pointer-events-none z-[5]" />

            {/* Aurora */}
            {!reduced && (
              <motion.div aria-hidden
                animate={{ opacity: [0.1, 0.22, 0.1] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[-110px] left-1/2 -translate-x-1/2 w-[460px] h-[320px] pointer-events-none z-[1]"
                style={{ background: 'radial-gradient(ellipse, rgba(217,119,87,0.35) 0%, transparent 62%)' }}
              />
            )}

            {/* Grain */}
            <div aria-hidden className="absolute inset-0 rounded-[22px] pointer-events-none z-[4] opacity-[0.028] mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundSize: '180px 180px',
              }}
            />

            <div className="px-[30px] pt-7 pb-[30px] relative z-[6]">
              {/* Header */}
              <div className="flex items-center justify-between mb-[26px] pb-4 border-b border-white/[0.08]">
                <span className="text-[10.5px] font-[660] tracking-[0.15em] uppercase text-white/[0.72]">
                  LiveLens API
                </span>
                <button onClick={handleDismiss} aria-label="Dismiss"
                  className="bg-transparent border-0 cursor-pointer w-7 h-7 flex items-center justify-center rounded-full opacity-35 p-0 hover:opacity-80 hover:bg-white/[0.10] transition-[opacity,background] duration-150">
                  <X size={13} strokeWidth={2.3} color="#fff" />
                </button>
              </div>

              <motion.div variants={STAGGER} initial="hidden" animate="show" className="flex flex-col gap-[22px]">

                {/* Hero — large "10" number */}
                <motion.div variants={ITEM} className="text-center">
                  <div className="flex items-end justify-center gap-2.5 mb-4">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-[88px] font-[800] leading-none tracking-[-0.055em] text-accent-primary"
                        style={{ textShadow: '0 0 64px rgba(217,119,87,0.40), 0 0 120px rgba(217,119,87,0.2)' }}
                      >
                        10
                      </span>
                      <div className="pb-3.5 flex flex-col justify-end gap-0.5">
                        <span className="text-[16px] font-bold text-[rgba(240,163,130,0.9)] tracking-[-0.02em] leading-none">min</span>
                        <span className="text-[10px] font-semibold text-white/[0.24] uppercase tracking-[0.1em]">free</span>
                      </div>
                    </div>
                  </div>

                  <h2
                    className="text-[21px] font-[720] tracking-[-0.03em] leading-[1.2] m-0 mb-[9px]"
                    style={{ background: 'linear-gradient(140deg, #FFFFFF 20%, rgba(196,181,253,0.92) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                  >
                    Try everything. No card needed.
                  </h2>
                  <p className="text-[13px] leading-[1.66] text-white/[0.44] m-0 mx-auto max-w-[330px]">
                    Full LiveLens API access — AI chat, meeting transcription, and company research — free for 10 minutes. Bound to this device. No sign-in.
                  </p>
                </motion.div>

                {/* Feature chips */}
                <motion.div variants={ITEM}>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: Zap,    label: 'AI Chat',       sub: '10 requests' },
                      { icon: Mic,    label: 'Transcription', sub: '10 min STT' },
                      { icon: Search, label: 'Research',      sub: '2 searches' },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div key={label} className="p-[12px_14px] rounded-[12px] bg-white/[0.04] border border-white/[0.08] flex flex-col gap-1.5 relative overflow-hidden">
                        {/* Violet top accent stripe */}
                        <div aria-hidden
                          className="absolute top-0 left-0 right-0 h-[2px]"
                          style={{ background: 'linear-gradient(90deg, rgba(217,119,87,0.7), transparent 70%)' }}
                        />
                        <div className="w-7 h-7 rounded-[8px] bg-accent-primary/[0.18] border border-accent-primary/[0.22] flex items-center justify-center">
                          <Icon size={13} strokeWidth={1.8} className="text-accent-primary" />
                        </div>
                        <div>
                          <div className="text-[12px] font-[620] text-white tracking-[-0.01em]">{label}</div>
                          <div className="text-[10.5px] text-white/[0.24] mt-[1px]">{sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* CTAs */}
                <motion.div variants={ITEM} className="flex flex-col gap-2.5">
                  <VioletCTA
                    label={starting ? 'Starting trial…' : 'Start free trial'}
                    onClick={handleStartTrial}
                    disabled={starting}
                    reduced={reduced}
                  />
                  {error && (
                    <p className="text-[11px] text-red-400/[0.85] text-center m-0">{error}</p>
                  )}
                  <button onClick={handleManual}
                    className="bg-transparent border-0 cursor-pointer text-[12px] text-white/[0.24] hover:text-white/[0.44] p-[4px_0] w-full text-center transition-colors duration-150">
                    I'll set up manually
                  </button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Violet CTA button ────────────────────────────────────────
const VioletCTA: React.FC<{ label: string; onClick: () => void; disabled: boolean; reduced: boolean }> = ({ label, onClick, disabled, reduced }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={reduced || disabled ? {} : { scale: 1.012, filter: 'brightness(1.06)' }}
      whileTap={{ scale: 0.983 }}
      className="relative w-full h-[54px] overflow-hidden flex items-center justify-between px-[22px] rounded-[14px] border-0 outline-none"
      style={{
        background: disabled
          ? 'rgba(217,119,87,0.3)'
          : 'linear-gradient(135deg, #d97757 0%, #c4623e 50%, #b05530 100%)',
        boxShadow: disabled ? 'none' : '0 0 0 1px rgba(180,85,48,0.45), 0 10px 32px rgba(217,119,87,0.38), inset 0 1px 0 rgba(255,255,255,0.16)',
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {/* Shimmer */}
      {!reduced && !disabled && (
        <motion.div aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)', transform: 'skewX(-14deg)' }}
          animate={{ x: ['-130%', '230%'] }}
          transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 5.5 }}
        />
      )}
      <span className="relative z-[1] text-[14px] font-[660] text-white tracking-[-0.016em]">
        {label}
      </span>
      <motion.span
        className="relative z-[1] flex items-center"
        animate={reduced ? {} : { x: hovered ? 4 : 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <ArrowRight size={16} strokeWidth={2.4} color="rgba(255,255,255,0.9)" />
      </motion.span>
    </motion.button>
  );
};
