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

// 🔧 Code students need to type/scan to unlock this challenge.
const TYPING_UNLOCK_CODE = "120116";

const TARGET_SENTENCE =
  "I love robotics. I am really excited for N.E.R.D.S orientation. Hope it will begin soon";

// Scoring: points = wpm * 10 - errors * 5, with a guaranteed floor of 50
// once they've submitted (typing something is always worth at least 50).
function calculateScore(wpm, errors) {
  const raw = Math.round(wpm * 10 - errors * 5);
  return Math.max(raw, 50);
}

const unlockPanel = document.getElementById("unlockPanel");
const unlockHeading = document.getElementById("unlockHeading");
const unlockInput = document.getElementById("unlockInput");
const unlockBtn = document.getElementById("unlockBtn");
const unlockBackBtn = document.getElementById("unlockBackBtn");

const countdownPanel = document.getElementById("countdownPanel");
const countdownNumber = document.getElementById("countdownNumber");

const typingPanel = document.getElementById("typingPanel");
const typingHeading = document.getElementById("typingHeading");
const targetSentence = document.getElementById("targetSentence");
const typingInput = document.getElementById("typingInput");
const backBtn = document.getElementById("backBtn");
const submitBtn = document.getElementById("submitBtn");

const resultPanel = document.getElementById("resultPanel");
const resultHeading = document.getElementById("resultHeading");
const resultWpm = document.getElementById("resultWpm");
const resultErrors = document.getElementById("resultErrors");
const resultPoints = document.getElementById("resultPoints");
const resultBackBtn = document.getElementById("resultBackBtn");

let scholarDocRef = null;
let scholarData = null;
let startTime = null;

targetSentence.textContent = TARGET_SENTENCE;

function showPanel(panel) {
  [unlockPanel, countdownPanel, typingPanel, resultPanel].forEach((p) => p.classList.add("hidden"));
  panel.classList.remove("hidden");
}

function showAlreadySolved(data) {
  resultHeading.textContent = "Already Completed";
  resultHeading.style.color = "";
  const result = data.typingResult || {};
  resultWpm.textContent = `Speed: ${result.wpm ?? "-"} WPM`;
  resultErrors.textContent = `Errors: ${result.errors ?? "-"}`;
  resultPoints.textContent = `Points earned: ${result.pointsAwarded ?? "-"}`;
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

    if (scholarData.typingSolved) {
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

  if (entered !== TYPING_UNLOCK_CODE) {
    unlockHeading.textContent = "Wrong code, try again!";
    unlockHeading.style.color = "#c5221f";
    return;
  }

  runCountdown();
});

// --- 3, 2, 1, GO countdown ----------------------------------------------

function runCountdown() {
  showPanel(countdownPanel);

  const sequence = ["3", "2", "1", "GO!"];
  let i = 0;
  countdownNumber.textContent = sequence[i];

  const interval = setInterval(() => {
    i++;
    if (i < sequence.length) {
      countdownNumber.textContent = sequence[i];
    } else {
      clearInterval(interval);
      beginTyping();
    }
  }, 800);
}

function beginTyping() {
  typingInput.value = "";
  typingHeading.textContent = "Type The Sentence Below";
  typingHeading.style.color = "";
  submitBtn.disabled = false;
  showPanel(typingPanel);
  startTime = Date.now();
  typingInput.focus();
}

// Discourage pasting the sentence in instead of actually typing it
typingInput.addEventListener("paste", (e) => {
  e.preventDefault();
});

// --- Typing step ---------------------------------------------------------

backBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});

submitBtn.addEventListener("click", async () => {
  const typed = typingInput.value;
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const elapsedMinutes = elapsedSeconds / 60;

  // Errors: compare character by character (including length mismatches)
  const maxLen = Math.max(typed.length, TARGET_SENTENCE.length);
  let errors = 0;
  for (let i = 0; i < maxLen; i++) {
    if (typed[i] !== TARGET_SENTENCE[i]) errors++;
  }

  // Standard typing-test WPM: (characters typed / 5) / minutes elapsed
  const wpm = elapsedMinutes > 0 ? Math.round((typed.length / 5) / elapsedMinutes) : 0;

  const pointsAwarded = calculateScore(wpm, errors);

  submitBtn.disabled = true;

  if (!scholarDocRef) {
    typingHeading.textContent = "Can't save your score - please log in again";
    typingHeading.style.color = "#c5221f";
    submitBtn.disabled = false;
    return;
  }

  try {
    await updateDoc(scholarDocRef, {
      typingSolved: true,
      points: increment(pointsAwarded),
      typingResult: {
        wpm,
        errors,
        pointsAwarded
      }
    });

    resultHeading.textContent = "Nice Typing!";
    resultHeading.style.color = "#137333";
    resultWpm.textContent = `Speed: ${wpm} WPM`;
    resultErrors.textContent = `Errors: ${errors}`;
    resultPoints.textContent = `+${pointsAwarded} points`;
    showPanel(resultPanel);
  } catch (err) {
    console.error(err);
    typingHeading.textContent = "Something went wrong saving your score";
    typingHeading.style.color = "#c5221f";
    submitBtn.disabled = false;
  }
});

// --- Result step -----------------------------------------------------

resultBackBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});
