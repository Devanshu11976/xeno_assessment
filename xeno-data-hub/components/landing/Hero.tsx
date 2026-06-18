'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import ValidationCore from './ValidationCore'
import UploadPortal from './UploadPortal'

const DEMO_EMAIL = 'sanmatijain2204@gmail.com'

/** Smooth-scrolls to the upload portal and focuses the dropzone */
export function scrollToUpload() {
    const el = document.getElementById('upload-portal-dropzone')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Small delay so scroll finishes before focus ring appears
    setTimeout(() => el.focus(), 500)
}

interface HeroProps {
    rulesCount?: number
    jobs?: any[]
}

export default function Hero({ rulesCount = 0, jobs = [] }: HeroProps) {
    const [intensity, setIntensity] = useState(0)
    const router = useRouter()

    const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'processing').length
    const sumRecords = jobs.reduce((acc, j) => acc + (j.total_records ?? 0), 0)
    const totalValid = jobs.reduce((acc, j) => acc + (j.valid_records ?? 0), 0)

    const formattedRecords = sumRecords > 0 
        ? (sumRecords >= 1000000 
            ? `${(sumRecords / 1000000).toFixed(1)}M` 
            : (sumRecords >= 1000 
                ? `${(sumRecords / 1000).toFixed(1)}K` 
                : `${sumRecords}`))
        : '1.2M'

    const formattedAccuracy = sumRecords > 0
        ? `${((totalValid / sumRecords) * 100).toFixed(2)}%`
        : '99.97%'

    const badges = [
        { value: formattedRecords, label: 'records processed', pos: { top: '-5%', left: '-18%' }, delay: 0 },
        { value: formattedAccuracy, label: 'accuracy', pos: { top: '2%', right: '-22%' }, delay: 1.4 },
        { value: rulesCount > 0 ? `${rulesCount}` : '190+', label: 'country rules', pos: { bottom: '12%', left: '-26%' }, delay: 2.8 },
        { value: jobs.length > 0 ? `${activeJobs}` : '32', label: 'active jobs', pos: { bottom: '-10%', right: '-12%' }, delay: 0.7 },
    ]

    const handleStartValidating = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        scrollToUpload()
    }, [])

    return (
        <section
            style={{
                position: 'relative',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                paddingTop: 120,
                overflow: 'hidden',
            }}
        >
            <ValidationCore intensity={intensity} />

            {/* Fade overlay */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    background:
                        'linear-gradient(180deg, transparent 40%, var(--void) 96%)',
                    pointerEvents: 'none',
                }}
            />

            <div
                className="wrap"
                style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '100%',
                    maxWidth: 1280,
                    margin: '0 auto',
                    paddingInline: 32,
                    display: 'grid',
                    gridTemplateColumns: '1fr 360px',
                    gap: 40,
                    alignItems: 'center',
                }}
            >
                {/* Left: copy */}
                <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    style={{ maxWidth: 680 }}
                >
                    {/* Eyebrow */}
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 12.5,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--mist)',
                            marginBottom: 28,
                            padding: '6px 12px',
                            border: '1px solid var(--line)',
                            borderRadius: 100,
                            background: 'rgba(255,255,255,0.02)',
                        }}
                    >
                        <span
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'var(--signal)',
                                boxShadow: '0 0 8px var(--signal)',
                                animation: 'pulse 2.4s infinite',
                                display: 'inline-block',
                            }}
                        />
                        Now streaming validation at scale
                    </div>

                    <h1
                        style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 'clamp(2.6rem, 6.4vw, 5rem)',
                            lineHeight: 1.02,
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Every transaction has a story.
                        <br />
                        <span
                            style={{
                                background:
                                    'linear-gradient(100deg, var(--ingest) 0%, var(--refine) 45%, var(--signal) 100%)',
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                color: 'transparent',
                            }}
                        >
                            We verify the truth.
                        </span>
                    </h1>

                    <p
                        style={{
                            marginTop: 26,
                            fontSize: 'clamp(1rem, 1.6vw, 1.2rem)',
                            color: 'var(--mist)',
                            maxWidth: 520,
                            lineHeight: 1.6,
                        }}
                    >
                        Xeno checks every order, product, and payment line by line, resolves
                        phone and date formats by country, and turns the result into
                        AI-generated insights your team can act on immediately.
                    </p>

                    <div
                        style={{
                            marginTop: 40,
                            display: 'flex',
                            gap: 14,
                            flexWrap: 'wrap',
                        }}
                    >
                        <motion.a
                            href="#upload-portal-dropzone"
                            aria-label="Start validating — scroll to upload portal"
                            onClick={handleStartValidating}
                            whileHover={{ y: -2 }}
                            style={{
                                padding: '14px 26px',
                                borderRadius: 10,
                                fontSize: 14.5,
                                fontWeight: 600,
                                color: '#0a0b0e',
                                background: 'linear-gradient(120deg, #fff, #e7e9ee)',
                                boxShadow: '0 8px 30px rgba(245,176,66,0.18)',
                                display: 'inline-block',
                                cursor: 'pointer',
                            }}
                        >
                            Start validating
                        </motion.a>
                        <motion.a
                            href="/workspace?demo=true"
                            aria-label="View a sample validation report"
                            onClick={(e) => { e.preventDefault(); router.push('/workspace?demo=true') }}
                            whileHover={{ y: -2 }}
                            style={{
                                padding: '14px 26px',
                                borderRadius: 10,
                                fontSize: 14.5,
                                fontWeight: 500,
                                border: '1px solid var(--line)',
                                background: 'rgba(255,255,255,0.02)',
                                backdropFilter: 'blur(10px)',
                                transition: 'border-color 0.2s ease',
                                display: 'inline-block',
                            }}
                            onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.borderColor =
                                'rgba(255,255,255,0.25)')
                            }
                            onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.borderColor =
                                'var(--line)')
                            }
                        >
                            View a sample report
                        </motion.a>
                    </div>

                    {/* Hero meta stats */}
                    <div
                        style={{
                            marginTop: 64,
                            display: 'flex',
                            gap: 36,
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 12.5,
                            color: 'var(--mist-dim)',
                            flexWrap: 'wrap',
                        }}
                    >
                        {[
                            ['Streaming', 'ingestion engine'],
                            ['6-stage', 'validation pipeline'],
                            ['Gemini', '-powered insights'],
                        ].map(([bold, rest]) => (
                            <div key={bold}>
                                <b style={{ color: 'var(--paper)', fontWeight: 500 }}>{bold}</b>
                                {rest}
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Right: upload portal + floating badges */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        position: 'relative',
                        minHeight: 380,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div id="upload-portal-container" style={{ position: 'relative', zIndex: 3, width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <UploadPortal onIntensityChange={setIntensity} rulesCount={rulesCount} />
                    </div>

                    {/* Floating metric badges */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                        }}
                    >
                        {badges.map((badge, i) => (
                            <motion.div
                                key={i}
                                className="hero-badge"
                                animate={{ y: [0, -9, 0] }}
                                transition={{
                                    duration: 6,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: badge.delay,
                                }}
                                style={{
                                    position: 'absolute',
                                    ...badge.pos,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    background: 'rgba(255,255,255,0.045)',
                                    border: '1px solid var(--line)',
                                    backdropFilter: 'blur(14px)',
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: 'var(--paper)',
                                    boxShadow: '0 14px 30px -12px rgba(0,0,0,0.55)',
                                    whiteSpace: 'nowrap',
                                    fontFamily: "'IBM Plex Mono', monospace",
                                }}
                            >
                                {badge.value}
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 400,
                                        color: 'var(--mist-dim)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.03em',
                                    }}
                                >
                                    {badge.label}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>

            <style>{`
        @media (max-width: 980px) {
          .wrap { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .hero-badge { display: none !important; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
        </section>
    )
}