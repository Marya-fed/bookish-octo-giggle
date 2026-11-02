// ---------- ПРОГРЕСС ----------
const Progress = {
  load() {
    try {
      const data = JSON.parse(localStorage.getItem("math_tutor_progress"));
      if (!data || !Array.isArray(data.completed) || !Array.isArray(data.unlocked)) {
        return { completed: [], diagnostic_passed: false, unlocked: [1] };
      }
      return data;
    } catch { 
      return { completed: [], diagnostic_passed: false, unlocked: [1] }; 
    }
  },
  save(p) { localStorage.setItem("math_tutor_progress", JSON.stringify(p)); }
};

// ---------- СОСТОЯНИЕ ----------
let lesson = null;
let stage = "welcome"; 
let gameState = null;
let consIndex = 0, consInput = "", consFeedback = null, consOk = 0;
let animFrameId = null;

// ---------- СПИСОК УРОКОВ И НАГРАД ----------
const LESSONS_LIST = [
  { id: 1, title: "Степени", desc: "Свойства степеней", reward: "🌸", rewardName: "Цветок" },
  { id: 2, title: "Кв. уравнения", desc: "Виета и дискриминант", reward: "🔑", rewardName: "Ключик" },
  { id: 3, title: "Неравенства", desc: "Метод интервалов", reward: "🔨", rewardName: "Молоток" },
  { id: 4, title: "Область опр.", desc: "Ограничения корня", reward: "🖊️", rewardName: "Золотая ручка" },
  { id: 5, title: "Корень n-й ст.", desc: "Понятие корня", reward: "💎", rewardName: "Кристалл" },
  { id: 6, title: "Свойства корня", desc: "Урок 1-й четверти", reward: "🛡️", rewardName: "Щит знаний" },
  { id: 7, title: "Иррациональные", desc: "Преобразования", reward: "🧭", rewardName: "Компас" },
  { id: 8, title: "Аксиомы", desc: "Стереометрия", reward: "🔭", rewardName: "Телескоп" },
  { id: 9, title: "Параллельность", desc: "Прямая и плоскость", reward: "🗝️", rewardName: "Древний ключ" },
  { id: 10, title: "Плоскости", desc: "Параллельные плоскости", reward: "⚖️", rewardName: "Весы" },
  { id: 11, title: "Практикум", desc: "Алгебра + Геометрия", reward: "🏹", rewardName: "Лук" },
  { id: 12, title: "Финал", desc: "Итоговое закрепление", reward: "🏆", rewardName: "Кубок" }
];

const DIAGNOSTIC_QUESTIONS = [
  { question: "Чему равно значение выражения √(4 · 9)?", options: ["13", "6", "36"], correct: 1, topic: "Свойства корня", lessonId: 6 },
  { question: "Вычисли: 2³ · 2²", options: ["2⁵", "2⁶", "4⁵"], correct: 0, topic: "Степени", lessonId: 1 },
  { question: "Реши уравнение: x² - 5x + 6 = 0", options: ["x=1, x=6", "x=2, x=3", "x=-2, x=-3"], correct: 1, topic: "Кв. уравнения", lessonId: 2 },
  { question: "Найди область определения функции y = √(x - 3)", options: ["x > 3", "x ≥ 3", "x < 3"], correct: 1, topic: "Область опр.", lessonId: 4 },
  { question: "Реши неравенство: (x - 1)(x + 2) > 0", options: ["(-2; 1)", "(-∞; -2) ∪ (1; +∞)", "(-∞; 1)"], correct: 1, topic: "Неравенства", lessonId: 3 },
  { question: "Сколько прямых можно провести через две точки в пространстве?", options: ["Одну", "Две", "Бесконечно много"], correct: 0, topic: "Аксиомы", lessonId: 8 },
  { question: "Если прямая параллельна плоскости, сколько общих точек у них?", options: ["Одну", "Ни одной", "Бесконечно много"], correct: 1, topic: "Параллельность", lessonId: 9 },
  { question: "Чему равно √(a²) при a < 0?", options: ["a", "-a", "a²"], correct: 1, topic: "Корень n-й ст.", lessonId: 5 },
  { question: "Упрости: (√a)²", options: ["a", "a²", "√a"], correct: 0, topic: "Иррациональные", lessonId: 7 },
  { question: "Если две плоскости параллельны, пересекаются ли они?", options: ["Да", "Нет", "Только под углом"], correct: 1, topic: "Плоскости", lessonId: 10 }
];
let diagIndex = 0;

