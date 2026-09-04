// ===== НОВЫЙ ДЕНЬ: ОЧИЩАЕМ ЗАДАЧИ =====

function getLocalDateKey(date = new Date()) {
    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
}

function createTaskId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return `extra-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const todayKey = getLocalDateKey();
const legacyDate = localStorage.getItem("focusDate");
const savedDay = localStorage.getItem("focusDay");
const isNewDay = savedDay
    ? savedDay !== todayKey
    : Boolean(legacyDate && legacyDate !== new Date().toDateString());
const inputs = document.querySelectorAll(".focus-input");
const doneChecks = document.querySelectorAll(".focus-done");
const mainTaskIds = ["main-business", "main-english", "main-myself"];
let completed = 0;
let extraTaskList;

try {
    extraTaskList = JSON.parse(localStorage.getItem("extraTaskList")) || [];
} catch (error) {
    extraTaskList = [];
}

extraTaskList = extraTaskList
    .filter(item => item && typeof item.text === "string")
    .map(item => ({
        id: item.id || createTaskId(),
        text: item.text,
        completed: Boolean(item.completed)
    }));

if (isNewDay) {
    extraTaskList.forEach(item => { item.completed = false; });
}
localStorage.setItem("extraTaskList", JSON.stringify(extraTaskList));
localStorage.setItem("focusDay", todayKey);
localStorage.setItem("focusDate", new Date().toDateString());

if (localStorage.getItem("totalXP") === null) {
    const legacyMainXP = [...doneChecks]
        .filter((checkbox, index) => localStorage.getItem(`focusDone${index}`) === "true")
        .length * 30;
    const legacyExtraXP = extraTaskList.filter(item => item.completed).length * 10;
    const legacyBonusXP = Number(localStorage.getItem("bonusXP")) || 0;
    const migratedXP = legacyMainXP + legacyExtraXP + legacyBonusXP;
    const legacyIsToday = !legacyDate || legacyDate === new Date().toDateString();
    localStorage.setItem("totalXP", String(migratedXP));
    localStorage.setItem("todayXP", String(legacyIsToday ? migratedXP : 0));
    localStorage.setItem("xpDate", todayKey);

    if (legacyIsToday) {
        doneChecks.forEach((checkbox, index) => {
            if (localStorage.getItem(`focusDone${index}`) === "true") {
                localStorage.setItem(`focusAward:${todayKey}:${mainTaskIds[index]}`, "true");
            }
        });
        extraTaskList.forEach(item => {
            if (item.completed) {
                localStorage.setItem(`focusAward:${todayKey}:${item.id}`, "true");
            }
        });
    }
}

if (localStorage.getItem("xpDate") !== todayKey) {
    localStorage.setItem("todayXP", "0");
    localStorage.setItem("xpDate", todayKey);
}

function changeXP(amount) {
    const totalXP = Math.max(0, (Number(localStorage.getItem("totalXP")) || 0) + amount);
    const todayXP = Math.max(0, (Number(localStorage.getItem("todayXP")) || 0) + amount);
    localStorage.setItem("totalXP", String(totalXP));
    localStorage.setItem("todayXP", String(todayXP));
}

inputs.forEach((input, index) => {
    const savedTask = localStorage.getItem(`focusTask${index}`);
    if (savedTask !== null) input.value = savedTask;
    input.addEventListener("input", () => {
        localStorage.setItem(`focusTask${index}`, input.value);
    });
});

doneChecks.forEach((checkbox, index) => {
    const saved = !isNewDay && localStorage.getItem(`focusDone${index}`) === "true";
    checkbox.checked = saved;
    if (isNewDay) localStorage.setItem(`focusDone${index}`, "false");
    checkbox.closest(".focus-card").classList.toggle("completed", saved);

    checkbox.addEventListener("change", () => {
        if (checkbox.checked && !inputs[index].value.trim()) {
            checkbox.checked = false;
            return;
        }
        const awardKey = `focusAward:${todayKey}:${mainTaskIds[index]}`;
        const wasAwarded = localStorage.getItem(awardKey) === "true";
        if (checkbox.checked && !wasAwarded) {
            changeXP(30);
            localStorage.setItem(awardKey, "true");
        } else if (!checkbox.checked && wasAwarded) {
            changeXP(-30);
            localStorage.removeItem(awardKey);
        }
        localStorage.setItem(`focusDone${index}`, String(checkbox.checked));
        checkbox.closest(".focus-card").classList.toggle("completed", checkbox.checked);
        updateProgress();
    });
});

function updateProgress() {
    completed = [...doneChecks].filter(check => check.checked).length;
    const stats = document.querySelectorAll(".stats strong");
    if (stats.length >= 3) {
        stats[0].textContent = Number(localStorage.getItem("focusStreak")) || 0;
        stats[1].textContent = Number(localStorage.getItem("todayXP")) || 0;
        stats[2].textContent = `${completed}/3`;
    }
    const level = document.querySelector(".level");
    if (level) level.innerHTML = `⭐ ${Number(localStorage.getItem("totalXP")) || 0} XP`;

    if (completed === 3 && localStorage.getItem("lastStreakDate") !== todayKey) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const streak = localStorage.getItem("lastStreakDate") === getLocalDateKey(yesterday)
            ? (Number(localStorage.getItem("focusStreak")) || 0) + 1
            : 1;
        localStorage.setItem("focusStreak", String(streak));
        localStorage.setItem("lastStreakDate", todayKey);
        if (stats[0]) stats[0].textContent = streak;
    }
}

updateProgress();

// Старый блок оставлен недоступным только для безопасной локальной миграции ключей.
if (false) {
const today = new Date().toDateString();
const savedDate = localStorage.getItem("focusDate");

if (savedDate !== today) {

    // удаляем вчерашние задачи и галочки
    for (let i = 0; i < 20; i++) {
        // Устаревший сброс удалён: пользовательские задачи сохраняются.
    }

    // запоминаем сегодняшний день
    localStorage.setItem("focusDate", today);
}
const inputs = document.querySelectorAll(".focus-input");
const doneChecks = document.querySelectorAll(".focus-done");

let completed = 0;

// СОХРАНЕНИЕ ТЕКСТА ЗАДАЧ
inputs.forEach((input, index) => {

    const savedTask = localStorage.getItem(`focusTask${index}`);

    if (savedTask) {
        input.value = savedTask;
    }

    input.addEventListener("input", () => {
        localStorage.setItem(`focusTask${index}`, input.value);
    });
});


// СОХРАНЕНИЕ ГАЛОЧЕК
doneChecks.forEach((checkbox, index) => {

    const saved =
        localStorage.getItem(`focusDone${index}`) === "true";

    checkbox.checked = saved;

    if (saved) {
        checkbox.closest(".focus-card")
            .classList.add("completed");
    }

    checkbox.addEventListener("change", () => {

        localStorage.setItem(
            `focusDone${index}`,
            checkbox.checked
        );

        checkbox.closest(".focus-card")
            .classList.toggle("completed", checkbox.checked);

        updateProgress();
    });
});


// XP И СЧЁТЧИК
function updateProgress() {

    completed = [...doneChecks]
        .filter(check => check.checked)
        .length;

    const bonusXP = Number(localStorage.getItem("bonusXP")) || 0;
const xp = completed * 30 + bonusXP;

    // Ищем нижние показатели
    const stats = document.querySelectorAll(".stats strong");

    if (stats.length >= 3) {
        stats[1].textContent = xp;
        stats[2].textContent = `${completed}/3`;
    }

    // XP в верхнем правом углу
    const level = document.querySelector(".level");

    if (level) {
        level.innerHTML = `⭐ ${xp} XP`;
        }
   // ===== ДНИ ПОДРЯД =====

const streakEl = stats[0];

const today = new Date();
const todayStr =
    today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");

let streak = Number(localStorage.getItem("focusStreak")) || 0;
const lastStreakDate = localStorage.getItem("lastStreakDate");

if (completed === 3 && lastStreakDate !== todayStr) {

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const yesterdayStr =
        yesterday.getFullYear() + "-" +
        String(yesterday.getMonth() + 1).padStart(2, "0") + "-" +
        String(yesterday.getDate()).padStart(2, "0");

    if (lastStreakDate === yesterdayStr) {
        streak += 1;
    } else {
        streak = 1;
    }

    localStorage.setItem("focusStreak", streak);
    localStorage.setItem("lastStreakDate", todayStr);
}

if (streakEl) {
    streakEl.textContent = streak;
}
}

updateProgress();
}

const greeting = document.getElementById("greeting");
const hour = new Date().getHours();

if (hour >= 5 && hour < 12) {
    greeting.textContent = "Доброе утро, Диляра ☀️";
} else if (hour >= 12 && hour < 18) {
    greeting.textContent = "Добрый день, Диляра 🌿";
} else if (hour >= 18 && hour < 23) {
    greeting.textContent = "Добрый вечер, Диляра 🌙";
} else {
    greeting.textContent = "Доброй ночи, Диляра ✨";
}

// ===== Я ЗАВИСЛА: ОТКРЫТИЕ ОКНА =====

const stuckButton = document.getElementById("stuckButton");
const stuckModal = document.getElementById("stuckModal");
const stuckClose = document.getElementById("stuckClose");
const stuckModalContent = stuckModal.querySelector(".stuck-modal-content");
const focusHelpHost = document.getElementById("focusHelpHost");

focusHelpHost.appendChild(stuckModalContent);
stuckModal.remove();

// Перейти к помощи во вкладке «Фокус».
stuckButton.addEventListener("click", () => {
    document.querySelector('[data-tab="focus"]').click();
    focusHelpHost.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Вернуться к выбору причины, не затрагивая запущенный таймер.
stuckClose.addEventListener("click", () => {
    stuckResult.classList.remove("show");
    tooManyResultEl.classList.remove("show");
    bigTaskResult.classList.remove("show");
    focusHelpHost.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ===== ВЫБЕРИ ЗА МЕНЯ =====

const pickForMe = document.getElementById("pickForMe");
const stuckResult = document.getElementById("stuckResult");
const chosenTask = document.getElementById("chosenTask");

pickForMe.addEventListener("click", () => {

    const inputs = [...document.querySelectorAll(".focus-input")];
    const checks = [...document.querySelectorAll(".focus-done")];

    const availableTasks = inputs
        .map((input, index) => ({
            text: input.value.trim(),
            done: checks[index]?.checked
        }))
        .filter(task => task.text && !task.done);

    if (availableTasks.length === 0) {
        chosenTask.textContent =
            "Нет незавершённых задач. Можно выбрать новое дело 🌿";
    } else {
        const randomTask =
            availableTasks[Math.floor(Math.random() * availableTasks.length)];

        chosenTask.textContent = randomTask.text;
    }

    stuckResult.classList.add("show");
});

// ===== ТАЙМЕР 10 МИНУТ =====

const startFocusBtn = document.getElementById("startFocusBtn");
const focusTimer = document.getElementById("focusTimer");
const finishFocusBtn = document.getElementById("finishFocusBtn");

let focusSeconds = 600;
let focusInterval = null;
let focusRewardClaimed = false;

function updateTimerText() {
    const minutes = Math.floor(focusSeconds / 60);
    const seconds = focusSeconds % 60;

    focusTimer.textContent =
        `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

