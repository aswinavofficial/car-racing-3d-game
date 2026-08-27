import * as THREE from 'three'
import './style.css'

const canvas = document.getElementById('c') as HTMLCanvasElement
const lapEl = document.getElementById('lap')!
const timeEl = document.getElementById('time')!
const bestEl = document.getElementById('best')!
const speedEl = document.getElementById('speed')!
const gearEl = document.getElementById('gear')!
const posEl = document.getElementById('pos')!
const overlay = document.getElementById('overlay')!
const playBtn = document.getElementById('playBtn') as HTMLButtonElement
const menuStats = document.getElementById('menuStats')!
const countdownEl = document.getElementById('countdown')!
const toastEl = document.getElementById('toast')!
const pauseBtn = document.getElementById('pauseBtn')!
const tiltToggle = document.getElementById('tiltToggle') as HTMLInputElement

let bestMs = +(localStorage.getItem('turbo_best') || '0')
if (bestMs) bestEl.textContent = fmt(bestMs)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1

const scene = new THREE.Scene()
scene.fog = new THREE.Fog(0x0a0a12, 80, 340)
scene.background = new THREE.Color(0x06070e)

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 800)
const camTarget = new THREE.Vector3()
const camPos = new THREE.Vector3()

scene.add(new THREE.HemisphereLight(0xfff0e0, 0x202040, 1.2))
const sun = new THREE.DirectionalLight(0xfff6e8, 2.2)
sun.position.set(60, 90, 40)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 300
sun.shadow.camera.left = -120; sun.shadow.camera.right = 120; sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120
sun.shadow.bias = -0.0005
scene.add(sun)

const trackPts: THREE.Vector3[] = []
const RX = 92, RZ = 58
for (let i = 0; i < 64; i++) {
  const a = (i / 64) * Math.PI * 2
  const r = RX + Math.sin(a * 2) * 10 + Math.cos(a * 3) * 6
  const rr = RZ + Math.cos(a * 2) * 8
  const x = Math.cos(a) * r
  const z = Math.sin(a) * rr
  const y = Math.sin(a * 2) * 1.2 + Math.cos(a) * 0.6
  trackPts.push(new THREE.Vector3(x, y, z))
}
const curve = new THREE.CatmullRomCurve3(trackPts, true, 'catmullrom', 0.22)
const TRACK_W = 14, TRACK_LEN = curve.getLength()
const divisions = 220
const trackShape: THREE.Vector2[] = []
for (let i = 0; i <= divisions; i++) {
  const t = i / divisions
  const p = curve.getPoint(t)
  const tan = curve.getTangent(t).normalize()
  const up = new THREE.Vector3(0, 1, 0)
  const right = new THREE.Vector3().crossVectors(tan, up).normalize()
  trackShape.push(new THREE.Vector2(p.x, p.z))
  void right
}
function nearestT(pos: THREE.Vector3): { t: number, dist: number, pt: THREE.Vector3 } {
  let best = 0, bd = Infinity, bp = new THREE.Vector3()
  for (let i = 0; i <= 200; i++) {
    const t = i / 200
    const pt = curve.getPoint(t)
    const d = pt.distanceTo(pos)
    if (d < bd) { bd = d; best = t; bp = pt }
  }
  for (let iter = 0; iter < 4; iter++) {
    const delta = 0.015 / (iter + 1)
    for (const dt of [-delta, delta]) {
      let nt = best + dt
      nt = (nt % 1 + 1) % 1
      const pt = curve.getPoint(nt)
      const d = pt.distanceTo(pos)
      if (d < bd) { bd = d; best = nt; bp = pt }
    }
  }
  return { t: best, dist: bd, pt: bp }
}

const groundGeo = new THREE.PlaneGeometry(600, 600, 32, 32)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f1a0f, roughness: 0.9 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -1.2
ground.receiveShadow = true
scene.add(ground)

