const video = document.createElement('video');
let currentTilt = 0;
let baseAngle = null;
let isMeasuringHeight = false;

// 1. Avvio Fotocamera Standard
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", focusMode: "continuous" } 
        });
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.className = "fullscreen-video";
        video.play();
        document.body.appendChild(video);
        document.getElementById('status-bar').textContent = "PRONTO: Punta la base";
    } catch (e) {
        document.getElementById('status-bar').textContent = "ERRORE CAMERA: " + e.message;
    }
}

// 2. Lettura Sensori (Inclinazione)
window.addEventListener('deviceorientation', (e) => {
    // Usiamo 'beta' per l'inclinazione avanti/dietro
    currentTilt = e.beta; 
});

// 3. Logica di Misurazione
document.getElementById('btn-action').onclick = () => {
    const h = parseFloat(document.getElementById('user-height').value);
    
    if (baseAngle === null) {
        // Step 1: Fissa la base (Distanza)
        baseAngle = currentTilt;
        const dist = h * Math.tan((90 - baseAngle) * Math.PI / 180);
        
        document.getElementById('measurement-display').textContent = Math.abs(dist).toFixed(2) + " m";
        document.getElementById('btn-action').textContent = "PUNTA CIMA";
        document.getElementById('status-bar').textContent = "Distanza rilevata. Ora punta il punto più alto.";
    } else {
        // Step 2: Fissa la cima (Altezza)
        const topAngle = currentTilt;
        const radBase = (90 - baseAngle) * Math.PI / 180;
        const radTop = (topAngle - baseAngle) * Math.PI / 180;

        const distance = h * Math.tan(radBase);
        const heightAboveEye = Math.abs(distance * Math.tan((topAngle - (90 - (90 - baseAngle))) * Math.PI / 180));
        
        // Calcolo altezza totale semplificato per esterni/interni
        const totalHeight = Math.abs(h + (distance * Math.tan((topAngle - baseAngle) * Math.PI / 180)));

        document.getElementById('measurement-display').textContent = totalHeight.toFixed(2) + " m";
        saveMeasure(totalHeight.toFixed(2));
        
        // Reset per prossima misura
        baseAngle = null;
        document.getElementById('btn-action').textContent = "PUNTA BASE";
        document.getElementById('status-bar').textContent = "Misura completata. Ricomincia dalla base.";
    }
};

function saveMeasure(val) {
    const li = document.createElement('li');
    li.textContent = `Altezza: ${val} m - ${new Date().toLocaleTimeString()}`;
    document.getElementById('measurements-list').prepend(li);
}

document.getElementById('btn-reset').onclick = () => {
    baseAngle = null;
    document.getElementById('measurement-display').textContent = "0.00 m";
    document.getElementById('btn-action').textContent = "PUNTA BASE";
    document.getElementById('measurements-list').innerHTML = "";
};

initCamera();
