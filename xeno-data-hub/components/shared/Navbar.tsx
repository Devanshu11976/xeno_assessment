'use client'

const DEMO_EMAIL = 'sanmatijain2204@gmail.com'

export default function Navbar() {
    return (
        <nav
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px clamp(20px, 4vw, 48px)',
                background: 'rgba(10,11,14,0.55)',
                backdropFilter: 'blur(16px) saturate(140%)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            {/* Logo */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                }}
            >
                <span
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--ingest), var(--signal))',
                        boxShadow: '0 0 12px rgba(245,176,66,0.6)',
                        display: 'inline-block',
                        flexShrink: 0,
                    }}
                />
                XENO{' '}
                <span
                    className="logo-subtext"
                    style={{ color: 'var(--mist)', fontWeight: 400 }}
                >
                    / Data Intelligence Hub
                </span>
            </div>

            {/* Nav links */}
            <div
                className="nav-links-desktop"
                style={{
                    display: 'flex',
                    gap: 36,
                    fontSize: 14,
                    color: 'var(--mist)',
                }}
            >
                {(['Pipeline', 'Architecture', 'Rules', 'Insights'] as const).map(
                    (link) => (
                        <a
                            key={link}
                            href={`#${link.toLowerCase()}`}
                            style={{ transition: 'color 0.2s' }}
                            onMouseEnter={(e) =>
                                ((e.target as HTMLElement).style.color = 'var(--paper)')
                            }
                            onMouseLeave={(e) =>
                                ((e.target as HTMLElement).style.color = 'var(--mist)')
                            }
                        >
                            {link}
                        </a>
                    )
                )}
            </div>

            {/* Book a demo → mailto */}
            <a
                href={`mailto:${DEMO_EMAIL}?subject=Xeno%20Data%20Intelligence%20Hub%20Demo%20Request`}
                aria-label="Book a demo — send us an email"
                style={{
                    fontSize: 13.5,
                    fontWeight: 500,
                    padding: '9px 18px',
                    borderRadius: 8,
                    background:
                        'linear-gradient(135deg, rgba(76,141,255,0.18), rgba(155,107,255,0.18))',
                    border: '1px solid rgba(255,255,255,0.14)',
                    transition: 'border-color 0.2s',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor =
                        'rgba(255,255,255,0.3)')
                }
                onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor =
                        'rgba(255,255,255,0.14)')
                }
            >
                Book a demo
            </a>

            <style>{`
        @media (max-width: 860px) {
          .nav-links-desktop { display: none !important; }
        }
        @media (max-width: 640px) {
          .logo-subtext { display: none !important; }
        }
      `}</style>
        </nav>
    )
}
