import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

let container, renderer, scene, camera, controller;
let reticle, hitTestSource = null, hitTestSourceRequested = false;
let startPoint = null, lineMesh = null;
let isMeasuring = false;

init();
animate();

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 30);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // Bottone AR con overlay per i comandi
    const btn = ARButton.createButton(renderer, { 
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.getElementById('ui-container') }
    });
    document.body.appendChild(btn);

    // Reticolo ad alta visibilità
    const ringGeom = new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2);
    const dotGeom = new THREE.CircleGeometry(0.01, 12).rotateX(-Math.PI / 2);
    reticle = new THREE.Group();
    reticle.add(new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({ color: 0x00ff00 })));
    reticle.add(new THREE.Mesh(dotGeom, new THREE.MeshBasicMaterial({ color: 0xffffff })));
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    window.addEventListener('resize', onWindowResize);
}

function onSelect() {
    if (!reticle.visible) return;

    if (!isMeasuring) {
        // PUNTO A
        startPoint = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
        isMeasuring = true;
        updateUI("Punto A fissato. Muoviti verso il punto B", "#ffcc00");
    } else {
        // PUNTO B
        const endPoint = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
        const distance = startPoint.distanceTo(endPoint);
        logMeasure(distance);
        resetMeasure();
    }
}

function updateUI(msg, color) {
    const btn = document.getElementById('main-action-btn');
    btn.textContent = msg;
    btn.style.borderColor = color;
}

function logMeasure(d) {
    const list = document.getElementById('measure-list');
    const entry = document.createElement('li');
    entry.innerHTML = `<b>${d.toFixed(2)} m</b> <small>${new Date().toLocaleTimeString()}</small>`;
    list.prepend(entry);
}

function resetMeasure() {
    isMeasuring = false;
    startPoint = null;
    if (lineMesh) {
        scene.remove(lineMesh);
        lineMesh = null;
    }
    updateUI("PUNTA E MISURA", "#00ff00");
}

function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {
            session.requestReferenceSpace('viewer').then((ref) => {
                session.requestHitTestSource({ space: ref }).then((source) => {
                    hitTestSource = source;
                });
            });
            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitResults = frame.getHitTestResults(hitTestSource);
            if (hitResults.length > 0) {
                const hit = hitResults[0];
                const pose = hit.getPose(referenceSpace);
                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);

                // LOGICA MISURA DINAMICA
                if (isMeasuring && startPoint) {
                    const currentPos = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
                    const d = startPoint.distanceTo(currentPos);
                    document.getElementById('current-value').textContent = d.toFixed(2);
                    drawLaser(startPoint, currentPos);
                }
                if(!isMeasuring) updateUI("AGANCIA PUNTO A", "#00ff00");
            } else {
                reticle.visible = false;
                updateUI("MUOVI TELEFONO: CERCO PIANO...", "#ff0000");
            }
        }
    }
    renderer.render(scene, camera);
}

function drawLaser(start, end) {
    if (lineMesh) scene.remove(lineMesh);
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 5 });
    lineMesh = new THREE.Line(geometry, material);
    scene.add(lineMesh);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
