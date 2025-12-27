import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

let container, scene, camera, renderer, controller, reticle;
let hitTestSource = null;
let hitTestSourceRequested = false;
let startPoint = null;
let currentLine = null;

// Avvio immediato senza attese
init();
animate();

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    renderer = new THREE.WebGLRenderer({ 
        antialias: false, // Disabilitato per aumentare la compatibilità GPU
        alpha: true, 
        precision: 'mediump' 
    });
    renderer.setPixelRatio(1); // Forza pixel ratio basso per stabilità
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // Configurazione AR forzata per Xiaomi Redmi Note Pro+ 5G
    const sessionInit = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.getElementById('ui-container') }
    };

    const arButton = ARButton.createButton(renderer, sessionInit);
    document.body.appendChild(arButton);

    // Forza il testo sul bottone se rimane incastrato
    setTimeout(() => {
        const btn = document.querySelector('button');
        if (btn && (btn.textContent.includes('LOADING') || btn.textContent.includes('CARICAMENTO'))) {
            btn.textContent = "AVVIA MISURATORE AR";
            btn.style.background = "#2196F3";
            btn.disabled = false;
        }
    }, 1500);

    // Mirino (Reticle)
    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Controller
    controller = renderer.xr.getController(0);
    scene.add(controller);

    // Eventi pulsanti UI
    document.getElementById('btn-place').onclick = onPlacePoint;
    document.getElementById('btn-reset').onclick = resetAll;
}

function onPlacePoint(e) {
    e.preventDefault(); // Impedisce conflitti touch
    if (!reticle.visible) return;

    const pos = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);

    if (!startPoint) {
        startPoint = pos.clone();
        document.getElementById('btn-place').textContent = "FISSA FINE (B)";
        document.getElementById('status-bar').textContent = "Punto A fissato. Muoviti verso B.";
    } else {
        const dist = startPoint.distanceTo(pos);
        saveMeasure(dist);
        startPoint = null;
        if(currentLine) scene.remove(currentLine);
        document.getElementById('btn-place').textContent = "FISSA INIZIO (A)";
    }
}

function saveMeasure(dist) {
    const li = document.createElement('li');
    li.style.padding = "5px";
    li.style.borderBottom = "1px solid #ccc";
    li.textContent = `Misura: ${dist.toFixed(3)} m`;
    document.getElementById('measurements-list').prepend(li);
}

function resetAll() {
    startPoint = null;
    if(currentLine) scene.remove(currentLine);
    document.getElementById('measurements-list').innerHTML = "";
    document.getElementById('measurement-display').textContent = "0.00 m";
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
    if (frame) {
        const session = renderer.xr.getSession();
        const referenceSpace = renderer.xr.getReferenceSpace();

        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then((refSpace) => {
                session.requestHitTestSource({ space: refSpace }).then((source) => {
                    hitTestSource = source;
                });
            });
            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);

                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);

                if (startPoint) {
                    const currentPos = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
                    const dist = startPoint.distanceTo(currentPos);
                    document.getElementById('measurement-display').textContent = `${dist.toFixed(2)} m`;
                    updateLine(startPoint, currentPos);
                }
            } else {
                reticle.visible = false;
            }
        }
    }
    renderer.render(scene, camera);
}

function updateLine(pA, pB) {
    if(currentLine) scene.remove(currentLine);
    const geo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
    currentLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00ff00 }));
    scene.add(currentLine);
}
