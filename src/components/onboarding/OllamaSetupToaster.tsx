// src/components/onboarding/OllamaSetupToaster.tsx
//
// First-run Ollama setup wizard — 4 steps: Install → Start → Pick model → Done.
// Design mirrors PermissionsToaster: dark glass card, animated gradient border,
// grain texture, aurora glow, SF Pro font, framer-motion spring animations.

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Download, CheckCircle, AlertCircle, ArrowRight, Zap, RefreshCw, Cpu, Copy } from 'lucide-react';

const STORAGE_KEY = 'natively_ollama_setup_done';

const GT_CLS = "bg-[linear-gradient(140deg,#faf9f5_20%,#d97757_100%)] bg-clip-text text-transparent";

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
  isOpen:         boolean;
  onDismiss:      () => void;
  onUseProviders?: () => void;
}

export const OllamaSetupToaster: React.FC<Props> = ({ isOpen, onDismiss, onUseProviders }) => {
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

  useEffect(() => {
    if (!isOpen) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [isOpen]);

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
        className="fixed inset-0 z-[9998] flex items-center justify-center backdrop-blur-[8px]"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(217,119,87,0.06) 0%, rgba(0,0,0,0.84) 100%)' }}
      >
        {/* Gradient border wrapper */}
        <motion.div
          key={`ollama-card-${step}`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.93, y: 20, filter: 'blur(10px)' }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1,    y: 0,  filter: 'blur(0px)' }}
          exit={   reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 14, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 290, damping: 25, mass: 0.82 }}
          className={`p-[1.5px] rounded-[23px] ${reduced ? 'ollama-border-reduced' : 'ollama-border'}`}
          style={{ boxShadow: '0 48px 120px -20px rgba(0,0,0,0.95), 0 0 80px rgba(217,119,87,0.12)' }}
        >
          <div className="relative w-[430px] rounded-[22px] overflow-hidden bg-[linear-gradient(150deg,#1a1917_0%,#141413_100%)] font-sans">
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
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-[660] tracking-[0.14em] uppercase text-[#faf9f5]/[0.72]">
                    LiveLens · Local AI Setup
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <StepDots current={step} />
                  <button onClick={handleDismiss} aria-label="Skip setup"
                    className="bg-transparent border-0 cursor-pointer w-7 h-7 flex items-center justify-center rounded-full opacity-35 p-0 hover:opacity-80 hover:bg-white/[0.10] transition-[opacity,background] duration-150">
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
                    onUseProviders={onUseProviders}
                  />
                )}
                {step === 'start' && (
                  <StepStart
                    key="start"
                    starting={starting}
                    hasError={startError}
                    onStart={handleStartOllama}
                    onDismiss={handleDismiss}
                    onUseProviders={onUseProviders}
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
                    onUseProviders={onUseProviders}
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
    <div className="flex gap-[5px] items-center">
      {STEP_ORDER.map((s, i) => (
        <div
          key={s}
          className={`h-[5px] rounded-full transition-[width,background] duration-300 ${i === idx ? 'w-4' : 'w-[5px]'} ${i <= idx ? 'bg-accent-primary' : 'bg-white/[0.08]'}`}
        />
      ))}
    </div>
  );
}

const CURL_CMD = 'curl -fsSL https://ollama.com/install.sh | sh';