const FIXIK_PHRASES = {
  welcome: "Привет, Федя! Я Фиксик. Чтобы я понял, какие темы тебе нужно подтянуть, давай пройдем диагностику из 10 вопросов. Готов?",
  diagCorrect: "Верно! Отличная работа.",
  diagWrong: "Почти! Но здесь есть пробел, мы это исправим.",
  diagDone: "Диагностика пройдена! Я составил для тебя индивидуальный план. Смотри на карту!",
  start: "Выбирай доступный урок на карте и погнали!",
  gameStart: "Вспомни правило: корень произведения равен произведению корней. Но есть ловушки!",
  error: "Ой! Кажется, здесь спряталась ловушка. Давай посмотрим внимательнее.",
  success: "Супер! Ты отлично справляешься. Я в тебя верю!",
  consStart: "Теперь проверим, как ты усвоил тему. Пиши ответы смело!",
  consError: "Почти получилось! Не переживай, попробуй еще раз, я подскажу.",
  done: "Ура! Мы прошли этот урок! Федя, ты большой молодец. Держи награду!"
};

const app = document.getElementById("app");

// ---------- ЗАЩИТА ----------
function showWarning() {
  if (document.getElementById("copy-warning")) return;
  const overlay = document.createElement("div");
  overlay.id = "copy-warning";
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);";
  const box = document.createElement("div");
  box.style.cssText = "background:#fff;padding:30px 20px;border-radius:20px;text-align:center;border:4px solid #ff4d4d;box-shadow:0 10px 30px rgba(0,0,0,0.3);max-width:90%;animation:shake 0.5s;";
  box.innerHTML = `<div style="font-size:60px;margin-bottom:10px;">🚫</div><h2 style="color:#d32f2f;font-size:28px;margin:0 0 10px 0;font-weight:900;">Федя, думай сам!</h2><p style="color:#333;font-size:16px;margin:0 0 20px 0;">Списывать из интернета или нейросетей нельзя. Реши задачу самостоятельно — я в тебя верю!</p><button id="close-warning" style="padding:12px 24px;background:#ff4d4f;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer;">Я всё понял</button>`;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  document.getElementById("close-warning").onclick = () => overlay.remove();
}
document.addEventListener('copy', (e) => { e.preventDefault(); showWarning(); });
document.addEventListener('paste', (e) => { e.preventDefault(); showWarning(); });

