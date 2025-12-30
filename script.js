let scene, camera, renderer, particleSystem;
let bgMesh;
let blackHoleGroup, blackHoleCore, blackHoleDisk, blackHoleHalo;
let infallSystem;
let rockSystem;
let rockBigSystem;
let activePreset = 'sun';
let time = 0;
let bhSpin = 0;

const INFALL_COUNT = 8000;
let infallR;
let infallA;
let infallY;
let infallSpeed;

const ROCK_COUNT = 900;
const ROCK_BIG_COUNT = 140;
let rockR;
let rockA;
let rockY;
let rockSpeed;
let rockBigR;
let rockBigA;
let rockBigY;
let rockBigSpeed;
let targetScale = 1, currentScale = 1;
let targetRotationZ = 0, currentRotationZ = 0;
const PARTICLE_COUNT = 30000;

const AUDIO_URL = 'music.mp3';
const audio = new Audio(AUDIO_URL);
audio.loop = true;
audio.preload = 'auto';
let musicPlaying = false;
let needsUserUnmute = false;

const musicToggleBtn = document.getElementById('musicToggle');

function syncMusicButton() {
    if (!musicToggleBtn) return;
    if (musicPlaying && audio.muted) {
        musicToggleBtn.innerText = 'TAP TO UNMUTE';
        return;
    }
    musicToggleBtn.innerText = musicPlaying ? 'PAUSE AUDIO' : 'PLAY AUDIO';
}

async function startMusic() {
    try {
        await audio.play();
        musicPlaying = true;
        syncMusicButton();
        return true;
    } catch {
        musicPlaying = false;
        syncMusicButton();
        return false;
    }
}

function stopMusic() {
    audio.pause();
    musicPlaying = false;
    syncMusicButton();
}

async function attemptAutoplay() {
    audio.muted = false;
    const okAudible = await startMusic();
    if (okAudible) return;

    audio.muted = true;
    const okMuted = await startMusic();
    if (!okMuted) {
        audio.muted = false;
        return;
    }

    needsUserUnmute = true;
    syncMusicButton();
    const unmuteOnce = () => {
        if (!needsUserUnmute) return;
        audio.muted = false;
        needsUserUnmute = false;
        syncMusicButton();
    };
    document.addEventListener('pointerdown', unmuteOnce, { once: true });
    document.addEventListener('keydown', unmuteOnce, { once: true });
}

if (musicToggleBtn) {
    musicToggleBtn.onclick = async () => {
        if (!musicPlaying) {
            audio.muted = false;
            needsUserUnmute = false;
            await startMusic();
            return;
        }

        if (musicPlaying && audio.muted) {
            audio.muted = false;
            needsUserUnmute = false;
            syncMusicButton();
            return;
        }

        stopMusic();
    };
}

syncMusicButton();
window.addEventListener('load', () => { attemptAutoplay(); });

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32,32,0, 32,32,32);
    grad.addColorStop(0, 'white');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'black');
    ctx.fillStyle = grad; ctx.fillRect(0,0,64,64);
    const texture = new THREE.CanvasTexture(canvas);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));

    const mat = new THREE.PointsMaterial({
        size: 0.05, map: texture, transparent: true, 
        blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true
    });

    particleSystem = new THREE.Points(geo, mat);
    scene.add(particleSystem);

    createBlackHoleAssets();

    updateShape('sun');
    animate();
}

function createBlackHoleBackgroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0.0, '#061219');
    g.addColorStop(0.35, '#0b1b22');
    g.addColorStop(0.7, '#1b1412');
    g.addColorStop(1.0, '#040607');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'source-over';
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}

function createGlowTexture(innerColor, outerColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0.0, innerColor);
    g.addColorStop(0.55, outerColor);
    g.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}

