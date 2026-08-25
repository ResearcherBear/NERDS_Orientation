// This page mostly just links out to the real screens (scan, quiz).
// Selfie / Find / Task / Work aren't wired up to a screen yet, so their
// cards stay non-clickable (see main.css: .card:not(.clickable)).

const scanBtn = document.getElementById("scanBtn");
const mapBtn = document.getElementById("mapBtn");
const quizCard = document.getElementById("quizCard");

// SCAN opens the camera / QR scanning screen
scanBtn.addEventListener("click", () => {
  window.location.href = "scan.html";
});

// MAP opens the map screen
mapBtn.addEventListener("click", () => {
  window.location.href = "map.html";
});

figureCard.addEventListener("click", () => {
  window.location.href = "figure.html";
});

AptitudeCard.addEventListener("click", () => {
  window.location.href = "aptitude.html";
});

JigCard.addEventListener("click", () => {
  window.location.href = "jigsaw.html";
});

typingCard.addEventListener("click", () => {
  window.location.href = "typing.html";
});

SuCard.addEventListener("click", () => {
  window.location.href = "sudoku.html";
});
MoveCard.addEventListener("click", () => {
  window.location.href = "move.html";
});
// Example of reading who's logged in, once login.html sets this:
// const scholarId = sessionStorage.getItem("scholarId");
// console.log("Logged in as:", scholarId);
