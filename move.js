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
const MOVE_UNLOCK_CODE = "190825";

// The verified shortest path through maze.png (computed with BFS - see
// gen_maze.py). U = Up, L = Left, R = Right. Compared case-insensitively.
const CORRECT_ANSWER = "UULLLUUL";
const POINTS_AWARDED = 150;

const unlockPanel = document.getElementById("unlockPanel");
const unlockHeading = document.getElementById("unlockHeading");
const unlockInput = document.getElementById("unlockInput");
const unlockBtn = document.getElementById("unlockBtn");
const unlockBackBtn = document.getElementById("unlockBackBtn");

const movePanel = document.getElementById("movePanel");
const backBtn = document.getElementById("backBtn");
const submitBtn = document.getElementById("submitBtn");
const answerInput = document.getElementById("answerInput");

const resultPanel = document.getElementById("resultPanel");
const resultHeading = document.getElementById("resultHeading");
const resultPoints = document.getElementById("resultPoints");
const resultBackBtn = document.getElementById("resultBackBtn");

let scholarDocRef = null;
let scholarData = null;

function showPanel(panel) {
  [unlockPanel, movePanel, resultPanel].forEach((p) => p.classList.add("hidden"));
  panel.classList.remove("hidden");
}

function showAlreadySolved(points) {
  resultHeading.textContent = "Already Solved";
  resultHeading.style.color = "";
  resultPoints.textContent = `You have ${points} points`;
  showPanel(resultPanel);
}

function showJustSolved(newTotal) {
  resultHeading.textContent = "Correct!";
  resultHeading.style.color = "#137333";
  resultPoints.textContent = `+${POINTS_AWARDED} points (total: ${newTotal})`;
  showPanel(resultPanel);
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

    if (scholarData.moveSolved) {
      showAlreadySolved(scholarData.points || 0);
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

  if (entered !== MOVE_UNLOCK_CODE) {
    unlockHeading.textContent = "Wrong code, try again!";
    unlockHeading.style.color = "#c5221f";
    return;
  }

  showPanel(movePanel);
});

// --- Maze answer step ---------------------------------------------------

backBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});

submitBtn.addEventListener("click", async () => {
  const entered = answerInput.value.trim().toUpperCase();

  if (entered !== CORRECT_ANSWER) {
    resultHeading.textContent = "Not quite, try again!";
    // Show the error inline instead of switching panels
    const heading = document.querySelector("#movePanel .panel-heading");
    heading.textContent = "Not quite, try again!";
    heading.style.color = "#c5221f";
    return;
  }

  if (!scholarDocRef) {
    const heading = document.querySelector("#movePanel .panel-heading");
    heading.textContent = "Can't save your score - please log in again";
    heading.style.color = "#c5221f";
    return;
  }

  submitBtn.disabled = true;

  try {
    await updateDoc(scholarDocRef, {
      moveSolved: true,
      points: increment(POINTS_AWARDED)
    });

    const newTotal = (scholarData.points || 0) + POINTS_AWARDED;
    showJustSolved(newTotal);
  } catch (err) {
    console.error(err);
    const heading = document.querySelector("#movePanel .panel-heading");
    heading.textContent = "Something went wrong saving your score";
    heading.style.color = "#c5221f";
    submitBtn.disabled = false;
  }
});

// --- Result step -----------------------------------------------------

resultBackBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});
