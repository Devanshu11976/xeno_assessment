'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { apiFetch } from '@/lib/api'
import { motionDuration, cssDuration } from '@/lib/motion'

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

function PulseRing({ delay, dragActive }: { delay: number; dragActive: boolean }) {
    const ringColor = dragActive
        ? 'rgba(245,176,66,0.55)'
        : 'rgba(155,107,255,0.55)'
    const duration = dragActive ? cssDuration(2.8) : cssDuration(5.5)

    return (
        <div
            aria-hidden
            className="pulse-ring"
            style={{
                position: 'absolute',
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: `1px solid ${ringColor}`,
                opacity: 0,
                pointerEvents: 'none',
                transform: 'translate(-50%, -50%) scale(0.7)',
                animation: `pulse-ring-cycle ${duration}s ease-out ${delay}s infinite`,
                ['--pulse-glow-r' as string]: dragActive ? '245' : '155',
                ['--pulse-glow-g' as string]: dragActive ? '176' : '107',
                ['--pulse-glow-b' as string]: dragActive ? '66' : '255',
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
        if (!ext || !['csv', 'xlsx'].includes(ext)) {
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

            const res = await apiFetch('/api/upload', {
                method: 'POST',
                body: form,
            })

            if (!res) {
                throw new Error('No response from server')
            }
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

        } catch (err: unknown) {
            setUploadState('error')
            setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
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
                        <g style={{ transformOrigin: '12px 12px', animation: `portal-spin ${cssDuration(1.6)}s linear infinite` }}>
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

            <div
                aria-live="polite"
                aria-atomic="true"
                style={{
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
                        transition={{ duration: motionDuration(2), repeat: Infinity, ease: 'easeInOut' }}
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
                @keyframes pulse-ring-cycle {
                    0%   { transform: translate(-50%, -50%) scale(0.7); opacity: 0; box-shadow: 0 0 0px rgba(var(--pulse-glow-r), var(--pulse-glow-g), var(--pulse-glow-b), 0); }
                    14%  { opacity: 0.55; box-shadow: 0 0 14px rgba(var(--pulse-glow-r), var(--pulse-glow-g), var(--pulse-glow-b), 0.22); }
                    55%  { transform: translate(-50%, -50%) scale(1.8); opacity: 0.35; box-shadow: 0 0 10px rgba(var(--pulse-glow-r), var(--pulse-glow-g), var(--pulse-glow-b), 0.18); }
                    100% { transform: translate(-50%, -50%) scale(0.05); opacity: 0; box-shadow: 0 0 0px rgba(var(--pulse-glow-r), var(--pulse-glow-g), var(--pulse-glow-b), 0); }
                }
            `}</style>
        </div>
    )
}