startFocusBtn.addEventListener("click", () => {

    if (focusInterval) return;

   const minutes = Number(startFocusBtn.dataset.minutes) || 10;
focusSeconds = minutes * 60;

    focusTimer.classList.add("show");
    finishFocusBtn.classList.remove("show");
    finishFocusBtn.disabled = false;
    focusRewardClaimed = false;

    startFocusBtn.disabled = true;
    startFocusBtn.textContent = "Фокус идёт…";

    updateTimerText();

    focusInterval = setInterval(() => {

        focusSeconds--;
        updateTimerText();

        if (focusSeconds <= 0) {

            clearInterval(focusInterval);
            focusInterval = null;

            startFocusBtn.disabled = false;
            startFocusBtn.textContent = "✓ 10 минут завершены";

            finishFocusBtn.classList.add("show");
        }

    }, 1000);
});

// ===== +20 XP ЗА МИНИ-ФОКУС =====

finishFocusBtn.addEventListener("click", () => {

    if (focusRewardClaimed) return;
    focusRewardClaimed = true;

    let bonusXP = Number(localStorage.getItem("bonusXP")) || 0;

    bonusXP += 20;

    localStorage.setItem("bonusXP", bonusXP);

    changeXP(20);

    updateProgress();

    finishFocusBtn.textContent = "✓ +20 XP получено";
    finishFocusBtn.disabled = true;

    startFocusBtn.textContent = "▶ Ещё 10 минут";
    startFocusBtn.disabled = false;
});

