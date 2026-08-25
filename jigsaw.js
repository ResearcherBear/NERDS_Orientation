import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// 🔧 PASTE YOUR FIREBASE CONFIG HERE (same one used in login.js / figure.js)
const firebaseConfig = {
  apiKey: "AIzaSyCMR6eaXL_UjvIne69aFFbiE5k0y0G-6wU",
  authDomain: "nerds-website-863ad.firebaseapp.com",
  projectId: "nerds-website-863ad",
  storageBucket: "nerds-website-863ad.firebasestorage.app",
  messagingSenderId: "201420001828",
  appId: "1:201420001828:web:ba1a2797553d83d9fc7eb1",
  measurementId: "G-6Z2WLJ99EF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔧 Code students need to type/scan to unlock this puzzle.
const JIGSAW_UNLOCK_CODE = "161213";

const GRID_SIZE = 3; // 3x3 = 9 tiles. Change this + puzzle.jpg's aspect ratio together if you want a different size.
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

// Points scale down the more moves it takes, with a guaranteed floor:
// points = max(300 - 10 * moves, 50)
function calculateScore(moves) {
  return Math.max(300 - 10 * moves, 50);
}

const unlockPanel = document.getElementById("unlockPanel");
const unlockHeading = document.getElementById("unlockHeading");
const unlockInput = document.getElementById("unlockInput");
const unlockBtn = document.getElementById("unlockBtn");
const unlockBackBtn = document.getElementById("unlockBackBtn");

const jigsawPanel = document.getElementById("jigsawPanel");
const jigsawHeading = document.getElementById("jigsawHeading");
const puzzleGrid = document.getElementById("puzzleGrid");
const moveCountEl = document.getElementById("moveCount");
const backBtn = document.getElementById("backBtn");
const shuffleBtn = document.getElementById("shuffleBtn");

const resultPanel = document.getElementById("resultPanel");
const resultHeading = document.getElementById("resultHeading");
const resultMoves = document.getElementById("resultMoves");
const resultPoints = document.getElementById("resultPoints");
const resultBackBtn = document.getElementById("resultBackBtn");

let scholarDocRef = null;
let scholarData = null;

// tiles[position] = which original image-slice is currently sitting in that position
let tiles = [];
let selectedPosition = null;
let moveCount = 0;
let solved = false;

function showPanel(panel) {
  [unlockPanel, jigsawPanel, resultPanel].forEach((p) => p.classList.add("hidden"));
  panel.classList.remove("hidden");
}

function showAlreadySolved(data) {
  resultHeading.textContent = "Already Solved";
  resultHeading.style.color = "";
  const result = data.jigsawResult || {};
  resultMoves.textContent = `Completed in ${result.moves ?? "-"} moves`;
  resultPoints.textContent = `Points earned: ${result.pointsAwarded ?? "-"}`;
  showPanel(resultPanel);
}

function showJustSolved(newTotal, pointsAwarded) {
  resultHeading.textContent = "Solved!";
  resultHeading.style.color = "#137333";
  resultMoves.textContent = `Completed in ${moveCount} moves`;
  resultPoints.textContent = `+${pointsAwarded} points (total: ${newTotal})`;
  showPanel(resultPanel);
}

// --- Puzzle setup --------------------------------------------------------

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isSolvedOrder(arr) {
  return arr.every((val, idx) => val === idx);
}

function setupPuzzle() {
  const correctOrder = Array.from({ length: TOTAL_TILES }, (_, i) => i);
  do {
    tiles = shuffleArray(correctOrder);
  } while (isSolvedOrder(tiles)); // don't hand them an already-solved shuffle

  moveCount = 0;
  selectedPosition = null;
  solved = false;
  moveCountEl.textContent = "0";
  jigsawHeading.textContent = "Tap Two Tiles To Swap Them";
  jigsawHeading.style.color = "";
  renderGrid();
}

function renderGrid() {
  puzzleGrid.innerHTML = "";

  tiles.forEach((sliceIndex, position) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    if (position === selectedPosition) tile.classList.add("selected");

    const row = Math.floor(sliceIndex / GRID_SIZE);
    const col = sliceIndex % GRID_SIZE;
    const step = 100 / (GRID_SIZE - 1);
    tile.style.backgroundPosition = `${col * step}% ${row * step}%`;

    tile.addEventListener("click", () => handleTileClick(position));
    puzzleGrid.appendChild(tile);
  });
}

function handleTileClick(position) {
  if (solved) return;

  if (selectedPosition === null) {
    selectedPosition = position;
    renderGrid();
    return;
  }

  if (selectedPosition === position) {
    // clicked the same tile twice - just deselect
    selectedPosition = null;
    renderGrid();
    return;
  }

  // Swap the two tiles
  [tiles[selectedPosition], tiles[position]] = [tiles[position], tiles[selectedPosition]];
  moveCount++;
  moveCountEl.textContent = moveCount;
  selectedPosition = null;
  renderGrid();

  if (isSolvedOrder(tiles)) {
    handleSolved();
  }
}

async function handleSolved() {
  solved = true;
  jigsawHeading.textContent = "Solved! Saving your score...";
  jigsawHeading.style.color = "#137333";

  if (!scholarDocRef) {
    jigsawHeading.textContent = "Solved, but can't save - please log in again";
    jigsawHeading.style.color = "#c5221f";
    return;
  }

  try {
    const pointsAwarded = calculateScore(moveCount);

    await updateDoc(scholarDocRef, {
      jigsawSolved: true,
      points: increment(pointsAwarded),
      jigsawResult: {
        moves: moveCount,
        pointsAwarded
      }
    });

    const newTotal = (scholarData.points || 0) + pointsAwarded;
    showJustSolved(newTotal, pointsAwarded);
  } catch (err) {
    console.error(err);
    jigsawHeading.textContent = "Solved, but something went wrong saving your score";
    jigsawHeading.style.color = "#c5221f";
  }
}

// --- Load the logged-in scholar's record -----------------------------

async function loadScholar() {
  const scholarId = sessionStorage.getItem("scholarId");

  if (!scholarId) {
    unlockHeading.textContent = "Please log in first";
    unlockHeading.style.color = "#c5221f";
    unlockInput.disabled = true;
    unlockBtn.disabled = true;
    return;
  }

  try {
    const scholarsRef = collection(db, "scholars");
    const q = query(scholarsRef, where("scholarId", "==", scholarId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      unlockHeading.textContent = "Scholar record not found";
      unlockHeading.style.color = "#c5221f";
      unlockInput.disabled = true;
      unlockBtn.disabled = true;
      return;
    }

    const docSnap = snapshot.docs[0];
    scholarDocRef = doc(db, "scholars", docSnap.id);
    scholarData = docSnap.data();

    if (scholarData.jigsawSolved) {
      showAlreadySolved(scholarData);
    }
  } catch (err) {
    console.error(err);
    unlockHeading.textContent = "Something went wrong loading your record";
    unlockHeading.style.color = "#c5221f";
  }
}

loadScholar();

// --- Unlock step -------------------------------------------------------

unlockBackBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});

unlockBtn.addEventListener("click", () => {
  const entered = unlockInput.value.trim();

  if (entered !== JIGSAW_UNLOCK_CODE) {
    unlockHeading.textContent = "Wrong code, try again!";
    unlockHeading.style.color = "#c5221f";
    return;
  }

  setupPuzzle();
  showPanel(jigsawPanel);
});

// --- Puzzle step -------------------------------------------------------

backBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});

shuffleBtn.addEventListener("click", () => {
  if (solved) return;
  setupPuzzle();
});

// --- Result step -----------------------------------------------------

resultBackBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});