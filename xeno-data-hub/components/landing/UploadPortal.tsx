'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface UploadPortalProps {
    onIntensityChange?: (intensity: number) => void
    rulesCount?: number
}

type UploadState = 'idle' | 'uploading' | 'queued' | 'error'

const STATE_MESSAGES: Record<UploadState, string> = {
    idle: '',
    uploading: '⬆ Uploading…',
    queued: '✓ Queued — redirecting…',
    error: '✗ Upload failed',
}

/* ─────────────────────────────────────────
   PulseRing — one ring, fully self-contained lifecycle
   Phase 1 (0 → 55%):  expand  0.7 → 1.8,  opacity 0 → 0.55 → 0.35
   Phase 2 (55 → 100%): collapse 1.8 → 0.05, opacity 0.35 → 0
   Result: energy absorbed back into the core, never just disappears
   ───────────────────────────────────────── */
function PulseRing({ delay, dragActive }: { delay: number; dragActive: boolean }) {
    const ref = useRef<HTMLDivElement>(null)

    const ringColor = dragActive
        ? 'rgba(245,176,66,0.55)'
        : 'rgba(155,107,255,0.55)'
    const glowColor = dragActive
        ? 'rgba(245,176,66,0.22)'
        : 'rgba(155,107,255,0.22)'
    const duration = dragActive ? 1.8 : 3.5

    useEffect(() => {
        const el = ref.current
        if (!el) return

        let cancelled = false

        const runCycle = async () => {
            if (cancelled || !ref.current) return
            const el = ref.current

            // Reset to start state immediately (no visible jump — opacity is 0)
            el.style.transform = 'translate(-50%, -50%) scale(0.7)'
            el.style.opacity = '0'
            el.style.boxShadow = `0 0 0px ${glowColor.replace('0.22', '0')}`

            await new Promise(r => setTimeout(r, delay * 1000))
            if (cancelled) return

            // ── Phase 1: Expand out ──
            // scale 0.7 → 1.8, opacity 0 → 0.55 → 0.35, glow brightens
            const expandDur = duration * 0.55 * 1000

            const startTime = performance.now()
            await new Promise<void>(resolve => {
                const tick = (now: number) => {
                    if (cancelled) return resolve()
                    const t = Math.min(1, (now - startTime) / expandDur)
                    const ease = 1 - Math.pow(1 - t, 2.8) // ease-out cubic-ish

                    const scale = 0.7 + ease * (1.8 - 0.7)
                    // opacity arc: rises to 0.55 then falls to 0.35 across phase 1
                    const opArc = t < 0.25
                        ? t / 0.25                          // 0 → 1 (normalized)
                        : 1 - ((t - 0.25) / 0.75) * 0.36   // 1 → 0.64 (normalized)
                    const opacity = opArc * 0.55

                    const glowStr = ease * 14
                    const glowAlpha = ease * 0.22

                    if (ref.current) {
                        ref.current.style.transform = `translate(-50%, -50%) scale(${scale})`
                        ref.current.style.opacity = String(opacity)
                        ref.current.style.boxShadow = `0 0 ${glowStr.toFixed(1)}px rgba(155,107,255,${glowAlpha.toFixed(3)})`
                    }

                    if (t < 1) requestAnimationFrame(tick)
                    else resolve()
                }
                requestAnimationFrame(tick)
            })

            if (cancelled) return

            // ── Phase 2: Collapse back to core ──
            // scale 1.8 → 0.05, opacity 0.35 → 0, glow fades
            const collapseDur = duration * 0.45 * 1000
            const collapseStart = performance.now()

            await new Promise<void>(resolve => {
                const tick = (now: number) => {
                    if (cancelled) return resolve()
                    const t = Math.min(1, (now - collapseStart) / collapseDur)
                    // accelerate inward — ease-in quad
                    const ease = t * t

                    const scale = 1.8 - ease * (1.8 - 0.05)
                    const opacity = (1 - ease) * 0.35
                    const glowStr = (1 - ease) * 10
                    const glowAlpha = (1 - ease) * 0.18

                    if (ref.current) {
                        ref.current.style.transform = `translate(-50%, -50%) scale(${scale})`
                        ref.current.style.opacity = String(opacity)
                        ref.current.style.boxShadow = `0 0 ${glowStr.toFixed(1)}px rgba(155,107,255,${glowAlpha.toFixed(3)})`
                    }

                    if (t < 1) requestAnimationFrame(tick)
                    else resolve()
                }
                requestAnimationFrame(tick)
            })

            if (cancelled) return

            // Fully invisible before looping
            if (ref.current) {
                ref.current.style.opacity = '0'
                ref.current.style.transform = 'translate(-50%, -50%) scale(0.05)'
            }

            // Loop — no delay on subsequent cycles (stagger only on first)
            runCycle()
        }

        runCycle()

        return () => { cancelled = true }
    // Re-run if drag state changes (different color/speed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dragActive])

    return (
        <div
            ref={ref}
            aria-hidden
            style={{
                position: 'absolute',
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: `1px solid ${ringColor}`,
                opacity: 0,
                pointerEvents: 'none',
                willChange: 'transform, opacity',
                transform: 'translate(-50%, -50%) scale(0.7)',
            }}
        />
    )
}

export default function UploadPortal({ onIntensityChange, rulesCount = 0 }: UploadPortalProps) {
    const router = useRouter()
    const [isDragActive, setIsDragActive] = useState(false)
    const [uploadState, setUploadState] = useState<UploadState>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const dragDepth = useRef(0)

    const uploadFile = useCallback(async (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
            setUploadState('error')
            setErrorMsg('Only .csv and .xlsx files are accepted')
            onIntensityChange?.(0)
            return
        }

        setUploadState('uploading')
        setErrorMsg('')
        onIntensityChange?.(1)

        try {
            const form = new FormData()
            form.append('file', file)
            form.append('country_code', 'AUTO')

            const res = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                body: form,
            })

            if (!res.ok) {
                const body = await res.text()
                throw new Error(body || `Server error ${res.status}`)
            }

            const data: { job_id: string; status: string } = await res.json()
            setUploadState('queued')
            onIntensityChange?.(0.4)

            setTimeout(() => {
                onIntensityChange?.(0)
                router.push(`/workspace?job_id=${data.job_id}`)
            }, 900)

        } catch (err: any) {
            setUploadState('error')
            setErrorMsg(err?.message ?? 'Unknown error')
            onIntensityChange?.(0)
        }
    }, [onIntensityChange, router])

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files?.length) return
        setIsDragActive(false)
        uploadFile(files[0])
    }, [uploadFile])

    const onDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        dragDepth.current++
        setIsDragActive(true)
        onIntensityChange?.(0.6)
    }
    const onDragOver = (e: React.DragEvent) => { e.preventDefault() }
    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) {
            setIsDragActive(false)
            if (uploadState === 'idle') onIntensityChange?.(0)
        }
    }
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        dragDepth.current = 0
        handleFiles(e.dataTransfer.files)
    }
    const onClick = () => { if (uploadState === 'idle' || uploadState === 'error') inputRef.current?.click() }
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() }
    }

    const busy = uploadState === 'uploading' || uploadState === 'queued'
    const statusColor = uploadState === 'error' ? '#f87171' : 'var(--signal)'
    const displayMsg = uploadState === 'error' ? `✗ ${errorMsg}` : STATE_MESSAGES[uploadState]

    return (
        <div
            role="button"
            tabIndex={0}
            id="upload-portal-dropzone"
            aria-label="Upload a CSV or XLSX file to validate"
            aria-disabled={busy}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={onClick}
            onKeyDown={onKeyDown}
            style={{
                position: 'relative',
                zIndex: 3,
                width: '100%',
                maxWidth: 300,
                padding: '28px 24px 22px',
                borderRadius: 20,
                border: isDragActive
                    ? '1.5px solid var(--signal)'
                    : uploadState === 'error'
                        ? '1.5px solid #f87171'
                        : '1.5px dashed rgba(255,255,255,0.18)',
                background: isDragActive
                    ? 'rgba(245,176,66,0.07)'
                    : 'rgba(255,255,255,0.035)',
                backdropFilter: 'blur(20px) saturate(160%)',
                textAlign: 'center',
                cursor: busy ? 'wait' : 'pointer',
                transition: 'border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease',
                boxShadow: isDragActive
                    ? '0 0 60px rgba(245,176,66,0.2), inset 0 0 30px rgba(245,176,66,0.06)'
                    : 'none',
                transform: isDragActive ? 'translateY(-2px) scale(1.03)' : 'none',
                overflow: 'visible',
            }}
        >
            {/* Ring anchor — zero-size, centered on the icon, rings expand freely */}
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    top: 'calc(28px + 28px)', /* card padding-top + half icon height */
                    left: '50%',
                    width: 0,
                    height: 0,
                    overflow: 'visible',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            >
                <PulseRing delay={0}    dragActive={isDragActive} />
                <PulseRing delay={1.15} dragActive={isDragActive} />
                <PulseRing delay={2.3}  dragActive={isDragActive} />
            </div>

            {/* Upload icon */}
            <div style={{
                position: 'relative',
                width: 56, height: 56,
                margin: '0 auto 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
            }}>
                {uploadState === 'uploading' ? (
                    <svg
                        style={{ width: 24, height: 24, color: 'var(--signal)', position: 'relative', zIndex: 2 }}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                    >
                        <g style={{ transformOrigin: '12px 12px', animation: 'portal-spin 1s linear infinite' }}>
                            <path
                                d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                                strokeLinecap="round"
                            />
                        </g>
                    </svg>
                ) : (
                    <svg
                        style={{ width: 24, height: 24, color: isDragActive ? 'var(--signal)' : 'var(--refine)', position: 'relative', zIndex: 2, transition: 'color 0.3s ease' }}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                    >
                        <path d="M12 16V4M12 4L7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>

            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15 }}>
                Drop a CSV or XLSX
            </p>
            <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--mist-dim)', lineHeight: 1.4 }}>
                Auto-detects countries and validates with AI-powered rules.
            </p>

            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 8 }}>
                {['.csv', '.xlsx'].map(fmt => (
                    <span key={fmt} style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10.5,
                        color: 'var(--mist-dim)',
                        padding: '3px 8px',
                        border: '1px solid var(--line)',
                        borderRadius: 5,
                    }}>
                        {fmt}
                    </span>
                ))}
            </div>

            <div style={{
                marginTop: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11.5,
                color: statusColor,
                minHeight: 16,
                opacity: displayMsg ? 1 : 0,
                transition: 'opacity 0.3s ease',
                lineHeight: 1.4,
            }}>
                {displayMsg}
            </div>

            <div style={{
                marginTop: 10,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                color: 'rgba(255,255,255,0.35)',
            }} onClick={e => e.stopPropagation()}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#2dd4bf' }}>
                    <motion.span
                        style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: '#2dd4bf', boxShadow: '0 0 6px #2dd4bf',
                            flexShrink: 0, display: 'inline-block',
                        }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    Rule Engine Active
                </span>
                <span>{rulesCount > 0 ? `${rulesCount} rules` : '190+ rules'}</span>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files)}
            />

            <style>{`
                @keyframes portal-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
