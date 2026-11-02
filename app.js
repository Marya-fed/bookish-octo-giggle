// ---------- прогресс ----------
const Progress = {
  load() {
    try { return JSON.parse(localStorage.getItem("math_tutor_progress")) || {completed: []}; }
    catch { return {completed: []}; }
  },
  save(p) { localStorage.setItem("math_tutor_progress", JSON.stringify(p)); }
};

// ---------- состояние ----------
let lesson = null;
let stage = "explain"; // explain | game | consolidation | done
let gameState = null;
let consIndex = 0, consInput = "", consFeedback = null, consOk = 0;

const app = document.getElementById("app");

// ---------- утилиты ----------
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function clear() { app.innerHTML = ""; }
function normalize(s) {
  return s.toLowerCase().trim()
    .replace(/\s+/g, "")
    .replace(/·/g, "*")
    .replace(/√/g, "sqrt")
    .replace(/√/g, "");
}
function evaluate(task, input) {
  const answer = (task.answer || "").trim().toLowerCase();
  if (answer === "open") {
    if (input.trim().length < 15) return {ok: false, msg: "Слишком коротко. Попробуй объяснить своими словами и привести числа. " + task.error_feedback};
    return {ok: true, msg: "Ты объяснил словами — это главное. " + task.error_feedback};
  }
  const a = answer.replace(/\s+/g, "").replace(/·/g, "*").replace(/√/g, "sqrt");
  const b = input.toLowerCase().replace(/\s+/g, "").replace(/·/g, "*").replace(/√/g, "sqrt");
  if (a === b) return {ok: true, msg: "Верно. " + task.error_feedback};
  return {ok: false, msg: "Пока не так. " + task.error_feedback};
}

// ---------- экраны ----------
function drawExplain() {
  clear();
  app.appendChild(el("h1", "", `Урок ${lesson.id}. ${lesson.title}`));
  const card = el("div", "card");
  card.appendChild(el("p", "", lesson.explain.text));
  card.appendChild(el("div", "rule", lesson.explain.rule));
  card.appendChild(el("p", "example", "Пример: " + lesson.explain.example));
  app.appendChild(card);

  const btn = el("button", "btn", "Понятно, дальше →");
  btn.onclick = () => { stage = "game"; initGame(); render(); };
  app.appendChild(btn);
}

function initGame() {
  gameState = {
    placed: {},     // index -> bin
    selected: null,
    wrongIndex: null,
    feedback: null,
  };
}

function drawGame() {
  clear();
  app.appendChild(el("h1", "", `Урок ${lesson.id}. ${lesson.title}`));
  app.appendChild(el("div", "instruction", lesson.game.instruction));

  // контейнеры
  const bins = el("div", "bins");
  lesson.game.bins.forEach((name, bi) => {
    const bin = el("div", "bin");
    if (gameState.selected !== null) bin.classList.add("active");
    bin.appendChild(el("div", "bin-title", name));
    const placedHere = Object.entries(gameState.placed)
      .filter(([i, b]) => b === bi)
      .map(([i]) => lesson.game.items[i].expr);
    bin.appendChild(el("div", "bin-items", placedHere.join(", ")));
    bin.onclick = () => {
      if (gameState.selected === null) return;
      attemptPlace(gameState.selected, bi);
    };
    bins.appendChild(bin);
  });
  app.appendChild(bins);

  // карточки
  const cards = el("div", "cards");
  lesson.game.items.forEach((item, i) => {
    if (i in gameState.placed) return;
    const c = el("div", "item", item.expr);
    if (gameState.selected === i) c.classList.add("selected");
    if (gameState.wrongIndex === i) c.classList.add("wrong");
    c.onclick = () => {
      gameState.selected = (gameState.selected === i) ? null : i;
      gameState.wrongIndex = null;
      gameState.feedback = null;
      render();
    };
    cards.appendChild(c);
  });
  app.appendChild(cards);

  // фидбек
  if (gameState.feedback) {
    const fb = el("div", "feedback err");
    fb.appendChild(el("strong", "", "Не совсем. Разберём вместе:"));
    fb.appendChild(el("p", "", gameState.feedback.hint));
    if (gameState.feedback.counterexample) {
      fb.appendChild(el("p", "", "Контрпример: " + gameState.feedback.counterexample));
    }
    app.appendChild(fb);
  }

  // прогресс
  const total = lesson.game.items.length;
  const done = Object.keys(gameState.placed).length;
  const pr = el("div", "progress", `Размещено: ${done} / ${total}`);
  const bar = el("div", "bar");
  const fill = el("div");
  fill.style.width = (done / total * 100) + "%";
  bar.appendChild(fill);
  pr.appendChild(bar);
  app.appendChild(pr);
}

