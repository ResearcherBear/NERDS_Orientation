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

// 🔧 PASTE YOUR FIREBASE CONFIG HERE (same one used in login.js / signup.js)
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

// 🔧 This is the code students need to type/scan to unlock this riddle.
const FIGURE_UNLOCK_CODE = "110706";

// The correct answer, compared case-insensitively.
const CORRECT_ANSWER = "library";
const POINTS_AWARDED = 150;

const unlockPanel = document.getElementById("unlockPanel");
const unlockHeading = document.getElementById("unlockHeading");
const unlockInput = document.getElementById("unlockInput");
const unlockBtn = document.getElementById("unlockBtn");
const unlockBackBtn = document.getElementById("unlockBackBtn");

const figurePanel = document.getElementById("figurePanel");
const backBtn = document.getElementById("backBtn");
const submitBtn = document.getElementById("submitBtn");
const answerInput = document.getElementById("answerInput");
const figureHeading = document.getElementById("figureHeading");

const resultPanel = document.getElementById("resultPanel");
const resultHeading = document.getElementById("resultHeading");
const resultPoints = document.getElementById("resultPoints");
const resultBackBtn = document.getElementById("resultBackBtn");

let scholarDocRef = null;
let scholarData = null;

function showPanel(panel) {
  [unlockPanel, figurePanel, resultPanel].forEach((p) => p.classList.add("hidden"));
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

    // Already solved on a previous visit - skip straight to the frozen state
    if (scholarData.figureSolved) {
      showAlreadySolved(scholarData.points || 0);
    }
    // Otherwise the unlock panel (shown by default in the HTML) stays as-is
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

  if (entered !== FIGURE_UNLOCK_CODE) {
    unlockHeading.textContent = "Wrong code, try again!";
    unlockHeading.style.color = "#c5221f";
    return;
  }

  showPanel(figurePanel);
});

// --- Riddle step ---------------------------------------------------------

backBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});

submitBtn.addEventListener("click", async () => {
  const entered = answerInput.value.trim().toLowerCase();

  if (entered !== CORRECT_ANSWER) {
    figureHeading.textContent = "Not quite, try again!";
    figureHeading.style.color = "#c5221f";
    return;
  }

  if (!scholarDocRef) {
    figureHeading.textContent = "Can't save your score - please log in again";
    figureHeading.style.color = "#c5221f";
    return;
  }

  submitBtn.disabled = true;

  try {
    // Atomically add points and freeze this riddle so it can't be answered again
    await updateDoc(scholarDocRef, {
      figureSolved: true,
      points: increment(POINTS_AWARDED)
    });

    const newTotal = (scholarData.points || 0) + POINTS_AWARDED;
    showJustSolved(newTotal);
  } catch (err) {
    console.error(err);
    figureHeading.textContent = "Something went wrong saving your score";
    figureHeading.style.color = "#c5221f";
    submitBtn.disabled = false;
  }
});

// --- Result step -----------------------------------------------------

resultBackBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});
