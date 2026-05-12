// src/components/trial/FreeTrialModal.tsx
//
// Post-trial upgrade panel — Apple-grade dark glass card.
// Plan cards follow Apple One / App Store subscription aesthetics.

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Zap, Key, ArrowRight, Loader2, CheckCircle, Brain, Mic, Flame, ShieldCheck } from 'lucide-react';
import { LiveLensLogoMark } from '../LiveLensLogoMark';

const PLAN_STANDARD_URL = 'https://checkout.dodopayments.com/buy/pdt_0NbFixGmD8CSeawb5qvVl';
const PLAN_PRO_URL      = 'https://checkout.dodopayments.com/buy/pdt_0NcM6Aw0IWdspbsgUeCLA';
const PLAN_MAX_URL      = 'https://checkout.dodopayments.com/buy/pdt_0NcM7JElX4Af6LNVFS1Yf';
const PLAN_ULTRA_URL    = 'https://checkout.dodopayments.com/buy/pdt_0NcM7rC2kAb69TFKsZnUU';

const EASE = 'cubic-bezier(0.4,0,0.2,1)';

// Accent palettes — colour in icon + button + hairline border + hover glow.
// Dynamic hover values must stay inline since they come from this runtime object.
const ACC = {
  violet: {
    iconColor:   '#A78BFA',
    cardBorder:  'rgba(139,92,246,0.22)',
    cardBg:      'rgba(139,92,246,0.055)',
    cardGlow:    '0 0 32px rgba(139,92,246,0.09)',
    hoverBorder: 'rgba(139,92,246,0.52)',
    hoverGlow:   '0 0 52px rgba(139,92,246,0.22), 0 16px 40px rgba(0,0,0,0.55)',
    hoverBg:     'rgba(139,92,246,0.08)',
    btnBg:       'linear-gradient(135deg,#d97757,#c4623e,#b05530)',
    btnShadow:   '0 0 0 1px rgba(180,85,48,0.4),0 6px 22px rgba(217,119,87,0.32),inset 0 1px 0 rgba(255,255,255,0.14)',
    btnColor:    '#fff',
    bandBg:      'rgba(217,119,87,0.2)',
    bandText:    'rgba(253,210,196,0.92)',
  },
  indigo: {
    iconColor:   '#818CF8',
    cardBorder:  'rgba(99,102,241,0.18)',
    cardBg:      'rgba(99,102,241,0.045)',
    cardGlow:    'none',
    hoverBorder: 'rgba(99,102,241,0.42)',
    hoverGlow:   '0 0 40px rgba(99,102,241,0.15), 0 12px 32px rgba(0,0,0,0.5)',
    hoverBg:     'rgba(99,102,241,0.08)',
    btnBg:       'linear-gradient(135deg,#d97757,#c4623e)',
    btnShadow:   '0 0 0 1px rgba(180,85,48,0.3),inset 0 1px 0 rgba(255,255,255,0.1)',
    btnColor:    '#fff',
    bandBg:      '',
    bandText:    '',
  },
  amber: {
    iconColor:   '#FBBF24',
    cardBorder:  'rgba(251,191,36,0.2)',
    cardBg:      'rgba(251,191,36,0.045)',
    cardGlow:    'none',
    hoverBorder: 'rgba(251,191,36,0.45)',
    hoverGlow:   '0 0 40px rgba(251,191,36,0.12), 0 12px 32px rgba(0,0,0,0.5)',
    hoverBg:     'rgba(251,191,36,0.07)',
    btnBg:       'rgba(217,119,6,0.82)',
    btnShadow:   'inset 0 1px 0 rgba(255,255,255,0.1)',
    btnColor:    '#fff',
    bandBg:      '',
    bandText:    '',
  },
  slate: {
    iconColor:   'rgba(148,163,184,0.85)',
    cardBorder:  'rgba(148,163,184,0.15)',
    cardBg:      'rgba(148,163,184,0.04)',
    cardGlow:    'none',
    hoverBorder: 'rgba(148,163,184,0.32)',
    hoverGlow:   '0 0 24px rgba(148,163,184,0.07), 0 8px 24px rgba(0,0,0,0.4)',
    hoverBg:     'rgba(148,163,184,0.07)',
    btnBg:       'rgba(148,163,184,0.12)',
    btnShadow:   '0 0 0 1px rgba(148,163,184,0.15)',
    btnColor:    'rgba(203,213,225,0.85)',
    bandBg:      '',
    bandText:    '',
  },
};

