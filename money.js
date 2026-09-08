(() => {
    "use strict";

    const STORAGE_KEY = "fokus.sales.v1";
    const byId = id => document.getElementById(id);

    function initSales() {
        const dialog = byId("salesDialog");
        const form = byId("salesForm");
        const openButton = byId("salesOpen");
        if (!dialog || !form || !openButton) return;

        const fields = {
            date: byId("saleDate"),
            product: byId("saleProduct"),
            quantity: byId("saleQuantity"),
            price: byId("salePrice"),
            cost: byId("saleCost"),
            expenses: byId("saleExpenses"),
            comment: byId("saleComment")
        };
        const monthField = byId("salesMonth");
        const status = byId("salesStatus");
        let records = [];
        let editingId = null;
        let storageAvailable = true;

        const localDate = (date = new Date()) =>
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const money = new Intl.NumberFormat("ru-RU", {
            style: "currency", currency: "RUB", maximumFractionDigits: 2
        });
        const number = value => Number.parseFloat(value) || 0;
        const totals = record => {
            const revenue = record.quantity * record.price;
            const grossProfit = revenue - record.quantity * record.cost - record.expenses;
            return {
                revenue,
                grossProfit,
                myIncome: grossProfit / 2
            };
        };
        const makeId = () => window.crypto?.randomUUID?.() ||
            `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        function readStorage() {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw === null) return [];
            const data = JSON.parse(raw);
            const list = Array.isArray(data) ? data : data?.sales;
            if (!Array.isArray(list) || !list.every(record =>
                record && typeof record.id === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(record.date) &&
                typeof record.product === "string" &&
                [record.quantity, record.price, record.cost, record.expenses]
                    .every(value => Number.isFinite(value) && value >= 0)
            )) throw new Error("Некорректный формат данных продаж.");
            return list;
        }

        function persist(next) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, sales: next }));
                records = next;
                return true;
            } catch (error) {
                status.textContent = `Не удалось сохранить: ${error.message}`;
                return false;
            }
        }

        function calculatePreview() {
            const result = totals({
                quantity: number(fields.quantity.value),
                price: number(fields.price.value),
                cost: number(fields.cost.value),
                expenses: number(fields.expenses.value)
            });
            byId("saleRevenue").textContent = money.format(result.revenue);
            byId("saleGrossProfit").textContent = money.format(result.grossProfit);
            byId("saleMyIncome").textContent = money.format(result.myIncome);
        }

        function resetForm() {
            editingId = null;
            form.reset();
            fields.date.value = localDate();
            fields.expenses.value = "0";
            byId("salesFormTitle").textContent = "Новая продажа";
            byId("saleSave").textContent = "Сохранить продажу";
            byId("saleCancel").hidden = true;
            calculatePreview();
        }

        function render() {
            const month = monthField.value;
            const visible = records
                .filter(record => record.date.startsWith(month))
                .sort((a, b) => b.date.localeCompare(a.date));
            const summary = visible.reduce((result, record) => {
                const value = totals(record);
                result.revenue += value.revenue;
                result.grossProfit += value.grossProfit;
                return result;
            }, { revenue: 0, grossProfit: 0 });

            byId("salesRevenueTotal").textContent = money.format(summary.revenue);
            byId("salesGrossProfitTotal").textContent = money.format(summary.grossProfit);
            byId("salesMyIncomeTotal").textContent = money.format(summary.grossProfit / 2);

            const list = byId("salesList");
            list.replaceChildren();
            if (!visible.length) {
                const empty = document.createElement("p");
                empty.className = "sales-empty";
                empty.textContent = "В этом месяце продаж пока нет.";
                list.append(empty);
                return;
            }

            visible.forEach(record => {
                const value = totals(record);
                const article = document.createElement("article");
                article.className = "sales-item";
                const content = document.createElement("div");
                const title = document.createElement("h4");
                title.textContent = record.product;
                const details = document.createElement("p");
                details.textContent = `${record.date.split("-").reverse().join(".")} · ${record.quantity} шт. × ${money.format(record.price)}`;
                const result = document.createElement("p");
                result.className = "sales-item-total";
                result.textContent = `Выручка ${money.format(value.revenue)} · Общая прибыль ${money.format(value.grossProfit)} · Мой доход ${money.format(value.myIncome)}`;
                content.append(title, details, result);
                if (record.comment) {
                    const comment = document.createElement("p");
                    comment.textContent = record.comment;
                    content.append(comment);
                }

                const actions = document.createElement("div");
                actions.className = "sales-item-actions";
                const edit = document.createElement("button");
                edit.type = "button";
                edit.textContent = "Изменить";
                edit.addEventListener("click", () => startEditing(record));
                const remove = document.createElement("button");
                remove.type = "button";
                remove.textContent = "Удалить";
                remove.addEventListener("click", () => {
                    if (!confirm(`Удалить продажу «${record.product}»?`)) return;
                    if (!persist(records.filter(item => item.id !== record.id))) return;
                    if (editingId === record.id) resetForm();
                    render();
                    status.textContent = "Продажа удалена.";
                });
                actions.append(edit, remove);
                article.append(content, actions);
                list.append(article);
            });
        }

        function startEditing(record) {
            editingId = record.id;
            Object.keys(fields).forEach(key => {
                fields[key].value = record[key] ?? "";
            });
            byId("salesFormTitle").textContent = "Редактирование продажи";
            byId("saleSave").textContent = "Сохранить изменения";
            byId("saleCancel").hidden = false;
            status.textContent = "Измени нужные поля и сохрани запись.";
            calculatePreview();
            form.scrollIntoView({ behavior: "smooth", block: "start" });
            fields.product.focus({ preventScroll: true });
        }

        form.addEventListener("input", calculatePreview);
        form.addEventListener("submit", event => {
            event.preventDefault();
            if (!storageAvailable || !form.reportValidity()) return;
            const record = {
                id: editingId || makeId(),
                date: fields.date.value,
                product: fields.product.value.trim(),
                quantity: number(fields.quantity.value),
                price: number(fields.price.value),
                cost: number(fields.cost.value),
                expenses: number(fields.expenses.value),
                comment: fields.comment.value.trim()
            };
            if (!record.product || record.quantity <= 0) return;
            const next = editingId
                ? records.map(item => item.id === editingId ? record : item)
                : [...records, record];
            const wasEditing = Boolean(editingId);
            if (!persist(next)) return;
            monthField.value = record.date.slice(0, 7);
            resetForm();
            render();
            status.textContent = wasEditing ? "Изменения сохранены." : "Продажа сохранена.";
        });

        openButton.addEventListener("click", () => dialog.showModal());
        byId("salesClose").addEventListener("click", () => dialog.close());
        byId("saleCancel").addEventListener("click", () => {
            resetForm();
            status.textContent = "Редактирование отменено.";
        });
        monthField.addEventListener("change", render);
        dialog.addEventListener("click", event => {
            if (event.target === dialog) dialog.close();
        });

        fields.date.value = localDate();
        monthField.value = localDate().slice(0, 7);
        try {
            records = readStorage();
            resetForm();
            render();
        } catch (error) {
            storageAvailable = false;
            byId("saleSave").disabled = true;
            status.textContent = `Хранилище продаж недоступно. Старые данные не изменены. ${error.message}`;
            render();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSales);
    } else {
        initSales();
    }
})();
