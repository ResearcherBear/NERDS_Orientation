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
const SUDOKU_UNLOCK_CODE = "170725";

// Generated + verified with gen_sudoku.py (backtracking solver + uniqueness
// check) - this is a real, solvable-with-one-answer 4x4 sudoku, not guessed.
// 0 = blank cell the student needs to fill in.
const PUZZLE = [
  [0, 4, 0, 1],
  [2, 0, 0, 0],
  [0, 0, 4, 0],
  [4, 2, 1, 3]
];

const SOLUTION = [
  [3, 4, 2, 1],
  [2, 1, 3, 4],
  [1, 3, 4, 2],
  [4, 2, 1, 3]
];

// Points scale down the longer it takes, with a guaranteed floor:
// points = max(300 - 5 * seconds, 100)
function calculateScore(seconds) {
  return Math.max(500 - 5 * seconds, 100);
}

const unlockPanel = document.getElementById("unlockPanel");
const unlockHeading = document.getElementById("unlockHeading");
const unlockInput = document.getElementById("unlockInput");
const unlockBtn = document.getElementById("unlockBtn");
const unlockBackBtn = document.getElementById("unlockBackBtn");

const sudokuPanel = document.getElementById("sudokuPanel");
const sudokuHeading = document.getElementById("sudokuHeading");
const sudokuGrid = document.getElementById("sudokuGrid");
const backBtn = document.getElementById("backBtn");
const submitBtn = document.getElementById("submitBtn");

const resultPanel = document.getElementById("resultPanel");
const resultHeading = document.getElementById("resultHeading");
const resultTime = document.getElementById("resultTime");
const resultPoints = document.getElementById("resultPoints");
const resultBackBtn = document.getElementById("resultBackBtn");

let scholarDocRef = null;
let scholarData = null;
let startTime = null;
let cellInputs = [];

function showPanel(panel) {
  [unlockPanel, sudokuPanel, resultPanel].forEach((p) => p.classList.add("hidden"));
  panel.classList.remove("hidden");
}

function showAlreadySolved(data) {
  resultHeading.textContent = "Already Solved";
  resultHeading.style.color = "";
  const result = data.sudokuResult || {};
  resultTime.textContent = `Time taken: ${result.timeSeconds ?? "-"}s`;
  resultPoints.textContent = `Points earned: ${result.pointsAwarded ?? "-"}`;
  showPanel(resultPanel);
}

// --- Build the grid ------------------------------------------------------

function buildGrid() {
  sudokuGrid.innerHTML = "";
  cellInputs = [];

  for (let r = 0; r < 4; r++) {
    const rowInputs = [];
    for (let c = 0; c < 4; c++) {
      const cell = document.createElement("input");
      cell.type = "text";
      cell.className = "sudoku-cell";
      cell.maxLength = 1;
      cell.inputMode = "numeric";

      if (PUZZLE[r][c] !== 0) {
        cell.value = PUZZLE[r][c];
        cell.disabled = true;
        cell.classList.add("given");
      } else {
        cell.addEventListener("input", () => {
          // Only allow digits 1-4, strip anything else
          cell.value = cell.value.replace(/[^1-4]/g, "").slice(0, 1);
          cell.classList.remove("wrong");
        });
      }

      sudokuGrid.appendChild(cell);
      rowInputs.push(cell);
    }
    cellInputs.push(rowInputs);
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

    if (scholarData.sudokuSolved) {
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

  if (entered !== SUDOKU_UNLOCK_CODE) {
    unlockHeading.textContent = "Wrong code, try again!";
    unlockHeading.style.color = "#c5221f";
    return;
  }

  buildGrid();
  sudokuHeading.textContent = "Fill 1-4 In Every Row, Column & Box";
  sudokuHeading.style.color = "";
  showPanel(sudokuPanel);
  startTime = Date.now();
});

// --- Puzzle step -------------------------------------------------------

backBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});

submitBtn.addEventListener("click", async () => {
  let allFilled = true;
  let allCorrect = true;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = cellInputs[r][c];
      const val = parseInt(cell.value, 10);

      if (!val) {
        allFilled = false;
        continue;
      }

      if (val !== SOLUTION[r][c]) {
        allCorrect = false;
        cell.classList.add("wrong");
      }
    }
  }

  if (!allFilled) {
    sudokuHeading.textContent = "Fill in every empty cell first";
    sudokuHeading.style.color = "#c5221f";
    return;
  }

  if (!allCorrect) {
    sudokuHeading.textContent = "Some cells are wrong - try again!";
    sudokuHeading.style.color = "#c5221f";
    return;
  }

  // Solved correctly
  const timeSeconds = Math.round((Date.now() - startTime) / 1000);
  const pointsAwarded = calculateScore(timeSeconds);

  submitBtn.disabled = true;

  if (!scholarDocRef) {
    sudokuHeading.textContent = "Can't save your score - please log in again";
    sudokuHeading.style.color = "#c5221f";
    submitBtn.disabled = false;
    return;
  }

  try {
    await updateDoc(scholarDocRef, {
      sudokuSolved: true,
      points: increment(pointsAwarded),
      sudokuResult: {
        timeSeconds,
        pointsAwarded
      }
    });

    resultHeading.textContent = "Solved!";
    resultHeading.style.color = "#137333";
    resultTime.textContent = `Time taken: ${timeSeconds}s`;
    resultPoints.textContent = `+${pointsAwarded} points`;
    showPanel(resultPanel);
  } catch (err) {
    console.error(err);
    sudokuHeading.textContent = "Something went wrong saving your score";
    sudokuHeading.style.color = "#c5221f";
    submitBtn.disabled = false;
  }
});

// --- Result step -----------------------------------------------------

resultBackBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});
