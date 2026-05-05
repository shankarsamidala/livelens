// src/components/onboarding/OllamaSetupToaster.tsx
//
// First-run Ollama setup wizard — 4 steps: Install → Start → Pick model → Done.
// Design mirrors PermissionsToaster: dark glass card, animated gradient border,
// grain texture, aurora glow, SF Pro font, framer-motion spring animations.

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Download, CheckCircle, AlertCircle, ArrowRight, Zap, RefreshCw, Cpu, Copy } from 'lucide-react';

const STORAGE_KEY = 'natively_ollama_setup_done';

// ─── Design tokens — Claude brand: #d97757 orange + #141413 black ─
const T = {
  font:    '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
  orange:  '#d97757',
  orangeG: 'rgba(217,119,87,0.38)',
  green:   '#34D399',
  greenG:  'rgba(52,211,153,0.32)',
  amber:   '#FBBF24',
  red:     '#F87171',
  blue:    '#6a9bcc',
  t1: '#faf9f5',
  t2: 'rgba(250,249,245,0.72)',
  t3: 'rgba(250,249,245,0.44)',
  t4: 'rgba(250,249,245,0.26)',
  glass:    'rgba(250,249,245,0.04)',
  glassMid: 'rgba(250,249,245,0.07)',
  rule:     'rgba(250,249,245,0.08)',
};

const GT: React.CSSProperties = {
  background: 'linear-gradient(140deg, #faf9f5 20%, #d97757 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const ITEM    = {
  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] as any } },
};

// ─── Recommended models ─────────────────────────────────────────
interface ModelOption {
  id:          string;
  label:       string;
  size:        string;
  description: string;
  badge?:      string;
}

const MODELS: ModelOption[] = [
  { id: 'llama3.2:3b',  label: 'Llama 3.2',   size: '~2.0 GB', description: 'Fast & well-rounded',    badge: 'Recommended' },
  { id: 'gemma2:2b',    label: 'Gemma 2',      size: '~1.6 GB', description: 'Lightest — great start' },
  { id: 'phi3.5:mini',  label: 'Phi 3.5 Mini', size: '~2.2 GB', description: 'Strong at reasoning'    },
  { id: 'qwen2.5:3b',   label: 'Qwen 2.5',     size: '~1.9 GB', description: 'Best multilingual'     },
];

type Step = 'install' | 'start' | 'model' | 'done';

interface Props {
  isOpen:    boolean;
  onDismiss: () => void;
}