// ===== СЛИШКОМ МНОГО ДЕЛ =====

const tooManyBtnEl = document.getElementById("tooManyBtn");
const tooManyResultEl = document.getElementById("tooManyResult");
const tooManyTasksEl = document.getElementById("tooManyTasks");
const chooseOneBtnEl = document.getElementById("chooseOneBtn");

tooManyBtnEl.addEventListener("click", () => {

    const taskInputs = [...document.querySelectorAll(".focus-input")];
    const taskChecks = [...document.querySelectorAll(".focus-done")];

    const activeTasks = taskInputs
        .map((input, index) => ({
            text: input.value.trim(),
            done: taskChecks[index]?.checked || false
        }))
        .filter(task => task.text !== "" && !task.done);

    tooManyTasksEl.innerHTML = "";

    if (activeTasks.length === 0) {

        tooManyTasksEl.innerHTML =
            "<p>Сейчас нет незавершённых дел 🌿</p>";

        chooseOneBtnEl.style.display = "none";

    } else {

        activeTasks.forEach(task => {

    const item = document.createElement("button");

    item.className = "too-many-task";
    item.textContent = task.text;

    item.addEventListener("click", () => {

        chosenTask.textContent = task.text;

        tooManyResultEl.classList.remove("show");
        stuckResult.classList.add("show");
    });

    tooManyTasksEl.appendChild(item);
});

        chooseOneBtnEl.style.display = "inline-block";
    }

    stuckResult.classList.remove("show");
    tooManyResultEl.classList.add("show");
});


