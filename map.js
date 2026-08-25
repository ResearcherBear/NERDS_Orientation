const scanBtn = document.getElementById("scanBtn");
const backBtn = document.getElementById("backBtn");

// SCAN from the map screen jumps straight to the camera screen
scanBtn.addEventListener("click", () => {
  window.location.href = "scan.html";
});

backBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});

// TODO: once you're ready, this is where you'd plug in an actual map
// (e.g. Google Maps JS API, Leaflet, or Firestore-driven pins for each
// activity's location) inside #mapBox.
