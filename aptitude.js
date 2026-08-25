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

// 🔧 Code students need to type/scan to unlock this quiz.
const APTITUDE_UNLOCK_CODE = "101205";

// --- The 5 questions - kept simple on purpose ---------------------------
// Each `answer` is compared after trimming + lowercasing, so numbers or
// short words both work fine.
const questions = [
  { text: "What is 15 + 27?", answer: "42" },
  { text: "A train travels 60 km in 1 hour. How far does it travel in 3 hours (in km)?", answer: "180" },
  { text: "What comes next in the series: 2, 4, 6, 8, ?", answer: "10" },
  { text: "A dozen apples cost 24 rupees. What is the cost of one apple (in rupees)?", answer: "2" },
  { text: "Which number is the odd one out: 3, 5, 7, 9, 10?", answer: "10" }
];

const unlockPanel = document.getElementById("unlockPanel");
const unlockHeading = document.getElementById("unlockHeading");
const unlockInput = document.getElementById("unlockInput");
const unlockBtn = document.getElementById("unlockBtn");
const unlockBackBtn = document.getElementById("unlockBackBtn");

const quizPanel = document.getElementById("quizPanel");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const questionText = document.getElementById("questionText");
const questionNum = document.getElementById("questionNum");
const answerInput = document.getElementById("answerInput");
const quizHeading = document.getElementById("quizHeading");

const resultPanel = document.getElementById("resultPanel");
const resultHeading = document.getElementById("resultHeading");
const resultCorrect = document.getElementById("resultCorrect");
const resultTime = document.getElementById("resultTime");
const resultPoints = document.getElementById("resultPoints");
const resultBackBtn = document.getElementById("resultBackBtn");

let scholarDocRef = null;
let scholarData = null;

let currentIndex = 0;
let correctCount = 0;
let startTime = null;

function showPanel(panel) {
  [unlockPanel, quizPanel, resultPanel].forEach((p) => p.classList.add("hidden"));
  panel.classList.remove("hidden");
}

// --- Scoring -------------------------------------------------------------
// raw score = 100 * correct answers - 10 * seconds taken
// but a minimum is guaranteed based on how many were correct:
//   1-2 correct -> at least 100
//   3-4 correct -> at least 200
//   5 correct   -> at least 300
//   0 correct   -> no minimum (score floored at 0)
function calculateScore(correct, seconds) {
  const raw = 100 * correct - 10 * seconds;

  let minimum = 0;
  if (correct >= 5) minimum = 300;
  else if (correct >= 3) minimum = 200;
  else if (correct >= 1) minimum = 100;

  return Math.max(raw, minimum, 0);
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

    if (scholarData.aptitudeSolved) {
      showAlreadySolved(scholarData);
    }
  } catch (err) {
    console.error(err);
    unlockHeading.textContent = "Something went wrong loading your record";
    unlockHeading.style.color = "#c5221f";
  }
}

loadScholar();

function showAlreadySolved(data) {
  resultHeading.textContent = "Already Completed";
  resultHeading.style.color = "";
  const result = data.aptitudeResult || {};
  resultCorrect.textContent = `Correct: ${result.correct ?? "-"} / 5`;
  resultTime.textContent = `Time taken: ${result.timeSeconds ?? "-"}s`;
  resultPoints.textContent = `Points earned: ${result.pointsAwarded ?? "-"}`;
  showPanel(resultPanel);
}

// --- Unlock step -------------------------------------------------------

unlockBackBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});

unlockBtn.addEventListener("click", () => {
  const entered = unlockInput.value.trim();

  if (entered !== APTITUDE_UNLOCK_CODE) {
    unlockHeading.textContent = "Wrong code, try again!";
    unlockHeading.style.color = "#c5221f";
    return;
  }

  startTime = Date.now();
  currentIndex = 0;
  correctCount = 0;
  renderQuestion();
  showPanel(quizPanel);
});

// --- Question flow ---------------------------------------------------

function renderQuestion() {
  const q = questions[currentIndex];
  questionNum.textContent = currentIndex + 1;
  questionText.textContent = q.text;
  answerInput.value = "";
  quizHeading.style.color = "";
  nextBtn.textContent = currentIndex === questions.length - 1 ? "FINISH" : "NEXT";
}

backBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});

nextBtn.addEventListener("click", async () => {
  const entered = answerInput.value.trim().toLowerCase();
  const correctAnswer = questions[currentIndex].answer.toLowerCase();

  if (entered === correctAnswer) {
    correctCount++;
  }

  currentIndex++;

  if (currentIndex < questions.length) {
    renderQuestion();
    return;
  }

  // Finished all 5 questions
  const timeSeconds = Math.round((Date.now() - startTime) / 1000);
  const pointsAwarded = calculateScore(correctCount, timeSeconds);

  nextBtn.disabled = true;

  if (!scholarDocRef) {
    quizHeading.textContent = "Can't save your score - please log in again";
    quizHeading.style.color = "#c5221f";
    nextBtn.disabled = false;
    return;
  }

  try {
    await updateDoc(scholarDocRef, {
      aptitudeSolved: true,
      points: increment(pointsAwarded),
      aptitudeResult: {
        correct: correctCount,
        timeSeconds,
        pointsAwarded
      }
    });

    resultHeading.textContent = "Quiz Complete!";
    resultHeading.style.color = "#137333";
    resultCorrect.textContent = `Correct: ${correctCount} / 5`;
    resultTime.textContent = `Time taken: ${timeSeconds}s`;
    resultPoints.textContent = `+${pointsAwarded} points`;
    showPanel(resultPanel);
  } catch (err) {
    console.error(err);
    quizHeading.textContent = "Something went wrong saving your score";
    quizHeading.style.color = "#c5221f";
    nextBtn.disabled = false;
  }
});

// --- Result step -----------------------------------------------------

resultBackBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});