function createBlackHoleAssets() {
    const bgTex = createBlackHoleBackgroundTexture();
    const bgGeo = new THREE.SphereGeometry(900, 32, 24);
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, side: THREE.BackSide, depthWrite: false });
    bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.visible = false;
    scene.add(bgMesh);

    blackHoleGroup = new THREE.Group();
    blackHoleGroup.visible = false;
    scene.add(blackHoleGroup);

    blackHoleCore = new THREE.Mesh(
        new THREE.CircleGeometry(0.92, 64),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1, depthWrite: false, depthTest: false })
    );
    blackHoleCore.renderOrder = 5;
    blackHoleGroup.add(blackHoleCore);

    const haloTex = createGlowTexture('rgba(255,255,255,0.75)', 'rgba(255,210,160,0.12)');
    blackHoleHalo = new THREE.Mesh(
        new THREE.RingGeometry(0.92, 1.32, 96),
        new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, depthTest: false })
    );
    blackHoleHalo.renderOrder = 8;
    blackHoleGroup.add(blackHoleHalo);

    const diskTex = createGlowTexture('rgba(255,210,150,0.85)', 'rgba(255,140,60,0.08)');
    blackHoleDisk = new THREE.Mesh(
        new THREE.RingGeometry(1.05, 2.85, 128, 1),
        new THREE.MeshBasicMaterial({ map: diskTex, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, depthTest: false })
    );
    blackHoleDisk.rotation.x = 1.12;
    blackHoleDisk.renderOrder = 7;
    blackHoleGroup.add(blackHoleDisk);

    infallR = new Float32Array(INFALL_COUNT);
    infallA = new Float32Array(INFALL_COUNT);
    infallY = new Float32Array(INFALL_COUNT);
    infallSpeed = new Float32Array(INFALL_COUNT);

    const iGeo = new THREE.BufferGeometry();
    iGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(INFALL_COUNT * 3), 3));
    iGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(INFALL_COUNT * 3), 3));

    const iMat = new THREE.PointsMaterial({
        size: 0.03,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true
    });
    infallSystem = new THREE.Points(iGeo, iMat);
    infallSystem.visible = false;
    infallSystem.renderOrder = 3;
    scene.add(infallSystem);

    for (let i = 0; i < INFALL_COUNT; i++) {
        resetInfallParticle(i, true);
    }

    rockR = new Float32Array(ROCK_COUNT);
    rockA = new Float32Array(ROCK_COUNT);
    rockY = new Float32Array(ROCK_COUNT);
    rockSpeed = new Float32Array(ROCK_COUNT);

    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ROCK_COUNT * 3), 3));
    rGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ROCK_COUNT * 3), 3));
    const rMat = new THREE.PointsMaterial({
        size: 0.06,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        vertexColors: true
    });
    rockSystem = new THREE.Points(rGeo, rMat);
    rockSystem.visible = false;
    rockSystem.renderOrder = 2;
    scene.add(rockSystem);

    rockBigR = new Float32Array(ROCK_BIG_COUNT);
    rockBigA = new Float32Array(ROCK_BIG_COUNT);
    rockBigY = new Float32Array(ROCK_BIG_COUNT);
    rockBigSpeed = new Float32Array(ROCK_BIG_COUNT);

    const rbGeo = new THREE.BufferGeometry();
    rbGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ROCK_BIG_COUNT * 3), 3));
    rbGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ROCK_BIG_COUNT * 3), 3));
    const rbMat = new THREE.PointsMaterial({
        size: 0.11,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        vertexColors: true
    });
    rockBigSystem = new THREE.Points(rbGeo, rbMat);
    rockBigSystem.visible = false;
    rockBigSystem.renderOrder = 2;
    scene.add(rockBigSystem);

    for (let i = 0; i < ROCK_COUNT; i++) resetRockParticle(i, true);
    for (let i = 0; i < ROCK_BIG_COUNT; i++) resetRockBigParticle(i, true);
}

function resetRockParticle(i, init = false) {
    rockA[i] = Math.random() * Math.PI * 2;
    rockR[i] = 3.8 + Math.random() * 4.3;
    rockY[i] = (Math.random() - 0.5) * 0.18;
    rockSpeed[i] = 0.018 + Math.random() * 0.02;

    if (!init) {
        const pos = rockSystem.geometry.attributes.position.array;
        pos[i * 3] = rockR[i] * Math.cos(rockA[i]);
        pos[i * 3 + 1] = rockY[i];
        pos[i * 3 + 2] = rockR[i] * Math.sin(rockA[i]);
    }
}

