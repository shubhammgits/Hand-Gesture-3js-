let scene, camera, renderer, particleSystem, starField;
let targetScale = 1, currentScale = 1;
let targetRotationZ = 0, currentRotationZ = 0;
const PARTICLE_COUNT = 30000;

const AUDIO_URL = 'YOUR_MUSIC_FILE_HERE.mp3';
const audio = new Audio(AUDIO_URL);
audio.loop = true;
let musicPlaying = false;

document.getElementById('musicToggle').onclick = () => {
    if(!musicPlaying) {
        audio.play();
        document.getElementById('musicToggle').innerText = "PAUSE NEURAL AUDIO";
    } else {
        audio.pause();
        document.getElementById('musicToggle').innerText = "PLAY NEURAL AUDIO";
    }
    musicPlaying = !musicPlaying;
};

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(10000 * 3);
    for(let i=0; i<30000; i++) starPos[i] = (Math.random() - 0.5) * 1000;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true });
    starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

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

    updateShape('sun');
    animate();
}

function updateShape(type) {
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
        } else {
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
    particleSystem.rotation.y += 0.003;

    starField.rotation.y += 0.0005;

    renderer.render(scene, camera);
}

document.getElementById('shapeSelect').onchange = (e) => updateShape(e.target.value);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

initThree();