const trackGeo = new THREE.BufferGeometry()
const tVerts: number[] = [], tUV: number[] = [], tIdx: number[] = []
for (let i = 0; i <= divisions; i++) {
  const t = i / divisions
  const p = curve.getPoint(t)
  const tan = curve.getTangent(t).normalize()
  const right = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize()
  const w = TRACK_W / 2
  const left = p.clone().add(right.clone().multiplyScalar(-w))
  const rg = p.clone().add(right.clone().multiplyScalar(w))
  left.y += 0.05; rg.y += 0.05
  tVerts.push(left.x, left.y, left.z, rg.x, rg.y, rg.z)
  tUV.push(0, t * 40, 1, t * 40)
}
for (let i = 0; i < divisions; i++) {
  const a = i * 2, b = a + 1, c = a + 2, d = a + 3
  tIdx.push(a, c, b, b, c, d)
}
trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(tVerts, 3))
trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(tUV, 2))
trackGeo.setIndex(tIdx)
trackGeo.computeVertexNormals()
const trackMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.8, metalness: 0.05 })
const trackMesh = new THREE.Mesh(trackGeo, trackMat)
trackMesh.receiveShadow = true
scene.add(trackMesh)

const lineGeo = new THREE.BufferGeometry()
const lVerts: number[] = []
for (let i = 0; i <= divisions; i++) {
  const t = i / divisions
  const p = curve.getPoint(t)
  p.y += 0.06
  lVerts.push(p.x, p.y, p.z)
}
lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lVerts, 3))
const centerLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffffff, linewidth: 1, scale: 1, dashSize: 3, gapSize: 5, transparent: true, opacity: 0.35 }))
centerLine.computeLineDistances()
scene.add(centerLine)

function addBarrier(offset: number, h: number, color: number) {
  const geo = new THREE.BufferGeometry()
  const v: number[] = [], idx: number[] = []
  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions
    const p = curve.getPoint(t)
    const tan = curve.getTangent(t).normalize()
    const right = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize()
    const base = p.clone().add(right.clone().multiplyScalar(offset))
    const top = base.clone(); top.y += h
    const inner = base.clone().add(right.clone().multiplyScalar(offset > 0 ? 0.7 : -0.7))
    inner.y += h * 0.6
    v.push(base.x, base.y, base.z, top.x, top.y, top.z, inner.x, inner.y, inner.z)
  }
  for (let i = 0; i < divisions; i++) {
    const s = i * 3
    idx.push(s, s + 3, s + 1, s + 1, s + 3, s + 4, s + 1, s + 4, s + 2, s + 2, s + 4, s + 5)
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  geo.setIndex(idx); geo.computeVertexNormals()
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }))
  m.castShadow = true; m.receiveShadow = true
  scene.add(m)
}
addBarrier(TRACK_W / 2 + 0.6, 1.6, 0xcc1a00)
addBarrier(-TRACK_W / 2 - 0.6, 1.6, 0x25304a)

for (let i = 0; i < 36; i++) {
  const t = i / 36
  const p = curve.getPoint(t)
  const tan = curve.getTangent(t).normalize()
  const right = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize()
  for (const side of [-1, 1]) {
    const bp = p.clone().add(right.clone().multiplyScalar(side * (TRACK_W / 2 + 8 + Math.random() * 18)))
    bp.y = -0.8
    const h = 6 + Math.random() * 10
    const geo = new THREE.BoxGeometry(2 + Math.random() * 3, h, 2 + Math.random() * 3)
    const mat = new THREE.MeshStandardMaterial({ color: side > 0 ? 0x1b2a1b : 0x2a1f1a })
    const m = new THREE.Mesh(geo, mat)
    m.position.copy(bp); m.position.y += h / 2 - 0.8
    m.castShadow = true; m.receiveShadow = true
    scene.add(m)
  }
}
for (let i = 0; i < 18; i++) {
  const a = Math.random() * Math.PI * 2
  const r = 110 + Math.random() * 60
  const x = Math.cos(a) * r, z = Math.sin(a) * r
  const h = 18 + Math.random() * 18
  const geo = new THREE.CylinderGeometry(0.4, 0.7, h, 6)
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x3a2a1a }))
  m.position.set(x, h / 2 - 1, z); scene.add(m)
}

