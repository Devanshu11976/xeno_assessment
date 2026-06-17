'use client'

import { useEffect } from 'react'
import Navbar from '@/components/shared/Navbar'
import Hero from '@/components/landing/Hero'
import Pipeline from '@/components/landing/Pipeline'
import Architecture from '@/components/landing/Architecture'
import RuleEngine from '@/components/landing/RuleEngine'
import Insights from '@/components/landing/Insights'
import Metrics from '@/components/landing/Metrics'
import CTA from '@/components/landing/CTA'
import CustomCursor from '@/components/shared/CustomCursor'

/* ─── Problem Statement (inline, not a named component in the spec) ─── */
const PROBLEM_ITEMS = [
  {
    num: '01',
    text: (
      <>
        <strong style={{ color: 'var(--paper)', fontWeight: 600 }}>
          Phone numbers
        </strong>{' '}
        are formatted differently in every export, and most validators only know
        one country.
      </>
    ),
  },
  {
    num: '02',
    text: (
      <>
        <strong style={{ color: 'var(--paper)', fontWeight: 600 }}>
          Payment fields
        </strong>{' '}
        drift silently between gateways — currency, status, and ID formats all
        shift without warning.
      </>
    ),
  },
  {
    num: '03',
    text: (
      <>
        <strong style={{ color: 'var(--paper)', fontWeight: 600 }}>
          Date formats
        </strong>{' '}
        mix inside the same file. One ambiguous row can break an entire
        reconciliation run.
      </>
    ),
  },
]

const TRUST_LABELS = [
  'Fintech Operations',
  'Retail & Commerce',
  'Logistics',
  'Healthcare Billing',
  'Marketplaces',
]

const STACK_PILLS = [
  'Litestar',
  'msgspec',
  'Polars',
  'Pandera',
  'PostgreSQL',
  'Redis',
  'Groq API',
]

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

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          {PROBLEM_ITEMS.map((item, i) => (
            <div
              key={item.num}
              style={{
                paddingBlock: 22,
                borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                display: 'flex',
                gap: 18,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: 'var(--mist-dim)',
                  fontSize: 13,
                  paddingTop: 3,
                  flexShrink: 0,
                }}
              >
                {item.num}
              </div>
              <p
                style={{
                  color: 'var(--mist)',
                  fontSize: 15,
                  lineHeight: 1.65,
                }}
              >
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust strip */}
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
            gap: 'clamp(28px, 5vw, 64px)',
            flexWrap: 'wrap',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(15px, 1.6vw, 19px)',
            color: 'var(--mist)',
            fontWeight: 500,
          }}
        >
          {TRUST_LABELS.map((label) => (
            <span key={label} style={{ opacity: 0.85 }}>
              {label}
            </span>
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

function StackSection() {
  return (
    <section
      style={{
        position: 'relative',
        zIndex: 2,
        paddingBlock: 64,
        borderTop: '1px solid var(--line-soft)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          paddingInline: 32,
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
          Engineered on
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          {STACK_PILLS.map((pill) => (
            <span
              key={pill}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: 'var(--mist)',
                padding: '9px 16px',
                border: '1px solid var(--line)',
                borderRadius: 100,
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              {pill}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

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
          © 2026 Xeno Data Intelligence Hub
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
        <Hero />
        <ProblemSection />
        <Pipeline />
        <Architecture />
        <StackSection />
        <RuleEngine />
        <Insights />
        <Metrics />
        <CTA />
      </main>

      <Footer />
    </>
  )
}