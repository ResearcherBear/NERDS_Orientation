import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// 🔧 PASTE YOUR FIREBASE CONFIG HERE (from Firebase Console > Project settings)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

const loginForm = document.getElementById("loginForm");
const startBtn = document.getElementById("startBtn");
const dialogBox = document.querySelector(".dialog-box");
const dialogText = document.getElementById("dialogText");
const okBtn = document.getElementById("okBtn");
const signupTab = document.getElementById("signupTab");

// Tabs: LOGIN is already active on this page, SIGN UP goes to the other page
signupTab.addEventListener("click", () => {
  window.location.href = "signup.html";
});

// OK button just dismisses/resets the welcome text
okBtn.addEventListener("click", () => {
  setDialog("Hello there! welcome to the world of NIT Silchar", false);
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const scholarId = document.getElementById("scholarId").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!scholarId || !/^\d{6}$/.test(password)) {
    setDialog("Password must be exactly 6 digits!", true);
    return;
  }

  startBtn.disabled = true;
  setDialog("Checking...", false);

  try {
    const scholarsRef = collection(db, "scholars");
    // NOTE: for a real production app, never store or compare plaintext
    // passwords like this. This uses Firebase Authentication instead in
    // a real project. Kept simple here since the brief asked for a plain
    // Firestore-based check.
    const q = query(
      scholarsRef,
      where("scholarId", "==", scholarId),
      where("password", "==", password)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      setDialog("Invalid Scholar ID or Password. Try again!", true);
    } else {
      sessionStorage.setItem("scholarId", scholarId);
      window.location.href = "main.html";
    }
  } catch (err) {
    console.error(err);
    setDialog("Something went wrong: " + err.message, true);
  } finally {
    startBtn.disabled = false;
  }
});

function setDialog(msg, isError) {
  dialogText.textContent = msg;
  dialogBox.classList.toggle("error", isError);
}
