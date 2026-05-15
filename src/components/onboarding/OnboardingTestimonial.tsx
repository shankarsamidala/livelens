// Adapted from REINIT dashboard's clean-testimonial.tsx
// Uses inline styles + brand tokens (no dashboard Tailwind dependency)

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BRAND = '#D97757';
const FONT  = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';

const testimonials = [
  {
    quote:  'Got three interview calls within a week. The real-time coaching during interviews is genuinely different.',
    author: 'Sravani Konduru',
    role:   'Software Engineer',
    company:'Hired via REINIT',
    avatar: 'https://tapback.co/api/avatar/Sravani.webp',
  },
  {
    quote:  'Stopped doomscrolling job boards. REINIT just surfaces the right roles every morning.',
    author: 'Kiran Babu Nadella',
    role:   'Product Manager',
    company:'Hired via REINIT',
    avatar: 'https://tapback.co/api/avatar/Kiran.webp',
  },
  {
    quote:  'The AI insights on each job saved me hours of prep. Knew exactly what to say in every interview.',
    author: 'Divya Chandra',
    role:   'Data Analyst',
    company:'Hired via REINIT',
    avatar: 'https://tapback.co/api/avatar/Divya.webp',
  },
];

function SplitText({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <span style={{ display: 'inline' }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
          transition={{ duration: 0.4, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] as any }}
          style={{ marginRight: '0.25em', display: 'inline-block' }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

export function OnboardingTestimonial() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNext = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % testimonials.length);
  }, []);

  const current = testimonials[activeIndex];
  const progress = ((activeIndex + 1) / testimonials.length) * 100;

  return (
    <div
      ref={containerRef}
      onClick={handleNext}
      style={{ position: 'relative', width: '100%', maxWidth: '480px', padding: '80px 32px', cursor: 'pointer', fontFamily: FONT }}
    >
      {/* Index indicator */}
      <motion.div
        style={{ position: 'absolute', top: 32, right: 32, display: 'flex', alignItems: 'baseline', gap: 4, fontFamily: 'monospace' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
      >
        <motion.span
          key={activeIndex}
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ fontSize: 24, fontWeight: 300, color: '#fff' }}
        >
          {String(activeIndex + 1).padStart(2, '0')}
        </motion.span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>/</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          {String(testimonials.length).padStart(2, '0')}
        </span>
      </motion.div>

      {/* Stacked avatars */}
      <motion.div
        style={{ position: 'absolute', top: 32, left: 32, display: 'flex' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
      >
        {testimonials.map((t, i) => (
          <div
            key={i}
            style={{
              width: 24, height: 24, borderRadius: '50%', overflow: 'hidden',
              border: '2px solid #1A1A1A',
              marginLeft: i === 0 ? 0 : -8,
              opacity: i === activeIndex ? 1 : 0.35,
              filter: i === activeIndex ? 'none' : 'grayscale(1)',
              transition: 'opacity 0.3s, filter 0.3s',
              outline: i === activeIndex ? `1px solid ${BRAND}` : 'none',
              outlineOffset: 1,
            }}
          >
            <img src={t.avatar} alt={t.author} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </motion.div>

      {/* Quote */}
      <div style={{ position: 'relative', marginTop: 16 }}>
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={activeIndex}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
            style={{ fontSize: 20, lineHeight: 1.6, fontWeight: 300, letterSpacing: '-0.01em', color: '#fff', margin: 0 }}
          >
            <SplitText text={current.quote} />
          </motion.blockquote>
        </AnimatePresence>

        {/* Author */}
        <motion.div style={{ position: 'relative', marginTop: 48 }} layout>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Avatar */}
            <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: -6, borderRadius: '50%',
                border: `1px solid rgba(217,119,87,0.4)`,
              }} />
              {testimonials.map((t, i) => (
                <motion.img
                  key={t.avatar}
                  src={t.avatar}
                  alt={t.author}
                  animate={{ opacity: i === activeIndex ? 1 : 0, zIndex: i === activeIndex ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    position: 'absolute', inset: 0, width: 48, height: 48,
                    borderRadius: '50%', objectFit: 'cover',
                    filter: 'grayscale(0.3)',
                  }}
                />
              ))}
            </div>

            {/* Name + role */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                style={{ position: 'relative', paddingLeft: 16 }}
              >
                {/* Vertical accent line */}
                <motion.div
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] as any }}
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 1,
                    background: BRAND, transformOrigin: 'top',
                  }}
                />
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '0.01em' }}>
                  {current.author}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2, fontFamily: 'monospace' }}>
                  {current.role} — {current.company}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Progress bar */}
        <div style={{ position: 'relative', marginTop: 48, height: 1, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as any }}
            style={{ position: 'absolute', inset: '0 auto 0 0', background: BRAND }}
          />
        </div>

        {/* Click hint */}
        <motion.div
          style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        >
          <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Click anywhere to advance
          </span>
        </motion.div>
      </div>
    </div>
  );
}
