const video = document.getElementById("cameraFeed");
const canvas = document.getElementById("cameraCanvas");
const canvasCtx = canvas.getContext("2d", { willReadFrequently: true });
const cameraHint = document.getElementById("cameraHint");
const codeDisplay = document.getElementById("codeDisplay");
const backBtn = document.getElementById("backBtn");
const mapBtn = document.getElementById("mapBtn");

let stream = null;
let scanning = false;

// --- Camera setup -----------------------------------------------------

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    video.srcObject = stream;
    await video.play();

    video.addEventListener("loadedmetadata", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    });

    scanning = true;
    requestAnimationFrame(scanFrame);
  } catch (err) {
    console.error(err);
    cameraHint.textContent = "Camera unavailable - type the code manually below";
  }
}

function stopCamera() {
  scanning = false;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}

// --- jsQR scanning loop -------------------------------------------------

function scanFrame() {
  if (!scanning) return;

  if (video.readyState === video.HAVE_ENOUGH_DATA && canvas.width > 0) {
    canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);

    // jsQR is loaded globally via the CDN <script> tag in scan.html
    const result = jsQR(imageData.data, imageData.width, imageData.height);

    if (result && result.data) {
      handleScannedValue(result.data.trim());
    }
  }

  requestAnimationFrame(scanFrame);
}

function handleScannedValue(value) {
  if (/^\d{6}$/.test(value)) {
    codeDisplay.textContent = value;
    cameraHint.textContent = "Code captured! Remember this number.";
    stopCamera();
  } else {
    cameraHint.textContent = "QR found, but it's not a valid 6-digit code";
  }
}

// --- Buttons -------------------------------------------------------------
// No START here - this page just displays the scanned code so the
// student can remember it and type it in manually on the quiz screen.

backBtn.addEventListener("click", () => {
  stopCamera();
  window.location.href = "main.html";
});

mapBtn.addEventListener("click", () => {
  stopCamera();
  window.location.href = "map.html";
});

// Release the camera if the user navigates away without clicking BACK
window.addEventListener("beforeunload", stopCamera);

startCamera();
