(() => {
  'use strict';

  const KEY = 'fokus.reflections.v1';

  const cards = [
    ['01-path.png', 'Женщина отдыхает под деревом у тропинки'],
    ['02-choice.png', 'Женщина перед развилкой тропинок'],
    ['03-sea.png', 'Лодка на спокойном море'],
    ['04-shelter.png', 'Уютное кресло в доме у открытой двери'],
    ['05-window.png', 'Открытое окно и свет'],
    ['06-garden.png', 'Зелёный сад'],
    ['07-bridge.png', 'Мост среди зелени'],
    ['08-new.webp', 'Маяк на берегу'],
    ['09-new.webp', 'Тёплое утро в горах'],
    ['10-new.webp', 'Книги у окна'],
    ['11-new.webp', 'Лестница в лесу'],
    ['12-new.webp', 'Качели на закате'],
    ['13-new.webp', 'Чемоданы и дорога'],
    ['14-new.webp', 'Кошка у моря'],
    ['15-new.webp', 'Новый город'],
    ['16-new.webp', 'Цветущее дерево'],
    ['17-new.webp', 'Мост через ручей'],
    ['18-new.webp', 'Домашний уют'],
    ['19-new.webp', 'Компас в руке'],
    ['20-new.webp', 'Указатели на перепутье'],
    ['21-new.webp', 'Свобода на вершине'],
    ['22-new.webp', 'Мастерская художника'],
    ['23-new.webp', 'Рабочее место у окна'],
    ['24-new.webp', 'Дорога к дому'],
    ['25-new.webp', 'Цветы на закате'],
    ['26-new.webp', 'Звезда в ладонях'],
    ['27-new.webp', 'Лестница среди цветов'],
    ['28-new.webp', 'Книга и тишина'],
    ['29-new.webp', 'Каменная арка'],
    ['30-new.webp', 'Путешествие к горам']
  ];

  function day(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function parse(raw) {
    if (raw === null) {
      return { version: 1, days: {} };
    }

    const data = JSON.parse(raw);

    if (
      !data ||
      data.version !== 1 ||
      !data.days ||
      typeof data.days !== 'object' ||
      Array.isArray(data.days)
    ) {
      throw Error('Некорректный формат записей.');
    }

    for (const [date, entry] of Object.entries(data.days)) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !entry ||
        !Number.isInteger(entry.card) ||
        entry.card < 0 ||
        entry.card >= cards.length ||
        !Array.isArray(entry.answers) ||
        entry.answers.length !== 3 ||
        entry.answers.some(
          answer => typeof answer !== 'string' || answer.length > 3000
        )
      ) {
        throw Error('Некорректная запись.');
      }
    }

    return data;
  }

  // Cycle through the entire available deck before repeating a card.
  // Existing daily cards and reflections remain unchanged.
  function pickUnusedCard(data, date, random) {
    const previous = Object.entries(data.days)
      .filter(([d]) => d < date)
      .sort(([a], [b]) => b.localeCompare(a));
    const used = new Set();
    for (const [, entry] of previous) {
      if (used.has(entry.card)) break;
      used.add(entry.card);
      if (used.size === cards.length) break;
    }
    const available = cards.map((_, i) => i).filter(i => !used.has(i));
    return available[Math.min(available.length - 1, Math.floor(random() * available.length))];
  }

  function ensure(data, date, random = Math.random) {
    if (!Object.hasOwn(data.days, date)) {
      data.days[date] = {
        card: pickUnusedCard(data, date, random),
        answers: ['', '', '']
      };
    }

    return data.days[date];
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parse, ensure, day, KEY };
    return;
  }

  const $ = id => document.getElementById(id);
  const form = $('reflectionForm');

  if (!form) return;

  const fields = [0, 1, 2].map(number =>
    $(`reflectionAnswer${number}`)
  );

  let data;
  let snapshot;
  let selected = day();
  let dirty = false;

  const status = message => {
    $('reflectionStatus').textContent = message;
  };

  function read() {
    snapshot = localStorage.getItem(KEY);
    data = parse(snapshot);
  }

  function commit(next) {
    if (localStorage.getItem(KEY) !== snapshot) {
      throw Error(
        'Записи изменились в другой вкладке. Скопируй несохранённый текст и обнови страницу.'
      );
    }

    const raw = JSON.stringify(next);
    localStorage.setItem(KEY, raw);

    snapshot = raw;
    data = next;
  }

  const label = date =>
    new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

  function history() {
    const host = $('reflectionHistory');
    host.replaceChildren();

    const entries = Object.entries(data.days)
      .filter(([, entry]) =>
        entry.answers.some(answer => answer.trim())
      )
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA));

    if (!entries.length) {
      host.textContent =
        'Здесь появятся сохранённые заметки. Начни, когда захочется.';
      return;
    }

    for (const [date, entry] of entries) {
      const article = document.createElement('article');

      const title = document.createElement('h4');
      title.textContent = label(date);
      article.append(title);

      entry.answers.forEach((answer, index) => {
        if (!answer.trim()) return;

        const text = document.createElement('p');

        text.textContent = [
          'Моё внимание: ',
          'Мои чувства: ',
          'Беру с собой: '
        ][index] + answer;

        article.append(text);
      });

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Открыть';

      edit.onclick = () => {
        if (
          dirty &&
          !confirm('Перейти без сохранения текущего текста?')
        ) {
          return;
        }

        selected = date;
        dirty = false;
        render();

        status('Открыта запись за ' + label(date));

        form.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      };

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Удалить заметку';

      remove.onclick = () => {
        if (dirty) {
          status('Сначала сохрани текущий текст.');
          return;
        }

        if (
          !confirm(
            'Удалить заметку за ' +
              label(date) +
              '? Восстановить её нельзя. Карта этого дня останется прежней.'
          )
        ) {
          return;
        }

        try {
          const next = JSON.parse(JSON.stringify(data));
          next.days[date].answers = ['', '', ''];

          commit(next);
          render();
          status('Заметка удалена.');
        } catch (error) {
          status(error.message);
        }
      };

      article.append(edit, remove);
      host.append(article);
    }
  }

  function render() {
    const entry = data.days[selected];

    $('reflectionCover').hidden = Boolean(entry);
    $('reflectionImage').hidden = !entry;
    form.hidden = !entry;
    $('reflectionToday').hidden = selected === day();
    $('reflectionDate').textContent = label(selected);

    if (entry) {
      const image = $('reflectionImage');

      image.src = 'images/cards/' + cards[entry.card][0];
      image.alt = cards[entry.card][1];

      fields.forEach((field, index) => {
        field.value = entry.answers[index];
      });
    }

    history();
  }

  $('reflectionImage').onerror = () => {
    status(
      'Не удалось загрузить картинку. Проверь, что папка images/cards скопирована целиком.'
    );
  };

  $('openReflection').onclick = () => {
    try {
      const next = JSON.parse(JSON.stringify(data));

      selected = day();
      ensure(next, selected);
      commit(next);

      render();
      status('Карта останется той же до конца дня.');
    } catch (error) {
      status('Не удалось открыть карту: ' + error.message);
    }
  };

  form.addEventListener('input', () => {
    dirty = true;
    status('Есть несохранённые изменения.');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();

    const answers = fields.map(field => field.value.trim());

    if (!answers.some(Boolean)) {
      status('Напиши хотя бы один отклик.');
      return;
    }

    try {
      const next = JSON.parse(JSON.stringify(data));
      next.days[selected].answers = answers;

      commit(next);
      dirty = false;
      history();

      status('Сохранено за ' + label(selected) + '.');
    } catch (error) {
      status('Не удалось сохранить: ' + error.message);
    }
  });

  $('reflectionToday').onclick = () => {
    if (
      dirty &&
      !confirm('Перейти без сохранения текущего текста?')
    ) {
      return;
    }

    selected = day();
    dirty = false;
    render();
    status('');
  };

  function checkDate() {
    if (selected !== day()) {
      if (dirty) {
        $('reflectionToday').hidden = false;

        status(
          'Наступил новый день. Этот текст сохранится за ' +
            label(selected) +
            '.'
        );
      } else {
        selected = day();
        render();
      }
    }
  }

  document
    .querySelector('[data-tab="profile"]')
    .addEventListener('click', checkDate);

  window.addEventListener('focus', checkDate);

  window.addEventListener('beforeunload', event => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;

    if (dirty) {
      status(
        'Данные изменились в другой вкладке. Скопируй текст перед обновлением страницы.'
      );
      return;
    }

    try {
      read();
      render();
    } catch (error) {
      status('Не удалось прочитать записи: ' + error.message);
    }
  });

  try {
    read();
    render();
  } catch (error) {
    $('openReflection').disabled = true;

    status(
      'Хранилище заметок недоступно или повреждено. Старые данные не изменены. ' +
        error.message
    );
  }
})();