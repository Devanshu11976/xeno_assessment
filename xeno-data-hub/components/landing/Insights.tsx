'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const BAR_DATA = [
    { label: 'Phone', pct: 62 },
    { label: 'Payment', pct: 18 },
    { label: 'Date/Time', pct: 12 },
    { label: 'Product', pct: 8 },
]

const RECOMMENDATIONS = [
    'Review Singapore phone formats — 8-digit rule may be misapplied to landlines.',
    'Check the payment export configuration for the DE checkout flow.',
    'Investigate payment anomalies clustered after 18:00 UTC.',
]

const INSIGHT_POINTS = [
    {
        num: '①',
        title: 'Root-cause grouping.',
        desc: 'Hundreds of failed rows collapse into a handful of underlying causes.',
    },
    {
        num: '②',
        title: 'Plain-language summaries.',
        desc: 'Written for the person who has to explain this batch to finance, not just the engineer who built the pipeline.',
    },
    {
        num: '③',
        title: 'Trend awareness.',
        desc: "Flags when this batch's error pattern is new, not just whether it failed.",
    },
]

interface InsightsProps {
    latestJob?: any
    latestReport?: any
}

export default function Insights({ latestJob, latestReport }: InsightsProps) {
    const reportRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(reportRef, { once: true, margin: '-10% 0px' })

    const hasLiveReport = latestJob && latestReport

    const qualityScore = hasLiveReport ? latestReport.quality_score : 92
    const batchName = hasLiveReport ? `#${latestJob.job_id}` : '#4471'
    const thresholdText = qualityScore >= 90 ? 'above your 90 threshold' : 'below your 90 threshold'

    const recommendations = hasLiveReport ? latestReport.recommendations : RECOMMENDATIONS

    let barData = BAR_DATA
    if (hasLiveReport && latestJob.validation_breakdown) {
        const breakdown = latestJob.validation_breakdown
        const entries = Object.entries(breakdown)
        const total = entries.reduce((acc, [, v]) => acc + (v as number), 0)
        if (total > 0) {
            barData = entries
                .map(([k, v]) => ({
                    label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    pct: Math.round(((v as number) / total) * 100)
                }))
                .sort((a, b) => b.pct - a.pct)
                .slice(0, 4)
        }
    }

    const r = 26
    const circ = 2 * Math.PI * r
    const strokeDashoffset = circ - (qualityScore / 100) * circ

    return (
        <section
            id="insights"
            style={{
                position: 'relative',
                zIndex: 2,
                paddingBlock: 'clamp(80px, 12vw, 160px)',
            }}
        >
            <div
                className="insights-grid"
                style={{
                    width: '100%',
                    maxWidth: 1280,
                    margin: '0 auto',
                    paddingInline: 32,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.3fr',
                    gap: 56,
                    alignItems: 'center',
                }}
            >
                {/* Left: copy */}
                <motion.div
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-10% 0px' }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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
                        AI-generated insights
                    </div>
                    <h2
                        style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 'clamp(1.9rem, 3.6vw, 2.8rem)',
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            lineHeight: 1.1,
                            marginBottom: 18,
                        }}
                    >
                        Not an error list. A reason.
                    </h2>
                    <p
                        style={{
                            color: 'var(--mist)',
                            fontSize: 16,
                            lineHeight: 1.65,
                            maxWidth: 560,
                        }}
                    >
                        Gemini reads the whole batch the way a senior analyst would —
                        looking for what's connected, not just what's broken.
                    </p>

                    <div
                        style={{
                            marginTop: 32,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 22,
                        }}
                    >
                        {INSIGHT_POINTS.map((pt) => (
                            <div
                                key={pt.num}
                                style={{ display: 'flex', gap: 16 }}
                            >
                                <div
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 8,
                                        flexShrink: 0,
                                        background: 'rgba(245,176,66,0.12)',
                                        border: '1px solid rgba(245,176,66,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--signal)',
                                        fontSize: 13,
                                        fontFamily: "'IBM Plex Mono', monospace",
                                    }}
                                >
                                    {pt.num}
                                </div>
                                <p
                                    style={{
                                        color: 'var(--mist)',
                                        fontSize: 14.5,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    <strong style={{ color: 'var(--paper)', fontWeight: 600 }}>
                                        {pt.title}
                                    </strong>{' '}
                                    {pt.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Right: report panel */}
                <motion.div
                    ref={reportRef}
                    className="hover-card"
                    initial={{ opacity: 0, y: 28 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                    style={{
                        background:
                            'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                        border: '1px solid var(--line)',
                        borderRadius: 18,
                        backdropFilter: 'blur(20px) saturate(160%)',
                        boxShadow:
                            '0 30px 80px -30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Panel header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '18px 22px',
                            borderBottom: '1px solid var(--line-soft)',
                        }}
                    >
                        <div
                            style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: 12.5,
                                color: 'var(--mist)',
                            }}
                        >
                            data-quality-report — batch {batchName}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[0, 1, 2].map((i) => (
                                <span
                                    key={i}
                                    style={{
                                        width: 9,
                                        height: 9,
                                        borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.12)',
                                        display: 'inline-block',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Quality gauge row */}
                    <div
                        style={{
                            display: 'flex',
                            gap: 18,
                            alignItems: 'center',
                            padding: '20px 22px',
                            borderBottom: '1px solid var(--line-soft)',
                        }}
                    >
                        {/* Gauge */}
                        <div
                            style={{
                                position: 'relative',
                                width: 60,
                                height: 60,
                                flexShrink: 0,
                            }}
                        >
                            <svg
                                viewBox="0 0 60 60"
                                style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}
                            >
                                <circle
                                    cx="30"
                                    cy="30"
                                    r="26"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.08)"
                                    strokeWidth="5"
                                />
                                <circle
                                    cx="30"
                                    cy="30"
                                    r="26"
                                    fill="none"
                                    stroke="var(--signal)"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeDasharray={circ}
                                    strokeDashoffset={strokeDashoffset}
                                    style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                                />
                            </svg>
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    fontWeight: 600,
                                    fontSize: 15,
                                }}
                            >
                                {qualityScore}
                            </div>
                        </div>
                        <div>
                            <div
                                style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: 10.5,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    color: 'var(--mist-dim)',
                                }}
                            >
                                Dataset quality score
                            </div>
                            <div
                                style={{ marginTop: 5, fontSize: 13, color: 'var(--paper)', fontWeight: 500 }}
                            >
                                {qualityScore} / 100 — {thresholdText}
                            </div>
                        </div>
                    </div>

                    {/* Report body */}
                    <div style={{ padding: 26 }}>
                        {/* Narrative */}
                        <div
                            style={{
                                fontSize: 14.5,
                                lineHeight: 1.7,
                                color: 'var(--paper)',
                                opacity: 0.92,
                                padding: '16px 18px',
                                borderRadius: 10,
                                background: 'rgba(155,107,255,0.07)',
                                border: '1px solid rgba(155,107,255,0.18)',
                                marginBottom: 24,
                            }}
                        >
                            {hasLiveReport ? (
                                <>
                                    <span style={{ color: 'var(--refine)', fontWeight: 600 }}>
                                        AI Summary —
                                    </span>{' '}
                                    {latestReport.executive_summary}
                                </>
                            ) : (
                                <>
                                    <span style={{ color: 'var(--refine)', fontWeight: 600 }}>
                                        Finding —
                                    </span>{' '}
                                    Malformed phone numbers from the{' '}
                                    <span style={{ color: 'var(--refine)', fontWeight: 600 }}>DE</span>{' '}
                                    region rose 12% in this batch, concentrated in orders placed after
                                    18:00 UTC. Pattern matches a checkout form regression, not random
                                    noise.
                                </>
                            )}
                        </div>

                        {/* Bars */}
                        {barData.map((bar) => (
                            <div
                                key={bar.label}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 14,
                                    marginBottom: 14,
                                    fontSize: 13,
                                }}
                            >
                                <div
                                    style={{
                                        width: 88,
                                        flexShrink: 0,
                                        color: 'var(--mist)',
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        fontSize: 12,
                                    }}
                                >
                                    {bar.label}
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        height: 8,
                                        borderRadius: 6,
                                        background: 'rgba(255,255,255,0.06)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={isInView ? { width: `${bar.pct}%` } : {}}
                                        transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                                        style={{
                                            height: '100%',
                                            borderRadius: 6,
                                            background:
                                                'linear-gradient(90deg, var(--ingest), var(--refine))',
                                        }}
                                    />
                                </div>
                                <div
                                    style={{
                                        width: 38,
                                        textAlign: 'right',
                                        color: 'var(--mist-dim)',
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        fontSize: 12,
                                    }}
                                >
                                    {bar.pct}%
                                </div>
                            </div>
                        ))}

                        {/* Recommendations */}
                        <div
                            style={{
                                marginTop: 22,
                                paddingTop: 18,
                                borderTop: '1px solid var(--line-soft)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 11,
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: 10.5,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    color: 'var(--mist-dim)',
                                    marginBottom: 8,
                                }}
                            >
                                AI recommendations
                            </div>
                            {recommendations.map((rec: string, i: number) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        gap: 10,
                                        fontSize: 13.5,
                                        color: 'var(--paper)',
                                        alignItems: 'flex-start',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    <span
                                        style={{
                                            color: 'var(--signal)',
                                            flexShrink: 0,
                                            fontWeight: 600,
                                        }}
                                    >
                                        ✓
                                    </span>
                                    {rec}
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            <style>{`
        @media (max-width: 900px) {
          .insights-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
        </section>
    )
}