export const OllamaSetupToaster: React.FC<Props> = ({ isOpen, onDismiss }) => {
  const [step,         setStep]         = useState<Step>('install');
  const [visible,      setVisible]      = useState(false);
  const [platform,     setPlatform]     = useState<string>('darwin');
  const [installed,    setInstalled]    = useState<boolean | null>(null);
  const [starting,     setStarting]     = useState(false);
  const [startError,   setStartError]   = useState(false);
  const [existingModels, setExistingModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('llama3.2:3b');
  const [pullStatus,   setPullStatus]   = useState<'idle' | 'pulling' | 'done' | 'error'>('idle');
  const [pullPercent,  setPullPercent]  = useState(0);
  const [pullMessage,  setPullMessage]  = useState('');
  const [confirming,   setConfirming]   = useState(false);
  const reduced = useReducedMotion() ?? false;

  // Show after a short delay once isOpen becomes true
  useEffect(() => {
    if (!isOpen) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [isOpen]);

  // On mount of wizard, fetch compound status to fast-forward steps
  const bootstrap = useCallback(async () => {
    try {
      const status = await window.electronAPI?.getOllamaSetupStatus?.();
      if (!status) return;
      setPlatform(status.platform || 'darwin');
      setInstalled(status.installed);
      if (status.installed && status.running) {
        setExistingModels(status.models);
        setStep('model');
      } else if (status.installed) {
        setStep('start');
      } else {
        setStep('install');
      }
    } catch {
      setStep('install');
    }
  }, []);

  useEffect(() => {
    if (visible) bootstrap();
  }, [visible, bootstrap]);

  // Listen for pull progress events
  useEffect(() => {
    if (!visible) return;
    const removeProgress = window.electronAPI?.onOllamaPullProgress?.((data) => {
      setPullPercent(data.percent || 0);
      setPullMessage(data.status || 'Downloading…');
    });
    const removeComplete = window.electronAPI?.onOllamaPullComplete?.(() => {
      setPullStatus('done');
      setPullPercent(100);
    });
    return () => {
      removeProgress?.();
      removeComplete?.();
    };
  }, [visible]);

  const handleDownload = () => {
    window.electronAPI?.openOllamaDownload?.();
  };

  const handleRecheck = async () => {
    const result = await window.electronAPI?.checkOllamaInstalled?.();
    if (result?.installed) {
      setInstalled(true);
      setStep('start');
    }
  };

  const handleStartOllama = async () => {
    setStarting(true);
    setStartError(false);
    try {
      const result = await window.electronAPI?.ensureOllamaRunning?.();
      if (result?.success) {
        // Refresh model list
        const models = await window.electronAPI?.getAvailableOllamaModels?.().catch(() => []);
        setExistingModels(models || []);
        setStep('model');
      } else {
        setStartError(true);
      }
    } catch {
      setStartError(true);
    } finally {
      setStarting(false);
    }
  };

  const handlePull = async () => {
    setPullStatus('pulling');
    setPullPercent(0);
    setPullMessage('Starting download…');
    try {
      const result = await window.electronAPI?.pullOllamaModel?.(selectedModel);
      if (!result?.success) {
        setPullStatus('error');
      }
    } catch {
      setPullStatus('error');
    }
  };

  const handleModelStepContinue = async () => {
    setConfirming(true);
    try {
      let modelToActivate = pullStatus === 'done' ? selectedModel : null;
      if (!modelToActivate) {
        const match = existingModels.find(m =>
          MODELS.some(opt => m.startsWith(opt.id.split(':')[0]))
        );
        // Exclude embedding-only models from LLM selection
        const nonEmbedding = existingModels.find(m => !m.startsWith('nomic-') && !m.startsWith('mxbai-'));
        modelToActivate = match || nonEmbedding || null;
      }
      if (modelToActivate) {
        await window.electronAPI?.switchToOllama?.(modelToActivate)?.catch(() => {});
      }
    } catch { /* ignore, always advance */ }
    setConfirming(false);
    setStep('done');
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    onDismiss();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <style>{`
        @keyframes ollama-border-flow {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
        .ollama-border {
          background: linear-gradient(145deg,
            rgba(217,119,87,0.85),
            rgba(196,98,62,0.6),
            rgba(217,119,87,0.75),
            rgba(176,85,48,0.55)
          );
          background-size: 300% 300%;
          animation: ollama-border-flow 6s ease infinite;
        }
        .ollama-border-reduced {
          background: linear-gradient(145deg, rgba(217,119,87,0.7), rgba(196,98,62,0.5), rgba(176,85,48,0.45));
        }
        @keyframes ollama-spin {
          to { transform: rotate(360deg); }
        }
        .ollama-spin { animation: ollama-spin 0.9s linear infinite; }
      `}</style>

      {/* Backdrop */}
      <motion.div
        key="ollama-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(217,119,87,0.06) 0%, rgba(0,0,0,0.84) 100%)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        } as React.CSSProperties}
      >
        {/* Gradient border wrapper */}
        <motion.div
          key={`ollama-card-${step}`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.93, y: 20, filter: 'blur(10px)' }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1,    y: 0,  filter: 'blur(0px)' }}
          exit={   reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 14, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 290, damping: 25, mass: 0.82 }}
          className={reduced ? 'ollama-border-reduced' : 'ollama-border'}
          style={{ padding: '1.5px', borderRadius: '23px', boxShadow: '0 48px 120px -20px rgba(0,0,0,0.95), 0 0 80px rgba(217,119,87,0.12)' }}
        >
          <div style={{
            position: 'relative', width: '430px', borderRadius: '22px', overflow: 'hidden',
            background: 'linear-gradient(150deg, #1a1917 0%, #141413 100%)',
            fontFamily: T.font,
          }}>
            {/* Catch-light */}
            <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.14)', pointerEvents: 'none', zIndex: 5 }} />

            {/* Aurora glow */}
            {!reduced && (
              <motion.div aria-hidden
                animate={{ opacity: [0.07, 0.15, 0.07] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '280px', background: 'radial-gradient(ellipse, rgba(217,119,87,0.28) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }}
              />
            )}

            {/* Grain texture */}
            <div aria-hidden style={{
              position: 'absolute', inset: 0, borderRadius: '22px', pointerEvents: 'none', zIndex: 4, opacity: 0.028, mixBlendMode: 'overlay',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '180px 180px',
            }} />

            <div style={{ padding: '26px 28px 28px', position: 'relative', zIndex: 6 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', paddingBottom: '16px', borderBottom: `1px solid ${T.rule}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 660, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.t2 }}>
                    LiveLens · Local AI Setup
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <StepDots current={step} />
                  <button onClick={handleDismiss} aria-label="Skip setup"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', opacity: 0.35, padding: 0, transition: 'opacity 150ms, background 150ms' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.35'; e.currentTarget.style.background = 'transparent'; }}>
                    <X size={13} strokeWidth={2.3} color="#fff" />
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {step === 'install' && (
                  <StepInstall
                    key="install"
                    installed={installed}
                    platform={platform}
                    onDownload={handleDownload}
                    onRecheck={handleRecheck}
                    onDismiss={handleDismiss}
                  />
                )}
                {step === 'start' && (
                  <StepStart
                    key="start"
                    starting={starting}
                    hasError={startError}
                    onStart={handleStartOllama}
                    onDismiss={handleDismiss}
                  />
                )}
                {step === 'model' && (
                  <StepModel
                    key="model"
                    existingModels={existingModels}
                    models={MODELS}
                    selectedModel={selectedModel}
                    pullStatus={pullStatus}
                    pullPercent={pullPercent}
                    pullMessage={pullMessage}
                    confirming={confirming}
                    onSelect={setSelectedModel}
                    onPull={handlePull}
                    onContinue={handleModelStepContinue}
                    onDismiss={handleDismiss}
                  />
                )}
                {step === 'done' && (
                  <StepDone key="done" onDismiss={handleDismiss} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Step dot indicator ────────────────────────────────────────
const STEP_ORDER: Step[] = ['install', 'start', 'model', 'done'];
function StepDots({ current }: { current: Step }) {
  const idx = STEP_ORDER.indexOf(current);
  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
      {STEP_ORDER.map((s, i) => (
        <div key={s} style={{
          width: i === idx ? '16px' : '5px',
          height: '5px',
          borderRadius: '99px',
          background: i <= idx ? T.orange : T.rule,
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      ))}
    </div>
  );
}

const CURL_CMD = 'curl -fsSL https://ollama.com/install.sh | sh';

// ─── Step 1: Install ───────────────────────────────────────────
function StepInstall({ installed, platform, onDownload, onRecheck, onDismiss }: {
  installed: boolean | null;
  platform:  string;
  onDownload: () => void;
  onRecheck: () => void;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isMac = platform === 'darwin';

  const handleCopy = () => {
    navigator.clipboard.writeText(CURL_CMD).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <motion.div variants={ITEM}>
        <h2 style={{ ...GT, fontSize: '22px', fontWeight: 720, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 8px' }}>
          Set up local AI
        </h2>
        <p style={{ fontSize: '13px', lineHeight: 1.64, color: T.t3, margin: 0 }}>
          LiveLens uses Ollama to run AI models on your device — private, fast, and free. No API key needed.
        </p>
      </motion.div>

      {/* Ollama info card */}
      <motion.div variants={ITEM} style={{
        padding: '14px 16px', borderRadius: '13px',
        background: T.glass, border: `1px solid ${T.rule}`,
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(217,119,87,0.12)', border: '1px solid rgba(217,119,87,0.2)',
        }}>
          <Cpu size={16} strokeWidth={1.75} color={T.orange} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 580, color: T.t1, letterSpacing: '-0.01em', fontFamily: T.font }}>Ollama</div>
          <div style={{ fontSize: '11.5px', color: T.t3, marginTop: '2px', fontFamily: T.font }}>
            Free · Open source · Runs 100% on your {isMac ? 'Mac' : 'PC'}
          </div>
        </div>
        {installed === null && (
          <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${T.orange}`, borderTopColor: 'transparent' }} className="ollama-spin" />
        )}
        {installed === true  && <CheckCircle size={16} strokeWidth={1.75} color={T.green} />}
        {installed === false && <AlertCircle  size={16} strokeWidth={1.75} color={T.amber} />}
      </motion.div>

      {/* macOS — inline terminal command */}
      {isMac && installed === false && (
        <motion.div variants={ITEM} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.t4, fontFamily: T.font }}>
            Run in Terminal
          </div>
          {/* Terminal panel */}
          <div style={{
            borderRadius: '11px', overflow: 'hidden',
            border: '1px solid rgba(217,119,87,0.18)',
            background: '#0e0d0b',
          }}>
            {/* Terminal titlebar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px', borderBottom: '1px solid rgba(250,249,245,0.06)',
              background: '#141413',
            }}>
              {['#ff5f57','#febc2e','#28c840'].map(c => (
                <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.7 }} />
              ))}
              <span style={{ marginLeft: '6px', fontSize: '10.5px', color: T.t4, fontFamily: T.font, letterSpacing: '0.02em' }}>
                Terminal
              </span>
            </div>
            {/* Command line */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <span style={{ color: T.orange, fontSize: '12px', fontFamily: 'monospace', flexShrink: 0 }}>$</span>
                <span style={{
                  fontSize: '11.5px', fontFamily: '"SF Mono", "Menlo", "Monaco", "Courier New", monospace',
                  color: 'rgba(250,249,245,0.88)', letterSpacing: '0.02em',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {CURL_CMD}
                </span>
              </div>
              <button onClick={handleCopy} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                background: copied ? 'rgba(52,211,153,0.18)' : 'rgba(217,119,87,0.15)',
                fontFamily: T.font, transition: 'background 150ms',
              }}
                onMouseEnter={e => { if (!copied) e.currentTarget.style.background = 'rgba(217,119,87,0.25)'; }}
                onMouseLeave={e => { if (!copied) e.currentTarget.style.background = 'rgba(217,119,87,0.15)'; }}
              >
                {copied
                  ? <CheckCircle size={11} strokeWidth={2} color={T.green} />
                  : <Copy size={11} strokeWidth={2} color={T.orange} />
                }
                <span style={{ fontSize: '11px', fontWeight: 600, color: copied ? T.green : T.orange }}>
                  {copied ? 'Copied!' : 'Copy'}
                </span>
              </button>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: T.t4, margin: '0', fontFamily: T.font, lineHeight: 1.5 }}>
            Paste and run in Terminal, then click "Check again" below.
          </p>
        </motion.div>
      )}

      <motion.div variants={ITEM} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Windows — browser download button */}
        {!isMac && installed === false && (
          <button onClick={onDownload} style={{
            width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '0 20px', borderRadius: '13px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #d97757 0%, #c4623e 50%, #b05530 100%)',
            boxShadow: '0 0 0 1px rgba(217,119,87,0.5), 0 8px 28px rgba(217,119,87,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
            fontFamily: T.font,
          }}>
            <span style={{ fontSize: '14px', fontWeight: 640, color: '#fff', letterSpacing: '-0.01em' }}>Download Ollama</span>
            <Download size={15} strokeWidth={2.2} color="#fff" />
          </button>
        )}
        {installed === false && (
          <button onClick={onRecheck} style={{
            width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '0 20px', borderRadius: '13px', border: `1px solid ${T.rule}`, cursor: 'pointer',
            background: T.glass, fontFamily: T.font, transition: 'background 150ms',
          }}
            onMouseEnter={e => e.currentTarget.style.background = T.glassMid}
            onMouseLeave={e => e.currentTarget.style.background = T.glass}
          >
            <RefreshCw size={12} strokeWidth={2.2} color={T.t3} />
            <span style={{ fontSize: '13px', fontWeight: 540, color: T.t3 }}>Check again</span>
          </button>
        )}
        {(installed === null || installed === true) && (
          <button onClick={onDismiss} style={{
            width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '0 20px', borderRadius: '13px', border: `1px solid ${T.rule}`, cursor: 'pointer',
            background: T.glass, fontFamily: T.font, transition: 'background 150ms',
          }}
            onMouseEnter={e => e.currentTarget.style.background = T.glassMid}
            onMouseLeave={e => e.currentTarget.style.background = T.glass}
          >
            <span style={{ fontSize: '14px', fontWeight: 540, color: T.t2 }}>Skip for now</span>
            <ArrowRight size={15} strokeWidth={2.2} color={T.t3} />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Step 2: Start ─────────────────────────────────────────────
function StepStart({ starting, hasError, onStart, onDismiss }: {
  starting: boolean;
  hasError: boolean;
  onStart: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <motion.div variants={ITEM}>
        <h2 style={{ ...GT, fontSize: '22px', fontWeight: 720, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 8px' }}>
          Starting Ollama
        </h2>
        <p style={{ fontSize: '13px', lineHeight: 1.64, color: T.t3, margin: 0 }}>
          {hasError
            ? 'Could not start Ollama automatically. Make sure it\'s installed, then try again.'
            : 'LiveLens will launch Ollama in the background. This only takes a few seconds.'}
        </p>
      </motion.div>

      <motion.div variants={ITEM} style={{
        padding: '18px 16px', borderRadius: '13px',
        background: T.glass, border: `1px solid ${hasError ? 'rgba(248,113,113,0.2)' : T.rule}`,
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hasError ? 'rgba(248,113,113,0.1)' : 'rgba(217,119,87,0.12)',
          border: `1px solid ${hasError ? 'rgba(248,113,113,0.2)' : 'rgba(217,119,87,0.2)'}`,
        }}>
          {starting
            ? <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${T.orange}`, borderTopColor: 'transparent' }} className="ollama-spin" />
            : hasError
              ? <AlertCircle size={16} strokeWidth={1.75} color={T.red} />
              : <Zap size={16} strokeWidth={1.75} color={T.orange} />
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 580, color: T.t1, fontFamily: T.font }}>
            {starting ? 'Starting Ollama…' : hasError ? 'Failed to start' : 'Ready to start'}
          </div>
          <div style={{ fontSize: '11.5px', color: T.t3, marginTop: '2px', fontFamily: T.font }}>
            {starting ? 'Waiting for the daemon to come up' : hasError ? 'Check that Ollama is installed correctly' : 'Runs silently in the background'}
          </div>
        </div>
      </motion.div>

      <motion.div variants={ITEM} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={onStart} disabled={starting} style={{
          width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '0 20px', borderRadius: '13px', border: 'none', cursor: starting ? 'default' : 'pointer',
          background: starting
            ? 'rgba(255,255,255,0.05)'
            : 'linear-gradient(135deg, #d97757 0%, #c4623e 50%, #b05530 100%)',
          boxShadow: starting ? 'none' : '0 0 0 1px rgba(217,119,87,0.5), 0 8px 28px rgba(217,119,87,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
          opacity: starting ? 0.5 : 1,
          fontFamily: T.font, transition: 'background 0.2s, opacity 0.2s',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 640, color: '#fff', letterSpacing: '-0.01em' }}>
            {starting ? 'Starting…' : hasError ? 'Try again' : 'Start Ollama'}
          </span>
          {starting
            ? <div style={{ width: '15px', height: '15px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} className="ollama-spin" />
            : <ArrowRight size={15} strokeWidth={2.2} color="#fff" />
          }
        </button>
        <button onClick={onDismiss} style={{
          width: '100%', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: 'transparent', fontFamily: T.font,
        }}>
          <span style={{ fontSize: '12px', color: T.t4 }}>Skip for now</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Step 3: Pick & pull model ─────────────────────────────────
function StepModel({ existingModels, models, selectedModel, pullStatus, pullPercent, pullMessage, confirming, onSelect, onPull, onContinue, onDismiss }: {
  existingModels:  string[];
  models:          ModelOption[];
  selectedModel:   string;
  pullStatus:      'idle' | 'pulling' | 'done' | 'error';
  pullPercent:     number;
  pullMessage:     string;
  confirming:      boolean;
  onSelect:        (id: string) => void;
  onPull:          () => void;
  onContinue:      () => void;
  onDismiss:       () => void;
}) {
  const hasExisting = existingModels.some(m =>
    models.some(opt => m.startsWith(opt.id.split(':')[0]))
  );
  const canContinue = hasExisting || pullStatus === 'done';

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <motion.div variants={ITEM}>
        <h2 style={{ ...GT, fontSize: '22px', fontWeight: 720, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 8px' }}>
          {hasExisting ? 'Models found' : 'Choose a model'}
        </h2>
        <p style={{ fontSize: '13px', lineHeight: 1.64, color: T.t3, margin: 0 }}>
          {hasExisting
            ? 'You already have Ollama models. You\'re all set, or add another one below.'
            : 'Pick a small model to start. You can add more anytime in Settings.'}
        </p>
      </motion.div>

      {/* Model cards */}
      <motion.div variants={ITEM} style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {models.map(opt => {
          const isInstalled = existingModels.some(m => m.startsWith(opt.id.split(':')[0]));
          const isSelected  = selectedModel === opt.id;
          const isPulling   = isSelected && pullStatus === 'pulling';
          const isPulled    = isSelected && pullStatus === 'done';

          return (
            <button key={opt.id}
              onClick={() => !isInstalled && pullStatus !== 'pulling' && onSelect(opt.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: '11px',
                background: isSelected ? 'rgba(217,119,87,0.1)' : T.glass,
                border: `1px solid ${isSelected ? 'rgba(217,119,87,0.35)' : T.rule}`,
                cursor: isInstalled || pullStatus === 'pulling' ? 'default' : 'pointer',
                transition: 'background 150ms, border-color 150ms',
                fontFamily: T.font,
              }}
              onMouseEnter={e => { if (!isSelected && pullStatus !== 'pulling') e.currentTarget.style.background = T.glassMid; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = T.glass; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 580, color: T.t1 }}>{opt.label}</span>
                    {opt.badge && (
                      <span style={{
                        fontSize: '9.5px', fontWeight: 660, letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '2px 6px', borderRadius: '5px',
                        background: 'rgba(217,119,87,0.18)', color: 'rgba(250,200,170,0.95)',
                      }}>{opt.badge}</span>
                    )}
                    {isInstalled && (
                      <span style={{
                        fontSize: '9.5px', fontWeight: 660, letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '2px 6px', borderRadius: '5px',
                        background: 'rgba(52,211,153,0.15)', color: T.green,
                      }}>Installed</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11.5px', color: T.t3, marginTop: '2px' }}>
                    {opt.description} · {opt.size}
                  </div>
                  {/* Pull progress bar */}
                  {isPulling && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ height: '3px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <motion.div
                          animate={{ width: `${pullPercent}%` }}
                          transition={{ duration: 0.3 }}
                          style={{ height: '100%', borderRadius: '99px', background: `linear-gradient(90deg, #b05530, ${T.orange}, #e8a882)` }}
                        />
                      </div>
                      <div style={{ fontSize: '10.5px', color: T.t4, marginTop: '4px' }}>
                        {pullMessage} {pullPercent > 0 ? `· ${pullPercent}%` : ''}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>
                  {isInstalled || isPulled
                    ? <CheckCircle size={15} strokeWidth={1.75} color={T.green} />
                    : isPulling
                      ? <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${T.orange}`, borderTopColor: 'transparent' }} className="ollama-spin" />
                      : isSelected
                        ? <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${T.orange}`, background: T.orange }} />
                        : <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `1.5px solid ${T.rule}` }} />
                  }
                </div>
              </div>
            </button>
          );
        })}
      </motion.div>

      <motion.div variants={ITEM} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {canContinue ? (
          <button onClick={!confirming ? onContinue : undefined} disabled={confirming} style={{
            width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '0 20px', borderRadius: '13px', border: 'none',
            cursor: confirming ? 'default' : 'pointer',
            background: confirming ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #d97757 0%, #c4623e 50%, #b05530 100%)',
            boxShadow: confirming ? 'none' : '0 0 0 1px rgba(217,119,87,0.5), 0 8px 28px rgba(217,119,87,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
            opacity: confirming ? 0.6 : 1,
            fontFamily: T.font, transition: 'background 0.2s, opacity 0.2s',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 640, color: '#fff', letterSpacing: '-0.01em' }}>
              {confirming ? 'Starting…' : 'Continue'}
            </span>
            {confirming
              ? <div style={{ width: '15px', height: '15px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} className="ollama-spin" />
              : <ArrowRight size={15} strokeWidth={2.2} color="#fff" />
            }
          </button>
        ) : (
          <button onClick={pullStatus !== 'pulling' ? onPull : undefined} disabled={pullStatus === 'pulling'} style={{
            width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '0 20px', borderRadius: '13px', border: 'none',
            cursor: pullStatus === 'pulling' ? 'default' : 'pointer',
            background: pullStatus === 'pulling'
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, #d97757 0%, #c4623e 50%, #b05530 100%)',
            boxShadow: pullStatus === 'pulling' ? 'none' : '0 0 0 1px rgba(217,119,87,0.5), 0 8px 28px rgba(217,119,87,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
            opacity: pullStatus === 'pulling' ? 0.6 : 1,
            fontFamily: T.font,
          }}>
            <span style={{ fontSize: '14px', fontWeight: 640, color: '#fff', letterSpacing: '-0.01em' }}>
              {pullStatus === 'error' ? 'Retry download' : pullStatus === 'pulling' ? 'Downloading…' : 'Download model'}
            </span>
            {pullStatus === 'pulling'
              ? <div style={{ width: '15px', height: '15px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} className="ollama-spin" />
              : <Download size={15} strokeWidth={2.2} color="#fff" />
            }
          </button>
        )}
        <button onClick={onDismiss} style={{
          width: '100%', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer', background: 'transparent', fontFamily: T.font,
        }}>
          <span style={{ fontSize: '12px', color: T.t4 }}>Skip for now</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Step 4: Done ──────────────────────────────────────────────
function StepDone({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <motion.div variants={ITEM}>
        <h2 style={{ ...GT, fontSize: '22px', fontWeight: 720, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 8px' }}>
          You're all set
        </h2>
        <p style={{ fontSize: '13px', lineHeight: 1.64, color: T.t3, margin: 0 }}>
          Local AI is ready. Your data never leaves your device.
        </p>
      </motion.div>

      <motion.div variants={ITEM} style={{
        padding: '18px 16px', borderRadius: '13px',
        background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.22)',
        }}>
          <CheckCircle size={16} strokeWidth={1.75} color={T.green} />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 580, color: T.t1, fontFamily: T.font }}>Ollama is running</div>
          <div style={{ fontSize: '11.5px', color: T.t3, marginTop: '2px', fontFamily: T.font }}>Model loaded · Private · On-device</div>
        </div>
      </motion.div>

      <motion.div variants={ITEM}>
        <button onClick={onDismiss} style={{
          width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '0 20px', borderRadius: '13px', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #d97757 0%, #c4623e 50%, #b05530 100%)',
          boxShadow: '0 0 0 1px rgba(217,119,87,0.5), 0 8px 28px rgba(217,119,87,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
          fontFamily: T.font,
        }}>
          <span style={{ fontSize: '14px', fontWeight: 640, color: '#fff', letterSpacing: '-0.01em' }}>Let's go</span>
          <ArrowRight size={15} strokeWidth={2.2} color="#fff" />
        </button>
      </motion.div>
    </motion.div>
  );
}