interface TrialModalProps {
  usage:      { ai: number; stt_seconds: number; search: number };
  onByok:     () => Promise<void>;
  onStandard?: () => Promise<void>;
  onDone?:    () => void;
}

type Step = 'choose' | 'wiping' | 'done';

export const FreeTrialModal: React.FC<TrialModalProps> = ({ usage, onByok, onStandard, onDone }) => {
  const [step,  setStep]  = useState<Step>('choose');
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion() ?? false;

  const openUrl = (url: string) => (window.electronAPI as any)?.openExternal?.(url);

  const handleByok = async () => {
    setStep('wiping');
    setError(null);
    try   { await onByok(); setStep('done'); }
    catch (e: any) { setError(e.message || 'Something went wrong. Restart the app.'); setStep('choose'); }
  };

  return (
    <>
      <style>{`
        @keyframes fm-border {
          0%,100% { background-position:0% 50%; }
          50%      { background-position:100% 50%; }
        }
        .fm-ring {
          background: linear-gradient(145deg,rgba(139,92,246,.7),rgba(99,102,241,.52),rgba(139,92,246,.7));
          background-size:300% 300%;
          animation:fm-border 7s ease infinite;
        }
        .fm-ring-r { background:linear-gradient(145deg,rgba(139,92,246,.55),rgba(99,102,241,.4)); }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-[12px] font-sans"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%,rgba(139,92,246,.07) 0%,rgba(0,0,0,.9) 100%)' }}
      >
        {/* Iridescent ring */}
        <motion.div
          initial={reduced ? {opacity:0} : {opacity:0,scale:.95,y:20,filter:'blur(8px)'}}
          animate={reduced ? {opacity:1} : {opacity:1,scale:1,  y:0, filter:'blur(0px)'}}
          transition={{type:'spring',stiffness:280,damping:24,mass:.85}}
          className={`p-[1.5px] rounded-[24px] ${reduced ? 'fm-ring-r' : 'fm-ring'}`}
          style={{boxShadow:'0 56px 130px -24px rgba(0,0,0,.98),0 0 80px rgba(139,92,246,.05)'}}
        >
          {/* Card shell */}
          <div
            className="relative w-[468px] rounded-[23px] overflow-hidden"
            style={{ background: 'linear-gradient(158deg,rgba(12,9,22,.99) 0%,rgba(7,5,13,1) 100%)' }}
          >
            {/* Catch-light */}
            <div aria-hidden className="absolute top-0 left-0 right-0 h-px bg-white/[0.12] pointer-events-none z-[5]" />
            {/* Aurora pulse */}
            {!reduced && (
              <motion.div aria-hidden
                animate={{opacity:[.07,.16,.07]}}
                transition={{duration:7,repeat:Infinity,ease:'easeInOut'}}
                className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[440px] h-[280px] pointer-events-none z-[1]"
                style={{background:'radial-gradient(ellipse,rgba(139,92,246,.28) 0%,transparent 65%)'}}
              />
            )}
            {/* Grain */}
            <div aria-hidden className="absolute inset-0 rounded-[23px] pointer-events-none z-[4] opacity-[0.026] mix-blend-overlay"
              style={{
                backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundSize:'180px',
              }}
            />

            <div className="px-[22px] pt-[22px] pb-6 relative z-[6]">
              {step==='wiping' && <WipingState />}
              {step==='done'   && <DoneState onDone={onDone} />}
              {step==='choose' && (
                <ChooseState
                  usage={usage} error={error} reduced={reduced}
                  onPro={()=>{ window.electronAPI?.convertTrial?.('pro')?.catch(()=>{}); openUrl(PLAN_PRO_URL); }}
                  onMax={()=>{ window.electronAPI?.convertTrial?.('max')?.catch(()=>{}); openUrl(PLAN_MAX_URL); }}
                  onUltra={()=>{ window.electronAPI?.convertTrial?.('ultra')?.catch(()=>{}); openUrl(PLAN_ULTRA_URL); }}
                  onStandard={()=>{
                    window.electronAPI?.convertTrial?.('standard')?.catch(()=>{});
                    if (onStandard) onStandard().catch(()=>{});
                    openUrl(PLAN_STANDARD_URL);
                  }}
                  onByok={handleByok}
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

// ─── Choose ──────────────────────────────────────────────────

function ChooseState({ usage, error, reduced, onPro, onMax, onUltra, onStandard, onByok }: {
  usage: {ai:number;stt_seconds:number;search:number};
  error: string|null; reduced:boolean;
  onPro:()=>void; onMax:()=>void; onUltra:()=>void; onStandard:()=>void; onByok:()=>void;
}) {
  const sttMin = (usage.stt_seconds/60).toFixed(1);
  return (
    <div className="flex flex-col gap-2.5">
      {/* ── Header ─── */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08]">
        <div className="w-[34px] h-[34px] rounded-[10px] bg-violet-500/[0.13] border border-violet-500/[0.22] flex items-center justify-center shrink-0">
          <LiveLensLogoMark size={16} className="text-violet-400" />
        </div>
        <div>
          <div className="text-[14px] font-[650] text-white tracking-[-0.02em] leading-[1.2]">Keep the momentum going</div>
          <div className="text-[11.5px] text-white/[0.28] mt-0.5">
            {usage.ai} AI · {sttMin} min · {usage.search} searches used in your trial
          </div>
        </div>
      </div>

      {/* ── Plans ─── */}
      <div className="flex flex-col gap-1.5">
        <HeroCard
          title="LiveLens Pro" price="$15" period="/mo" icon={Zap}
          spec="1,000 AI answers · 500 min live STT · 100 searches · Pro App included"
          accent="violet" reduced={reduced} onClick={onPro}
        />

        <div className="grid grid-cols-2 gap-1.5">
          <TierCard title="Max"   price="$25" period="/mo" icon={Brain}
            spec="2,000 AI · 1,000 min · 200 searches · Pro App included"
            badge="Best value" accent="indigo" onClick={onMax} />
          <TierCard title="Ultra" price="$35" period="/mo" icon={Flame}
            spec="3,000 AI · 2,000 min · 300 searches · Pro App included"
            badge="Power" accent="amber" onClick={onUltra} />
        </div>

        <TierCard title="Standard" price="$8" period="/mo" icon={Mic}
            spec="500 AI · 200 min · 20 searches"
            badge="No Pro App" badgeWarn accent="slate" onClick={onStandard} />
      </div>

      {/* ── BYOK + trust ─── */}
      <ByokRow onClick={onByok} />

      <div className="flex items-center justify-center gap-1 -mt-0.5">
        <ShieldCheck size={9.5} strokeWidth={2} className="text-white/[0.46]" />
        <span className="text-[10px] text-white/[0.46]">Cancel anytime · Secure checkout via Dodo Payments</span>
      </div>

      {error && <p className="text-[11px] text-red-400/[0.85] text-center m-0">{error}</p>}
    </div>
  );
}

// ─── Hero card (Pro) ──────────────────────────────────────────

function HeroCard({ title, price, period, icon: Icon, spec, accent, reduced, onClick }: {
  title:string; price:string; period:string; icon:React.ElementType;
  spec:string; accent:'violet'; reduced:boolean; onClick:()=>void;
}) {
  const a = ACC[accent];
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="rounded-[14px] overflow-hidden cursor-pointer"
      style={{
        border:`1px solid ${hov ? a.hoverBorder : a.cardBorder}`,
        background: hov ? a.hoverBg : a.cardBg,
        boxShadow: hov ? a.hoverGlow : a.cardGlow,
        transform: hov && !reduced ? 'translateY(-2px)' : 'translateY(0)',
        transition:`transform 220ms ${EASE}, border-color 220ms ${EASE}, box-shadow 220ms ${EASE}, background 220ms ${EASE}`,
      }}
    >
      <div className="p-[12px_14px_14px]">
        {/* Name + badge + price — single row */}
        <div className="flex items-center justify-between mb-[7px]">
          <div className="flex items-center gap-[7px]">
            <Icon size={13} strokeWidth={1.75} style={{ color: a.iconColor }} />
            <span className="text-[13.5px] font-[650] text-white tracking-[-0.018em]">{title}</span>
            <span
              className="text-[7.5px] font-[720] tracking-[0.12em] uppercase px-1.5 py-0.5 rounded"
              style={{ color: a.bandText, background: a.bandBg }}
            >Popular</span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[22px] font-[760] text-white tracking-[-0.05em] leading-none">{price}</span>
            <span className="text-[10px] text-white/[0.28] font-normal">{period}</span>
          </div>
        </div>

        {/* Spec line */}
        <div className="text-[11px] text-white/[0.46] tracking-[-0.005em] mb-[11px] leading-[1.45]">
          {spec}
        </div>

        {/* CTA */}
        <motion.button
          onClick={onClick}
          whileHover={reduced?{}:{scale:1.008,filter:'brightness(1.09)'}}
          whileTap={{scale:.982}}
          className="relative w-full h-9 overflow-hidden flex items-center justify-between px-4 rounded-[9px] border-0 cursor-pointer outline-none"
          style={{ background: a.btnBg, boxShadow: a.btnShadow }}
        >
          {!reduced && (
            <motion.div aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{background:'linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)',transform:'skewX(-14deg)'}}
              animate={{x:['-130%','230%']}}
              transition={{duration:1.8,ease:'easeInOut',repeat:Infinity,repeatDelay:5.5}}
            />
          )}
          <span className="relative z-[1] text-[12.5px] font-[650] tracking-[-0.015em]" style={{ color: a.btnColor }}>
            Start {title}
          </span>
          <motion.span className="relative z-[1] flex items-center"
            animate={reduced?{}:{x:hov?3:0}} transition={{duration:.16}}>
            <ArrowRight size={13} strokeWidth={2.3} color="rgba(255,255,255,.9)" />
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}

// ─── Tier card (Max / Ultra / Standard) ──────────────────────

function TierCard({ title, price, period, icon: Icon, spec, accent, badge, badgeWarn, onClick }: {
  title:string; price:string; period:string; icon:React.ElementType;
  spec:string; accent:'indigo'|'amber'|'slate'; badge:string|null; badgeWarn?:boolean; onClick:()=>void;
}) {
  const a = ACC[accent];
  const [hov, setHov] = useState(false);
  const reduced = useReducedMotion() ?? false;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="p-[11px_13px_13px] rounded-[13px] flex flex-col gap-2 cursor-pointer"
      style={{
        border:`1px solid ${hov ? a.hoverBorder : a.cardBorder}`,
        background: hov ? a.hoverBg : a.cardBg,
        boxShadow: hov ? a.hoverGlow : 'none',
        transform: hov && !reduced ? 'translateY(-2px)' : 'translateY(0)',
        transition:`transform 220ms ${EASE}, border-color 220ms ${EASE}, box-shadow 220ms ${EASE}, background 220ms ${EASE}`,
      }}
    >
      {/* Name + badge + price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={12} strokeWidth={1.75} style={{ color: a.iconColor }} />
          <span className="text-[13px] font-[640] text-white tracking-[-0.015em]">{title}</span>
          {badge && (
            <span
              className="text-[7.5px] font-[720] tracking-[0.08em] uppercase px-[5px] py-[1.5px] rounded"
              style={{
                color: badgeWarn ? 'rgba(148,163,184,0.7)' : accent==='indigo' ? '#818CF8' : a.iconColor,
                background: badgeWarn ? 'rgba(148,163,184,0.06)' : accent==='indigo' ? 'rgba(99,102,241,0.12)' : 'rgba(251,191,36,.1)',
                border: `1px solid ${badgeWarn ? 'rgba(148,163,184,0.15)' : accent==='indigo' ? 'rgba(99,102,241,0.25)' : 'rgba(251,191,36,.22)'}`,
              }}
            >{badge}</span>
          )}
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-[18px] font-[740] text-white tracking-[-0.04em] leading-none">{price}</span>
          <span className="text-[9.5px] text-white/[0.28]">{period}</span>
        </div>
      </div>

      {/* Spec line */}
      <div className="text-[10.5px] text-white/[0.46] tracking-[-0.005em] leading-[1.4]">{spec}</div>

      {/* Button */}
      <button
        onClick={onClick}
        className="w-full h-[29px] flex items-center justify-center gap-1 rounded-[7px] border-0 cursor-pointer text-[11.5px] font-[640] transition-colors duration-180"
        style={{
          background: hov
            ? (accent==='indigo' ? 'rgba(99,102,241,0.9)' : accent==='amber' ? 'rgba(217,119,6,0.95)' : 'rgba(100,116,139,0.55)')
            : a.btnBg,
          boxShadow: a.btnShadow,
          color: a.btnColor,
        }}
      >
        Start {title} <ArrowRight size={10} strokeWidth={2.3} />
      </button>
    </div>
  );
}

// ─── BYOK row ─────────────────────────────────────────────────

function ByokRow({ onClick }: { onClick:()=>void }) {
  const [hov, setHov] = useState(false);
  const reduced = useReducedMotion() ?? false;
  return (
    <div className="border-t border-white/[0.08] pt-2">
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className="w-full flex items-center gap-2.5 p-[9px_12px] rounded-[10px] cursor-pointer text-left"
        style={{
          border:`1px solid ${hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'}`,
          background: hov ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
          transform: hov && !reduced ? 'translateY(-1px)' : 'translateY(0)',
          transition:`background 180ms ${EASE}, border-color 180ms ${EASE}, transform 180ms ${EASE}`,
        }}
      >
        <div
          className="w-[26px] h-[26px] rounded-[7px] shrink-0 flex items-center justify-center"
          style={{
            background: hov ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.06)',
            border:`1px solid ${hov ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
            transition:`background 180ms ${EASE}, border-color 180ms ${EASE}`,
          }}
        >
          <Key size={11} strokeWidth={1.75} color={hov ? 'rgba(255,255,255,0.76)' : 'rgba(255,255,255,0.46)'} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-[7px]">
            <span
              className="text-[12px] font-[580] transition-colors"
              style={{ color: hov ? '#FFFFFF' : 'rgba(255,255,255,0.76)' }}
            >
              Use my own API keys
            </span>
            <span className="text-[7.5px] font-bold tracking-[0.08em] uppercase text-white/[0.28] border border-white/[0.12] px-1 py-[1.5px] rounded-[3px]">free</span>
          </div>
          <div className="text-[10.5px] text-white/[0.28] mt-[1px]">
            LiveLens API disabled · No Pro features
          </div>
        </div>
        <ArrowRight size={11} strokeWidth={2} className="shrink-0" color={hov ? 'rgba(255,255,255,0.76)' : 'rgba(255,255,255,0.46)'} />
      </button>
    </div>
  );
}

// ─── Intermediate states ──────────────────────────────────────

function WipingState() {
  return (
    <div className="px-7 py-[52px] flex flex-col items-center gap-[18px] text-center">
      <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:'linear'}}>
        <Loader2 size={24} strokeWidth={1.5} className="text-white/[0.28]" />
      </motion.div>
      <div>
        <div className="text-[14px] font-[560] text-white/[0.76] mb-1.5">Cleaning up trial data…</div>
        <div className="text-[12px] text-white/[0.28] leading-[1.6]">Wiping cached company research and Pro data.</div>
      </div>
    </div>
  );
}

function DoneState({ onDone }: { onDone?:()=>void }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="px-7 py-[52px] flex flex-col items-center gap-[18px] text-center">
      <div className="w-[52px] h-[52px] rounded-full bg-green-400/[0.10] border border-green-400/20 flex items-center justify-center">
        <CheckCircle size={22} strokeWidth={1.5} className="text-green-400" />
      </div>
      <div>
        <div className="text-[15px] font-semibold text-white mb-1.5">All set.</div>
        <div className="text-[12.5px] text-white/[0.46] leading-[1.65] max-w-[240px] mx-auto">
          Trial data wiped. Add your API keys in Settings → AI Providers to get started.
        </div>
      </div>
      {onDone && (
        <button
          onClick={onDone}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          className="px-6 py-[9px] rounded-[10px] border border-white/[0.08] cursor-pointer text-[12.5px] font-[560] transition-[background,color] duration-150"
          style={{
            background: hov ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.06)',
            color: hov ? 'rgba(255,255,255,0.76)' : 'rgba(255,255,255,0.46)',
          }}
        >
          Continue →
        </button>
      )}
    </div>
  );
}
