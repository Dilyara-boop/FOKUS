(() => {
    "use strict";

    const form = document.getElementById("companionForm");
    const input = document.getElementById("companionInput");
    const chat = document.getElementById("companionChat");
    const clearButton = document.getElementById("clearCompanion");
    if (!form || !input || !chat || !clearButton) return;

    const LANGUAGE_KEY = "fokus.companion.language.v1";
    const HISTORY_KEY = "fokus.companion.history.v1";
    const translations = {
        ru: {
            eyebrow: "БЕРЕЖНЫЙ ДИАЛОГ",
            title: "Спокойный собеседник",
            subtitle: "Можно выговориться, разобрать мысли и выбрать один маленький следующий шаг",
            greeting: "Я рядом. Расскажи, что сейчас больше всего занимает твои мысли",
            anxious: "Мне тревожно",
            tired: "Я устала",
            start: "Не могу начать",
            sort: "Хочу разобраться",
            messageLabel: "Твоё сообщение",
            placeholder: "Можно написать так, как получается…",
            send: "Отправить",
            clear: "Очистить разговор",
            warning: "Это поддерживающий собеседник, а не врач. В экстренной ситуации обратись за помощью к людям и службам рядом",
            unavailable: "Собеседник временно недоступен. Проверь подключение к интернету и настройку сервера.",
            waiting: "Думаю…",
            confirmClear: "Очистить разговор? Сообщения нельзя будет восстановить.",
            languageLabel: "Язык собеседника",
            promptsLabel: "Быстрые темы разговора",
            chatLabel: "Переписка"
        },
        en: {
            eyebrow: "GENTLE CONVERSATION",
            title: "Calm Companion",
            subtitle: "You can talk things through, sort out your thoughts, and choose one small next step.",
            greeting: "I’m here. Tell me what is taking up most of your thoughts right now.",
            anxious: "I feel anxious",
            tired: "I’m tired",
            start: "I can’t get started",
            sort: "I want to sort things out",
            messageLabel: "Your message",
            placeholder: "Write whatever comes naturally...",
            send: "Send",
            clear: "Clear conversation",
            warning: "This is a supportive companion, not a doctor. In an emergency, contact people or emergency services near you.",
            unavailable: "The companion is temporarily unavailable. Check your internet connection and server settings.",
            waiting: "Thinking…",
            confirmClear: "Clear the conversation? Messages cannot be restored.",
            languageLabel: "Companion language",
            promptsLabel: "Quick conversation topics",
            chatLabel: "Conversation"
        }
    };
    let language = "ru";
    let history = [];

    function addMessage(text, type, messageKey = "") {
        const message = document.createElement("div");
        message.className = `companion-message companion-message-${type}`;
        message.textContent = text;
        if (messageKey) message.dataset.companionMessage = messageKey;
        chat.append(message);
        chat.scrollTop = chat.scrollHeight;
        return message;
    }

    function saveHistory() {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-30)));
        } catch {
            // Диалог продолжает работать без локальной истории.
        }
    }

    function restoreHistory() {
        try {
            const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
            if (!Array.isArray(saved)) return;
            history = saved.filter(item =>
                item && ["user", "assistant"].includes(item.role) &&
                typeof item.content === "string" && item.content.length <= 4000
            ).slice(-30);
            if (!history.length) return;
            chat.replaceChildren();
            history.forEach(item => addMessage(item.content, item.role));
        } catch {
            history = [];
        }
    }

    function applyLanguage(nextLanguage, save = false) {
        language = Object.hasOwn(translations, nextLanguage) ? nextLanguage : "ru";
        const text = translations[language];

        document.querySelectorAll("[data-companion-i18n]").forEach(element => {
            element.textContent = text[element.dataset.companionI18n];
        });
        document.querySelectorAll("[data-companion-prompt]").forEach(button => {
            button.textContent = text[button.dataset.companionPrompt];
        });
        document.querySelectorAll("[data-companion-message]").forEach(message => {
            message.textContent = text[message.dataset.companionMessage];
        });
        document.querySelectorAll("[data-companion-language]").forEach(button => {
            button.setAttribute("aria-pressed", String(button.dataset.companionLanguage === language));
        });

        input.placeholder = text.placeholder;
        document.querySelector(".companion-language").setAttribute("aria-label", text.languageLabel);
        document.querySelector(".companion-prompts").setAttribute("aria-label", text.promptsLabel);
        chat.setAttribute("aria-label", text.chatLabel);

        if (save) {
            try {
                localStorage.setItem(LANGUAGE_KEY, language);
            } catch {
                // Переключение продолжает работать, даже если хранилище недоступно.
            }
        }
    }

    document.querySelectorAll("[data-companion-language]").forEach(button => {
        button.addEventListener("click", () => {
            applyLanguage(button.dataset.companionLanguage, true);
        });
    });

    document.querySelectorAll("[data-companion-prompt]").forEach(button => {
        button.addEventListener("click", () => {
            input.value = translations[language][button.dataset.companionPrompt];
            input.focus();
        });
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, "user");
        history.push({ role: "user", content: text });
        saveHistory();
        input.value = "";
        input.disabled = true;
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = true;
        const waiting = addMessage(translations[language].waiting, "notice");

        try {
            const response = await fetch("https://functions.yandexcloud.net/d4e710p596ie3l1fpjoc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ language, messages: history.slice(-12) })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || typeof result.reply !== "string") {
                throw new Error(result.error || "AI request failed");
            }
            waiting.remove();
            addMessage(result.reply, "assistant");
            history.push({ role: "assistant", content: result.reply });
            saveHistory();
        } catch (error) {
            console.warn("FOCUS companion failed", error);
            waiting.textContent = translations[language].unavailable;
            waiting.dataset.companionMessage = "unavailable";
        } finally {
            input.disabled = false;
            submit.disabled = false;
            input.focus();
        }
    });

    clearButton.addEventListener("click", () => {
        if (!confirm(translations[language].confirmClear)) return;
        chat.replaceChildren();
        addMessage(translations[language].greeting, "assistant", "greeting");
        history = [];
        saveHistory();
        input.value = "";
    });

    window.addEventListener("storage", event => {
        if (event.key === LANGUAGE_KEY) applyLanguage(event.newValue);
    });

    try {
        applyLanguage(localStorage.getItem(LANGUAGE_KEY) || "ru");
    } catch {
        applyLanguage("ru");
    }
    restoreHistory();
})();
