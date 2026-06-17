'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const STAGES = [
    {
        num: '01',
        title: 'Ingest',
        desc: 'Drop in a CSV or Excel file, a few rows or a few million. Xeno streams it chunk by chunk — nothing loads fully into memory.',
        color: 'var(--ingest)',
        visual: (
            <svg viewBox="0 0 100 60" fill="none" style={{ width: '100%', height: '100%' }}>
                <circle cx="14" cy="30" r="3" fill="var(--ingest)" opacity="0.9" />
                <circle cx="26" cy="18" r="2.4" fill="var(--ingest)" opacity="0.7" />
                <circle cx="22" cy="44" r="2" fill="var(--ingest)" opacity="0.6" />
                <circle cx="38" cy="32" r="2.6" fill="var(--ingest)" opacity="0.8" />
                <path d="M50 30H88" stroke="var(--ingest)" strokeWidth="1.4" strokeDasharray="2 4" opacity="0.6" />
                <path d="M80 24L88 30L80 36" stroke="var(--ingest)" strokeWidth="1.4" />
            </svg>
        ),
    },
    {
        num: '02',
        title: 'Validate',
        desc: 'Every order, product, payment, phone number, and timestamp is checked against rules written for real-world messiness, not clean test data.',
        color: 'var(--ingest)',
        visual: (
            <svg viewBox="0 0 100 60" fill="none" style={{ width: '100%', height: '100%' }}>
                <rect x="20" y="14" width="14" height="14" rx="2" stroke="var(--refine)" strokeWidth="1.4" />
                <rect x="38" y="14" width="14" height="14" rx="2" fill="rgba(245,176,66,0.15)" stroke="var(--signal)" strokeWidth="1.4" />
                <rect x="56" y="14" width="14" height="14" rx="2" stroke="var(--refine)" strokeWidth="1.4" />
                <rect x="20" y="32" width="14" height="14" rx="2" stroke="var(--refine)" strokeWidth="1.4" />
                <rect x="38" y="32" width="14" height="14" rx="2" stroke="var(--refine)" strokeWidth="1.4" />
                <rect x="56" y="32" width="14" height="14" rx="2" fill="rgba(245,176,66,0.15)" stroke="var(--signal)" strokeWidth="1.4" />
            </svg>
        ),
    },
    {
        num: '03',
        title: 'Clean',
        desc: "Malformed rows are repaired where the fix is unambiguous, and set aside where it isn't. You see exactly what changed and why, row by row.",
        color: 'var(--refine)',
        visual: (
            <svg viewBox="0 0 100 60" fill="none" style={{ width: '100%', height: '100%' }}>
                <path d="M16 30H40" stroke="var(--refine)" strokeWidth="1.4" opacity="0.5" />
                <circle cx="44" cy="30" r="9" stroke="var(--refine)" strokeWidth="1.4" />
                <path d="M40 30L44 34L50 26" stroke="var(--signal)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M54 30H84" stroke="var(--refine)" strokeWidth="1.4" />
            </svg>
        ),
    },
    {
        num: '04',
        title: 'Enrich',
        desc: 'Country codes are resolved, currencies normalized, and duplicate orders linked together — restoring context the source file never had.',
        color: 'var(--refine)',
        visual: (
            <svg viewBox="0 0 100 60" fill="none" style={{ width: '100%', height: '100%' }}>
                <circle cx="30" cy="30" r="10" stroke="var(--refine)" strokeWidth="1.4" />
                <path d="M40 30H58" stroke="var(--refine)" strokeWidth="1.4" strokeDasharray="2 3" />
                <circle cx="66" cy="30" r="13" stroke="var(--signal)" strokeWidth="1.6" />
                <path d="M61 30L71 30M66 25L66 35" stroke="var(--signal)" strokeWidth="1.4" />
            </svg>
        ),
    },
    {
        num: '05',
        title: 'Analyze',
        desc: 'Groq reviews the dataset as a whole and writes a plain-language quality report — patterns and root causes, not just a list of broken rows.',
        color: 'var(--signal)',
        visual: (
            <svg viewBox="0 0 100 60" fill="none" style={{ width: '100%', height: '100%' }}>
                <rect x="20" y="38" width="8" height="10" fill="var(--signal)" opacity="0.5" />
                <rect x="32" y="28" width="8" height="20" fill="var(--signal)" opacity="0.7" />
                <rect x="44" y="16" width="8" height="32" fill="var(--signal)" />
                <rect x="56" y="30" width="8" height="18" fill="var(--signal)" opacity="0.7" />
                <rect x="68" y="22" width="8" height="26" fill="var(--signal)" opacity="0.85" />
            </svg>
        ),
    },
    {
        num: '06',
        title: 'Trust',
        desc: 'A clean export, an error report, and chunked files land wherever your downstream systems expect them. Ready to reconcile, not just review.',
        color: 'var(--signal)',
        visual: (
            <svg viewBox="0 0 100 60" fill="none" style={{ width: '100%', height: '100%' }}>
                <rect x="36" y="22" width="28" height="22" rx="4" stroke="var(--signal)" strokeWidth="1.6" />
                <path d="M42 22V17a8 8 0 0116 0v5" stroke="var(--signal)" strokeWidth="1.6" />
                <circle cx="50" cy="33" r="2.4" fill="var(--signal)" />
            </svg>
        ),
    },
]

