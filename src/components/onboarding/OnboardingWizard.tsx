// Full-screen multi-step onboarding wizard.
// Replaces the old StartupSequence + PermissionsToaster (floating modal) flow.
// Layout: left = dot background (form) + right = dark #1A1A1A (testimonial)
// Steps: 0 Welcome → 1 Permissions → 2 AI Provider → 3 Speech-to-Text

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Mic, CheckCircle, AlertCircle, ExternalLink,
  ArrowRight, ArrowLeft, Eye, EyeOff, Check, Zap,
} from 'lucide-react';
import logoAsset from '../../assets/logo.png';
import StartupSequence from '../StartupSequence';
import { OnboardingTestimonial } from './OnboardingTestimonial';

// ─── Design tokens ───────────────────────────────────────────
const BRAND   = '#D97757';
const INK_900 = '#1A1A1A';
const FONT    = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';

const dotBg: React.CSSProperties = {
  backgroundColor:  '#F5F5F5',
  backgroundImage:  'radial-gradient(circle, rgba(200,200,200,0.6) 2px, transparent 2px)',
  backgroundSize:   '36px 36px',
};

const STEP_LABELS = ['Permissions', 'AI Provider', 'Speech-to-Text'];
const TOTAL       = STEP_LABELS.length;

// ─── Types ───────────────────────────────────────────────────
type PermStatus = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'loading';

type LLMProvider = 'claude' | 'openai' | 'groq' | 'gemini';
type SttOption   = 'google' | 'groq' | 'openai';

interface Props { onComplete: () => void; }

// ─── Root wizard ─────────────────────────────────────────────
export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  if (step === 0) {
    return <StartupSequence onComplete={() => setStep(1)} />;
  }

  return (
    <WizardShell
      step={step}
      onBack={() => setStep(s => s - 1)}
      onNext={() => {
        if (step >= TOTAL) onComplete();
        else setStep(s => s + 1);
      }}
      onSkip={() => {
        if (step >= TOTAL) onComplete();
        else setStep(s => s + 1);
      }}
    />
  );
}

