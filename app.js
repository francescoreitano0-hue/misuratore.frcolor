import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

let container, renderer, scene, camera, controller;
let reticle, hitTestSource = null, hitTestSourceRequested = false;
let measurements = [];
let startPoint = null;
let currentLine = null;
let isMeasuring = false;

init();
animate();

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // Integrazione ARButton
    document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

    // Mirino (Reticle)
    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Controller (Input tap sullo schermo)
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    window.addEventListener('resize', onWindowResize);
    document.getElementById('reset-btn').addEventListener('click', resetSession);
}

function onSelect() {
    if (!reticle.visible) return;

    if (!isMeasuring) {
        // Inizio misura
        startPoint = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
        isMeasuring = true;
        document.getElementById('main-action-btn').textContent = "FISSA FINE";
    } else {
        // Fine misura
        const endPoint = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
        const dist = startPoint.distanceTo(endPoint);
        saveMeasure(dist);
        isMeasuring = false;
        startPoint = null;
        document.getElementById('main-action-btn').textContent = "MISURA NUOVA";
    }
}

function saveMeasure(val) {
    const list = document.getElementById('measure-list');
    const li = document.createElement('li');
    li.innerText = `Misura: ${val.toFixed(2)}m - ${new Date().toLocaleTimeString()}`;
    list.prepend(li);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then((referenceSpace) => {
                session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                    hitTestSource = source;
                });
            });
            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length) {
                const hit = hitTestResults[0];
                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
                
                document.getElementById('main-action-btn').disabled = false;
                document.getElementById('accuracy-indicator').textContent = "Punto Agganciato";
                document.getElementById('accuracy-indicator').style.color = "#00ff00";

                if (isMeasuring && startPoint) {
                    const currentPos = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
                    const d = startPoint.distanceTo(currentPos);
                    document.getElementById('current-value').textContent = d.toFixed(2);
                }
            } else {
                reticle.visible = false;
                document.getElementById('accuracy-indicator').textContent = "Scansiona la superficie...";
                document.getElementById('accuracy-indicator').style.color = "#ff0000";
            }
        }
    }
    renderer.render(scene, camera);
}

function resetSession() {
    isMeasuring = false;
    startPoint = null;
    document.getElementById('current-value').textContent = "0.00";
    document.getElementById('measure-list').innerHTML = "";
}