chooseOneBtnEl.addEventListener("click", () => {

    const taskInputs = [...document.querySelectorAll(".focus-input")];
    const taskChecks = [...document.querySelectorAll(".focus-done")];

    const activeTasks = taskInputs
        .map((input, index) => ({
            text: input.value.trim(),
            done: taskChecks[index]?.checked || false
        }))
        .filter(task => task.text !== "" && !task.done);

    if (activeTasks.length === 0) return;

    const chosen =
        activeTasks[Math.floor(Math.random() * activeTasks.length)];

    chosenTask.textContent = chosen.text;

    tooManyResultEl.classList.remove("show");
    stuckResult.classList.add("show");
});

// ===== НЕ ЗНАЮ, С ЧЕГО НАЧАТЬ =====

const bigTaskResult = document.getElementById("bigTaskResult");
const stepOne = document.getElementById("stepOne");
const stepTwo = document.getElementById("stepTwo");
const stepThree = document.getElementById("stepThree");
const startFirstStepBtn = document.getElementById("startFirstStepBtn");

const dontKnowBtn = document.getElementById("dontKnowBtn");

dontKnowBtn.addEventListener("click", () => {
    stuckResult.classList.remove("show");
    tooManyResultEl.classList.remove("show");
    bigTaskResult.classList.add("show");
    startFocusBtn.textContent = "▶ Начать 10 минут";
startFocusBtn.dataset.minutes = "10";
});

// ===== ЗАДАЧА СЛИШКОМ БОЛЬШАЯ =====

const bigTaskBtn = document.getElementById("bigTaskBtn");

bigTaskBtn.addEventListener("click", () => {
    stuckResult.classList.remove("show");
    tooManyResultEl.classList.remove("show");
    bigTaskResult.classList.add("show");
    startFocusBtn.textContent = "▶ Начать 10 минут";
startFocusBtn.dataset.minutes = "10";
});

startFirstStepBtn.addEventListener("click", () => {

    const firstStep = stepOne.value.trim();

    if (!firstStep) {
        stepOne.focus();
        return;
    }

    chosenTask.textContent = firstStep;

    bigTaskResult.classList.remove("show");
    tooManyResultEl.classList.remove("show");

    stuckResult.classList.add("show");
});

// ===== НЕТ СИЛ =====

const noEnergyBtn = document.getElementById("noEnergyBtn");

noEnergyBtn.addEventListener("click", () => {

    const inputs = [...document.querySelectorAll(".focus-input")];
    const checks = [...document.querySelectorAll(".focus-done")];

    const activeTasks = inputs
        .map((input, index) => ({
            text: input.value.trim(),
            done: checks[index]?.checked || false
        }))
        .filter(task => task.text !== "" && !task.done);

    let minimalStep = "Сделай только самый маленький шаг.";

    if (activeTasks.length > 0) {
        const firstTask = activeTasks[0].text;

        minimalStep =
            "Мини-версия: начни с одного маленького действия по задаче «" +
            firstTask +
            "»";
    }

    bigTaskResult.classList.remove("show");
    tooManyResultEl.classList.remove("show");

    chosenTask.textContent = minimalStep;
    stuckResult.classList.add("show");

    startFocusBtn.textContent = "▶ Начать 2 минуты";

    startFocusBtn.dataset.minutes = "2";
});