// ─── Two-column shell ─────────────────────────────────────────
function WizardShell({
  step, onBack, onNext, onSkip,
}: { step: number; onBack: () => void; onNext: () => void; onSkip: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', gridTemplateColumns: '1fr 1fr', fontFamily: FONT }}>
      {/* ── Left: dot background + form ── */}
      <div style={{ ...dotBg, display: 'flex', flexDirection: 'column', padding: '40px 48px', overflowY: 'auto' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'auto', paddingBottom: 32 }}>
          <img src={logoAsset} alt="REINIT" style={{ height: 26, width: 'auto' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: INK_900, letterSpacing: '-0.02em' }}>reinit.in</span>
        </div>

        {/* Step indicator */}
        <div style={{ marginBottom: 32 }}>
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
            color: BRAND,
          }}>
            Step {step} of {TOTAL}
          </span>
        </div>

        {/* Step form */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] as any }}
            style={{ flex: 1 }}
          >
            {step === 1 && <StepPermissions onNext={onNext} />}
            {step === 2 && <StepAIProvider  onNext={onNext} onSkip={onSkip} />}
            {step === 3 && <StepSTT         onNext={onNext} onSkip={onSkip} />}
          </motion.div>
        </AnimatePresence>

        {/* Back link */}
        {step > 1 && (
          <button
            onClick={onBack}
            style={{
              marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'rgba(26,26,26,0.45)', padding: 0, fontFamily: FONT,
            }}
            onMouseEnter={e => e.currentTarget.style.color = INK_900}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(26,26,26,0.45)'}
          >
            <ArrowLeft size={14} strokeWidth={2} /> Back
          </button>
        )}
      </div>

      {/* ── Right: dark testimonial panel ── */}
      <div style={{
        background: INK_900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(to right,rgba(255,255,255,0.03) 1px,transparent 1px),
                            linear-gradient(to bottom,rgba(255,255,255,0.03) 1px,transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 80% at 50% 50%,transparent 40%,${INK_900} 100%)`,
        }} />
        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <OnboardingTestimonial />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Step 1 — Permissions
// ═══════════════════════════════════════════════════════════════
function StepPermissions({ onNext }: { onNext: () => void }) {
  const [platform,  setPlatform]  = useState('darwin');
  const [micStatus, setMicStatus] = useState<PermStatus>('loading');
  const [scrStatus, setScrStatus] = useState<PermStatus>('loading');
  const [requesting, setRequesting] = useState(false);

  const refresh = useCallback(async () => {
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

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const requestMic = async () => {
    setRequesting(true);
    await window.electronAPI?.requestMicPermission?.();
    await refresh();
    setRequesting(false);
  };

  const openScreenSettings = () => {
    window.electronAPI?.openExternal?.(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
    );
  };

  const allGranted = micStatus === 'granted' && scrStatus === 'granted';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: INK_900, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Allow access
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.52)', lineHeight: 1.65, margin: 0 }}>
          {platform === 'darwin'
            ? 'REINIT needs screen and microphone access to capture meetings and coach you in real time.'
            : 'Click "Allow" if Windows asks for microphone or screen access when you start a meeting.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PermRow
          icon={Monitor}
          label="Screen Recording"
          description="Capture meeting content"
          status={scrStatus}
          platform={platform}
          actionLabel="Open Settings"
          ActionIcon={ExternalLink}
          onAction={platform === 'darwin' ? openScreenSettings : undefined}
        />
        <PermRow
          icon={Mic}
          label="Microphone"
          description="Speech transcription"
          status={micStatus}
          platform={platform}
          actionLabel={requesting ? 'Requesting…' : 'Request Access'}
          onAction={micStatus !== 'granted' && !requesting ? requestMic : undefined}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ContinueButton onClick={onNext} active={allGranted}>
          {allGranted ? 'All set — continue' : 'Continue'}
        </ContinueButton>
        {!allGranted && (
          <p style={{ fontSize: 11, color: 'rgba(26,26,26,0.35)', textAlign: 'center', margin: 0 }}>
            You can grant permissions later in System Preferences.
          </p>
        )}
      </div>
    </div>
  );
}

function PermRow({
  icon: Icon, label, description, status, platform,
  actionLabel, ActionIcon, onAction,
}: {
  icon: React.ElementType; label: string; description: string;
  status: PermStatus; platform: string;
  actionLabel: string; ActionIcon?: React.ElementType; onAction?: () => void;
}) {
  const isGranted = status === 'granted';
  const isDenied  = status === 'denied' || status === 'restricted';
  const isPending = status === 'loading' || status === 'not-determined';
  const GREEN = '#10b981', RED = '#ef4444';

  const iconColor  = isGranted ? GREEN : isDenied ? RED : BRAND;
  const wellBg     = isGranted ? 'rgba(16,185,129,0.10)' : isDenied ? 'rgba(239,68,68,0.08)' : 'rgba(217,119,87,0.10)';
  const wellBorder = isGranted ? 'rgba(16,185,129,0.20)' : isDenied ? 'rgba(239,68,68,0.15)' : 'rgba(217,119,87,0.20)';
  const statusLabel = platform !== 'darwin' ? 'System handles this'
    : isGranted ? 'Granted' : isDenied ? 'Denied — re-enable in Settings' : 'Not yet granted';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px',
      borderRadius: 12, background: 'rgba(255,255,255,0.72)',
      border: `1px solid ${isGranted ? 'rgba(16,185,129,0.20)' : 'rgba(0,0,0,0.08)'}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'border-color 0.3s',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: wellBg, border: `1px solid ${wellBorder}`,
      }}>
        <Icon size={16} strokeWidth={1.75} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK_900 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'rgba(26,26,26,0.48)', marginTop: 2 }}>
          {isPending || platform !== 'darwin' ? description : statusLabel}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {platform === 'darwin' && !isPending && (
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isGranted ? GREEN : isDenied ? RED : BRAND,
            boxShadow: `0 0 6px ${isGranted ? 'rgba(16,185,129,0.4)' : isDenied ? 'rgba(239,68,68,0.4)' : 'rgba(217,119,87,0.4)'}`,
          }} />
        )}
        {onAction && !isGranted && (
          <button
            onClick={onAction}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'rgba(217,119,87,0.12)', fontSize: 11.5, fontWeight: 600,
              color: BRAND, fontFamily: FONT, transition: 'background 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,119,87,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(217,119,87,0.12)'}
          >
            {ActionIcon && <ActionIcon size={11} strokeWidth={2} />}
            {actionLabel}
          </button>
        )}
        {isGranted && <CheckCircle size={16} strokeWidth={1.75} color={GREEN} />}
        {isDenied && platform === 'darwin' && <AlertCircle size={16} strokeWidth={1.75} color={RED} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Step 2 — AI Provider
// ═══════════════════════════════════════════════════════════════
const LLM_PROVIDERS: { id: LLMProvider; name: string; hint: string; url: string; placeholder: string }[] = [
  { id: 'claude',  name: 'Anthropic Claude', hint: 'Best for reasoning & coding',   url: 'https://console.anthropic.com/',           placeholder: 'sk-ant-…' },
  { id: 'openai',  name: 'OpenAI GPT',       hint: 'Broad capability, GPT-4o',       url: 'https://platform.openai.com/api-keys',    placeholder: 'sk-…' },
  { id: 'groq',    name: 'Groq',             hint: 'Ultra-fast inference',           url: 'https://console.groq.com/keys',            placeholder: 'gsk_…' },
  { id: 'gemini',  name: 'Google Gemini',    hint: 'Free tier available',            url: 'https://aistudio.google.com/app/apikey',   placeholder: 'AIza…' },
];

function StepAIProvider({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [selected, setSelected]   = useState<LLMProvider | null>(null);
  const [key,      setKey]        = useState('');
  const [showKey,  setShowKey]    = useState(false);
  const [saving,   setSaving]     = useState(false);
  const [saved,    setSaved]      = useState<LLMProvider | null>(null);
  const [error,    setError]      = useState('');

  const saveKey = async () => {
    if (!selected || !key.trim()) return;
    setSaving(true); setError('');
    try {
      let result: { success: boolean; error?: string } | undefined;
      if (selected === 'claude')  result = await window.electronAPI?.setClaudeApiKey?.(key.trim());
      if (selected === 'openai')  result = await window.electronAPI?.setOpenaiApiKey?.(key.trim());
      if (selected === 'groq')    result = await window.electronAPI?.setGroqApiKey?.(key.trim());
      if (selected === 'gemini')  result = await window.electronAPI?.setGeminiApiKey?.(key.trim());
      if (result?.success) {
        setSaved(selected);
        setKey('');
      } else {
        setError(result?.error || 'Failed to save key. Please try again.');
      }
    } catch {
      setError('Failed to save key. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: INK_900, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Connect your AI
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.52)', lineHeight: 1.65, margin: 0 }}>
          Add an API key so REINIT can coach you during interviews and answer questions in real time.
        </p>
      </div>

      {/* Provider cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {LLM_PROVIDERS.map(p => {
          const isSaved    = saved === p.id;
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => { setSelected(p.id); setKey(''); setError(''); }}
              style={{
                padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                textAlign: 'left', fontFamily: FONT, transition: 'all 150ms',
                background: isSelected
                  ? 'rgba(217,119,87,0.10)'
                  : isSaved ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.72)',
                outline: isSelected
                  ? `2px solid ${BRAND}`
                  : isSaved ? '2px solid rgba(16,185,129,0.4)' : '1px solid rgba(0,0,0,0.09)',
                outlineOffset: isSelected || isSaved ? 0 : -1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: INK_900 }}>{p.name}</span>
                {isSaved && <CheckCircle size={14} strokeWidth={2} color="#10b981" />}
              </div>
              <span style={{ fontSize: 11, color: 'rgba(26,26,26,0.48)' }}>{p.hint}</span>
            </button>
          );
        })}
      </div>

      {/* Key input — shows when a provider is selected */}
      <AnimatePresence>
        {selected && saved !== selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(26,26,26,0.55)' }}>
                  {LLM_PROVIDERS.find(p => p.id === selected)?.name} API Key
                </span>
                <button
                  onClick={() => window.electronAPI?.openExternal?.(LLM_PROVIDERS.find(p => p.id === selected)?.url || '')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, color: BRAND, padding: 0, fontFamily: FONT,
                  }}
                >
                  Get API key <ExternalLink size={10} strokeWidth={2} />
                </button>
              </div>
              <div style={{ position: 'relative', display: 'flex' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={e => { setKey(e.target.value); setError(''); }}
                  placeholder={LLM_PROVIDERS.find(p => p.id === selected)?.placeholder}
                  onKeyDown={e => e.key === 'Enter' && saveKey()}
                  style={{
                    flex: 1, height: 44, padding: '0 44px 0 14px', borderRadius: 10,
                    border: `1px solid ${error ? '#ef4444' : 'rgba(0,0,0,0.12)'}`,
                    background: '#fff', fontSize: 13, fontFamily: 'monospace',
                    color: INK_900, outline: 'none',
                  }}
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(26,26,26,0.35)', padding: 0,
                  }}
                >
                  {showKey ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                </button>
              </div>
              {error && <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{error}</p>}
              <button
                onClick={saveKey}
                disabled={!key.trim() || saving}
                style={{
                  height: 40, borderRadius: 10, border: 'none', cursor: key.trim() && !saving ? 'pointer' : 'default',
                  background: key.trim() && !saving ? BRAND : 'rgba(26,26,26,0.08)',
                  color: key.trim() && !saving ? '#fff' : 'rgba(26,26,26,0.35)',
                  fontSize: 13, fontWeight: 600, fontFamily: FONT,
                  transition: 'all 0.2s',
                }}
              >
                {saving ? 'Saving…' : 'Save Key'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        <ContinueButton onClick={onNext} active={!!saved}>
          {saved ? 'Continue' : 'Continue'}
        </ContinueButton>
        <button
          onClick={onSkip}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'rgba(26,26,26,0.4)', fontFamily: FONT, padding: '4px 0',
          }}
          onMouseEnter={e => e.currentTarget.style.color = INK_900}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(26,26,26,0.4)'}
        >
          Skip for now — I'll add this in settings
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Step 3 — Speech-to-Text
// ═══════════════════════════════════════════════════════════════
const STT_OPTIONS: { id: SttOption; name: string; hint: string; needsKey: boolean; recommended?: boolean }[] = [
  { id: 'google', name: 'Google (Default)', hint: 'Free, no setup required',   needsKey: false, recommended: true },
  { id: 'groq',   name: 'Groq Whisper',    hint: 'Ultra-fast, needs Groq key', needsKey: true  },
  { id: 'openai', name: 'OpenAI Whisper',  hint: 'High accuracy, needs OpenAI key', needsKey: true },
];

function StepSTT({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [selected, setSelected] = useState<SttOption>('google');
  const [key,      setKey]      = useState('');
  const [showKey,  setShowKey]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  const handleSelect = async (opt: SttOption) => {
    setSelected(opt);
    setKey(''); setError(''); setSaved(false);
    if (opt === 'google') {
      try { await window.electronAPI?.setSttProvider?.('google'); } catch {}
    }
  };

  const saveAndContinue = async () => {
    const opt = STT_OPTIONS.find(o => o.id === selected)!;
    if (!opt.needsKey) { onNext(); return; }
    if (!key.trim()) { setError('Please enter an API key.'); return; }
    setSaving(true); setError('');
    try {
      // Set the provider first
      await window.electronAPI?.setSttProvider?.(selected as any);
      // Then save the key
      if (selected === 'groq') {
        // @ts-ignore
        await window.electronAPI?.setGroqSttApiKey?.(key.trim());
      } else if (selected === 'openai') {
        // @ts-ignore
        await window.electronAPI?.setOpenAiSttApiKey?.(key.trim());
      }
      setSaved(true);
      onNext();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedOpt = STT_OPTIONS.find(o => o.id === selected)!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: INK_900, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Choose transcription
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.52)', lineHeight: 1.65, margin: 0 }}>
          REINIT transcribes your meetings in real time. Pick a provider — Google works out of the box.
        </p>
      </div>

      {/* STT options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STT_OPTIONS.map(opt => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                textAlign: 'left', fontFamily: FONT, transition: 'all 150ms',
                background: isSelected ? 'rgba(217,119,87,0.10)' : 'rgba(255,255,255,0.72)',
                outline: isSelected ? `2px solid ${BRAND}` : '1px solid rgba(0,0,0,0.09)',
                outlineOffset: isSelected ? 0 : -1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Selection dot */}
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isSelected ? BRAND : 'rgba(0,0,0,0.2)'}`,
                  background: isSelected ? BRAND : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms',
                }}>
                  {isSelected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: INK_900 }}>{opt.name}</span>
                    {opt.recommended && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: 99,
                        background: 'rgba(217,119,87,0.14)', color: BRAND,
                      }}>
                        Recommended
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11.5, color: 'rgba(26,26,26,0.48)', display: 'block', marginTop: 2 }}>{opt.hint}</span>
                </div>
              </div>
              {!opt.needsKey && (
                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, flexShrink: 0 }}>No key needed</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Key input for providers that need it */}
      <AnimatePresence>
        {selectedOpt.needsKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(26,26,26,0.55)' }}>
                {selected === 'groq' ? 'Groq' : 'OpenAI'} API Key
              </span>
              <div style={{ position: 'relative', display: 'flex' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={e => { setKey(e.target.value); setError(''); }}
                  placeholder={selected === 'groq' ? 'gsk_…' : 'sk-…'}
                  onKeyDown={e => e.key === 'Enter' && saveAndContinue()}
                  style={{
                    flex: 1, height: 44, padding: '0 44px 0 14px', borderRadius: 10,
                    border: `1px solid ${error ? '#ef4444' : 'rgba(0,0,0,0.12)'}`,
                    background: '#fff', fontSize: 13, fontFamily: 'monospace',
                    color: INK_900, outline: 'none',
                  }}
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(26,26,26,0.35)', padding: 0,
                  }}
                >
                  {showKey ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                </button>
              </div>
              {error && <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        <ContinueButton onClick={saveAndContinue} active={!selectedOpt.needsKey || !!key.trim()} loading={saving}>
          {saving ? 'Saving…' : "Let's go"}
        </ContinueButton>
        <button
          onClick={onSkip}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'rgba(26,26,26,0.4)', fontFamily: FONT, padding: '4px 0',
          }}
          onMouseEnter={e => e.currentTarget.style.color = INK_900}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(26,26,26,0.4)'}
        >
          Skip for now — I'll configure this later
        </button>
      </div>
    </div>
  );
}

// ─── Shared ContinueButton ────────────────────────────────────
function ContinueButton({
  children, onClick, active = true, loading = false,
}: {
  children: React.ReactNode; onClick: () => void; active?: boolean; loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%', height: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderRadius: 12, border: 'none', cursor: loading ? 'wait' : 'pointer',
        fontFamily: FONT, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
        background: active ? BRAND : 'rgba(26,26,26,0.08)',
        color:      active ? '#fff' : 'rgba(26,26,26,0.45)',
        boxShadow:  active ? '0 0 0 1px rgba(217,119,87,0.35),0 4px 12px -4px rgba(217,119,87,0.45)' : 'none',
        transition: 'all 0.25s',
      }}
      onMouseEnter={e => { if (active) e.currentTarget.style.opacity = '0.9'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {children}
      {!loading && <ArrowRight size={15} strokeWidth={2.2} />}
    </button>
  );
}