const startT = 0.02
const startP = curve.getPoint(startT)
const startTan = curve.getTangent(startT)
const finishGeo = new THREE.PlaneGeometry(TRACK_W, 6)
const cvs = document.createElement('canvas'); cvs.width = 256; cvs.height = 64
const cctx = cvs.getContext('2d')!
for (let x = 0; x < 8; x++) for (let y = 0; y < 2; y++) { cctx.fillStyle = (x + y) % 2 ? '#fff' : '#111'; cctx.fillRect(x * 32, y * 32, 32, 32) }
const finishTex = new THREE.CanvasTexture(cvs); finishTex.anisotropy = 4
const finishMat = new THREE.MeshStandardMaterial({ map: finishTex, roughness: 0.6 })
const finish = new THREE.Mesh(finishGeo, finishMat)
finish.rotation.x = -Math.PI / 2
finish.position.copy(startP); finish.position.y += 0.08
finish.lookAt(startP.clone().add(startTan))
finish.rotateX(Math.PI / 2)
finish.rotateZ(Math.PI / 2)
scene.add(finish)

function makeCar(col: number, accent: number) {
  const g = new THREE.Group()
  const bodyGeo = new THREE.BoxGeometry(1.9, 0.68, 4.0)
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.35 }))
  body.castShadow = true; body.position.y = 0.62
  g.add(body)
  const cabGeo = new THREE.BoxGeometry(1.75, 0.55, 1.9)
  const cab = new THREE.Mesh(cabGeo, new THREE.MeshStandardMaterial({ color: accent, roughness: 0.2, metalness: 0.4 }))
  cab.position.set(0, 1.12, -0.28); cab.castShadow = true; g.add(cab)
  const winGeo = new THREE.BoxGeometry(1.6, 0.45, 1.2)
  const win = new THREE.Mesh(winGeo, new THREE.MeshStandardMaterial({ color: 0x0a1a2a, roughness: 0.1, metalness: 0.7, transparent: true, opacity: 0.9 }))
  win.position.set(0, 1.15, -0.28); g.add(win)
  const spoilerGeo = new THREE.BoxGeometry(1.9, 0.12, 0.35)
  const spoiler = new THREE.Mesh(spoilerGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }))
  spoiler.position.set(0, 0.95, -1.85); g.add(spoiler)
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.5, 14)
  wheelGeo.rotateZ(Math.PI / 2)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
  const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.52, 10); rimGeo.rotateZ(Math.PI / 2)
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 })
  const offs = [[-1.0, 0.18, 1.25], [1.0, 0.18, 1.25], [-1.0, 0.18, -1.25], [1.0, 0.18, -1.25]]
  const wheels: THREE.Group[] = []
  for (const o of offs) {
    const wg = new THREE.Group()
    const w = new THREE.Mesh(wheelGeo, wheelMat); w.castShadow = true
    const r = new THREE.Mesh(rimGeo, rimMat)
    wg.add(w); wg.add(r); wg.position.set(o[0], o[1], o[2]); g.add(wg); wheels.push(wg)
  }
  const lightGeo = new THREE.BoxGeometry(0.5, 0.22, 0.1)
  const hl = new THREE.Mesh(lightGeo, new THREE.MeshStandardMaterial({ color: 0xffffe0, emissive: 0xffffaa, emissiveIntensity: 0.6 }))
  hl.position.set(-0.6, 0.58, 2.0); g.add(hl)
  const hr = hl.clone(); hr.position.x = 0.6; g.add(hr)
  const tl = new THREE.Mesh(lightGeo, new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xff0000, emissiveIntensity: 0.8 }))
  tl.position.set(-0.6, 0.58, -2.0); g.add(tl)
  const tr = tl.clone(); tr.position.x = 0.6; g.add(tr)
  g.userData.wheels = wheels
  return g
}

const car = makeCar(0xff2a00, 0x00d8ff)
scene.add(car)
const rival = makeCar(0xffffff, 0xff2a00)
scene.add(rival)