function resetRockBigParticle(i, init = false) {
    rockBigA[i] = Math.random() * Math.PI * 2;
    rockBigR[i] = 4.6 + Math.random() * 4.5;
    rockBigY[i] = (Math.random() - 0.5) * 0.22;
    rockBigSpeed[i] = 0.014 + Math.random() * 0.018;

    if (!init) {
        const pos = rockBigSystem.geometry.attributes.position.array;
        pos[i * 3] = rockBigR[i] * Math.cos(rockBigA[i]);
        pos[i * 3 + 1] = rockBigY[i];
        pos[i * 3 + 2] = rockBigR[i] * Math.sin(rockBigA[i]);
    }
}

function resetInfallParticle(i, init = false) {
    infallA[i] = Math.random() * Math.PI * 2;
    infallR[i] = 3.3 + Math.random() * 3.0;
    const ray = Math.random() < 0.35;
    infallY[i] = ray ? (Math.random() - 0.5) * 0.25 : (Math.random() - 0.5) * 0.08;
    infallSpeed[i] = (ray ? 0.035 : 0.02) + Math.random() * 0.02;

    if (!init) {
        const pos = infallSystem.geometry.attributes.position.array;
        pos[i * 3] = infallR[i] * Math.cos(infallA[i]);
        pos[i * 3 + 1] = infallY[i];
        pos[i * 3 + 2] = infallR[i] * Math.sin(infallA[i]);
    }
}

function updateShape(type) {
    activePreset = type;

    const isBlackHole = type === 'blackhole';
    if (bgMesh) bgMesh.visible = false;
    if (blackHoleGroup) blackHoleGroup.visible = isBlackHole;
    if (infallSystem) infallSystem.visible = isBlackHole;
    if (rockSystem) rockSystem.visible = isBlackHole;
    if (rockBigSystem) rockBigSystem.visible = isBlackHole;

    if (particleSystem && particleSystem.material) {
        particleSystem.material.size = isBlackHole ? 0.035 : 0.05;
    }

    const pos = particleSystem.geometry.attributes.position.array;
    const cols = particleSystem.geometry.attributes.color.array;
    const color = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        let x, y, z;
        const t = Math.random() * Math.PI * 2;
        const u = Math.random() * 2 - 1;

        if (type === 'sun') {
            const r = 1.8 + Math.random() * 0.2;
            x = r * Math.sin(Math.acos(u)) * Math.cos(t);
            y = r * Math.sin(Math.acos(u)) * Math.sin(t);
            z = r * u;
            color.setHSL(0.1 + Math.random() * 0.05, 1, 0.5);
        }
        else if (type === 'earth') {
            const r = 1.5;
            x = r * Math.sin(Math.acos(u)) * Math.cos(t);
            y = r * Math.sin(Math.acos(u)) * Math.sin(t);
            z = r * u;
            
            if (i % 50 === 0) {
                y += (Math.random() * 0.2);
                color.set(0xffffff);
            } else {
                const isLand = Math.random() > 0.6;
                color.set(isLand ? 0x22ff44 : 0x0088ff); 
            }
        }
        else if (type === 'jupiter') {
            const r = 2.2;
            x = r * Math.sin(Math.acos(u)) * Math.cos(t);
            y = r * Math.sin(Math.acos(u)) * Math.sin(t);
            z = r * u;
            const band = Math.floor(y * 4) % 2;
            color.set(band === 0 ? 0xd4a373 : 0xfaedcd);
        }
        else if (type === 'saturn') {
            if (i < PARTICLE_COUNT * 0.5) {
                const r = 1.4;
                x = r * Math.sin(Math.acos(u)) * Math.cos(t);
                y = r * Math.sin(Math.acos(u)) * Math.sin(t);
                z = r * u;
                color.set(0xe9c46a);
            } else {
                const r = 2.2 + Math.random() * 1.5;
                x = r * Math.cos(t);
                y = (Math.random() - 0.5) * 0.1;
                z = r * Math.sin(t);
                color.set(0xa88d32);
            }
        }
        else if (type === 'blackhole') {
            const inner = 0.96;
            const outer = 3.25;

            const bias = Math.pow(Math.random(), 2.5);
            const r = inner + (outer - inner) * bias;
            const thick = (Math.random() - 0.5) * 0.14;

            const swirl = 0.45 / (r + 0.15);
            const a = t + swirl;

            x = r * Math.cos(a);
            z = r * Math.sin(a);
            y = thick + Math.sin(a * 3.0 + r * 2.3) * 0.03;

            const heat = THREE.MathUtils.clamp(1.0 - (r - inner) / (outer - inner), 0, 1);
            const hue = 0.08 + (1.0 - heat) * 0.04;
            const sat = 0.95;
            const light = 0.45 + heat * 0.35;
            color.setHSL(hue, sat, light);

            if (r < 1.18) {
                color.lerp(new THREE.Color(0xffffff), 0.25);
            }
        }
        else {
            const r = Math.random() * 5;
            const phi = Math.acos(u);
            x = r * Math.sin(phi) * Math.cos(t);
            y = r * Math.sin(phi) * Math.sin(t);
            z = r * Math.cos(phi);
            color.setHSL(Math.random(), 1, 0.5);
        }

        pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
        cols[i*3] = color.r; cols[i*3+1] = color.g; cols[i*3+2] = color.b;
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.color.needsUpdate = true;
}

