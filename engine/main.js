import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export const cameraState = {
    rotX: 0,
    rotY: 0,
    zoom: 1.0
};

let scene, camera, renderer, raycaster, touchVector;
let celestialObjects = [];
const OBJECT_COUNT = 250;

const SPECTRAL_TYPES = [
    { category: 'star', name: 'Blue Supergiant', temp: '32,000 K', mass: '18.4 M☉', color: 0x00bfff, emissive: 0x0088ff },
    { category: 'star', name: 'Yellow Main Sequence', temp: '5,780 K', mass: '1.0 M☉', color: 0xffaa00, emissive: 0xff6600 },
    { category: 'star', name: 'Red Dwarf', temp: '3,100 K', mass: '0.3 M☉', color: 'ff3355', emissive: 0xcc0022 },
    { category: 'blackhole', name: 'Primordial Black Hole', temp: '0.0001 K', mass: '30.0 M☉', color: 0x000000, emissive: 0x7000ff },
    { category: 'neutron', name: 'Neutron Star', temp: '600,000 K', mass: '1.4 M☉', color: 0x00ffe5, emissive: 0x00bbcc },
    { category: 'planet', name: 'Terrestrial Protoplanet', temp: '288 K', mass: '0.8 M⊕', color: 0x4d88ff, emissive: 0x112244 }
];

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    initThreeJSScene(container);
}

function initThreeJSScene(container) {
    container.innerHTML = '';

    // 1. Scene & Camera Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020206);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 400;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    touchVector = new THREE.Vector2();

    // 2. 3D Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const centerPointLight = new THREE.PointLight(0x7000ff, 2, 800);
    centerPointLight.position.set(0, 0, 0);
    scene.add(centerPointLight);

    // 3. Generate 3D Celestial Meshes
    celestialObjects = [];
    const sphereGeo = new THREE.SphereGeometry(1, 32, 32);

    for (let i = 0; i < OBJECT_COUNT; i++) {
        const spec = SPECTRAL_TYPES[Math.floor(Math.random() * SPECTRAL_TYPES.length)];
        
        // Spherical distribution
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = Math.cbrt(Math.random()) * 260 + 20;

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        let mesh;

        if (spec.category === 'blackhole') {
            // Black Hole Group: Event Horizon Sphere + 3D Accretion Disk Ring
            const group = new THREE.Group();
            
            const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const horizonMesh = new THREE.Mesh(sphereGeo, horizonMat);
            horizonMesh.scale.set(6, 6, 6);
            group.add(horizonMesh);

            const ringGeo = new THREE.RingGeometry(8, 16, 32);
            const ringMat = new THREE.MeshBasicMaterial({ 
                color: 0x7000ff, 
                side: THREE.DoubleSide, 
                transparent: true, 
                opacity: 0.85 
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = Math.PI / 3;
            group.add(ringMesh);

            mesh = group;
        } else {
            // 3D Sphere with Physical Material Shading
            const scale = spec.category === 'planet' ? 2.5 : (Math.random() * 3 + 3);
            const mat = new THREE.MeshStandardMaterial({
                color: spec.color,
                emissive: spec.emissive,
                emissiveIntensity: spec.category === 'planet' ? 0.2 : 0.8,
                roughness: 0.4,
                metalness: 0.2
            });
            mesh = new THREE.Mesh(sphereGeo, mat);
            mesh.scale.set(scale, scale, scale);
        }

        mesh.position.set(x, y, z);
        scene.add(mesh);

        // Store metadata on mesh for raycasting inspection
        mesh.userData = {
            id: `OBJ-${Math.floor(10000 + Math.random() * 90000)}`,
            name: `${spec.category.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
            type: spec.name,
            temp: spec.temp,
            mass: spec.mass,
            distanceOrigin: Math.floor(r * 120 + 150)
        };

        celestialObjects.push(mesh);
    }

    // 4. Raycasting Touch Selector
    window.selectParticleAt = function(clientX, clientY) {
        touchVector.x = (clientX / window.innerWidth) * 2 - 1;
        touchVector.y = -(clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(touchVector, camera);
        const intersects = raycaster.intersectObjects(celestialObjects, true);

        if (intersects.length > 0) {
            let hit = intersects[0].object;
            while (hit.parent && hit.parent !== scene) {
                if (hit.userData && hit.userData.name) break;
                hit = hit.parent;
            }

            const data = hit.userData;
            if (data && data.name) {
                // Update Preview Card
                const objName = document.getElementById('obj-name');
                const objSub = document.getElementById('obj-sub');
                const preview = document.getElementById('inspector-preview');

                if (objName) objName.innerText = data.name;
                if (objSub) objSub.innerText = `${data.type} | ${data.distanceOrigin.toLocaleString()} ly from Core`;
                if (preview) preview.classList.add('active');

                // Update Modal Spec Sheet
                const modalTitle = document.getElementById('modal-obj-title');
                const modalSub = document.getElementById('modal-obj-sub');
                if (modalTitle) modalTitle.innerText = data.name;
                if (modalSub) modalSub.innerText = data.type;

                const elId = document.getElementById('spec-id');
                const elClass = document.getElementById('spec-class');
                const elMass = document.getElementById('spec-mass');
                const elTemp = document.getElementById('spec-temp');
                const elDist = document.getElementById('spec-dist');

                if (elId) elId.innerText = data.id;
                if (elClass) elClass.innerText = data.type;
                if (elMass) elMass.innerText = data.mass;
                if (elTemp) elTemp.innerText = data.temp;
                if (elDist) elDist.innerText = `${data.distanceOrigin.toLocaleString()} ly`;
            }
        }
    };

    // 5. Window Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 6. Animation Render Loop
    function animate() {
        requestAnimationFrame(animate);

        // Continuous 3D rotation & camera state controls
        scene.rotation.y += 0.001;
        scene.rotation.x = cameraState.rotX * 0.5;
        scene.rotation.y += cameraState.rotY * 0.01;
        camera.position.z = 400 / cameraState.zoom;

        renderer.render(scene, camera);
    }

    animate();
}