// ====== ИЗБЕГАЮ НЕПРИЯТНОГО ДЕЛА ======

const avoidBtn = document.getElementById("avoidBtn");

avoidBtn.addEventListener("click", () => {
    bigTaskResult.classList.remove("show");
    tooManyResultEl.classList.remove("show");

    chosenTask.textContent = "Сделай только первые 5 минут. Не нужно заканчивать — нужно только начать.";
    stuckResult.classList.add("show");

    startFocusBtn.textContent = "▶ Начать 5 минут";
    startFocusBtn.dataset.minutes = "5";
});

// ===== ДОПОЛНИТЕЛЬНЫЕ ЗАДАЧИ =====

/* Legacy extra-task implementation retained as inert source during migration.
if (false) {
const addTaskBtn = document.getElementById("addTaskBtn");
const extraTasks = document.getElementById("extraTasks");
let extraTaskList = JSON.parse(localStorage.getItem("extraTaskList")) || [];
extraTaskList.forEach((item, index) => {
    const task = document.createElement("div");
    task.className = "extra-task";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    const text = document.createElement("span");
    text.textContent = item.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✕";
    deleteBtn.className = "extra-task-delete";
deleteBtn.addEventListener("click", () => {
    extraTaskList.splice(index, 1);
    localStorage.setItem("extraTaskList", JSON.stringify(extraTaskList));
    task.remove();
});
    task.appendChild(checkbox);
    task.appendChild(text);
    task.appendChild(deleteBtn);

    extraTasks.appendChild(task);
});
*/

const addTaskBtn = document.getElementById("addTaskBtn");
const extraTasks = document.getElementById("extraTasks");

function saveExtraTasks() {
    localStorage.setItem("extraTaskList", JSON.stringify(extraTaskList));
}

function renderExtraTasks() {
    extraTasks.innerHTML = "";

    extraTaskList.forEach(item => {
        const task = document.createElement("div");
        task.className = "extra-task";
        task.classList.toggle("completed", item.completed);
        task.dataset.taskId = item.id;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = item.completed;
        checkbox.setAttribute("aria-label", "Отметить дополнительную задачу");

        const text = document.createElement("span");
        text.textContent = item.text;

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "✕";
        deleteBtn.className = "extra-task-delete";
        deleteBtn.setAttribute("aria-label", "Удалить задачу");

        checkbox.addEventListener("change", () => {
            if (checkbox.checked && !item.text.trim()) {
                checkbox.checked = false;
                return;
            }

            const awardKey = `focusAward:${todayKey}:${item.id}`;
            const wasAwarded = localStorage.getItem(awardKey) === "true";
            if (checkbox.checked && !wasAwarded) {
                changeXP(10);
                localStorage.setItem(awardKey, "true");
            } else if (!checkbox.checked && wasAwarded) {
                changeXP(-10);
                localStorage.removeItem(awardKey);
            }

            item.completed = checkbox.checked;
            saveExtraTasks();
            task.classList.toggle("completed", item.completed);
            updateProgress();
        });

        deleteBtn.addEventListener("click", () => {
            const wasCompleted = Boolean(item.completed);
            const awardKey = `focusAward:${todayKey}:${item.id}`;
            if (localStorage.getItem(awardKey) === "true") {
                changeXP(-10);
                localStorage.removeItem(awardKey);
            }
            extraTaskList = extraTaskList.filter(taskItem => taskItem.id !== item.id);
            saveExtraTasks();
            document.dispatchEvent(new CustomEvent("fokus:extra-task-deleted", {
                detail: { taskId: item.id, wasCompleted }
            }));
            renderExtraTasks();
            updateProgress();
        });

        task.append(checkbox, text, deleteBtn);
        extraTasks.appendChild(task);
    });
}