let pos = startP.clone(); pos.y = 0.35
let yaw = Math.atan2(startTan.x, startTan.z)
let vel = 0, steer = 0
let lap = 1, totalLaps = 3, prog = startT, lastT = startT
let raceTime = 0, racing = false, paused = true, countdown = false
let aiT = startT + 0.06
let drift = 0

const keys: Record<string, boolean> = {}
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if ([' ', 'arrowup', 'arrowdown'].includes(e.key.toLowerCase())) e.preventDefault() })
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false)

let inputSteer = 0, inputGas = 0, inputBrake = 0, joySteer = 0
let tiltSteer = 0
function bindBtn(id: string, on: () => void, off: () => void) {
  const el = document.getElementById(id)!;
  ['pointerdown', 'touchstart'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); on() }, { passive: false }))
  ;['pointerup', 'pointerleave', 'touchend', 'touchcancel'].forEach(ev => el.addEventListener(ev, off))
}
bindBtn('leftBtn', () => { inputSteer = -1; document.getElementById('leftBtn')!.classList.add('pressed') }, () => { inputSteer = 0; document.getElementById('leftBtn')!.classList.remove('pressed') })
bindBtn('rightBtn', () => { inputSteer = 1; document.getElementById('rightBtn')!.classList.add('pressed') }, () => { inputSteer = 0; document.getElementById('rightBtn')!.classList.remove('pressed') })
bindBtn('gasBtn', () => { inputGas = 1; document.getElementById('gasBtn')!.classList.add('pressed') }, () => { inputGas = 0; document.getElementById('gasBtn')!.classList.remove('pressed') })
bindBtn('brakeBtn', () => { inputBrake = 1; document.getElementById('brakeBtn')!.classList.add('pressed') }, () => { inputBrake = 0; document.getElementById('brakeBtn')!.classList.remove('pressed') })

let dragging = false, dragX = 0
canvas.addEventListener('pointerdown', e => { dragging = true; dragX = e.clientX })
addEventListener('pointerup', () => { dragging = false; joySteer = 0 })
canvas.addEventListener('pointermove', e => {
  if (!dragging) return
  const dx = e.clientX - dragX
  joySteer = Math.max(-1, Math.min(1, dx / 90))
})
canvas.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && dragging) {
    const dx = e.touches[0].clientX - dragX
    joySteer = Math.max(-1, Math.min(1, dx / 90))
  }
}, { passive: true })

let tiltEnabled = false
tiltToggle.addEventListener('change', async () => {
  tiltEnabled = tiltToggle.checked
  if (tiltEnabled && typeof DeviceOrientationEvent !== 'undefined' && 'requestPermission' in DeviceOrientationEvent) {
    try { const r = await (DeviceOrientationEvent as any).requestPermission(); tiltEnabled = r === 'granted' } catch { }
  }
})
addEventListener('deviceorientation', e => {
  if (!tiltEnabled) return
  const g = e.gamma ?? 0
  tiltSteer = Math.max(-1, Math.min(1, g / 26))
})

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
renderer.setSize(innerWidth, innerHeight)