// ─── Step 1: Install ───────────────────────────────────────────
function StepInstall({ installed, platform, onDownload, onRecheck, onDismiss, onUseProviders }: {
  installed: boolean | null;
  platform:  string;
  onDownload: () => void;
  onRecheck: () => void;
  onDismiss: () => void;
  onUseProviders?: () => void;
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
      className="flex flex-col gap-5">
      <motion.div variants={ITEM}>
        <h2 className={`${GT_CLS} text-[22px] font-[720] tracking-[-0.03em] leading-[1.2] m-0 mb-2`}>
          Set up local AI
        </h2>
        <p className="text-[13px] leading-[1.64] text-[#faf9f5]/[0.44] m-0">
          LiveLens uses Ollama to run AI models on your device — private, fast, and free. No API key needed.
        </p>
      </motion.div>

      {/* Ollama info card */}
      <motion.div variants={ITEM} className="p-[14px_16px] rounded-[13px] bg-white/[0.04] border border-white/[0.08] flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center bg-accent-primary/[0.12] border border-accent-primary/20">
          <Cpu size={16} strokeWidth={1.75} className="text-accent-primary" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-[580] text-[#faf9f5] tracking-[-0.01em]">Ollama</div>
          <div className="text-[11.5px] text-[#faf9f5]/[0.44] mt-0.5">
            Free · Open source · Runs 100% on your {isMac ? 'Mac' : 'PC'}
          </div>
        </div>
        {installed === null && (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-accent-primary border-t-transparent ollama-spin" />
        )}
        {installed === true  && <CheckCircle size={16} strokeWidth={1.75} className="text-green-400" />}
        {installed === false && <AlertCircle  size={16} strokeWidth={1.75} className="text-amber-400" />}
      </motion.div>

      {/* macOS — inline terminal command */}
      {isMac && installed === false && (
        <motion.div variants={ITEM} className="flex flex-col gap-2">
          <div className="text-[11.5px] font-semibold tracking-[0.06em] uppercase text-[#faf9f5]/[0.26]">
            Run in Terminal
          </div>
          <div className="rounded-[11px] overflow-hidden border border-accent-primary/[0.18] bg-[#0e0d0b]">
            {/* Terminal titlebar */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06] bg-[#141413]">
              {['#ff5f57','#febc2e','#28c840'].map(c => (
                <div key={c} className="w-2.5 h-2.5 rounded-full opacity-70" style={{ background: c }} />
              ))}
              <span className="ml-1.5 text-[10.5px] text-[#faf9f5]/[0.26] tracking-[0.02em]">
                Terminal
              </span>
            </div>
            {/* Command line */}
            <div className="flex items-center justify-between px-3.5 py-3 gap-2.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-accent-primary text-[12px] font-mono shrink-0">$</span>
                <span className="text-[11.5px] font-mono text-[#faf9f5]/[0.88] tracking-[0.02em] whitespace-nowrap overflow-hidden text-ellipsis">
                  {CURL_CMD}
                </span>
              </div>
              <button onClick={handleCopy}
                className={`shrink-0 flex items-center gap-[5px] px-2.5 py-[5px] rounded-[7px] border-0 cursor-pointer transition-colors duration-150 ${copied ? 'bg-green-400/[0.18]' : 'bg-accent-primary/[0.15] hover:bg-accent-primary/25'}`}>
                {copied
                  ? <CheckCircle size={11} strokeWidth={2} className="text-green-400" />
                  : <Copy size={11} strokeWidth={2} className="text-accent-primary" />
                }
                <span className={`text-[11px] font-semibold ${copied ? 'text-green-400' : 'text-accent-primary'}`}>
                  {copied ? 'Copied!' : 'Copy'}
                </span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[#faf9f5]/[0.26] m-0 leading-[1.5]">
            Paste and run in Terminal, then click "Check again" below.
          </p>
        </motion.div>
      )}

      <motion.div variants={ITEM} className="flex flex-col gap-2">
        {/* Windows — browser download button */}
        {!isMac && installed === false && (
          <PrimaryBtn onClick={onDownload}>
            <span className="text-[14px] font-[640] text-white tracking-[-0.01em]">Download Ollama</span>
            <Download size={15} strokeWidth={2.2} color="#fff" />
          </PrimaryBtn>
        )}
        {installed === false && (
          <button onClick={onRecheck}
            className="w-full h-11 flex items-center justify-center gap-1.5 px-5 rounded-[13px] border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] cursor-pointer transition-colors duration-150">
            <RefreshCw size={12} strokeWidth={2.2} className="text-[#faf9f5]/[0.44]" />
            <span className="text-[13px] font-[540] text-[#faf9f5]/[0.44]">Check again</span>
          </button>
        )}
        {(installed === null || installed === true) && (
          <>
            <PrimaryBtn onClick={() => onUseProviders?.()}>
              <span className="text-[14px] font-[640] text-white tracking-[-0.01em]">Use AI Providers instead</span>
            </PrimaryBtn>
            <SkipBtn onClick={onDismiss}>Skip for now</SkipBtn>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Step 2: Start ─────────────────────────────────────────────
function StepStart({ starting, hasError, onStart, onDismiss, onUseProviders }: {
  starting: boolean;
  hasError: boolean;
  onStart: () => void;
  onDismiss: () => void;
  onUseProviders?: () => void;
}) {
  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      className="flex flex-col gap-5">
      <motion.div variants={ITEM}>
        <h2 className={`${GT_CLS} text-[22px] font-[720] tracking-[-0.03em] leading-[1.2] m-0 mb-2`}>
          Starting Ollama
        </h2>
        <p className="text-[13px] leading-[1.64] text-[#faf9f5]/[0.44] m-0">
          {hasError
            ? 'Could not start Ollama automatically. Make sure it\'s installed, then try again.'
            : 'LiveLens will launch Ollama in the background. This only takes a few seconds.'}
        </p>
      </motion.div>

      <motion.div variants={ITEM} className={`p-[18px_16px] rounded-[13px] bg-white/[0.04] border flex items-center gap-3.5 ${hasError ? 'border-red-400/20' : 'border-white/[0.08]'}`}>
        <div className={`w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center ${hasError ? 'bg-red-400/[0.10] border border-red-400/20' : 'bg-accent-primary/[0.12] border border-accent-primary/20'}`}>
          {starting
            ? <div className="w-4 h-4 rounded-full border-2 border-accent-primary border-t-transparent ollama-spin" />
            : hasError
              ? <AlertCircle size={16} strokeWidth={1.75} className="text-red-400" />
              : <Zap size={16} strokeWidth={1.75} className="text-accent-primary" />
          }
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-[580] text-[#faf9f5]">
            {starting ? 'Starting Ollama…' : hasError ? 'Failed to start' : 'Ready to start'}
          </div>
          <div className="text-[11.5px] text-[#faf9f5]/[0.44] mt-0.5">
            {starting ? 'Waiting for the daemon to come up' : hasError ? 'Check that Ollama is installed correctly' : 'Runs silently in the background'}
          </div>
        </div>
      </motion.div>

      <motion.div variants={ITEM} className="flex flex-col gap-2">
        <button onClick={onStart} disabled={starting}
          className={`w-full h-[50px] flex items-center justify-center gap-2 px-5 rounded-[13px] border-0 transition-[background,opacity] duration-200 ${starting ? 'bg-white/[0.05] opacity-50 cursor-default' : 'bg-gradient-to-br from-accent-primary via-accent-hover to-accent-deep cursor-pointer shadow-[0_0_0_1px_rgba(217,119,87,0.5),0_8px_28px_rgba(217,119,87,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]'}`}>
          <span className="text-[14px] font-[640] text-white tracking-[-0.01em]">
            {starting ? 'Starting…' : hasError ? 'Try again' : 'Start Ollama'}
          </span>
          {starting
            ? <div className="w-[15px] h-[15px] rounded-full border-2 border-white/30 border-t-white ollama-spin" />
            : <ArrowRight size={15} strokeWidth={2.2} color="#fff" />
          }
        </button>
        <PrimaryBtn onClick={() => onUseProviders?.()}>
          <span className="text-[14px] font-[640] text-white tracking-[-0.01em]">Use AI Providers instead</span>
        </PrimaryBtn>
        <SkipBtn onClick={onDismiss}>Skip for now</SkipBtn>
      </motion.div>
    </motion.div>
  );
}

// ─── Step 3: Pick & pull model ─────────────────────────────────
function StepModel({ existingModels, models, selectedModel, pullStatus, pullPercent, pullMessage, confirming, onSelect, onPull, onContinue, onDismiss, onUseProviders }: {
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
  onUseProviders?: () => void;
}) {
  const hasExisting = existingModels.some(m =>
    models.some(opt => m.startsWith(opt.id.split(':')[0]))
  );
  const canContinue = hasExisting || pullStatus === 'done';

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      className="flex flex-col gap-4">
      <motion.div variants={ITEM}>
        <h2 className={`${GT_CLS} text-[22px] font-[720] tracking-[-0.03em] leading-[1.2] m-0 mb-2`}>
          {hasExisting ? 'Models found' : 'Choose a model'}
        </h2>
        <p className="text-[13px] leading-[1.64] text-[#faf9f5]/[0.44] m-0">
          {hasExisting
            ? 'You already have Ollama models. You\'re all set, or add another one below.'
            : 'Pick a small model to start. You can add more anytime in Settings.'}
        </p>
      </motion.div>

      {/* Model cards */}
      <motion.div variants={ITEM} className="flex flex-col gap-[7px]">
        {models.map(opt => {
          const isInstalled = existingModels.some(m => m.startsWith(opt.id.split(':')[0]));
          const isSelected  = selectedModel === opt.id;
          const isPulling   = isSelected && pullStatus === 'pulling';
          const isPulled    = isSelected && pullStatus === 'done';

          return (
            <button key={opt.id}
              onClick={() => !isInstalled && pullStatus !== 'pulling' && onSelect(opt.id)}
              className={`w-full text-left p-[12px_14px] rounded-[11px] border transition-colors duration-150 ${isSelected ? 'bg-accent-primary/[0.10] border-accent-primary/35' : `bg-white/[0.04] border-white/[0.08] ${!isInstalled && pullStatus !== 'pulling' ? 'hover:bg-white/[0.07]' : ''}`} ${isInstalled || pullStatus === 'pulling' ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex-1">
                  <div className="flex items-center gap-[7px]">
                    <span className="text-[13px] font-[580] text-[#faf9f5]">{opt.label}</span>
                    {opt.badge && (
                      <span className="text-[9.5px] font-[660] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-[5px] bg-accent-primary/[0.18] text-[rgba(250,200,170,0.95)]">
                        {opt.badge}
                      </span>
                    )}
                    {isInstalled && (
                      <span className="text-[9.5px] font-[660] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-[5px] bg-green-400/[0.15] text-green-400">
                        Installed
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-[#faf9f5]/[0.44] mt-0.5">
                    {opt.description} · {opt.size}
                  </div>
                  {/* Pull progress bar */}
                  {isPulling && (
                    <div className="mt-2">
                      <div className="h-[3px] rounded-full bg-white/[0.08] overflow-hidden">
                        <motion.div
                          animate={{ width: `${pullPercent}%` }}
                          transition={{ duration: 0.3 }}
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, #b05530, #d97757, #e8a882)' }}
                        />
                      </div>
                      <div className="text-[10.5px] text-[#faf9f5]/[0.26] mt-1">
                        {pullMessage} {pullPercent > 0 ? `· ${pullPercent}%` : ''}
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {isInstalled || isPulled
                    ? <CheckCircle size={15} strokeWidth={1.75} className="text-green-400" />
                    : isPulling
                      ? <div className="w-3.5 h-3.5 rounded-full border-2 border-accent-primary border-t-transparent ollama-spin" />
                      : isSelected
                        ? <div className="w-3.5 h-3.5 rounded-full border-2 border-accent-primary bg-accent-primary" />
                        : <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-white/[0.08]" />
                  }
                </div>
              </div>
            </button>
          );
        })}
      </motion.div>

      <motion.div variants={ITEM} className="flex flex-col gap-2">
        {canContinue ? (
          <button onClick={!confirming ? onContinue : undefined} disabled={confirming}
            className={`w-full h-[50px] flex items-center justify-center gap-2 px-5 rounded-[13px] border-0 transition-[background,opacity] duration-200 ${confirming ? 'bg-white/[0.05] opacity-[0.6] cursor-default' : 'bg-gradient-to-br from-accent-primary via-accent-hover to-accent-deep cursor-pointer shadow-[0_0_0_1px_rgba(217,119,87,0.5),0_8px_28px_rgba(217,119,87,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]'}`}>
            <span className="text-[14px] font-[640] text-white tracking-[-0.01em]">
              {confirming ? 'Starting…' : 'Continue'}
            </span>
            {confirming
              ? <div className="w-[15px] h-[15px] rounded-full border-2 border-white/30 border-t-white ollama-spin" />
              : <ArrowRight size={15} strokeWidth={2.2} color="#fff" />
            }
          </button>
        ) : (
          <button onClick={pullStatus !== 'pulling' ? onPull : undefined} disabled={pullStatus === 'pulling'}
            className={`w-full h-[50px] flex items-center justify-center gap-2 px-5 rounded-[13px] border-0 transition-[background,opacity] duration-200 ${pullStatus === 'pulling' ? 'bg-white/[0.05] opacity-[0.6] cursor-default' : 'bg-gradient-to-br from-accent-primary via-accent-hover to-accent-deep cursor-pointer shadow-[0_0_0_1px_rgba(217,119,87,0.5),0_8px_28px_rgba(217,119,87,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]'}`}>
            <span className="text-[14px] font-[640] text-white tracking-[-0.01em]">
              {pullStatus === 'error' ? 'Retry download' : pullStatus === 'pulling' ? 'Downloading…' : 'Download model'}
            </span>
            {pullStatus === 'pulling'
              ? <div className="w-[15px] h-[15px] rounded-full border-2 border-white/30 border-t-white ollama-spin" />
              : <Download size={15} strokeWidth={2.2} color="#fff" />
            }
          </button>
        )}
        <PrimaryBtn onClick={() => onUseProviders?.()}>
          <span className="text-[14px] font-[640] text-white tracking-[-0.01em]">Use AI Providers instead</span>
        </PrimaryBtn>
        <SkipBtn onClick={onDismiss}>Skip for now</SkipBtn>
      </motion.div>
    </motion.div>
  );
}

// ─── Step 4: Done ──────────────────────────────────────────────
function StepDone({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      className="flex flex-col gap-5">
      <motion.div variants={ITEM}>
        <h2 className={`${GT_CLS} text-[22px] font-[720] tracking-[-0.03em] leading-[1.2] m-0 mb-2`}>
          You're all set
        </h2>
        <p className="text-[13px] leading-[1.64] text-[#faf9f5]/[0.44] m-0">
          Local AI is ready. Your data never leaves your device.
        </p>
      </motion.div>

      <motion.div variants={ITEM} className="p-[18px_16px] rounded-[13px] bg-green-400/[0.06] border border-green-400/20 flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center bg-green-400/[0.12] border border-green-400/[0.22]">
          <CheckCircle size={16} strokeWidth={1.75} className="text-green-400" />
        </div>
        <div>
          <div className="text-[13px] font-[580] text-[#faf9f5]">Ollama is running</div>
          <div className="text-[11.5px] text-[#faf9f5]/[0.44] mt-0.5">Model loaded · Private · On-device</div>
        </div>
      </motion.div>

      <motion.div variants={ITEM}>
        <PrimaryBtn onClick={onDismiss}>
          <span className="text-[14px] font-[640] text-white tracking-[-0.01em]">Let's go</span>
          <ArrowRight size={15} strokeWidth={2.2} color="#fff" />
        </PrimaryBtn>
      </motion.div>
    </motion.div>
  );
}

// ─── Shared small components ───────────────────────────────────
function PrimaryBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="w-full h-[50px] flex items-center justify-center gap-2 px-5 rounded-[13px] border-0 cursor-pointer bg-gradient-to-br from-accent-primary via-accent-hover to-accent-deep shadow-[0_0_0_1px_rgba(217,119,87,0.5),0_8px_28px_rgba(217,119,87,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] transition-opacity duration-200">
      {children}
    </button>
  );
}

function SkipBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="w-full h-[34px] flex items-center justify-center border-0 bg-transparent cursor-pointer">
      <span className="text-[12px] text-[#faf9f5]/[0.26]">{children}</span>
    </button>
  );
}
