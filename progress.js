(() => {
    "use strict";

    const STORAGE_KEY = "fokus.progress.v1";
    const WEEK_GOAL = 5;
    const MONTH_GOAL = 20;
    const byId = id => document.getElementById(id);

    function initProgress() {
        const panel = byId("progressTab");
        const extraTasks = byId("extraTasks");
        if (!panel || !extraTasks) return;

        let data;
        let storageAvailable = true;
        const storageStatus = byId("progressStorageStatus");
        const rewardControls = {
            week: {
                choice: byId("weeklyRewardChoice"),
                custom: byId("weeklyRewardCustom"),
                customWrap: byId("weeklyCustomWrap"),
                claim: byId("claimWeeklyReward"),
                status: byId("weeklyRewardStatus")
            },
            month: {
                choice: byId("monthlyRewardChoice"),
                custom: byId("monthlyRewardCustom"),
                customWrap: byId("monthlyCustomWrap"),
                claim: byId("claimMonthlyReward"),
                status: byId("monthlyRewardStatus")
            }
        };

        const emptyData = () => ({
            version: 1,
            completions: [],
            rewards: [],
            unlocked: [],
            preferences: {
                week: { choice: "", custom: "" },
                month: { choice: "", custom: "" }
            }
        });
        const pad = number => String(number).padStart(2, "0");
        const dateKey = (date = new Date()) =>
            `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        const parseDate = value => new Date(`${value}T12:00:00`);
        const monthKey = (date = new Date()) => dateKey(date).slice(0, 7);
        const weekKey = (date = new Date()) => {
            const monday = new Date(date);
            monday.setHours(12, 0, 0, 0);
            monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
            return dateKey(monday);
        };
        const completionKey = completion => `${completion.date}:${completion.taskId}`;
        const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value);

        function validate(candidate) {
            if (!candidate || candidate.version !== 1 ||
                !Array.isArray(candidate.completions) ||
                !candidate.completions.every(item =>
                    item && typeof item.taskId === "string" && item.taskId.length > 0 && validDate(item.date)
                ) ||
                new Set(candidate.completions.map(completionKey)).size !== candidate.completions.length ||
                !Array.isArray(candidate.rewards) ||
                !candidate.rewards.every(item =>
                    item && ["week", "month"].includes(item.type) &&
                    typeof item.period === "string" && typeof item.reward === "string" &&
                    item.reward.length > 0 && typeof item.claimedAt === "string"
                ) ||
                !Array.isArray(candidate.unlocked) ||
                !candidate.unlocked.every(item => typeof item === "string") ||
                !candidate.preferences ||
                !["week", "month"].every(type =>
                    candidate.preferences[type] &&
                    typeof candidate.preferences[type].choice === "string" &&
                    typeof candidate.preferences[type].custom === "string"
                )) {
                throw new Error("Некорректный формат данных прогресса.");
            }
            return candidate;
        }

        function read() {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw === null ? emptyData() : validate(JSON.parse(raw));
        }

        function persist(next) {
            if (!storageAvailable) return false;
            try {
                validate(next);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                data = next;
                return true;
            } catch (error) {
                storageStatus.textContent = `Не удалось сохранить прогресс: ${error.message}`;
                return false;
            }
        }

        function addCompletion(taskId, date = dateKey()) {
            const key = `${date}:${taskId}`;
            if (data.completions.some(item => completionKey(item) === key)) return false;
            return persist({ ...data, completions: [...data.completions, { taskId, date }] });
        }

        function removeCompletion(taskId, date = dateKey()) {
            const next = data.completions.filter(item =>
                !(item.taskId === taskId && item.date === date)
            );
            if (next.length === data.completions.length) return false;
            return persist({ ...data, completions: next });
        }

        function removeTaskCompletions(taskId) {
            const next = data.completions.filter(item => item.taskId !== taskId);
            if (next.length === data.completions.length) return false;
            return persist({ ...data, completions: next });
        }

        function periodCounts() {
            const currentWeek = weekKey();
            const currentMonth = monthKey();
            return {
                week: data.completions.filter(item => weekKey(parseDate(item.date)) === currentWeek).length,
                month: data.completions.filter(item => item.date.startsWith(currentMonth)).length
            };
        }

        function maximumFor(getPeriod) {
            const counts = new Map();
            data.completions.forEach(item => {
                const period = getPeriod(item);
                counts.set(period, (counts.get(period) || 0) + 1);
            });
            return Math.max(0, ...counts.values());
        }

        const achievements = [
            { id: "first-extra", icon: "🌱", title: "Первый шаг", note: "Выполнена 1 дополнительная задача" },
            { id: "week-five", icon: "🎯", title: "Вошла в ритм", note: "5 дополнительных задач за неделю" },
            { id: "month-twenty", icon: "🏆", title: "Сильный месяц", note: "20 дополнительных задач за месяц" },
            { id: "streak-seven", icon: "🔥", title: "Серия 7 дней", note: "Серия достигла семи дней" },
            { id: "xp-100", icon: "⭐", title: "100 XP", note: "Набрано 100 очков опыта" },
            { id: "xp-500", icon: "🌟", title: "500 XP", note: "Набрано 500 очков опыта" },
            { id: "xp-1000", icon: "✨", title: "1000 XP", note: "Набрано 1000 очков опыта" }
        ];

        function updateAchievements(totalXP, streak) {
            const earned = new Set(data.unlocked);
            const conditions = {
                "first-extra": data.completions.length >= 1,
                "week-five": maximumFor(item => weekKey(parseDate(item.date))) >= WEEK_GOAL,
                "month-twenty": maximumFor(item => item.date.slice(0, 7)) >= MONTH_GOAL,
                "streak-seven": streak >= 7,
                "xp-100": totalXP >= 100,
                "xp-500": totalXP >= 500,
                "xp-1000": totalXP >= 1000
            };
            Object.entries(conditions).forEach(([id, reached]) => {
                if (reached) earned.add(id);
            });
            const next = [...earned];
            if (next.length !== data.unlocked.length && persist({ ...data, unlocked: next })) {
                return new Set(data.unlocked);
            }
            return earned;
        }

        function rewardValue(type) {
            const preference = data.preferences[type];
            return preference.choice === "custom"
                ? preference.custom.trim()
                : preference.choice;
        }

        function isClaimed(type, period) {
            return data.rewards.some(reward => reward.type === type && reward.period === period);
        }

        function updateRewardControl(type, count, goal, period) {
            const controls = rewardControls[type];
            const preference = data.preferences[type];
            controls.choice.value = preference.choice;
            controls.custom.value = preference.custom;
            controls.customWrap.hidden = preference.choice !== "custom";
            const claimed = isClaimed(type, period);
            controls.claim.disabled = count < goal || claimed || !rewardValue(type);
            controls.claim.textContent = claimed ? "Награда получена ✓" : "Получить награду";
            if (claimed) controls.status.textContent = "Эта награда уже сохранена в истории.";
        }

        function renderHistory() {
            const host = byId("rewardHistory");
            host.replaceChildren();
            const rewards = [...data.rewards].sort((a, b) => b.claimedAt.localeCompare(a.claimedAt));
            if (!rewards.length) {
                const empty = document.createElement("p");
                empty.className = "reward-history-empty";
                empty.textContent = "Здесь появятся награды, которые ты получила.";
                host.append(empty);
                return;
            }
            rewards.forEach(reward => {
                const item = document.createElement("div");
                item.className = "reward-history-item";
                const icon = document.createElement("span");
                icon.textContent = reward.type === "week" ? "🎁" : "🏅";
                const title = document.createElement("strong");
                title.textContent = reward.reward;
                const detail = document.createElement("small");
                detail.textContent = `${reward.type === "week" ? "Неделя" : "Месяц"}: ${reward.period}`;
                item.append(icon, title, detail);
                host.append(item);
            });
        }

        function render() {
            const totalXP = Math.max(0, Number(localStorage.getItem("totalXP")) || 0);
            const streak = Math.max(0, Number(localStorage.getItem("focusStreak")) || 0);
            const level = Math.floor(totalXP / 100) + 1;
            const levelXP = totalXP % 100;
            const counts = periodCounts();
            const currentWeek = weekKey();
            const currentMonth = monthKey();

            byId("progressTotalXP").textContent = `${totalXP} XP`;
            byId("progressLevel").textContent = `Уровень ${level}`;
            byId("progressLevelFill").style.width = `${levelXP}%`;
            const levelTrack = panel.querySelector(".progress-level-track");
            levelTrack.setAttribute("aria-valuenow", String(levelXP));
            byId("progressLevelNote").textContent = `До уровня ${level + 1} осталось ${100 - levelXP} XP`;
            byId("progressStreak").textContent = String(streak);
            byId("progressWeekExtra").textContent = String(counts.week);
            byId("progressMonthExtra").textContent = String(counts.month);

            byId("weeklyRewardCount").textContent = `${Math.min(counts.week, WEEK_GOAL)} из ${WEEK_GOAL}`;
            byId("weeklyRewardFill").style.width = `${Math.min(100, counts.week / WEEK_GOAL * 100)}%`;
            byId("weeklyRewardCard").classList.toggle("is-unlocked", counts.week >= WEEK_GOAL);
            byId("monthlyRewardCount").textContent = `${Math.min(counts.month, MONTH_GOAL)} из ${MONTH_GOAL}`;
            byId("monthlyRewardFill").style.width = `${Math.min(100, counts.month / MONTH_GOAL * 100)}%`;
            byId("monthlyRewardCard").classList.toggle("is-unlocked", counts.month >= MONTH_GOAL);

            const weekEnd = parseDate(currentWeek);
            weekEnd.setDate(weekEnd.getDate() + 6);
            byId("weeklyPeriodLabel").textContent =
                `${parseDate(currentWeek).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ` +
                weekEnd.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
            byId("monthlyPeriodLabel").textContent = parseDate(`${currentMonth}-01`).toLocaleDateString(
                "ru-RU", { month: "long", year: "numeric" }
            );

            updateRewardControl("week", counts.week, WEEK_GOAL, currentWeek);
            updateRewardControl("month", counts.month, MONTH_GOAL, currentMonth);

            const unlocked = updateAchievements(totalXP, streak);
            const grid = byId("achievementGrid");
            grid.replaceChildren();
            achievements.forEach(achievement => {
                const card = document.createElement("article");
                const isUnlocked = unlocked.has(achievement.id);
                card.className = `achievement-card${isUnlocked ? " is-unlocked" : ""}`;
                const icon = document.createElement("span");
                icon.className = "achievement-icon";
                icon.textContent = isUnlocked ? achievement.icon : "🔒";
                const title = document.createElement("h4");
                title.textContent = achievement.title;
                const note = document.createElement("p");
                note.textContent = achievement.note;
                card.append(icon, title, note);
                grid.append(card);
            });
            byId("achievementCount").textContent = `${unlocked.size} из ${achievements.length}`;
            renderHistory();
        }

        function savePreference(type) {
            const controls = rewardControls[type];
            const nextPreference = {
                choice: controls.choice.value,
                custom: controls.custom.value.slice(0, 200)
            };
            if (persist({
                ...data,
                preferences: { ...data.preferences, [type]: nextPreference }
            })) render();
        }

        ["week", "month"].forEach(type => {
            const controls = rewardControls[type];
            controls.choice.addEventListener("change", () => savePreference(type));
            controls.custom.addEventListener("input", () => savePreference(type));
            controls.claim.addEventListener("click", () => {
                const counts = periodCounts();
                const count = counts[type];
                const goal = type === "week" ? WEEK_GOAL : MONTH_GOAL;
                const period = type === "week" ? weekKey() : monthKey();
                const reward = rewardValue(type);
                if (count < goal || !reward || isClaimed(type, period)) {
                    render();
                    return;
                }
                const next = {
                    ...data,
                    rewards: [...data.rewards, {
                        type,
                        period,
                        reward,
                        claimedAt: new Date().toISOString()
                    }]
                };
                if (persist(next)) {
                    controls.status.textContent = "Награда получена и добавлена в историю ✨";
                    render();
                }
            });
        });

        byId("resetProgress").addEventListener("click", () => {
            if (!confirm("Обнулить XP, достижения и награды? Остальные данные сохранятся")) return;

            try {
                localStorage.setItem("totalXP", "0");
                localStorage.setItem("todayXP", "0");
                localStorage.setItem("bonusXP", "0");
                localStorage.setItem("focusStreak", "0");
                localStorage.setItem("xpDate", dateKey());
                localStorage.removeItem("lastStreakDate");

                Object.keys(localStorage)
                    .filter(key => key.startsWith("focusAward:"))
                    .forEach(key => localStorage.removeItem(key));

                localStorage.removeItem(STORAGE_KEY);
                data = emptyData();
                persist(data);

                rewardControls.week.status.textContent = "";
                rewardControls.month.status.textContent = "";
                storageStatus.textContent = "Прогресс обнулён. Остальные данные сохранены.";
                render();

                const level = document.querySelector(".level");
                if (level) level.innerHTML = "⭐ <span>0 XP</span>";
                const stats = document.querySelectorAll(".stats strong");
                if (stats[0]) stats[0].textContent = "0";
                if (stats[1]) stats[1].textContent = "0";
            } catch (error) {
                storageStatus.textContent = `Не удалось сбросить прогресс: ${error.message}`;
            }
        });

        document.addEventListener("change", event => {
            const checkbox = event.target;
            if (!(checkbox instanceof HTMLInputElement) || checkbox.type !== "checkbox") return;
            const task = checkbox.closest("#extraTasks .extra-task[data-task-id]");
            if (!task) return;
            if (checkbox.checked) addCompletion(task.dataset.taskId);
            else removeCompletion(task.dataset.taskId);
            render();
        });

        document.addEventListener("fokus:extra-task-deleted", event => {
            if (!event.detail?.wasCompleted || !event.detail.taskId) return;
            removeTaskCompletions(event.detail.taskId);
            render();
        });

        document.addEventListener("click", event => {
            if (event.target.closest('[data-tab="progress"]')) queueMicrotask(render);
            if (event.target.closest("#finishFocusBtn")) queueMicrotask(render);
        });

        window.addEventListener("focus", render);
        window.addEventListener("storage", event => {
            if (event.key === STORAGE_KEY) {
                try {
                    data = read();
                    storageStatus.textContent = "Прогресс обновлён из другой вкладки.";
                    render();
                } catch (error) {
                    storageStatus.textContent = `Не удалось обновить прогресс: ${error.message}`;
                }
            } else if (["totalXP", "focusStreak"].includes(event.key)) {
                render();
            }
        });

        try {
            data = read();
            const today = dateKey();
            let changed = false;
            let tasks = [];
            try { tasks = JSON.parse(localStorage.getItem("extraTaskList") || "[]"); } catch { tasks = []; }
            const taskIds = new Set(tasks.filter(task => task?.id).map(task => task.id));
            const existingCompletions = data.completions.filter(item => taskIds.has(item.taskId));
            if (existingCompletions.length !== data.completions.length) {
                data = { ...data, completions: existingCompletions };
                changed = true;
            }
            tasks.forEach(task => {
                if (task?.id && task.completed &&
                    localStorage.getItem(`focusAward:${today}:${task.id}`) === "true" &&
                    !data.completions.some(item => item.taskId === task.id && item.date === today)) {
                    data.completions.push({ taskId: task.id, date: today });
                    changed = true;
                }
            });
            if (changed) persist({ ...data, completions: [...data.completions] });
            render();
        } catch (error) {
            data = emptyData();
            storageAvailable = false;
            panel.querySelectorAll("select, input, button").forEach(control => { control.disabled = true; });
            storageStatus.textContent = `Хранилище прогресса недоступно. Старые данные не изменены. ${error.message}`;
            render();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initProgress);
    } else {
        initProgress();
    }
})();