function fmt(ms: number) {
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), d = Math.floor((ms % 1000) / 100), cs = Math.floor((ms % 1000) / 10) % 100
  if (m > 0) return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`
  return `${String(s).padStart(2, '0')}:${String(cs).padStart(2, '0')}`
}
function toast(msg: string) { toastEl.textContent = msg; toastEl.classList.add('show'); setTimeout(() => toastEl.classList.remove('show'), 1500) }

let steerSmoothed = 0
const clock = new THREE.Clock()

function updatePhysics(dt: number) {
  if (!racing || paused) return
  raceTime += dt * 1000

  const kSteer = (keys['arrowleft'] || keys['a'] ? -1 : 0) + (keys['arrowright'] || keys['d'] ? 1 : 0)
  const kGas = (keys['arrowup'] || keys['w'] || keys[' '] ? 1 : 0)
  const kBrake = (keys['arrowdown'] || keys['s'] ? 1 : 0)

  let targetSteer = kSteer || inputSteer || joySteer || tiltSteer
  targetSteer = Math.max(-1, Math.min(1, targetSteer * 1.15))
  steerSmoothed += (targetSteer - steerSmoothed) * Math.min(1, dt * 9)
  steer = steerSmoothed

  const speed01 = Math.abs(vel) / 42
  const steerEff = steer * (0.9 + speed01 * 0.2)
  const maxSteerAngle = 0.62 * (1 - Math.min(0.45, speed01 * 0.55))
  yaw += steerEff * maxSteerAngle * dt * (vel > 1 ? Math.min(1, vel / 9) : 1) * (vel < 0 ? -1 : 1)

  const gas = Math.max(kGas, inputGas)
  const brake = Math.max(kBrake, inputBrake)

  const ENGINE = 28, BRAKE = 46, DRAG = 0.62, GRIP = 3.0
  let accel = 0
  if (gas) accel += ENGINE * (1 - speed01 * 0.58)
  if (brake) accel -= vel > 0 ? BRAKE : ENGINE * 0.7
  if (!gas && !brake) {
    accel -= Math.sign(vel) * DRAG * (2.2 + speed01 * 3)
  }
  if (Math.abs(steer) > 0.5 && Math.abs(vel) > 12) {
    drift = Math.min(1, drift + dt * 3)
    accel -= drift * 2.5
  } else drift = Math.max(0, drift - dt * 4)

  vel += accel * dt
  vel -= vel * GRIP * 0.015 * dt * 60 * 0.07
  const friction = 0.985 - Math.abs(steer) * 0.012 - drift * 0.018
  vel *= Math.pow(friction, dt * 60)
  if (Math.abs(vel) < 0.08) vel = 0
  vel = Math.max(-16, Math.min(42, vel))

  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
  pos.add(fwd.multiplyScalar(vel * dt))

  const groundY = curve.getPoint(nearestT(pos).t).y
  pos.y += (groundY + 0.35 - pos.y) * Math.min(1, dt * 12)

  const nt = nearestT(pos)
  if (nt.dist > TRACK_W / 2 + 0.9) {
    const dirToCenter = nt.pt.clone().sub(pos).normalize()
    pos.add(dirToCenter.multiplyScalar((nt.dist - TRACK_W / 2) * 0.28))
    vel *= 0.92
    if (nt.dist > TRACK_W / 2 + 1.6) vel *= 0.88
  }

  prog = nt.t
  const crossed = lastT > 0.82 && prog < 0.18 && vel > 2
  if (crossed) {
    lap++
    if (lap > totalLaps) {
      racing = false
      paused = true
      const final = raceTime
      if (!bestMs || final < bestMs) { bestMs = final; localStorage.setItem('turbo_best', String(bestMs)); bestEl.textContent = fmt(bestMs); toast('🏆 NEW BEST LAP!') }
      menuStats.innerHTML = `FINISHED <b style="color:#ff2a00">${fmt(final)}</b> • BEST ${fmt(bestMs)}`
      playBtn.textContent = '↻ RACE AGAIN'
      overlay.classList.remove('hidden')
      toast(`Finished in ${fmt(final)}`)
    } else {
      lapEl.textContent = `${lap} / ${totalLaps}`
      toast(`LAP ${lap}/${totalLaps}`)
    }
  }
  lastT = prog
  if (prog > 0.92) lastT = prog

  aiT = (aiT + dt * 0.045) % 1
  const aiP = curve.getPoint(aiT)
  aiP.y += 0.35
  rival.position.copy(aiP)
  const aiTan = curve.getTangent(aiT)
  rival.rotation.y = Math.atan2(aiTan.x, aiTan.z)
  const aiw: THREE.Group[] = rival.userData.wheels
  if (aiw) aiw.forEach(w => w.rotation.x += dt * 12)

  car.position.copy(pos)
  car.rotation.y = yaw
  car.rotation.z = -steer * 0.18 * (vel / 32) - drift * steer * 0.12
  car.rotation.x = Math.sin(raceTime * 0.012) * 0.012 * (vel / 28)

  const wheels: THREE.Group[] = car.userData.wheels
  if (wheels) {
    const spin = vel * dt * 3.2
    wheels.forEach((w, i) => {
      w.rotation.x += spin
      if (i < 2) w.rotation.y = steer * 0.55
    })
  }

  speedEl.textContent = String(Math.round(Math.abs(vel) * 8.7))
  const gNum = vel < 1 ? 'N' : vel < 10 ? '1' : vel < 19 ? '2' : vel < 28 ? '3' : vel < 35 ? '4' : '5'
  gearEl.textContent = gNum + (drift > 0.5 ? ' ⟋ DRIFT' : '')
  gearEl.style.color = drift > 0.5 ? '#ff2a00' : '#00d8ff'
  timeEl.textContent = fmt(raceTime)
  const aiAhead = (aiT - prog + 1) % 1
  const playerAhead = aiAhead > 0.5 || (aiAhead < 0.5 && Math.abs(vel) > 22)
  posEl.textContent = playerAhead ? 'POS 1/2' : 'POS 2/2'
}

function updateCamera(dt: number) {
  const chase = 10, height = 4.2
  const back = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-chase)
  const desired = pos.clone().add(back); desired.y += height
  camPos.lerp(desired, Math.min(1, dt * 5.2))
  camera.position.copy(camPos)
  const look = pos.clone(); look.y += 0.9
  look.add(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(6))
  camTarget.lerp(look, Math.min(1, dt * 7))
  camera.lookAt(camTarget)
  camera.position.y += Math.sin(raceTime * 0.006) * 0.02
}

let last = performance.now()
function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  let dt = (now - last) / 1000; last = now
  dt = Math.min(dt, 1 / 30)
  updatePhysics(dt)
  updateCamera(dt)
  renderer.render(scene, camera)
}
animate()

async function startCountdown() {
  if (countdown) return
  countdown = true; playBtn.disabled = true
  overlay.classList.add('hidden')
  const seq = ['3', '2', '1', 'GO!']
  for (const s of seq) {
    countdownEl.textContent = s; countdownEl.classList.remove('show'); void countdownEl.offsetWidth; countdownEl.classList.add('show')
    if (s === 'GO!') countdownEl.style.color = '#ff2a00'; else countdownEl.style.color = '#fff'
    await new Promise(r => setTimeout(r, 700))
  }
  countdownEl.classList.remove('show')
  startRace()
  countdown = false; playBtn.disabled = false
}
function startRace() {
  pos.copy(startP); pos.y = 0.35
  yaw = Math.atan2(startTan.x, startTan.z)
  vel = 0; steer = 0; steerSmoothed = 0; drift = 0
  lap = 1; prog = startT; lastT = startT; raceTime = 0; aiT = startT + 0.06
  lapEl.textContent = `1 / ${totalLaps}`
  timeEl.textContent = '00:00'
  racing = true; paused = false
  toast('GO GO GO!')
}

playBtn.addEventListener('click', startCountdown)
pauseBtn.addEventListener('click', () => {
  if (!racing) return
  paused = !paused
  pauseBtn.textContent = paused ? '▶' : '⏸︎'
  toast(paused ? 'Paused' : 'Resumed')
})
addEventListener('keydown', e => { if (e.key === 'Escape' && racing) { paused = !paused; pauseBtn.textContent = paused ? '▶' : '⏸︎' } })

menuStats.innerHTML = bestMs ? `BEST <b style="color:#00d8ff">${fmt(bestMs)}</b> • 3 LAPS` : '3 LAPS • BEAT THE RIVAL • DRIFT TO WIN'
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { }))
}
let deferredPrompt: any = null
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; toast('📲 Install available — tap share → Add to Home Screen') })
canvas.addEventListener('dblclick', () => { if (deferredPrompt) deferredPrompt.prompt() })

pos.copy(startP); pos.y = 0.35; yaw = Math.atan2(startTan.x, startTan.z)
car.position.copy(pos); car.rotation.y = yaw
aiT = startT + 0.06; rival.position.copy(curve.getPoint(aiT))
updateCamera(0.016); renderer.render(scene, camera)
