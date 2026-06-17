'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface UploadPortalProps {
    onIntensityChange?: (intensity: number) => void
}

type UploadState = 'idle' | 'uploading' | 'queued' | 'error'

const STATE_MESSAGES: Record<UploadState, string> = {
    idle: '',
    uploading: '⬆ Uploading…',
    queued: '✓ Queued — redirecting…',
    error: '✗ Upload failed',
}

export default function UploadPortal({ onIntensityChange }: UploadPortalProps) {
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
            // Send default 'IN' country code as parameter (backend fallback)
            form.append('country_code', 'IN')

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
    const statusColor = uploadState === 'error' ? '#f87171' : '#2dd4bf'
    const displayMsg = uploadState === 'error' ? `✗ ${errorMsg}` : STATE_MESSAGES[uploadState]

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label="Upload a CSV or XLSX file to validate"
            aria-disabled={busy}
            className={isDragActive ? 'drag-active' : ''}
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
                maxWidth: 340,
                padding: '36px 26px',
                borderRadius: 24,
                border: isDragActive
                    ? '1.5px solid #2dd4bf'
                    : uploadState === 'error'
                        ? '1.5px solid #f87171'
                        : '1.5px dashed rgba(255,255,255,0.15)',
                background: isDragActive
                    ? 'rgba(45, 212, 191, 0.05)'
                    : 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(24px) saturate(170%)',
                textAlign: 'center',
                cursor: busy ? 'wait' : 'pointer',
                transition: 'border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease',
                boxShadow: isDragActive
                    ? '0 0 60px rgba(45, 212, 191, 0.25), inset 0 0 30px rgba(45, 212, 191, 0.05)'
                    : '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                transform: isDragActive ? 'translateY(-2px) scale(1.02)' : 'none',
            }}
        >
            {/* Upload icon */}
            <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="upload-ring" />
                <div className="upload-ring" />
                <div className="upload-ring" />
                {uploadState === 'uploading' ? (
                    <svg style={{ width: 28, height: 28, color: '#2dd4bf', position: 'relative', zIndex: 2, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                    </svg>
                ) : (
                    <svg style={{ width: 28, height: 28, color: isDragActive ? '#2dd4bf' : 'rgba(255,255,255,0.6)', position: 'relative', zIndex: 2, transition: 'color 0.3s ease' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M12 16V4M12 4L7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>

            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: '#fff' }}>
                Drop a CSV or XLSX
            </p>
            <p style={{ marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                or click to browse
            </p>

            <p style={{ marginTop: 12, fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, padding: '0 8px' }}>
                The system automatically discovers country-specific validation rules, validates records, and generates AI-powered quality insights.
            </p>

            {/* Visual System Status */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 8, 
                marginTop: 18, 
                fontSize: 11, 
                fontFamily: "'IBM Plex Mono', monospace", 
                color: '#2dd4bf' 
            }}>
                <span className="status-dot" style={{ 
                    width: 7, 
                    height: 7, 
                    borderRadius: '50%', 
                    background: '#2dd4bf', 
                    boxShadow: '0 0 8px #2dd4bf',
                }} />
                Dynamic Rule Engine Active
            </div>

            {/* Dynamic Rule Engine Messaging */}
            <div style={{ 
                marginTop: 20, 
                borderTop: '1px solid rgba(255,255,255,0.08)', 
                paddingTop: 16, 
                textAlign: 'left', 
                fontSize: 11.5, 
                color: 'rgba(255,255,255,0.6)' 
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ color: '#2dd4bf', fontWeight: 'bold' }}>✓</span> Auto Country Detection
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ color: '#2dd4bf', fontWeight: 'bold' }}>✓</span> Dynamic Rule Engine
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ color: '#2dd4bf', fontWeight: 'bold' }}>✓</span> AI Quality Analysis
                </div>
                <div style={{ 
                    fontFamily: "'IBM Plex Mono', monospace", 
                    fontSize: 10.5, 
                    background: 'rgba(45, 212, 191, 0.08)', 
                    color: '#2dd4bf', 
                    padding: '5px 10px', 
                    borderRadius: 6, 
                    display: 'inline-block',
                    border: '1px solid rgba(45, 212, 191, 0.25)',
                    fontWeight: 500
                }}>
                    190+ Validation Rules Loaded
                </div>
            </div>

            {/* Live Capability Chips */}
            <div style={{ 
                marginTop: 20, 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                gap: 6 
            }} onClick={e => e.stopPropagation()}>
                {[
                    "Auto Detect Countries",
                    "AI Validation",
                    "Error Reports",
                    "Chunk Generation",
                    "Streaming Processing"
                ].map(chip => (
                    <span key={chip} style={{ 
                        fontFamily: "'IBM Plex Mono', monospace", 
                        fontSize: 9, 
                        color: 'rgba(255,255,255,0.45)', 
                        padding: '3px 8px', 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.06)', 
                        borderRadius: 5,
                        letterSpacing: '0.01em'
                    }}>
                        [ {chip} ]
                    </span>
                ))}
            </div>

            {/* File Format & Status message */}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
                {['.csv', '.xlsx'].map(fmt => (
                    <span key={fmt} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '2px 6px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4 }}>
                        {fmt}
                    </span>
                ))}
            </div>

            {/* Status message */}
            <div style={{ marginTop: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: statusColor, minHeight: 16, opacity: displayMsg ? 1 : 0, transition: 'opacity 0.3s ease', lineHeight: 1.4 }}>
                {displayMsg}
            </div>

            {/* Architecture Hint */}
            <p style={{ marginTop: 18, fontSize: 9.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4, textAlign: 'center' }}>
                Validation rules are automatically loaded based on country codes found in your dataset. No manual configuration required.
            </p>

            <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files)}
            />

            <style>{`
                .upload-ring {
                    position: absolute; inset: 0; border-radius: 50%;
                    border: 1px solid rgba(45, 212, 191, 0.35);
                    opacity: 0; pointer-events: none;
                    animation: upload-pulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite;
                    transition: border-color 0.3s ease;
                }
                .drag-active .upload-ring { border-color: #2dd4bf; animation-duration: 1.5s; }
                .upload-ring:nth-child(1) { animation-delay: 0s; }
                .upload-ring:nth-child(2) { animation-delay: 1s; }
                .upload-ring:nth-child(3) { animation-delay: 2s; }
                @keyframes upload-pulse {
                    0% { transform: scale(0.7); opacity: 0; }
                    15% { opacity: 0.5; }
                    100% { transform: scale(2.0); opacity: 0; }
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                .status-dot {
                    animation: dot-pulse 1.8s ease-in-out infinite;
                }
                @keyframes dot-pulse {
                    0% { opacity: 0.4; transform: scale(0.9); }
                    50% { opacity: 1; transform: scale(1.1); }
                    100% { opacity: 0.4; transform: scale(0.9); }
                }
            `}</style>
        </div>
    )
}