const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

hands.onResults((res) => {
    const status = document.getElementById('status');
    if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
        status.innerHTML = "SYSTEM: <span style='color:#00ff00'>STABLE</span>";
        const lm = res.multiHandLandmarks[0];

        const dist = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
        targetScale = THREE.MathUtils.mapLinear(dist, 0.05, 0.4, 0.3, 6.0);

        const dx = lm[9].x - lm[0].x;
        const dy = lm[9].y - lm[0].y;
        targetRotationZ = Math.atan2(dy, dx) + Math.PI / 2;
    } else {
        status.innerHTML = "SYSTEM: <span style='color:#ff0000'>SEARCHING...</span>";
    }
});

const cameraUtils = new Camera(document.getElementById('webcam'), {
    onFrame: async () => { await hands.send({image: document.getElementById('webcam')}); },
    width: 640, height: 480
});
cameraUtils.start();

function animate() {
    requestAnimationFrame(animate);
    
    currentScale += (targetScale - currentScale) * 0.1;
    currentRotationZ += (targetRotationZ - currentRotationZ) * 0.1;

    particleSystem.scale.set(currentScale, currentScale, currentScale);
    particleSystem.rotation.z = currentRotationZ;
    if (activePreset !== 'blackhole') {
        particleSystem.rotation.y += 0.003;
    }

    if (activePreset === 'blackhole') {
        updateBlackHoleVisuals();
    }

    renderer.render(scene, camera);
}

