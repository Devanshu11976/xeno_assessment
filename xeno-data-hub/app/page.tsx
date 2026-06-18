'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/shared/Navbar'
import Hero from '@/components/landing/Hero'
import Pipeline from '@/components/landing/Pipeline'
import Architecture from '@/components/landing/Architecture'
import RuleEngine from '@/components/landing/RuleEngine'
import Insights from '@/components/landing/Insights'
import Metrics from '@/components/landing/Metrics'
import CTA from '@/components/landing/CTA'
import CustomCursor from '@/components/shared/CustomCursor'

/* ─── Problem Statement ─── */
const PROBLEM_ITEMS = [
  {
    num: '01',
    label: 'Phone numbers',
    text: (
      <>
        {' '}are formatted differently in every export, and most validators only know
        one country.
      </>
    ),
  },
  {
    num: '02',
    label: 'Payment fields',
    text: (
      <>
        {' '}drift silently between gateways — currency, status, and ID formats all
        shift without warning.
      </>
    ),
  },
  {
    num: '03',
    label: 'Date formats',
    text: (
      <>
        {' '}mix inside the same file. One ambiguous row can break an entire
        reconciliation run.
      </>
    ),
  },
]

/* ─── Industry cards ─── */
const INDUSTRY_CARDS: {
  label: string
  validating: string[]
}[] = [
  {
    label: 'Fintech Operations',
    validating: ['Transactions', 'Payment Modes', 'Settlement IDs'],
  },
  {
    label: 'Retail & Commerce',
    validating: ['Orders', 'Products', 'Inventory Records'],
  },
  {
    label: 'Logistics',
    validating: ['Shipments', 'Tracking IDs', 'Delivery Events'],
  },
  {
    label: 'Healthcare Billing',
    validating: ['Claims', 'Invoice Dates', 'Patient Records'],
  },
  {
    label: 'Marketplaces',
    validating: ['Sellers', 'Payouts', 'Order History'],
  },
]


/* ─────────────────────────────────────────
   SpotlightLabel  — cursor-reactive radial glow
   ───────────────────────────────────────── */
function SpotlightLabel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [hovered, setHovered] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const targetPos = useRef({ x: 0, y: 0 })
  const animPos = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  const tick = useCallback(() => {
    animPos.current.x = lerp(animPos.current.x, targetPos.current.x, 0.14)
    animPos.current.y = lerp(animPos.current.y, targetPos.current.y, 0.14)
    setPos({ x: animPos.current.x, y: animPos.current.y })
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const onMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    targetPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onEnter = () => {
    setHovered(true)
    rafRef.current = requestAnimationFrame(tick)
  }

  const onLeave = () => {
    setHovered(false)
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
  }

  // Cancel RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <span
      ref={ref}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseMove={onMove}
      style={{ position: 'relative', display: 'inline', color: 'var(--paper)', fontWeight: 600 }}
    >
      {children}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-14px -18px',
          borderRadius: 10,
          pointerEvents: 'none',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
          background: `radial-gradient(ellipse 100px 70px at ${pos.x}px ${pos.y}px, rgba(76,141,255,0.20) 0%, rgba(155,107,255,0.11) 55%, transparent 80%)`,
          willChange: 'background',
        }}
      />
    </span>
  )
}

/* ─────────────────────────────────────────
   ScanRow  — validation scan line on hover
   ───────────────────────────────────────── */
function ScanRow({
  num,
  label,
  body,
  borderTop,
}: {
  num: string
  label: React.ReactNode
  body: React.ReactNode
  borderTop: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        paddingBlock: 22,
        borderTop: borderTop ? '1px solid var(--line-soft)' : 'none',
        display: 'flex',
        gap: 18,
      }}
    >
      {/* Scan line */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            aria-hidden
            key="scan"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.82, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '100%',
              background:
                'linear-gradient(90deg, rgba(76,141,255,0.07) 0%, rgba(155,107,255,0.07) 60%, transparent 100%)',
              pointerEvents: 'none',
              willChange: 'transform',
            }}
          />
        )}
      </AnimatePresence>

      {/* Thin top border scan line */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            aria-hidden
            key="line"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background:
                'linear-gradient(90deg, rgba(76,141,255,0.5) 0%, rgba(155,107,255,0.5) 60%, transparent 100%)',
              pointerEvents: 'none',
              willChange: 'transform',
            }}
          />
        )}
      </AnimatePresence>

      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--mist-dim)',
          fontSize: 13,
          paddingTop: 3,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {num}
      </div>
      <p
        style={{
          color: 'var(--mist)',
          fontSize: 15,
          lineHeight: 1.65,
          position: 'relative',
        }}
      >
        <SpotlightLabel>{label}</SpotlightLabel>
        {body}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────
   IndustryCard  — glassmorphism + preview
   ───────────────────────────────────────── */