// ---------- УТИЛИТЫ ----------
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function clear() { 
  if (animFrameId) cancelAnimationFrame(animFrameId);
  app.innerHTML = ""; 
}
function renderFixik(text, mood = "normal") {
  const box = el("div", "fixik-box");
  if (mood === "success") box.classList.add("success");
  if (mood === "error") box.classList.add("error");
  const avatar = el("div", "fixik-avatar");
  const img = document.createElement("img");
  img.src = "fixik.png"; img.alt = "Фиксик"; img.ondragstart = () => false; 
  avatar.appendChild(img);
  const speech = el("div", "fixik-speech", text);
  box.appendChild(avatar); box.appendChild(speech);
  return box;
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

// ---------- ДИАГНОСТИКА ----------
function drawWelcome() {
  clear();
  app.appendChild(renderFixik(FIXIK_PHRASES.welcome));
  app.appendChild(el("h1", "center", "Добро пожаловать!"));
  const card = el("div", "card");
  card.appendChild(el("p", "", "Сейчас мы выполним 10 заданий. По их результатам я открою те уроки на карте, которые помогут закрыть твои пробелы."));
  app.appendChild(card);
  const btn = el("button", "btn", "Начать диагностику 🚀");
  btn.onclick = () => { stage = "diagnostic"; diagIndex = 0; render(); };
  app.appendChild(btn);
}

function drawDiagnostic() {
  clear();
  app.appendChild(renderFixik(`Вопрос ${diagIndex + 1} из ${DIAGNOSTIC_QUESTIONS.length}`, "normal"));
  const q = DIAGNOSTIC_QUESTIONS[diagIndex];
  app.appendChild(el("h1", "", "Проверка знаний"));
  const card = el("div", "card");
  card.appendChild(el("p", "", q.question));
  app.appendChild(card);

  const optionsDiv = el("div", "cards");
  optionsDiv.style.gridTemplateColumns = "1fr"; 
  
  q.options.forEach((opt, idx) => {
    const btn = el("div", "item", opt);
    btn.style.padding = "16px"; btn.style.fontSize = "18px";
    btn.onclick = () => {
      const isCorrect = (idx === q.correct);
      const p = Progress.load();
      
      if (!isCorrect && !p.unlocked.includes(q.lessonId)) {
        p.unlocked.push(q.lessonId);
        p.unlocked.sort((a,b) => a - b);
      }
      Progress.save(p);

      clear();
      app.appendChild(renderFixik(isCorrect ? FIXIK_PHRASES.diagCorrect : FIXIK_PHRASES.diagWrong, isCorrect ? "success" : "error"));
      
      const btnNext = el("button", "btn", "Дальше →");
      btnNext.onclick = () => {
        diagIndex++;
        if (diagIndex < DIAGNOSTIC_QUESTIONS.length) {
          stage = "diagnostic"; render();
        } else {
          const p = Progress.load();
          p.diagnostic_passed = true;
          Progress.save(p);
          stage = "diagDone"; render();
        }
      };
      app.appendChild(btnNext);
    };
    optionsDiv.appendChild(btn);
  });
  app.appendChild(optionsDiv);
}

function drawDiagDone() {
  clear();
  app.appendChild(renderFixik(FIXIK_PHRASES.diagDone, "success"));
  app.appendChild(el("h1", "center", "Диагностика завершена!"));
  const btn = el("button", "btn green", "Перейти к карте знаний 🗺️");
  btn.onclick = () => { stage = "home"; render(); };
  app.appendChild(btn);
}

// ---------- КАРТА (С ЯЧЕЙКАМИ НАГРАД) ----------
function drawHome() {
  clear();
  app.appendChild(renderFixik(FIXIK_PHRASES.start));
  app.appendChild(el("h1", "center", "Карта восхождения"));
  
  const progress = Progress.load();
  const grid = el("div", "map-grid");
  
  LESSONS_LIST.forEach((item) => {
    const isCompleted = progress.completed.includes(item.id);
    const isUnlockedByDiag = progress.unlocked.includes(item.id);
    const isPreviousCompleted = item.id === 1 || progress.completed.includes(item.id - 1);
    const isAvailable = isUnlockedByDiag && isPreviousCompleted;

    const node = el("div", "map-node");
    if (isCompleted) node.classList.add("completed");
    else if (isAvailable) node.classList.add("current");
    else node.classList.add("locked");

    node.appendChild(el("div", "map-icon", isCompleted ? "✅" : (isAvailable ? "🚀" : "🔒")));
    node.appendChild(el("div", "map-title", `Урок ${item.id}`));
    node.appendChild(el("div", "map-desc", item.title));

    node.onclick = () => {
      if (isCompleted || isAvailable) {
        fetch(`lesson_${String(item.id).padStart(2, '0')}.json`)
          .then(r => r.json())
          .then(data => { lesson = data; stage = "explain"; render(); })
          .catch(err => alert(`Файл lesson_${String(item.id).padStart(2, '0')}.json еще не создан!`));
      } else {
        alert("Этот урок пока закрыт! Сначала пройди предыдущие.");
      }
    };
    grid.appendChild(node);
  });
  app.appendChild(grid);

  // --- БЛОК ИНВЕНТАРЯ (НАГРАДЫ) ---
  const invTitle = el("h2", "", "Твой инвентарь");
  invTitle.style.marginTop = "30px";
  invTitle.style.textAlign = "center";
  invTitle.style.color = "#1a2b4c";
  app.appendChild(invTitle);

  const inventoryGrid = el("div", "inventory-grid");
  
  LESSONS_LIST.forEach(item => {
    const isCollected = progress.completed.includes(item.id);
    const slot = el("div", "inv-slot");
    if (isCollected) slot.classList.add("filled");
    
    slot.appendChild(el("div", "inv-icon", isCollected ? item.reward : "❓"));
    slot.appendChild(el("div", "inv-name", item.rewardName));
    inventoryGrid.appendChild(slot);
  });
  
  app.appendChild(inventoryGrid);
}

// ---------- УРОК ----------
function drawExplain() {
  clear();
  app.appendChild(renderFixik(FIXIK_PHRASES.start));
  app.appendChild(el("h1", "", `Урок ${lesson.id}. ${lesson.title}`));
  const card = el("div", "card");
  card.appendChild(el("p", "", lesson.explain.text));
  card.appendChild(el("div", "rule", lesson.explain.rule));
  card.appendChild(el("p", "example", "Пример: " + lesson.explain.example));
  app.appendChild(card);

  const btn = el("button", "btn", "Понятно, дальше →");
  btn.onclick = () => { stage = "game"; initGame(); render(); };
  app.appendChild(btn);

  const backBtn = el("button", "btn", "← Назад на карту");
  backBtn.style.cssText = "background:transparent;color:#5b6475;box-shadow:none;margin-top:8px;";
  backBtn.onclick = () => { stage = "home"; render(); };
  app.appendChild(backBtn);
}

function initGame() { gameState = { placed: {}, selected: null, wrongIndex: null, feedback: null }; }

function drawGame() {
  clear();
  let fixikText = FIXIK_PHRASES.gameStart;
  let mood = "normal";
  if (gameState.feedback) { fixikText = FIXIK_PHRASES.error; mood = "error"; }
  else if (Object.keys(gameState.placed).length > 0 && !gameState.selected) { fixikText = FIXIK_PHRASES.success; mood = "success"; }
  
  app.appendChild(renderFixik(fixikText, mood));
  app.appendChild(el("h1", "", `Урок ${lesson.id}. ${lesson.title}`));
  app.appendChild(el("div", "instruction", lesson.game.instruction));

  const bins = el("div", "bins");
  lesson.game.bins.forEach((name, bi) => {
    const bin = el("div", "bin");
    if (gameState.selected !== null) bin.classList.add("active");
    bin.appendChild(el("div", "bin-title", name));
    
    const placedHere = Object.entries(gameState.placed).filter(([i, b]) => b === bi).map(([i]) => lesson.game.items[i].expr);
    const itemsDiv = el("div", "bin-items");
    placedHere.forEach(expr => { itemsDiv.appendChild(el("span", "", expr + " ")); });
    bin.appendChild(itemsDiv);
    
    bin.onclick = () => { if (gameState.selected === null) return; attemptPlace(gameState.selected, bi); };
    bins.appendChild(bin);
  });
  app.appendChild(bins);

  const cards = el("div", "cards");
  lesson.game.items.forEach((item, i) => {
    if (i in gameState.placed) return;
    const c = el("div", "item", item.expr);
    if (gameState.selected === i) c.classList.add("selected");
    if (gameState.wrongIndex === i) c.classList.add("wrong");
    c.onclick = () => {
      gameState.selected = (gameState.selected === i) ? null : i;
      gameState.wrongIndex = null; gameState.feedback = null; render();
    };
    cards.appendChild(c);
  });
  app.appendChild(cards);

  if (gameState.feedback) {
    const fb = el("div", "feedback err");
    fb.style.cssText = "padding:14px;background:#fff5f5;border-radius:12px;border:2px solid #ff6b6b;color:#8a2a2a;font-size:15px;margin-top:16px;";
    fb.appendChild(el("strong", "", "Разбор полёта:"));
    fb.appendChild(el("p", "", gameState.feedback.hint));
    if (gameState.feedback.counterexample) fb.appendChild(el("p", "", "Контрпример: " + gameState.feedback.counterexample));
    app.appendChild(fb);
  }

  const total = lesson.game.items.length;
  const done = Object.keys(gameState.placed).length;
  const pr = el("div", "progress", `Размещено: ${done} / ${total}`);
  const bar = el("div", "bar");
  const fill = el("div");
  fill.style.width = (done / total * 100) + "%";
  bar.appendChild(fill); pr.appendChild(bar); app.appendChild(pr);
}

function attemptPlace(idx, binIndex) {
  const item = lesson.game.items[idx];
  if (item.correct === binIndex) {
    gameState.placed[idx] = binIndex;
    gameState.selected = null; gameState.wrongIndex = null; gameState.feedback = null;
    if (Object.keys(gameState.placed).length === lesson.game.items.length) {
      stage = "consolidation"; consIndex = 0; consInput = ""; consFeedback = null; consOk = 0;
    }
  } else {
    gameState.wrongIndex = idx; gameState.feedback = item; gameState.selected = null;
  }
  render();
}

function drawConsolidation() {
  clear();
  let fixikText = FIXIK_PHRASES.consStart;
  let mood = "normal";
  if (consFeedback) {
    if (consFeedback.ok) { fixikText = FIXIK_PHRASES.success; mood = "success"; }
    else { fixikText = FIXIK_PHRASES.consError; mood = "error"; }
  }
  app.appendChild(renderFixik(fixikText, mood));

  const total = lesson.consolidation.length;
  app.appendChild(el("h1", "", `Закрепление — задание ${consIndex + 1} из ${total}`));
  
  const card = el("div", "card");
  card.appendChild(el("p", "", lesson.consolidation[consIndex].task));
  app.appendChild(card);

  const inp = document.createElement("input");
  inp.type = "text"; inp.placeholder = "Введи ответ или объяснение"; inp.value = consInput;
  inp.onpaste = (e) => { e.preventDefault(); showWarning(); };
  inp.oncontextmenu = (e) => { e.preventDefault(); showWarning(); };
  inp.oninput = (e) => { consInput = e.target.value; };
  inp.onkeydown = (e) => { if (e.key === "Enter") submitCons(); };
  app.appendChild(inp);

  const btn = el("button", "btn", "Проверить");
  btn.onclick = submitCons;
  app.appendChild(btn);

  if (consFeedback) {
    const fb = el("div", "feedback " + (consFeedback.ok ? "ok" : "err"));
    fb.style.cssText = `padding:16px;border-radius:14px;margin-top:16px;background:${consFeedback.ok ? '#f4fcf7' : '#fff5f5'};border:2px solid ${consFeedback.ok ? '#43e97b' : '#ff6b6b'};color:${consFeedback.ok ? '#0b4632' : '#8a2a2a'};`;
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
    consOk++; consIndex++; consInput = "";
    if (consIndex >= lesson.consolidation.length) {
      stage = "done";
    } else {
      setTimeout(() => { consFeedback = null; render(); }, 1500);
    }
  }
  render();
}

// ---------- 2D-МУЛЬТФИЛЬМ С РАЗНЫМИ БИОМАМИ ----------
function drawDone() {
  clear();
  const currentReward = LESSONS_LIST.find(l => l.id === lesson.id).reward;
  
  app.appendChild(renderFixik(`Ура! Ты прошел Урок ${lesson.id}. Смотри, как высоко мы забрались! Твоя награда: ${currentReward}`, "success"));
  app.appendChild(el("h1", "center", `Уровень ${lesson.id} пройден!`));
  
  const canvasContainer = el("div", "card");
  canvasContainer.style.cssText = "padding:0;overflow:hidden;display:flex;justify-content:center;background:#87CEEB;border-radius:18px;border:4px solid #fff;box-shadow:0 10px 30px rgba(0,0,0,0.1);";
  
  const canvas = document.createElement("canvas");
  canvas.width = 600; canvas.height = 350;
  canvas.style.width = "100%"; canvas.style.maxWidth = "600px";
  canvasContainer.appendChild(canvas);
  app.appendChild(canvasContainer);

  const btn = el("button", "btn green", `Забрать награду ${currentReward}`);
  btn.onclick = () => {
    const p = Progress.load();
    if (!p.completed.includes(lesson.id)) p.completed.push(lesson.id);
    const nextLesson = lesson.id + 1;
    if (nextLesson <= 12 && !p.unlocked.includes(nextLesson)) {
      p.unlocked.push(nextLesson);
      p.unlocked.sort((a,b) => a - b);
    }
    Progress.save(p);
    stage = "home"; render();
  };
  app.appendChild(btn);

  start3DAnimation(canvas, lesson.id);
}

function start3DAnimation(canvas, lessonId) {
  const ctx = canvas.getContext("2d");
  let t = 0; 
  const fixikImg = new Image();
  fixikImg.src = "fixik.png";

  // Смена биомов в зависимости от урока
  let bgColor = "#87CEEB";
  let groundColor = "#27AE60";
  let mountainColor = "#7F8C8D";
  
  if (lessonId <= 2) { groundColor = "#95A5A6"; mountainColor = "#BDC3C7"; } // Камни
  else if (lessonId <= 4) { groundColor = "#F1C40F"; mountainColor = "#F39C12"; } // Песок
  else if (lessonId <= 6) { groundColor = "#2ECC71"; mountainColor = "#27AE60"; } // Трава
  else if (lessonId <= 8) { groundColor = "#1ABC9C"; mountainColor = "#16A085"; } // Плато
  else if (lessonId <= 10) { groundColor = "#3498DB"; mountainColor = "#2980B9"; } // Оазис (вода)
  else { groundColor = "#ECF0F1"; mountainColor = "#BDC3C7"; } // Снег

  function drawSuperFedia(ctx, x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    // Плащ
    const capeWave = Math.sin(t * 0.1) * 10;
    ctx.fillStyle = "#E74C3C";
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-40, 20 + capeWave, -60, 40 + capeWave); ctx.lineTo(-30, 50); ctx.lineTo(10, 10); ctx.fill();
    // Костюм
    ctx.fillStyle = "#3498DB"; ctx.beginPath(); ctx.roundRect(-15, 0, 30, 45, 8); ctx.fill();
    // Голова
    ctx.fillStyle = "#FFDFC4"; ctx.beginPath(); ctx.arc(0, -15, 14, 0, Math.PI * 2); ctx.fill();
    // Маска
    ctx.fillStyle = "#2C3E50"; ctx.beginPath(); ctx.arc(0, -18, 14, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#FFF"; ctx.beginPath(); ctx.arc(-6, -16, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(6, -16, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function animate() {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Солнце
    ctx.fillStyle = "#FFF9C4"; ctx.beginPath(); ctx.arc(500, 60, 30 + Math.sin(t*0.05)*5, 0, Math.PI*2); ctx.fill();
    
    // Земля
    ctx.fillStyle = groundColor; 
    ctx.beginPath(); ctx.moveTo(0, 280); ctx.quadraticCurveTo(300, 230, 600, 280); ctx.lineTo(600, 350); ctx.lineTo(0, 350); ctx.fill();
    
    // Гора
    ctx.fillStyle = mountainColor; 
    ctx.beginPath(); ctx.moveTo(200, 300); ctx.lineTo(400, 150); ctx.lineTo(600, 300); ctx.fill();

    // Пьедестал
    ctx.fillStyle = "#BDC3C7"; ctx.fillRect(350, 250, 100, 100);
    
    // Федя прыгает на вершине
    const jump = Math.max(0, Math.sin(t * 0.1) * 20);
    drawSuperFedia(ctx, 400, 230 - jump, 1.5);

    // Фиксик приносит награду (появляется с 60 кадра)
    if (t > 60) {
      let fixikX = 150 + ((t - 60) / 40) * 180;
      if (fixikX > 330) fixikX = 330;
      
      if (fixikImg.complete && fixikImg.naturalWidth > 0) {
        ctx.drawImage(fixikImg, fixikX, 200, 80, 80);
      } else {
        ctx.fillStyle = "#00BFFF"; ctx.beginPath(); ctx.arc(fixikX + 40, 240, 30, 0, Math.PI * 2); ctx.fill();
      }
      
      // Летящая награда
      if (t > 100) {
        const rewardProgress = Math.min((t - 100) / 30, 1);
        const rx = 330 + 40 + (400 - (330 + 40)) * rewardProgress;
        const ry = 200 + (230 - 200) * rewardProgress - Math.sin(rewardProgress * Math.PI) * 40;
        
        const rewardItem = LESSONS_LIST.find(l => l.id === lessonId).reward;
        ctx.font = "36px Arial"; ctx.textAlign = "center";
        ctx.fillText(rewardItem, rx, ry);
      }
    }

    t++;
    animFrameId = requestAnimationFrame(animate);
  }
  animate();
}

function render() {
  if (stage === "welcome") drawWelcome();
  else if (stage === "diagnostic") drawDiagnostic();
  else if (stage === "diagDone") drawDiagDone();
  else if (stage === "home") drawHome();
  else if (stage === "explain") drawExplain();
  else if (stage === "game") drawGame();
  else if (stage === "consolidation") drawConsolidation();
  else if (stage === "done") drawDone();
}

// СТАРТ
const savedProgress = Progress.load();
if (savedProgress.diagnostic_passed) {
  stage = "home"; 
} else {
  stage = "welcome"; 
}
render();
