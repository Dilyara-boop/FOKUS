import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBFBsCxg0Vk0C1e-G9YZxgxaCMADUPSLdM",
    authDomain: "focus-1e74a.firebaseapp.com",
    projectId: "focus-1e74a",
    storageBucket: "focus-1e74a.firebasestorage.app",
    messagingSenderId: "872858278219",
    appId: "1:872858278219:web:84bddb080dd795b8d8b0ce"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const button = document.getElementById("syncButton");
const status = document.getElementById("syncStatus");
const tasks = [
    { key: "business", card: document.querySelector("#todayTab .focus-card.business") },
    { key: "english", card: document.querySelector("#todayTab .focus-card.english-card") },
    { key: "self", card: document.querySelector("#todayTab .focus-card.myself-card") }
].map((task, index) => ({
    ...task,
    index,
    input: task.card?.querySelector(".focus-input"),
    checkbox: task.card?.querySelector(".focus-done")
}));

let currentUser = null;
let saveTimer = null;
let loadingCloud = false;

function setStatus(message, state = "") {
    status.textContent = message;
    status.dataset.state = state;
}

function collectTasks() {
    return Object.fromEntries(tasks.map(task => [task.key, {
        text: task.input?.value ?? "",
        done: Boolean(task.checkbox?.checked)
    }]));
}

async function saveCloud() {
    if (!currentUser || loadingCloud) return;
    setStatus("Сохраняю…", "working");
    try {
        await setDoc(doc(db, "users", currentUser.uid, "focus_data", "today"), {
            ...collectTasks(),
            updatedAt: serverTimestamp()
        });
        setStatus("Синхронизировано ✓", "ok");
    } catch (error) {
        console.warn("FOCUS sync save failed", error);
        setStatus("Не удалось синхронизировать. Данные сохранены на устройстве", "error");
    }
}

function scheduleSave() {
    if (!currentUser || loadingCloud) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCloud, 700);
}

async function loadCloud(user) {
    setStatus("Загружаю данные…", "working");
    loadingCloud = true;
    try {
        const snapshot = await getDoc(doc(db, "users", user.uid, "focus_data", "today"));
        if (snapshot.exists()) {
            const cloud = snapshot.data();
            tasks.forEach(task => {
                const value = cloud[task.key];
                if (!task.input || !task.checkbox || !value || typeof value.text !== "string" || typeof value.done !== "boolean") return;
                task.input.value = value.text;
                task.checkbox.checked = value.done;
                task.card?.classList.toggle("completed", value.done);
                localStorage.setItem(`focusTask${task.index}`, value.text);
                localStorage.setItem(`focusDone${task.index}`, String(value.done));
            });
        } else {
            await saveCloud();
        }
        setStatus("Синхронизировано ✓", "ok");
    } catch (error) {
        console.warn("FOCUS sync load failed", error);
        setStatus("Облако недоступно. Работаю с данными на устройстве", "error");
    } finally {
        loadingCloud = false;
    }
}

tasks.forEach(task => {
    task.input?.addEventListener("input", scheduleSave);
    task.checkbox?.addEventListener("change", scheduleSave);
});

button.addEventListener("click", async () => {
    button.disabled = true;
    try {
        if (currentUser) {
            await signOut(auth);
        } else {
            setStatus("Открываю вход Google…", "working");
            await signInWithPopup(auth, provider);
        }
    } catch (error) {
        console.warn("FOCUS Google auth failed", error);
        setStatus("Вход отменён или заблокирован браузером", "error");
    } finally {
        button.disabled = false;
    }
});

onAuthStateChanged(auth, user => {
    currentUser = user;
    if (user) {
        button.textContent = "☁ Выйти из синхронизации";
        button.title = user.email || "Аккаунт Google подключён";
        loadCloud(user);
    } else {
        button.textContent = "☁ Войти и синхронизировать";
        button.removeAttribute("title");
        setStatus("Данные хранятся на этом устройстве");
    }
});

window.focusFirebase = { app, db, auth };