function Stage({ stage, index }: { stage: (typeof STAGES)[0]; index: number }) {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true, margin: '-15% 0px' })

    return (
        <motion.div
            ref={ref}
            className="stage-row"
            initial={{ opacity: 0, x: -32 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: index * 0.07 }}
            style={{
                display: 'grid',
                gridTemplateColumns: '96px 1fr 220px',
                gap: 40,
                alignItems: 'center',
                paddingBlock: 48,
                borderTop: '1px solid var(--line-soft)',
            }}
        >
            {/* Stage number + dot */}
            <div
                style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 14,
                    color: 'var(--mist-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                }}
            >
                <motion.div
                    animate={isInView ? {
                        scale: [1, 1.3, 1],
                        boxShadow: [`0 0 0px ${stage.color}`, `0 0 18px ${stage.color}`, `0 0 10px ${stage.color}`],
                    } : {}}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.07 + 0.3 }}
                    style={{
                        width: 13,
                        height: 13,
                        borderRadius: '50%',
                        border: `2px solid ${isInView ? stage.color : 'var(--mist-dim)'}`,
                        background: isInView ? stage.color : 'var(--void)',
                        flexShrink: 0,
                        transition: 'all 0.5s ease',
                    }}
                />
                {stage.num}
            </div>

            {/* Body */}
            <div>
                <motion.h3
                    initial={{ opacity: 0, y: 12 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: index * 0.07 + 0.15 }}
                    style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 22,
                        fontWeight: 600,
                        marginBottom: 10,
                    }}
                >
                    {stage.title}
                </motion.h3>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: index * 0.07 + 0.25 }}
                    style={{
                        color: 'var(--mist)',
                        fontSize: 15,
                        lineHeight: 1.65,
                        maxWidth: 520,
                    }}
                >
                    {stage.desc}
                </motion.p>
            </div>

            {/* Visual */}
            <motion.div
                className="stage-visual"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: index * 0.07 + 0.2 }}
                style={{
                    height: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--line)',
                    borderRadius: 14,
                    padding: '10px 16px',
                }}
            >
                {stage.visual}
            </motion.div>
        </motion.div>
    )
}

export default function Pipeline() {
    const railRef = useRef<HTMLDivElement>(null)
    const cometRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const updateComet = () => {
            const wrap = railRef.current
            const comet = cometRef.current
            if (!wrap || !comet) return
            const rect = wrap.getBoundingClientRect()
            const total = rect.height
            const viewportCenter = window.innerHeight * 0.5
            let progress = (viewportCenter - rect.top) / total
            progress = Math.max(0, Math.min(1, progress))
            comet.style.top = `${progress * total}px`
        }
        window.addEventListener('scroll', updateComet, { passive: true })
        window.addEventListener('resize', updateComet)
        updateComet()
        return () => {
            window.removeEventListener('scroll', updateComet)
            window.removeEventListener('resize', updateComet)
        }
    }, [])

    const headerRef = useRef<HTMLDivElement>(null)
    const headerInView = useInView(headerRef, { once: true, margin: '-10% 0px' })

    return (
        <section
            id="pipeline"
            style={{
                position: 'relative',
                zIndex: 2,
                paddingBlock: 'clamp(80px, 12vw, 160px)',
                overflow: 'hidden',
            }}
        >
            <div
                ref={railRef}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 1280,
                    margin: '0 auto',
                    paddingInline: 'clamp(20px, 4vw, 32px)',
                }}
            >
                {/* Rail track line */}
                <div
                    style={{
                        position: 'absolute',
                        left: 'clamp(20px, 4vw, 32px)',
                        top: 0,
                        bottom: 0,
                        width: 1,
                        background: 'linear-gradient(to bottom, transparent, var(--line) 10%, var(--line) 90%, transparent)',
                    }}
                />

                {/* Comet — scroll-driven glow dot on the rail */}
                <div
                    ref={cometRef}
                    style={{
                        position: 'absolute',
                        left: 'clamp(20px, 4vw, 32px)',
                        top: 0,
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: 'var(--refine)',
                        boxShadow: '0 0 14px 4px var(--refine)',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 3,
                        pointerEvents: 'none',
                    }}
                />

                {/* Head */}
                <motion.div
                    ref={headerRef}
                    initial={{ opacity: 0, y: 32 }}
                    animate={headerInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    style={{ maxWidth: 600, marginBottom: 88, paddingLeft: 'clamp(24px, 5vw, 56px)' }}
                >
                    <div
                        style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 12.5,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--refine)',
                            marginBottom: 18,
                        }}
                    >
                        The pipeline
                    </div>
                    <h2
                        style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 'clamp(1.9rem, 3.6vw, 2.8rem)',
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            lineHeight: 1.1,
                        }}
                    >
                        Six stages stand between a messy export and a number you can report on.
                    </h2>
                    <p
                        style={{
                            marginTop: 18,
                            color: 'var(--mist)',
                            fontSize: 16,
                            lineHeight: 1.65,
                            maxWidth: 560,
                        }}
                    >
                        Every file moves through the same ordered path — nothing skipped, nothing assumed.
                    </p>
                </motion.div>

                {/* Stages */}
                <div style={{ paddingLeft: 'clamp(24px, 5vw, 56px)' }}>
                    {STAGES.map((stage, i) => (
                        <Stage key={stage.num} stage={stage} index={i} />
                    ))}
                    {/* Bottom border on last stage */}
                    <div style={{ borderBottom: '1px solid var(--line-soft)', height: 0 }} />
                </div>
            </div>

            <style>{`
                @media (max-width: 860px) {
                    .stage-row {
                        grid-template-columns: 72px 1fr !important;
                        gap: 20px !important;
                        padding-block: 32px !important;
                    }
                    .stage-visual {
                        display: none !important;
                    }
                }
                @media (max-width: 540px) {
                    .stage-row {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                        padding-block: 28px !important;
                    }
                }
            `}</style>
        </section>
    )
}