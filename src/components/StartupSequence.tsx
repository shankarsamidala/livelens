import React from 'react';
import { motion } from 'framer-motion';
import logoAsset from '../assets/logo.png';
import celebFont from '../font/Masterfont - Celeb MF Medium.otf?url';
import celebLightFont from '../font/Masterfont - Celeb MF Light.otf?url';
import interFont from '../font/Inter-4.1/web/Inter-Medium.woff2?url';
import interLightFont from '../font/Inter-4.1/web/Inter-Light.woff2?url';

import heroVideo from '../assets/hero.webm';
import NativelyInterfaceCard from './NativelyInterfaceCard';

interface StartupSequenceProps {
    onComplete: () => void;
}

const BRAND   = '#D97757';
const INK_900 = '#1A1A1A';

const FONTS = {
    display: "'Inter', ui-sans-serif, system-ui, sans-serif",
    celebMedium: "'Celeb MF Medium', 'Inter', ui-sans-serif, system-ui, sans-serif",
    celebLight: "'Celeb MF Light', 'Inter', ui-sans-serif, system-ui, sans-serif",
    interMedium: "'Inter Medium', 'Inter', ui-sans-serif, system-ui, sans-serif",
    interLight: "'Inter Light', 'Inter', ui-sans-serif, system-ui, sans-serif",
};

const VALUE_PROPS = [
    'Capture every meeting — automatic and private',
    'Real-time AI coaching during interviews',
    'Your career history, always at your fingertips',
];

// Premium Spring Physics
const springEase = [0.23, 1, 0.32, 1] as [number, number, number, number];

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: springEase },
    },
};