function updateBlackHoleVisuals() {
    if (!blackHoleGroup || !infallSystem) return;

    blackHoleGroup.scale.copy(particleSystem.scale);
    blackHoleGroup.rotation.set(0, 0, particleSystem.rotation.z);

    bhSpin += 0.002;

    infallSystem.scale.copy(particleSystem.scale);
    infallSystem.rotation.set(0, 0, particleSystem.rotation.z + bhSpin * 0.08);

    if (rockSystem) {
        rockSystem.scale.copy(particleSystem.scale);
        rockSystem.rotation.set(0, 0, particleSystem.rotation.z + bhSpin * 0.06);
    }
    if (rockBigSystem) {
        rockBigSystem.scale.copy(particleSystem.scale);
        rockBigSystem.rotation.set(0, 0, particleSystem.rotation.z + bhSpin * 0.05);
    }

    blackHoleDisk.rotation.y = 0;
    blackHoleDisk.rotation.z += 0.02;

    blackHoleHalo.rotation.x = 0;
    blackHoleHalo.rotation.y = 0;
    blackHoleHalo.rotation.z += 0.008;

    const inner = 0.95;
    const zoom = THREE.MathUtils.clamp((currentScale - 1.0) / 3.0, 0, 1);
    const speedBoost = 1.0 + zoom * 3.0;

    const showInfall = zoom > 0.06;
    infallSystem.visible = showInfall;
    if (rockSystem) rockSystem.visible = showInfall;
    if (rockBigSystem) rockBigSystem.visible = showInfall;

    const pos = infallSystem.geometry.attributes.position.array;
    const cols = infallSystem.geometry.attributes.color.array;
    const c = new THREE.Color();

    for (let i = 0; i < INFALL_COUNT; i++) {
        infallR[i] -= infallSpeed[i] * speedBoost;
        infallA[i] += (0.02 / (infallR[i] + 0.25)) * speedBoost;

        if (infallR[i] < inner) {
            resetInfallParticle(i);
        }

        const r = infallR[i];
        const a = infallA[i];
        const y = infallY[i];

        pos[i * 3] = r * Math.cos(a);
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = r * Math.sin(a);

        const heat = THREE.MathUtils.clamp(1.0 - (r - inner) / 5.5, 0, 1);
        c.setHSL(0.09, 1.0, 0.35 + heat * 0.55);
        const boost = 0.35 + zoom * 0.65;
        cols[i * 3] = c.r * boost;
        cols[i * 3 + 1] = c.g * boost;
        cols[i * 3 + 2] = c.b * boost;
    }

    infallSystem.material.size = 0.02 + zoom * 0.03;
    infallSystem.geometry.attributes.position.needsUpdate = true;
    infallSystem.geometry.attributes.color.needsUpdate = true;

    if (rockSystem && rockBigSystem) {
        const rockOpacity = THREE.MathUtils.clamp((zoom - 0.06) / 0.35, 0, 1);
        rockSystem.material.opacity = rockOpacity * 0.9;
        rockBigSystem.material.opacity = rockOpacity * 0.75;
        rockSystem.material.size = 0.055 + zoom * 0.03;
        rockBigSystem.material.size = 0.10 + zoom * 0.05;

        const rPos = rockSystem.geometry.attributes.position.array;
        const rCols = rockSystem.geometry.attributes.color.array;
        for (let i = 0; i < ROCK_COUNT; i++) {
            rockR[i] -= rockSpeed[i] * (1.0 + zoom * 2.0);
            rockA[i] += (0.012 / (rockR[i] + 0.35)) * (1.0 + zoom * 2.0);
            if (rockR[i] < inner) resetRockParticle(i);

            const r = rockR[i];
            const a = rockA[i];
            rPos[i * 3] = r * Math.cos(a);
            rPos[i * 3 + 1] = rockY[i];
            rPos[i * 3 + 2] = r * Math.sin(a);

            const heat = THREE.MathUtils.clamp(1.0 - (r - inner) / 7.0, 0, 1);
            const base = 0.25 + heat * 0.2;
            const warm = 0.06 * heat;
            rCols[i * 3] = base + warm;
            rCols[i * 3 + 1] = base;
            rCols[i * 3 + 2] = base * 0.95;
        }
        rockSystem.geometry.attributes.position.needsUpdate = true;
        rockSystem.geometry.attributes.color.needsUpdate = true;

        const rbPos = rockBigSystem.geometry.attributes.position.array;
        const rbCols = rockBigSystem.geometry.attributes.color.array;
        for (let i = 0; i < ROCK_BIG_COUNT; i++) {
            rockBigR[i] -= rockBigSpeed[i] * (1.0 + zoom * 2.1);
            rockBigA[i] += (0.009 / (rockBigR[i] + 0.35)) * (1.0 + zoom * 2.1);
            if (rockBigR[i] < inner) resetRockBigParticle(i);

            const r = rockBigR[i];
            const a = rockBigA[i];
            rbPos[i * 3] = r * Math.cos(a);
            rbPos[i * 3 + 1] = rockBigY[i];
            rbPos[i * 3 + 2] = r * Math.sin(a);

            const heat = THREE.MathUtils.clamp(1.0 - (r - inner) / 7.5, 0, 1);
            const base = 0.22 + heat * 0.18;
            rbCols[i * 3] = base;
            rbCols[i * 3 + 1] = base;
            rbCols[i * 3 + 2] = base;
        }
        rockBigSystem.geometry.attributes.position.needsUpdate = true;
        rockBigSystem.geometry.attributes.color.needsUpdate = true;
    }
}