function attemptPlace(idx, binIndex) {
  const item = lesson.game.items[idx];
  if (item.correct === binIndex) {
    gameState.placed[idx] = binIndex;
    gameState.selected = null;
    gameState.wrongIndex = null;
    gameState.feedback = null;
    if (Object.keys(gameState.placed).length === lesson.game.items.length) {
      stage = "consolidation";
      consIndex = 0; consInput = ""; consFeedback = null; consOk = 0;
    }
  } else {
    gameState.wrongIndex = idx;
    gameState.feedback = item;
    gameState.selected = null;
  }
  render();
}

function drawConsolidation() {
  clear();
  const total = lesson.consolidation.length;
  app.appendChild(el("h1", "", `Закрепление — задание ${consIndex + 1} из ${total}`));
  const card = el("div", "card");
  card.appendChild(el("p", "", lesson.consolidation[consIndex].task));
  app.appendChild(card);

  const inp = document.createElement("input");
  inp.type = "text";
  inp.placeholder = "Введи ответ или объяснение";
  inp.value = consInput;
  inp.oninput = (e) => { consInput = e.target.value; };
  inp.onkeydown = (e) => { if (e.key === "Enter") submitCons(); };
  app.appendChild(inp);

  const btn = el("button", "btn", "Проверить");
  btn.onclick = submitCons;
  app.appendChild(btn);

  if (consFeedback) {
    const fb = el("div", "feedback " + (consFeedback.ok ? "ok" : "err"));
    fb.appendChild(el("strong", "", consFeedback.ok ? "✓ Верно!" : "✗ Пока не так"));
    fb.appendChild(el("p", "", consFeedback.msg));
    app.appendChild(fb);
  }
}

function submitCons() {
  const task = lesson.consolidation[consIndex];
  const res = evaluate(task, consInput);
  consFeedback = res;
  if (res.ok) {
    consOk++;
    consIndex++;
    consInput = "";
    if (consIndex >= lesson.consolidation.length) {
      stage = "done";
      const p = Progress.load();
      if (!p.completed.includes(lesson.id)) p.completed.push(lesson.id);
      Progress.save(p);
    }
  }
  render();
}

function drawDone() {
  clear();
  app.appendChild(el("div", "praise", "🎉"));
  app.appendChild(el("h1", "center", "Урок закрыт!"));
  app.appendChild(el("p", "center", `Ты прошёл все задания урока ${lesson.id}.`));
  app.appendChild(el("p", "center", "Ты сам разобрался, где корень произведения раскладывается, а где нет — это ровно то, что нужно к концу первой четверти."));
  const btn = el("button", "btn green", "Готово");
  btn.onclick = () => {
    app.innerHTML = "";
    app.appendChild(el("h1", "center", "Прогресс сохранён"));
    app.appendChild(el("p", "center", "До встречи на следующем уроке!"));
  };
  app.appendChild(btn);
}

// ---------- рендер ----------
function render() {
  if (stage === "explain") drawExplain();
  else if (stage === "game") drawGame();
  else if (stage === "consolidation") drawConsolidation();
  else if (stage === "done") drawDone();
}

// ---------- старт ----------
fetch("lesson_06.json")
  .then(r => r.json())
  .then(data => { lesson = data; render(); })
  .catch(err => {
    app.innerHTML = "<h1>Ошибка загрузки</h1><p>Не удалось загрузить lesson_06.json. " +
                    "Убедись, что файл лежит рядом с index.html и открываешь через http-сервер, а не file://</p>";
    console.error(err);
  });
