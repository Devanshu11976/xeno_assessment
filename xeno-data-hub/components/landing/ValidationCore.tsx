'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface ValidationCoreProps {
    intensity?: number
}

export default function ValidationCore({ intensity = 0 }: ValidationCoreProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const intensityRef = useRef(intensity)

    useEffect(() => {
        intensityRef.current = intensity
    }, [intensity])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        let animId: number
        let renderer: any, scene: any, camera: any, points: any
        let geometry: any, material: any
        let grid: Float32Array
        let noisePhase: Float32Array
        let baseX: Float32Array
        let baseY: Float32Array
        let baseZ: Float32Array
        let speed: Float32Array

        let orderFactor = 0
        let targetOrder = 0
        let mouseX = 0, mouseY = 0
        let t0 = performance.now()
        let disposed = false

        const waitForDimensions = (): Promise<{ w: number; h: number }> => {
            return new Promise((resolve) => {
                const check = () => {
                    if (disposed) return
                    const rect = canvas.getBoundingClientRect()
                    if (rect.width > 10 && rect.height > 10) {
                        resolve({ w: rect.width, h: rect.height })
                    } else {
                        // Fallback to parent or window
                        const parent = canvas.parentElement
                        const parentRect = parent?.getBoundingClientRect()
                        if (parentRect && parentRect.width > 10 && parentRect.height > 10) {
                            resolve({ w: parentRect.width, h: parentRect.height })
                        } else if (window.innerWidth > 0 && window.innerHeight > 0) {
                            resolve({ w: window.innerWidth, h: window.innerHeight })
                        } else {
                            requestAnimationFrame(check)
                        }
                    }
                }
                check()
            })
        }

        const loadThree = async () => {
            try {
                // Wait until the canvas actually has layout dimensions
                const { w, h } = await waitForDimensions()
                if (disposed) return

                const COUNT = w < 760 ? 700 : 1600

                scene = new THREE.Scene()
                camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100)
                camera.position.z = 18

                renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
                renderer.setSize(w, h)

                // Setup reactor core group
                const reactorGroup = new THREE.Group()
                scene.add(reactorGroup)

                // 3D concentric glowing rings
                const innerRingGeom = new THREE.TorusGeometry(1.6, 0.04, 8, 64)
                const innerRingMat = new THREE.MeshBasicMaterial({
                    color: new THREE.Color('#4c8dff'),
                    transparent: true,
                    opacity: 0.55,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                })
                const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat)
                reactorGroup.add(innerRing)

                const middleRingGeom = new THREE.TorusGeometry(2.1, 0.03, 8, 64)
                const middleRingMat = new THREE.MeshBasicMaterial({
                    color: new THREE.Color('#9b6bff'),
                    transparent: true,
                    opacity: 0.5,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                })
                const middleRing = new THREE.Mesh(middleRingGeom, middleRingMat)
                reactorGroup.add(middleRing)

                const outerRingGeom = new THREE.TorusGeometry(2.6, 0.02, 6, 64)
                const outerRingMat = new THREE.MeshBasicMaterial({
                    color: new THREE.Color('#f5b042'),
                    transparent: true,
                    opacity: 0.45,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                })
                const outerRing = new THREE.Mesh(outerRingGeom, outerRingMat)
                reactorGroup.add(outerRing)

                // Setup flow and grid arrays
                baseX = new Float32Array(COUNT)
                baseY = new Float32Array(COUNT)
                baseZ = new Float32Array(COUNT)
                speed = new Float32Array(COUNT)
                noisePhase = new Float32Array(COUNT)
                grid = new Float32Array(COUNT * 3)
                const colors = new Float32Array(COUNT * 3)

                const cols = Math.ceil(Math.sqrt(COUNT * (w / h)))
                const rows = Math.ceil(COUNT / cols)

                for (let i = 0; i < COUNT; i++) {
                    baseX[i] = (Math.random() - 0.5) * 36
                    baseY[i] = (Math.random() - 0.5) * 12
                    baseZ[i] = (Math.random() - 0.5) * 6
                    speed[i] = 0.05 + Math.random() * 0.08
                    noisePhase[i] = Math.random() * Math.PI * 2

                    const gx = i % cols
                    const gy = Math.floor(i / cols)
                    grid[i * 3 + 0] = (gx / (cols - 1) - 0.5) * 22
                    grid[i * 3 + 1] = (gy / (rows - 1) - 0.5) * 13
                    grid[i * 3 + 2] = 0

                    // Initial colors — overwritten per-frame based on position
                    colors[i * 3 + 0] = 0.3
                    colors[i * 3 + 1] = 0.55
                    colors[i * 3 + 2] = 1.0
                }

                geometry = new THREE.BufferGeometry()
                const positions = new Float32Array(COUNT * 3)
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

                material = new THREE.PointsMaterial({
                    size: 0.16,
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.9,
                    sizeAttenuation: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })

                points = new THREE.Points(geometry, material)
                scene.add(points)

                // Setup tracking coordinates
                let coreX = w > 980 ? 4 : 0
                let coreY = w > 980 ? 0 : -2

                const updateCorePosition = () => {
                    const portalEl = document.getElementById('upload-portal-container')
                    if (portalEl && canvas) {
                        const rect = portalEl.getBoundingClientRect()
                        const cRect = canvas.getBoundingClientRect()
                        if (cRect.width < 1 || cRect.height < 1) return
                        const centerX = rect.left + rect.width / 2
                        const centerY = rect.top + rect.height / 2

                        const localX = centerX - cRect.left
                        const localY = centerY - cRect.top
                        const ndcX = (localX / cRect.width) * 2 - 1
                        const ndcY = -(localY / cRect.height) * 2 + 1

                        const vFOV = (camera.fov * Math.PI) / 180
                        const heightAtZ0 = 2 * Math.tan(vFOV / 2) * camera.position.z
                        const widthAtZ0 = heightAtZ0 * (cRect.width / cRect.height)

                        coreX = ndcX * (widthAtZ0 / 2)
                        coreY = ndcY * (heightAtZ0 / 2)
                    } else {
                        const cRect = canvas.getBoundingClientRect()
                        const cw = cRect.width || window.innerWidth
                        if (cw > 980) {
                            coreX = 4
                            coreY = 0
                        } else {
                            coreX = 0
                            coreY = -2
                        }
                    }
                }

                const heroSection = canvas.parentElement
                const onScroll = () => {
                    if (!heroSection) return
                    // Guard: don't start the order transition until the user has
                    // scrolled at least 60px — eliminates false positives from
                    // browser scroll-restoration, hydration layout shifts, and
                    // sub-pixel rect.top drift on initial paint.
                    if (window.scrollY < 60) {
                        targetOrder = 0
                        return
                    }
                    const rect = heroSection.getBoundingClientRect()
                    if (rect.height <= 0) return
                    const progress = Math.min(
                        1,
                        Math.max(0, -rect.top / (rect.height * 0.6))
                    )
                    if (isNaN(progress)) return
                    targetOrder = progress
                }

                const onMouseMove = (e: MouseEvent) => {
                    mouseX = e.clientX / window.innerWidth - 0.5
                    mouseY = e.clientY / window.innerHeight - 0.5
                }

                window.addEventListener('scroll', onScroll, { passive: true })
                window.addEventListener('mousemove', onMouseMove)

                // Defer initial scroll check by one rAF so layout is fully settled
                // before we calculate rect positions. This prevents a flash where
                // targetOrder gets set to > 0 during hydration layout shift.
                requestAnimationFrame(() => {
                    if (!disposed) onScroll()
                })
                updateCorePosition()

                const posAttr = geometry.attributes.position
                const colorAttr = geometry.attributes.color

                const cBlue = { r: 76 / 255, g: 141 / 255, b: 255 / 255 }
                const cPurple = { r: 155 / 255, g: 107 / 255, b: 255 / 255 }
                const cGold = { r: 245 / 255, g: 176 / 255, b: 66 / 255 }

                const animate = () => {
                    if (disposed) return
                    animId = requestAnimationFrame(animate)
                    const now = performance.now()
                    const dt = (now - t0) / 1000
                    t0 = now

                    // Lerp faster when returning to 0 (scroll back up) so
                    // the chaotic flow resumes promptly, but not so fast it
                    // fights a momentary bad rect reading.
                    const lerpSpeed = targetOrder < orderFactor ? 0.07 : 0.04
                    orderFactor += (targetOrder - orderFactor) * lerpSpeed
                    // Dead zone: snap tiny residual values to 0 so scroll jitter /
                    // hydration noise never partially hides the rings.
                    if (orderFactor < 0.015) orderFactor = 0
                    const currentIntensity = intensityRef.current

                    updateCorePosition()

                    reactorGroup.position.set(coreX, coreY, 0)
                    reactorGroup.scale.setScalar(1 - orderFactor)

                    const rotSpeedMult = 1 + currentIntensity * 3.5
                    innerRing.rotation.x += dt * 0.8 * rotSpeedMult
                    innerRing.rotation.y += dt * 1.2 * rotSpeedMult
                    middleRing.rotation.y -= dt * 1.0 * rotSpeedMult
                    middleRing.rotation.z += dt * 0.5 * rotSpeedMult
                    outerRing.rotation.x -= dt * 0.6 * rotSpeedMult
                    outerRing.rotation.z -= dt * 1.4 * rotSpeedMult

                    innerRingMat.opacity = 0.55 * (1 - orderFactor) * (1 + currentIntensity * 0.45)
                    middleRingMat.opacity = 0.5 * (1 - orderFactor) * (1 + currentIntensity * 0.5)
                    outerRingMat.opacity = 0.45 * (1 - orderFactor) * (1 + currentIntensity * 0.55)

                    for (let i = 0; i < COUNT; i++) {
                        const ix = i * 3
                        const iy = i * 3 + 1
                        const iz = i * 3 + 2

                        // Left-to-right streaming flow
                        baseX[i] += speed[i] * (1 + currentIntensity * 1.8)
                        if (baseX[i] > 18) {
                            baseX[i] = -18
                            baseY[i] = (Math.random() - 0.5) * 12
                            baseZ[i] = (Math.random() - 0.5) * 6
                        }

                        const fx = baseX[i]
                        let fy = baseY[i]
                        let fz = baseZ[i]

                        // Gravitational pull toward reactor core
                        const dx = fx - coreX
                        const pull = Math.exp(-(dx * dx) / 18)

                        fy = fy * (1 - pull) + coreY * pull
                        fz = fz * (1 - pull)

                        // Swirl near core
                        if (pull > 0.01) {
                            const swirlSpeed = now * 0.0035 + noisePhase[i]
                            const swirlRadius = (1.5 + Math.sin(now * 0.001 + noisePhase[i]) * 0.3) * pull
                            fy += Math.sin(swirlSpeed) * swirlRadius
                            fz += Math.cos(swirlSpeed) * swirlRadius
                        }

                        // Ambient wiggle
                        const wiggle = (1 - pull) * 0.35
                        const ny = Math.sin(now * 0.001 + noisePhase[i]) * wiggle
                        const nz = Math.cos(now * 0.0015 + noisePhase[i]) * wiggle

                        const flowX = fx
                        const flowY = fy + ny
                        const flowZ = fz + nz

                        const gridX = grid[ix]
                        const gridY = grid[iy]
                        const gridZ = grid[iz]

                        const finalX = flowX + (gridX - flowX) * orderFactor
                        const finalY = flowY + (gridY - flowY) * orderFactor
                        const finalZ = flowZ + (gridZ - flowZ) * orderFactor

                        posAttr.array[ix] = finalX
                        posAttr.array[iy] = finalY
                        posAttr.array[iz] = finalZ

                        // Position-based recoloring: blue → purple → gold
                        let r, g, b
                        const transX = finalX - coreX
                        const transitionWidth = 3.0

                        if (transX < -transitionWidth) {
                            r = cBlue.r;  g = cBlue.g;  b = cBlue.b
                        } else if (transX > transitionWidth) {
                            r = cGold.r;  g = cGold.g;  b = cGold.b
                        } else {
                            const t = (transX + transitionWidth) / (2 * transitionWidth)
                            if (t < 0.5) {
                                const nt = t / 0.5
                                r = cBlue.r + (cPurple.r - cBlue.r) * nt
                                g = cBlue.g + (cPurple.g - cBlue.g) * nt
                                b = cBlue.b + (cPurple.b - cBlue.b) * nt
                            } else {
                                const nt = (t - 0.5) / 0.5
                                r = cPurple.r + (cGold.r - cPurple.r) * nt
                                g = cPurple.g + (cGold.g - cPurple.g) * nt
                                b = cPurple.b + (cGold.b - cPurple.b) * nt
                            }
                        }

                        colorAttr.array[ix] = r
                        colorAttr.array[iy] = g
                        colorAttr.array[iz] = b
                    }

                    posAttr.needsUpdate = true
                    colorAttr.needsUpdate = true

                    material.size = (0.16 + currentIntensity * 0.14) * (1 - orderFactor * 0.3)

                    // Subtle micro-parallax on mouse — no core offset so rings stay aligned
                    camera.position.x += (mouseX * 2 - camera.position.x) * 0.03
                    camera.position.y += (-mouseY * 1.4 - camera.position.y) * 0.03
                    camera.lookAt(0, 0, 0)

                    renderer.render(scene, camera)
                }

                // Reset t0 right before the loop starts — loadThree() is async
                // so the gap between useEffect init and first animate() call can
                // be 100–500ms, causing a huge dt spike on frame 1.
                t0 = performance.now()
                animate()

                const onResize = () => {
                    const cRect = canvas.getBoundingClientRect()
                    const nw = cRect.width || window.innerWidth
                    const nh = cRect.height || window.innerHeight
                    if (nw < 1 || nh < 1) return
                    camera.aspect = nw / nh
                    camera.updateProjectionMatrix()
                    renderer.setSize(nw, nh)
                    updateCorePosition()
                }

                window.addEventListener('resize', onResize)

                return () => {
                    window.removeEventListener('scroll', onScroll)
                    window.removeEventListener('mousemove', onMouseMove)
                    window.removeEventListener('resize', onResize)
                    innerRingGeom.dispose()
                    innerRingMat.dispose()
                    middleRingGeom.dispose()
                    middleRingMat.dispose()
                    outerRingGeom.dispose()
                    outerRingMat.dispose()
                }
            } catch (err) {
                console.error('[ValidationCore] Three.js init failed:', err)
            }
        }

        const cleanup = loadThree()

        return () => {
            disposed = true
            cancelAnimationFrame(animId)
            cleanup.then((fn) => fn?.())
            geometry?.dispose()
            material?.dispose()
            renderer?.dispose()
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            id="hero-canvas"
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                opacity: 0.95,
            }}
        />
    )
}