document.getElementById('shapeSelect').onchange = (e) => updateShape(e.target.value);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function setupResponsiveUI() {
    const toggleBtn = document.getElementById('uiToggle');
    const uiPanel = document.getElementById('ui-panel');
    if (!toggleBtn || !uiPanel) return;

    const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 640px)').matches;

    const syncInitialState = () => {
        if (isMobile()) document.body.classList.remove('ui-open');
        else document.body.classList.add('ui-open');
    };

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('ui-open');
    });

    window.addEventListener('resize', () => {
        if (!isMobile()) document.body.classList.add('ui-open');
    });

    syncInitialState();
}

function setupHelpPanel() {
    const helpToggle = document.getElementById('helpToggle');
    const helpPanel = document.getElementById('helpPanel');
    if (!helpToggle || !helpPanel) return;

    helpToggle.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('help-open');
    });

    document.addEventListener('click', (e) => {
        if (helpPanel.contains(e.target) || helpToggle.contains(e.target)) return;
        document.body.classList.remove('help-open');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') document.body.classList.remove('help-open');
    });
}

function setupIntroOverlay() {
    const overlay = document.getElementById('introOverlay');
    const card = document.getElementById('introCard');
    const closeBtn = document.getElementById('introClose');
    const continueBtn = document.getElementById('introContinue');
    if (!overlay || !card) return;

    const close = () => {
        document.body.classList.remove('intro-open');
    };

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (continueBtn) continueBtn.addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    card.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });

    document.body.classList.add('intro-open');
}

function setupCustomShapeSelect() {
    const selectEl = document.getElementById('shapeSelect');
    const uiPanel = document.getElementById('ui-panel');
    if (!selectEl) return;
    if (selectEl.dataset.customized === '1') return;
    selectEl.dataset.customized = '1';

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';

    const menu = document.createElement('div');
    menu.className = 'custom-select-menu';
    menu.setAttribute('role', 'listbox');

    const updateTriggerText = () => {
        const selectedOption = selectEl.options[selectEl.selectedIndex];
        trigger.textContent = selectedOption ? selectedOption.textContent : '';
    };

    const setSelected = (value) => {
        selectEl.value = value;
        updateTriggerText();
        const opts = menu.querySelectorAll('.custom-select-option');
        for (const opt of opts) {
            opt.setAttribute('aria-selected', opt.dataset.value === value ? 'true' : 'false');
        }
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
            document.body.classList.remove('ui-open');
        }
    };

    for (const option of selectEl.options) {
        const item = document.createElement('div');
        item.className = 'custom-select-option';
        item.textContent = option.textContent;
        item.dataset.value = option.value;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', option.selected ? 'true' : 'false');
        item.addEventListener('click', () => {
            setSelected(option.value);
            wrapper.classList.remove('open');
            if (uiPanel) uiPanel.classList.remove('menu-open');
        });
        menu.appendChild(item);
    }

    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        wrapper.classList.toggle('open');
        if (uiPanel) uiPanel.classList.toggle('menu-open', wrapper.classList.contains('open'));
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
            if (uiPanel) uiPanel.classList.remove('menu-open');
        }
    });

    selectEl.addEventListener('change', () => {
        updateTriggerText();
        const opts = menu.querySelectorAll('.custom-select-option');
        for (const opt of opts) {
            opt.setAttribute('aria-selected', opt.dataset.value === selectEl.value ? 'true' : 'false');
        }
    });

    updateTriggerText();

    selectEl.insertAdjacentElement('afterend', wrapper);
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
}

setupCustomShapeSelect();
setupResponsiveUI();
setupHelpPanel();
setupIntroOverlay();

initThree();