addTaskBtn.addEventListener("click", () => {
    const taskText = prompt("Какую задачу добавить?");
    if (!taskText || !taskText.trim()) return;

    extraTaskList.push({
        id: createTaskId(),
        text: taskText.trim(),
        completed: false
    });
    saveExtraTasks();
    renderExtraTasks();
});

renderExtraTasks();
const tabNavigation = document.querySelector("nav");
const tabButtons = [...tabNavigation.querySelectorAll("[data-tab]")];
const tabPanels = [...document.querySelectorAll("[data-tab-panel]")];

tabNavigation.addEventListener("click", event => {
    const button = event.target.closest("[data-tab]");
    if (!button || !tabNavigation.contains(button)) return;

    const selectedTab = button.dataset.tab;
    tabButtons.forEach(tabButton => {
        const isSelected = tabButton === button;
        tabButton.classList.toggle("active", isSelected);
        tabButton.setAttribute("aria-selected", String(isSelected));
    });
    tabPanels.forEach(panel => {
        panel.classList.toggle("active", panel.dataset.tabPanel === selectedTab);
    });
});
/* Inactive legacy tail.
addTaskBtn.addEventListener("click", () => {
    const taskText = prompt("Какую задачу добавить?");

    if (!taskText || !taskText.trim()) return;
    extraTaskList.push({
    text: taskText.trim(),
    completed: false
});
}

const addTaskBtn = document.getElementById("addTaskBtn");
const extraTasks = document.getElementById("extraTasks");

function saveExtraTasks() {
    localStorage.setItem("extraTaskList", JSON.stringify(extraTaskList));
}

function renderExtraTasks() {
    extraTasks.innerHTML = "";

    extraTaskList.forEach(item => {
        const task = document.createElement("div");
        task.className = "extra-task";
        task.classList.toggle("completed", item.completed);
        task.dataset.taskId = item.id;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = item.completed;
        checkbox.setAttribute("aria-label", "Отметить дополнительную задачу");

        const text = document.createElement("span");
        text.textContent = item.text;

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "✕";
        deleteBtn.className = "extra-task-delete";
        deleteBtn.setAttribute("aria-label", "Удалить задачу");

        checkbox.addEventListener("change", () => {
            if (checkbox.checked && !item.text.trim()) {
                checkbox.checked = false;
                return;
            }

            const awardKey = `focusAward:${todayKey}:${item.id}`;
            const wasAwarded = localStorage.getItem(awardKey) === "true";
            if (checkbox.checked && !wasAwarded) {
                changeXP(10);
                localStorage.setItem(awardKey, "true");
            } else if (!checkbox.checked && wasAwarded) {
                changeXP(-10);
                localStorage.removeItem(awardKey);
            }

            item.completed = checkbox.checked;
            saveExtraTasks();
            task.classList.toggle("completed", item.completed);
            updateProgress();
        });

        deleteBtn.addEventListener("click", () => {
            const awardKey = `focusAward:${todayKey}:${item.id}`;
            if (localStorage.getItem(awardKey) === "true") {
                changeXP(-10);
                localStorage.removeItem(awardKey);
            }
            extraTaskList = extraTaskList.filter(taskItem => taskItem.id !== item.id);
            saveExtraTasks();
            renderExtraTasks();
            updateProgress();
        });

        task.append(checkbox, text, deleteBtn);
        extraTasks.appendChild(task);
    });
}

addTaskBtn.addEventListener("click", () => {
    const taskText = prompt("Какую задачу добавить?");
    if (!taskText || !taskText.trim()) return;

    extraTaskList.push({
        id: createTaskId(),
        text: taskText.trim(),
        completed: false
    });
    saveExtraTasks();
    renderExtraTasks();
});

renderExtraTasks();
/* Remaining legacy duplicate (inactive).
localStorage.setItem("extraTaskList", JSON.stringify(extraTaskList));

    const task = document.createElement("div");
    task.className = "extra-task";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
checkbox.checked = item.completed || false;
    const text = document.createElement("span");
    text.textContent = taskText.trim();

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✕";
    deleteBtn.className = "extra-task-delete";

    checkbox.addEventListener("change", () => {
        task.classList.toggle("completed", checkbox.checked);
    });

    deleteBtn.addEventListener("click", () => {
    extraTaskList = extraTaskList.filter(item => item.text !== taskText.trim());
    localStorage.setItem("extraTaskList", JSON.stringify(extraTaskList));
    task.remove();
});
checkbox.addEventListener("change", () => {
    extraTaskList[index].completed = checkbox.checked;
    localStorage.setItem("extraTaskList", JSON.stringify(extraTaskList));
    task.classList.toggle("completed", checkbox.checked);
});

if (item.completed) {
    task.classList.add("completed");
}
    task.appendChild(checkbox);
    task.appendChild(text);
    task.appendChild(deleteBtn);

    extraTasks.appendChild(task);
});
*/
// Моя фигура: цель, история и редактирование
(() => {
    function initBodyJournal() {
        const el = id => document.getElementById(id);
        const form = el("bodyRecordForm");
        if (!form || !el("saveBodyGoal")) return;

        const recordsKey = "fokus.body.records.v1";
        const goalKey = "fokus.body.goal.v1";
        const status = el("bodyRecordStatus");
        const saveButton = el("saveBodyRecord");
        const fields = {
            date: "bodyDate",
            weight: "bodyWeight",
            waist: "bodyWaist",
            hips: "bodyHips",
            note: "bodyNote"
        };

        let records = [];
        let goal = {};
        let editingRecord = null;

        try {
            records = JSON.parse(localStorage.getItem(recordsKey) || "[]");
            goal = JSON.parse(localStorage.getItem(goalKey) || "{}");

            if (
                !Array.isArray(records) ||
                !records.every(r =>
                    r && typeof r === "object" &&
                    typeof r.date === "string"
                ) ||
                !goal || typeof goal !== "object" ||
                Array.isArray(goal)
            ) {
                throw new Error("Некорректные данные");
            }
        } catch {
            status.textContent =
                "Не удалось прочитать данные. Сохранение отключено.";
            return;
        }

        const goalFields = [
            "goalStartWeight", "goalTargetWeight",
            "goalReason", "goalSmallStep"
        ];

        goalFields.forEach(id => {
            el(id).value = goal[id] ?? "";
        });

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.textContent = "Отменить изменения";
        cancelButton.hidden = true;
        saveButton.after(cancelButton);

        function setToday() {
            const now = new Date();
            el("bodyDate").value =
                `${now.getFullYear()}-` +
                `${String(now.getMonth() + 1).padStart(2, "0")}-` +
                `${String(now.getDate()).padStart(2, "0")}`;
        }

        function readForm() {
            const record = {};
            Object.entries(fields).forEach(([key, id]) => {
                record[key] = el(id).value.trim();
            });
            return record;
        }

        function resetEditor() {
            editingRecord = null;
            form.reset();
            setToday();
            saveButton.textContent = "Сохранить запись";
            cancelButton.hidden = true;
        }

        function persist(nextRecords) {
            try {
                localStorage.setItem(
                    recordsKey, JSON.stringify(nextRecords)
                );
                records = nextRecords;
                return true;
            } catch {
                status.textContent =
                    "Не удалось сохранить изменения. Попробуй ещё раз.";
                return false;
            }
        }

        cancelButton.addEventListener("click", () => {
            resetEditor();
            status.textContent =
                "Редактирование отменено. Запись не изменена.";
        });

        function startEditing(record) {
            const draft = readForm();
            const hasDraft =
                draft.weight || draft.waist || draft.hips || draft.note;

            if (
                hasDraft &&
                !confirm("Заменить данные в форме выбранной записью? Несохранённые правки будут потеряны.")
            ) return;

            editingRecord = record;
            Object.entries(fields).forEach(([key, id]) => {
                el(id).value = record[key] ?? "";
            });

            saveButton.textContent = "Сохранить изменения";
            cancelButton.hidden = false;
            status.textContent =
                "Редактируешь существующую запись, а не создаёшь новую.";

            const details = form.closest("details");
            if (details) details.open = true;

            el("bodyDate").focus({ preventScroll: true });
            form.scrollIntoView({ block: "nearest" });
        }

        function renderRecords() {
            const list = el("bodyRecordList");
            list.replaceChildren();

            if (!records.length) {
                list.textContent = "Записей пока нет.";
                return;
            }

            [...records]
                .sort((a, b) => b.date.localeCompare(a.date))
                .forEach(record => {
                    const card = document.createElement("div");
                    const text = document.createElement("p");
                    const parts = [
                        record.date.split("-").reverse().join(".")
                    ];

                    if (record.weight) parts.push(`Вес: ${record.weight} кг`);
                    if (record.waist) parts.push(`Талия: ${record.waist} см`);
                    if (record.hips) parts.push(`Бёдра: ${record.hips} см`);
                    if (record.note) parts.push(record.note);
                    text.textContent = parts.join(" · ");

                    const edit = document.createElement("button");
                    edit.type = "button";
                    edit.textContent = "Изменить";
                    edit.setAttribute(
                        "aria-label", `Изменить запись за ${record.date}`
                    );
                    edit.addEventListener("click", () => {
                        startEditing(record);
                    });

                    const remove = document.createElement("button");
                    remove.type = "button";
                    remove.textContent = "Удалить";
                    remove.setAttribute(
                        "aria-label", `Удалить запись за ${record.date}`
                    );
                    remove.addEventListener("click", () => {
                        if (!confirm(
                            "Удалить эту запись? Восстановить её будет нельзя."
                        )) return;

                        const next = records.filter(r => r !== record);
                        if (!persist(next)) return;

                        if (editingRecord === record) resetEditor();
                        renderRecords();
                        status.textContent = "Запись удалена.";
                    });

                    card.append(text, edit, remove);
                    list.appendChild(card);
                });
        }

        el("saveBodyGoal").addEventListener("click", () => {
            if (!goalFields.every(id => el(id).reportValidity())) return;

            const nextGoal = {};
            goalFields.forEach(id => {
                nextGoal[id] = el(id).value.trim();
            });

            try {
                localStorage.setItem(goalKey, JSON.stringify(nextGoal));
                goal = nextGoal;
                el("bodyGoalStatus").textContent = "Цель сохранена 🌿";
            } catch {
                el("bodyGoalStatus").textContent =
                    "Не удалось сохранить цель. Данные в полях оставлены.";
            }
        });

        form.addEventListener("submit", event => {
            event.preventDefault();
            if (!form.reportValidity()) return;

            const record = readForm();

            if (!record.weight && !record.waist &&
                !record.hips && !record.note) {
                status.textContent =
                    "Добавь хотя бы один показатель или комментарий.";
                return;
            }

            const duplicate = records.some(r =>
                r !== editingRecord &&
                Object.keys(fields).every(key =>
                    String(r[key] ?? "") === record[key]
                )
            );

            if (duplicate) {
                status.textContent = "Такая запись уже сохранена.";
                return;
            }

            const wasEditing = editingRecord !== null;
            const next = wasEditing
                ? records.map(r =>
                    r === editingRecord ? { ...r, ...record } : r
                )
                : [...records, record];

            if (!persist(next)) return;

            resetEditor();
            renderRecords();
            status.textContent = wasEditing
                ? "Изменения сохранены 🌿"
                : "Запись сохранена 🌿";
        });

        setToday();
        renderRecords();
        el("saveBodyGoal").disabled = false;
        saveButton.disabled = false;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initBodyJournal);
    } else {
        initBodyJournal();
    }
})();