function IndustryCard({ card }: { card: (typeof INDUSTRY_CARDS)[number] }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      style={{
        position: 'relative',
        padding: '18px 22px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        cursor: 'default',
        boxShadow: hovered
          ? '0 8px 32px rgba(76,141,255,0.12), 0 0 0 1px rgba(155,107,255,0.18)'
          : '0 4px 16px rgba(0,0,0,0.25)',
        transition: 'box-shadow 0.3s ease, background 0.3s ease, border-color 0.3s ease',
        borderColor: hovered ? 'rgba(155,107,255,0.28)' : 'rgba(255,255,255,0.07)',
        backgroundColor: hovered ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.03)',
        minWidth: 160,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(13px, 1.3vw, 15px)',
          color: 'var(--mist)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        {card.label}
      </div>

      {/* Dynamic preview on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              background: 'rgba(14,15,20,0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(155,107,255,0.18)',
              borderRadius: 10,
              padding: '14px 18px',
              minWidth: 180,
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10.5,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--refine)',
                marginBottom: 10,
              }}
            >
              Validating
            </div>
            {card.validating.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.065, duration: 0.2, ease: 'easeOut' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: i < card.validating.length - 1 ? 7 : 0,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4c8dff, #9b6bff)',
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: 'var(--mist)',
                  }}
                >
                  {item}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─────────────────────────────────────────
   ProblemSection
   ───────────────────────────────────────── */
function ProblemSection() {
  return (
    <section
      id="problem"
      style={{
        position: 'relative',
        zIndex: 2,
        paddingBlock: 'clamp(80px, 12vw, 160px)',
        borderTop: '1px solid var(--line-soft)',
        borderBottom: '1px solid var(--line-soft)',
      }}
    >
      <div
        className="problem-grid"
        style={{
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          paddingInline: 32,
          display: 'grid',
          gridTemplateColumns: '0.9fr 1.1fr',
          gap: 64,
        }}
      >
        {/* Left */}
        <div>
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
            The problem
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
            Transaction data breaks in ways spreadsheets don't show you.
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
            It looks fine until finance reconciles it, support escalates it, or
            a regulator asks for it.
          </p>
        </div>

        {/* Right — scan rows */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          {PROBLEM_ITEMS.map((item, i) => (
            <ScanRow
              key={item.num}
              num={item.num}
              label={item.label}
              body={item.text}
              borderTop={i !== 0}
            />
          ))}
        </div>
      </div>

      {/* Trust strip — industry glass cards */}
      <div
        style={{
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          paddingInline: 32,
          marginTop: 72,
          paddingTop: 40,
          borderTop: '1px solid var(--line-soft)',
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--mist-dim)',
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Built for teams that can't afford to guess
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(10px, 2vw, 20px)',
            flexWrap: 'wrap',
          }}
        >
          {INDUSTRY_CARDS.map((card) => (
            <IndustryCard key={card.label} card={card} />
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .problem-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </section>
  )
}


/* ─────────────────────────────────────────
   Footer
   ───────────────────────────────────────── */

function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--line-soft)',
        padding: '48px 0',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          paddingInline: 32,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: 'var(--mist-dim)',
          }}
        >
          © 2026 Sanmati Jain · Xeno Data Intelligence Hub
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 13.5, color: 'var(--mist-dim)' }}>
          {['Privacy', 'Terms', 'Status', 'Docs'].map((link) => (
            <a
              key={link}
              href="#"
              style={{ transition: 'color 0.2s' }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.color = 'var(--mist)')
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.color = 'var(--mist-dim)')
              }
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default function Page() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  const [stats, setStats] = useState<{
    active_jobs: number
    country_rule_count: number
    processed_records: number
    avg_quality_score: number
  } | null>(null)
  const [heroJobs, setHeroJobs] = useState<Array<{
    status: string
    total_records: number | null
    valid_records: number | null
  }>>([])

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/stats`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/jobs`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, j]) => {
      if (s) setStats(s)
      if (j) setHeroJobs(j)
    })
  }, [API_BASE])

  const [rules, setRules] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [latestJobDetails, setLatestJobDetails] = useState<any | null>(null)
  const [latestJobReport, setLatestJobReport] = useState<any | null>(null)

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/rules`)
      if (res.ok) {
        setRules(await res.json())
      }
    } catch (e) {
      console.error('Failed to fetch rules', e)
    }
  }, [])

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs`)
      if (res.ok) {
        const jobsData = await res.json()
        setJobs(jobsData)
        
        // Find latest completed job
        const completed = jobsData.find((j: any) => j.status === 'completed')
        if (completed) {
          const [detailsRes, reportRes] = await Promise.all([
            fetch(`${API_BASE}/api/jobs/${completed.job_id}`),
            fetch(`${API_BASE}/api/jobs/${completed.job_id}/report`)
          ])
          if (detailsRes.ok) {
            setLatestJobDetails(await detailsRes.json())
          }
          if (reportRes.ok) {
            setLatestJobReport(await reportRes.json())
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch jobs', e)
    }
  }, [])

  const toggleRule = useCallback(async (ruleId: string, is_active: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      })
      if (res.ok) {
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, is_active } : r))
        )
      }
    } catch (e) {
      console.error('Failed to toggle rule', e)
    }
  }, [])

  useEffect(() => {
    fetchRules()
    fetchJobs()
  }, [fetchRules, fetchJobs])

  /* Mouse spotlight */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100
      const y = (e.clientY / window.innerHeight) * 100
      document.documentElement.style.setProperty('--mx', x + '%')
      document.documentElement.style.setProperty('--my', y + '%')
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  /* Drag prevention on window */
  useEffect(() => {
    const prev = (e: Event) => e.preventDefault()
    window.addEventListener('dragover', prev)
    window.addEventListener('drop', prev)
    return () => {
      window.removeEventListener('dragover', prev)
      window.removeEventListener('drop', prev)
    }
  }, [])

  return (
    <>
      <CustomCursor />
      {/* Fixed background layers */}
      <div className="bg-grid" />
      <div
        className="spotlight"
        style={{
          background: `radial-gradient(600px circle at var(--mx) var(--my), rgba(155,107,255,0.10), transparent 60%)`,
        }}
      />

      <Navbar />

      <main>
        <Hero
          rulesCount={stats?.country_rule_count ?? 0}
          jobs={heroJobs}
        />
        <ProblemSection />
        <Pipeline />
        <Architecture />
        <RuleEngine rules={rules} onToggleRule={toggleRule} />
        <Insights latestJob={latestJobDetails} latestReport={latestJobReport} />
        <Metrics jobs={jobs} />
        <CTA />
      </main>

      <Footer />
    </>
  )
}