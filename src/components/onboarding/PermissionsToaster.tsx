// src/components/onboarding/PermissionsToaster.tsx
//
// Premium Apple-style permissions request card.
// Shows once on first launch, after the launcher UI is visible.

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Monitor, Mic, CheckCircle, AlertCircle, ExternalLink, ArrowRight } from 'lucide-react';

const STORAGE_KEY      = 'natively_perms_shown_v1';
const STARTUP_DELAY_MS = 1_400;

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const ITEM    = {
  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] as any } },
};

type PermStatus = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'loading';

interface Props {
  isOpen:    boolean;
  onDismiss: () => void;
}

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
      <style>{`
        @keyframes perm-border-flow {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
        .perm-border {
          background: linear-gradient(145deg,
            rgba(217,119,87,0.75),
            rgba(59,130,246,0.55),
            rgba(217,119,87,0.7),
            rgba(52,211,153,0.5)
          );
          background-size: 300% 300%;
          animation: perm-border-flow 6s ease infinite;
        }
        .perm-border-reduced {
          background: linear-gradient(145deg, rgba(217,119,87,0.55), rgba(59,130,246,0.4), rgba(52,211,153,0.38));
        }
      `}</style>

      {/* Backdrop */}
      <motion.div
        key="perm-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[9998] flex items-center justify-center backdrop-blur-[8px]"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(217,119,87,0.06) 0%, rgba(0,0,0,0.84) 100%)' }}
        onClick={e => { if (e.target === e.currentTarget) handleDismiss(); }}
      >
        {/* Gradient border wrapper */}
        <motion.div
          key="perm-card"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.93, y: 20, filter: 'blur(10px)' }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1,    y: 0,  filter: 'blur(0px)' }}
          exit={   reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 14, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 290, damping: 25, mass: 0.82 }}
          className={`p-[1.5px] rounded-[23px] ${reduced ? 'perm-border-reduced' : 'perm-border'}`}
          style={{ boxShadow: '0 48px 120px -20px rgba(0,0,0,0.95), 0 0 80px rgba(217,119,87,0.06)' }}
        >
          <div className="relative w-[430px] rounded-[22px] overflow-hidden bg-[linear-gradient(150deg,rgba(10,10,18,0.99)_0%,rgba(6,6,11,1)_100%)] font-sans">
            {/* Catch-light */}
            <div aria-hidden className="absolute top-0 left-0 right-0 h-px bg-white/[0.14] pointer-events-none z-[5]" />

            {/* Aurora glow */}
            {!reduced && (
              <motion.div aria-hidden
                animate={{ opacity: [0.07, 0.15, 0.07] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[400px] h-[280px] pointer-events-none z-[1]"
                style={{ background: 'radial-gradient(ellipse, rgba(217,119,87,0.28) 0%, transparent 65%)' }}
              />
            )}

            {/* Grain texture */}
            <div aria-hidden className="absolute inset-0 rounded-[22px] pointer-events-none z-[4] opacity-[0.028] mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundSize: '180px 180px',
              }}
            />

            <div className="px-7 pt-[26px] pb-7 relative z-[6]">
              {/* Header */}
              <div className="flex items-center justify-between mb-[22px] pb-4 border-b border-white/[0.08]">
                <span className="text-[10.5px] font-[660] tracking-[0.14em] uppercase text-white/[0.72]">
                  LiveLens · Permissions
                </span>
                <button onClick={handleDismiss} aria-label="Dismiss"
                  className="bg-transparent border-0 cursor-pointer w-7 h-7 flex items-center justify-center rounded-full opacity-35 p-0 hover:opacity-80 hover:bg-white/[0.10] transition-[opacity,background] duration-150">
                  <X size={13} strokeWidth={2.3} color="#fff" />
                </button>
              </div>

              <motion.div variants={STAGGER} initial="hidden" animate="show" className="flex flex-col gap-5">
                {/* Headline */}
                <motion.div variants={ITEM}>
                  <h2
                    className="text-[22px] font-[720] tracking-[-0.03em] leading-[1.2] m-0 mb-2"
                    style={{ background: 'linear-gradient(140deg, #FFFFFF 25%, rgba(196,181,253,0.9) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                  >
                    Before we start
                  </h2>
                  <p className="text-[13px] leading-[1.64] text-white/[0.44] m-0 max-w-[340px]">
                    {platform === 'darwin'
                      ? 'LiveLens needs access to your screen and microphone to capture meetings and transcribe speech.'
                      : 'Click "Allow" if Windows asks for microphone or screen access when you start a meeting.'}
                  </p>
                </motion.div>

                {/* Permission rows */}
                <motion.div variants={ITEM} className="flex flex-col gap-2.5">
                  <PermRow
                    icon={Monitor}
                    label="Screen Recording"
                    description={platform === 'darwin' ? 'Required to capture meeting content' : 'Required to capture meeting content'}
                    status={scrStatus}
                    platform={platform}
                    actionLabel="Open Settings"
                    actionIcon={ExternalLink}
                    onAction={platform === 'darwin' ? openScreenSettings : undefined}
                    reduced={reduced}
                  />
                  <PermRow
                    icon={Mic}
                    label="Microphone"
                    description="Required for speech transcription"
                    status={micStatus}
                    platform={platform}
                    actionLabel={requesting ? 'Requesting…' : 'Request Access'}
                    onAction={micStatus !== 'granted' && !requesting ? handleMicRequest : undefined}
                    reduced={reduced}
                  />
                </motion.div>

                {/* CTA */}
                <motion.div variants={ITEM}>
                  <button
                    onClick={handleDismiss}
                    className="w-full h-[50px] flex items-center justify-between px-5 rounded-[13px] border-0 cursor-pointer transition-[background,box-shadow] duration-300"
                    style={{
                      background: allGranted
                        ? 'linear-gradient(135deg, #c4623e 0%, #b05530 50%, #a04928 100%)'
                        : 'rgba(255,255,255,0.07)',
                      boxShadow: allGranted
                        ? '0 0 0 1px rgba(180,85,48,0.5), 0 8px 28px rgba(217,119,87,0.35), inset 0 1px 0 rgba(255,255,255,0.18)'
                        : '0 0 0 1px rgba(255,255,255,0.08)',
                    }}
                  >
                    <span className={`text-[14px] font-[640] tracking-[-0.01em] ${allGranted ? 'text-white' : 'text-white/[0.72]'}`}>
                      {allGranted ? 'All set — continue' : 'Continue'}
                    </span>
                    <ArrowRight size={15} strokeWidth={2.2} color={allGranted ? '#fff' : 'rgba(255,255,255,0.44)'} />
                  </button>
                  {!allGranted && (
                    <p className="text-[11px] text-white/[0.26] text-center mt-2.5">
                      You can grant permissions later in System Preferences.
                    </p>
                  )}
                </motion.div>
              </motion.div>
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
  actionLabel, actionIcon: ActionIcon, onAction, reduced,
}: {
  icon:         React.ElementType;
  label:        string;
  description:  string;
  status:       PermStatus;
  platform:     string;
  actionLabel:  string;
  actionIcon?:  React.ElementType;
  onAction?:    () => void;
  reduced:      boolean;
}) {
  const isGranted = status === 'granted';
  const isDenied  = status === 'denied' || status === 'restricted';
  const isPending = status === 'loading' || status === 'not-determined';

  const statusLabel = platform !== 'darwin' ? 'System handles this'
    : isGranted ? 'Granted' : isDenied ? 'Denied — re-enable in Settings' : 'Not yet granted';

  return (
    <div className={`flex items-center gap-3.5 p-[14px_16px] rounded-[13px] bg-white/[0.04] border transition-colors duration-300 ${isGranted ? 'border-green-400/20' : 'border-white/[0.08]'}`}>
      {/* Icon well */}
      <div className={`w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center border ${
        isGranted ? 'bg-green-400/[0.12] border-green-400/[0.22]'
        : isDenied ? 'bg-red-400/[0.10] border-red-400/[0.18]'
        : 'bg-accent-primary/[0.12] border-accent-primary/20'
      }`}>
        <Icon size={16} strokeWidth={1.75} className={isGranted ? 'text-green-400' : isDenied ? 'text-red-400' : 'text-accent-primary'} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-[580] text-white tracking-[-0.01em]">{label}</div>
        <div className="text-[11.5px] text-white/[0.44] mt-0.5">
          {isPending || platform !== 'darwin' ? description : statusLabel}
        </div>
      </div>

      {/* Status badge + action */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Dot indicator */}
        {platform === 'darwin' && !isPending && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 20 }}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isGranted ? '#34D399' : isDenied ? '#F87171' : '#FBBF24',
              boxShadow: `0 0 8px ${isGranted ? 'rgba(52,211,153,0.32)' : 'rgba(248,113,113,0.5)'}`,
            }}
          />
        )}

        {/* Action button */}
        {onAction && !isGranted && (
          <button
            onClick={onAction}
            className="flex items-center gap-[5px] px-3 py-1.5 rounded-[8px] border-0 cursor-pointer bg-accent-primary/[0.18] hover:bg-accent-primary/[0.28] text-[11.5px] font-semibold text-[rgba(196,181,253,0.9)] transition-colors duration-150"
          >
            {ActionIcon && <ActionIcon size={11} strokeWidth={2} />}
            {actionLabel}
          </button>
        )}

        {isGranted && <CheckCircle size={16} strokeWidth={1.75} className="text-green-400" />}
        {isDenied && platform === 'darwin' && <AlertCircle size={16} strokeWidth={1.75} className="text-red-400" />}
      </div>
    </div>
  );
}