// ─── Main Subsystem ───────────────────────────────────────────────────────
const StartupSequence: React.FC<StartupSequenceProps> = ({ onComplete }) => {
    return (
        <div
            className="fixed inset-0 z-[100] flex overflow-hidden lg:grid lg:grid-cols-[1fr_1fr]"
            style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#f3f3f4', color: '#2f2f34' }}
        >
            <style>{`
                @font-face {
                    font-family: 'Celeb MF Medium';
                    src: url('${celebFont}') format('opentype');
                    font-weight: 500;
                    font-style: normal;
                }
                @font-face {
                    font-family: 'Celeb MF Light';
                    src: url('${celebLightFont}') format('opentype');
                    font-weight: 300;
                    font-style: normal;
                }
                @font-face {
                    font-family: 'Inter Medium';
                    src: url('${interFont}') format('woff2');
                    font-weight: 500;
                    font-style: normal;
                }
                @font-face {
                    font-family: 'Inter Light';
                    src: url('${interLightFont}') format('woff2');
                    font-weight: 300;
                    font-style: normal;
                }
                @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=IBM+Plex+Sans:wght@500;600&display=swap');
                * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
            `}</style>

            {/* ── LEFT PANEL: REINIT branded welcome ── */}
            <motion.div
                className="relative flex flex-col w-full h-full p-12"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                style={{
                    backgroundColor: '#F5F5F5',
                    backgroundImage: 'radial-gradient(circle, rgba(200,200,200,0.6) 2px, transparent 2px)',
                    backgroundSize: '36px 36px',
                }}
            >
                {/* Logo + wordmark */}
                <motion.div variants={itemVariants} className="flex items-center gap-2 mb-auto">
                    <img src={logoAsset} alt="REINIT" style={{ height: '28px', width: 'auto' }} />
                    <span style={{ fontSize: '17px', fontWeight: 700, color: INK_900, letterSpacing: '-0.02em', fontFamily: FONTS.interMedium }}>
                        reinit.in
                    </span>
                </motion.div>

                {/* Center content */}
                <div className="flex flex-col gap-6 my-auto">
                    <motion.div variants={itemVariants} className="flex flex-col gap-2">
                        <p style={{
                            fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
                            textTransform: 'uppercase', color: BRAND,
                            fontFamily: FONTS.interMedium, margin: 0,
                        }}>
                            Your AI Career Copilot
                        </p>
                        <h1 style={{
                            fontSize: '38px', fontWeight: 700, color: INK_900,
                            letterSpacing: '-0.03em', lineHeight: 1.18,
                            fontFamily: FONTS.interMedium, margin: 0,
                        }}>
                            A smarter way to<br />get hired and grow
                        </h1>
                    </motion.div>

                    <motion.ul variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '10px', listStyle: 'none', padding: 0, margin: 0 }}>
                        {VALUE_PROPS.map(prop => (
                            <li key={prop} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                                    background: `rgba(217,119,87,0.14)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke={BRAND} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <span style={{ fontSize: '14px', color: 'rgba(26,26,26,0.7)', fontFamily: FONTS.interMedium, lineHeight: 1.5 }}>
                                    {prop}
                                </span>
                            </li>
                        ))}
                    </motion.ul>

                    <motion.div variants={itemVariants}>
                        <motion.button
                            onClick={onComplete}
                            whileHover={{ opacity: 0.9 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                width: '100%', maxWidth: '300px', height: '52px',
                                borderRadius: '14px', border: 'none', cursor: 'pointer',
                                background: BRAND, color: '#fff',
                                fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                fontFamily: FONTS.interMedium,
                                boxShadow: '0 0 0 1px rgba(217,119,87,0.35), 0 8px 24px -6px rgba(217,119,87,0.5)',
                            }}
                        >
                            Get Started
                            <span style={{ fontSize: '18px', lineHeight: 1 }}>›</span>
                        </motion.button>
                    </motion.div>
                </div>

                {/* Footer */}
                <motion.div variants={itemVariants} className="mt-auto">
                    <p style={{ fontSize: '11.5px', color: 'rgba(26,26,26,0.4)', fontFamily: FONTS.interMedium }}>
                        By continuing you agree to our{' '}
                        <span
                            onClick={() => (window.electronAPI as any)?.openExternal?.('https://reinit.in/terms')}
                            style={{ color: INK_900, textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Terms
                        </span>
                        {' '}and{' '}
                        <span
                            onClick={() => (window.electronAPI as any)?.openExternal?.('https://reinit.in/privacy')}
                            style={{ color: INK_900, textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Privacy Policy
                        </span>
                        .
                    </p>
                </motion.div>
            </motion.div>

            {/* ── RIGHT PANEL: Dark + Video Composition ── */}
            <div
                className="hidden lg:flex flex-col relative items-center justify-center overflow-hidden w-full h-full"
                style={{ backgroundColor: INK_900 }}
            >
                {/* Subtle grid */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
                        `,
                        backgroundSize: '48px 48px',
                    }}
                />
                <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, ${INK_900} 100%)` }} />

                {/* 2. Content layers — stacked vertically, card overlaps video top */}
                <div className="relative z-10 w-full flex flex-col items-center justify-center px-8" style={{ paddingBottom: '80px' }}>

                    {/* A. NativelyInterfaceCard — slightly wider, on top */}
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 1, ease: springEase }}
                        className="relative w-[95%] drop-shadow-[0_24px_48px_rgba(0,0,0,0.25)]"
                        style={{ zIndex: 2 }}
                    >
                        <NativelyInterfaceCard isStatic={true} isMobile={false} spreadHotkeys />
                    </motion.div>

                    {/* B. Hero Video — slightly narrower, below; negative margin to overlap under card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 1, ease: springEase }}
                        className="w-[92%] rounded-[14px] overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/5 -mt-[160px]"
                        style={{ aspectRatio: '16/9', zIndex: 1 }}
                    >
                        <video
                            src={heroVideo}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover bg-black"
                        />
                    </motion.div>

                </div>

                {/* 3. Bottom Tagline */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 1, ease: springEase }}
                    className="absolute bottom-16 z-20 text-center px-12"
                >
                    <h2
                        className="text-[32px] font-bold leading-[1.25] tracking-tight"
                        style={{ color: '#fff', fontFamily: FONTS.interMedium }}
                    >
                        Real-time coaching,<br />
                        <span style={{ color: BRAND }}>always on your side</span>
                    </h2>
                </motion.div>

            </div>
        </div>
    );
};

export default StartupSequence;