// Переключение разделов и открытие окна «Фигура и забота»
(() => {
    function initCareDialog() {
        const dialog = document.getElementById("selfCareDialog");
        const openButton = document.querySelector(".self-care-open");
        if (!dialog || !openButton) return;

        const viewButtons = [...dialog.querySelectorAll("[data-care-view]")];
        const views = {
            body: document.getElementById("careBody"),
            wellbeing: document.getElementById("careWellbeing")
        };

        function showView(name) {
            if (!views[name]) return;

            Object.entries(views).forEach(([viewName, section]) => {
                if (section) section.hidden = viewName !== name;
            });

            viewButtons.forEach(button => {
                button.setAttribute(
                    "aria-pressed",
                    String(button.dataset.careView === name)
                );
            });
        }

        viewButtons.forEach(button => {
            button.addEventListener("click", () => {
                showView(button.dataset.careView);
            });
        });

        openButton.addEventListener("click", () => {
            dialog.showModal();
            dialog.scrollTop = 0;
            dialog.scrollLeft = 0;

            requestAnimationFrame(() => {
                dialog.scrollTop = 0;
                dialog.scrollLeft = 0;
            });
        });

        const activeButton = viewButtons.find(button =>
            button.getAttribute("aria-pressed") === "true"
        );
        showView(activeButton?.dataset.careView || "body");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCareDialog);
    } else {
        initCareDialog();
    }
})();
