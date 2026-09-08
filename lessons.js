(() => {
    "use strict";

    const STORAGE_KEY = "fokus.lessons.v1";
    const byId = id => document.getElementById(id);

    function initLessons() {
        const dialog = byId("lessonsDialog");
        const form = byId("lessonForm");
        const openButton = byId("lessonsOpen");
        if (!dialog || !form || !openButton) return;

        const fields = {
            student: byId("lessonStudent"),
            date: byId("lessonDate"),
            time: byId("lessonTime"),
            duration: byId("lessonDuration"),
            price: byId("lessonPrice"),
            format: byId("lessonFormat"),
            status: byId("lessonStatus"),
            payment: byId("lessonPayment"),
            comment: byId("lessonComment")
        };
        const monthField = byId("lessonsMonth");
        const message = byId("lessonsStatus");
        const saveButton = byId("lessonSave");
        const cancelButton = byId("lessonCancel");
        let lessons = [];
        let editingId = null;
        let storageAvailable = true;

        const money = new Intl.NumberFormat("ru-RU", {
            style: "currency",
            currency: "RUB",
            maximumFractionDigits: 2
        });
        const two = value => String(value).padStart(2, "0");
        const localDate = (date = new Date()) =>
            `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
        const localTime = (date = new Date()) => `${two(date.getHours())}:${two(date.getMinutes())}`;
        const makeId = () => window.crypto?.randomUUID?.() ||
            `lesson-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const labels = {
            format: { online: "Онлайн", offline: "Очно" },
            status: { planned: "Запланировано", completed: "Проведено", cancelled: "Отменено" },
            payment: { unpaid: "Не оплачено", paid: "Оплачено" }
        };

        function isValidLesson(item) {
            return item && typeof item === "object" &&
                typeof item.id === "string" && item.id.length > 0 &&
                typeof item.student === "string" && item.student.length <= 200 &&
                /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
                /^\d{2}:\d{2}$/.test(item.time) &&
                Number.isInteger(item.duration) && item.duration > 0 && item.duration <= 1440 &&
                Number.isFinite(item.price) && item.price >= 0 &&
                Object.hasOwn(labels.format, item.format) &&
                Object.hasOwn(labels.status, item.status) &&
                Object.hasOwn(labels.payment, item.payment) &&
                typeof item.comment === "string" && item.comment.length <= 1000;
        }

        function readStorage() {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw === null) return [];
            const data = JSON.parse(raw);
            if (!data || data.version !== 1 || !Array.isArray(data.lessons) ||
                !data.lessons.every(isValidLesson)) {
                throw new Error("Некорректный формат данных занятий.");
            }
            return data.lessons;
        }

        function persist(next) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, lessons: next }));
                lessons = next;
                return true;
            } catch (error) {
                message.textContent = `Не удалось сохранить: ${error.message}`;
                return false;
            }
        }

        function resetForm() {
            editingId = null;
            form.reset();
            fields.date.value = localDate();
            fields.time.value = localTime();
            fields.duration.value = "60";
            fields.format.value = "online";
            fields.status.value = "planned";
            fields.payment.value = "unpaid";
            byId("lessonFormTitle").textContent = "Новое занятие";
            saveButton.textContent = "Сохранить занятие";
            cancelButton.hidden = true;
        }

        function readForm() {
            return {
                id: editingId || makeId(),
                student: fields.student.value.trim(),
                date: fields.date.value,
                time: fields.time.value,
                duration: Number.parseInt(fields.duration.value, 10),
                price: Number.parseFloat(fields.price.value),
                format: fields.format.value,
                status: fields.status.value,
                payment: fields.payment.value,
                comment: fields.comment.value.trim()
            };
        }

        function startEditing(lesson) {
            editingId = lesson.id;
            Object.keys(fields).forEach(key => {
                fields[key].value = lesson[key] ?? "";
            });
            byId("lessonFormTitle").textContent = "Редактирование занятия";
            saveButton.textContent = "Сохранить изменения";
            cancelButton.hidden = false;
            message.textContent = "Измени нужные поля и сохрани занятие.";
            form.scrollIntoView({ behavior: "smooth", block: "start" });
            fields.student.focus({ preventScroll: true });
        }

        function quickUpdate(lesson, changes, confirmation) {
            const next = lessons.map(item =>
                item.id === lesson.id ? { ...item, ...changes } : item
            );
            if (!persist(next)) return;
            if (editingId === lesson.id) {
                Object.entries(changes).forEach(([key, value]) => {
                    if (fields[key]) fields[key].value = value;
                });
            }
            render();
            message.textContent = confirmation;
        }

        function createBadge(text, className) {
            const badge = document.createElement("span");
            badge.className = `lesson-badge ${className}`;
            badge.textContent = text;
            return badge;
        }

        function render() {
            const visible = lessons
                .filter(lesson => lesson.date.startsWith(monthField.value))
                .sort((a, b) =>
                    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
                );

            byId("lessonsPlanned").textContent = String(
                visible.filter(lesson => lesson.status === "planned").length
            );
            byId("lessonsCompleted").textContent = String(
                visible.filter(lesson => lesson.status === "completed").length
            );
            const paid = visible.filter(lesson => lesson.payment === "paid");
            byId("lessonsPaid").textContent = String(paid.length);
            byId("lessonsPaidTotal").textContent = money.format(
                paid.reduce((sum, lesson) => sum + lesson.price, 0)
            );

            const list = byId("lessonsList");
            list.replaceChildren();
            if (!visible.length) {
                const empty = document.createElement("p");
                empty.className = "lessons-empty";
                empty.textContent = "В этом месяце занятий пока нет.";
                list.append(empty);
                return;
            }

            visible.forEach(lesson => {
                const article = document.createElement("article");
                article.className = "lesson-item";
                const content = document.createElement("div");
                const title = document.createElement("h4");
                title.textContent = lesson.student;
                const timing = document.createElement("p");
                timing.className = "lesson-item-time";
                timing.textContent = `${lesson.date.split("-").reverse().join(".")} в ${lesson.time} · ${lesson.duration} мин.`;
                const details = document.createElement("p");
                details.textContent = `${labels.format[lesson.format]} · ${money.format(lesson.price)}`;
                const badges = document.createElement("div");
                badges.className = "lesson-badges";
                badges.append(
                    createBadge(labels.status[lesson.status], lesson.status),
                    createBadge(labels.payment[lesson.payment], lesson.payment)
                );
                content.append(title, timing, details, badges);
                if (lesson.comment) {
                    const comment = document.createElement("p");
                    comment.textContent = lesson.comment;
                    content.append(comment);
                }

                const actions = document.createElement("div");
                actions.className = "lesson-item-actions";
                const edit = document.createElement("button");
                edit.type = "button";
                edit.textContent = "Изменить";
                edit.addEventListener("click", () => startEditing(lesson));
                const remove = document.createElement("button");
                remove.type = "button";
                remove.textContent = "Удалить";
                remove.addEventListener("click", () => {
                    if (!confirm(`Удалить занятие с учеником «${lesson.student}»?`)) return;
                    if (!persist(lessons.filter(item => item.id !== lesson.id))) return;
                    if (editingId === lesson.id) resetForm();
                    render();
                    message.textContent = "Занятие удалено.";
                });
                const complete = document.createElement("button");
                complete.type = "button";
                complete.textContent = "Проведено";
                complete.disabled = lesson.status === "completed";
                complete.addEventListener("click", () =>
                    quickUpdate(lesson, { status: "completed" }, "Занятие отмечено как проведённое.")
                );
                const pay = document.createElement("button");
                pay.type = "button";
                pay.textContent = "Оплачено";
                pay.disabled = lesson.payment === "paid";
                pay.addEventListener("click", () =>
                    quickUpdate(lesson, { payment: "paid" }, "Оплата отмечена.")
                );
                actions.append(edit, remove, complete, pay);
                article.append(content, actions);
                list.append(article);
            });
        }

        form.addEventListener("submit", event => {
            event.preventDefault();
            if (!storageAvailable || !form.reportValidity()) return;
            const lesson = readForm();
            if (!isValidLesson(lesson)) {
                message.textContent = "Проверь заполнение полей занятия.";
                return;
            }
            const wasEditing = Boolean(editingId);
            const next = editingId
                ? lessons.map(item => item.id === editingId ? lesson : item)
                : [...lessons, lesson];
            if (!persist(next)) return;
            monthField.value = lesson.date.slice(0, 7);
            resetForm();
            render();
            message.textContent = wasEditing ? "Изменения сохранены." : "Занятие сохранено.";
        });

        cancelButton.addEventListener("click", () => {
            resetForm();
            message.textContent = "Редактирование отменено.";
        });
        monthField.addEventListener("change", render);
        openButton.addEventListener("click", () => {
            dialog.showModal();
            dialog.scrollTop = 0;
            requestAnimationFrame(() => { dialog.scrollTop = 0; });
        });
        byId("lessonsClose").addEventListener("click", () => dialog.close());
        dialog.addEventListener("click", event => {
            if (event.target === dialog) dialog.close();
        });
        window.addEventListener("storage", event => {
            if (event.key !== STORAGE_KEY) return;
            try {
                lessons = readStorage();
                render();
                message.textContent = "Расписание обновлено из другой вкладки.";
            } catch (error) {
                message.textContent = `Не удалось обновить расписание: ${error.message}`;
            }
        });

        monthField.value = localDate().slice(0, 7);
        try {
            lessons = readStorage();
            resetForm();
            render();
        } catch (error) {
            storageAvailable = false;
            saveButton.disabled = true;
            message.textContent = `Хранилище занятий недоступно. Старые данные не изменены. ${error.message}`;
            render();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initLessons);
    } else {
        initLessons();
    }
})();
