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
let stage = "explain"; 
let gameState = null;
let consIndex = 0, consInput = "", consFeedback = null, consOk = 0;
let animFrameId = null;

const FIXIK_PHRASES = {
  start: "Привет! Я твой Фиксик. Помогу разобраться с корнями. Поехали!",
  gameStart: "Вспомни правило: корень произведения равен произведению корней. Но есть ловушки!",
  error: "Ой! Кажется, здесь спряталась ловушка. Давай посмотрим внимательнее.",
  success: "Супер! Ты отлично справляешься. Я в тебя верю!",
  consStart: "Теперь проверим, как ты усвоил тему. Пиши ответы смело!",
  consError: "Почти получилось! Не переживай, попробуй еще раз, я подскажу.",
  done: "Ура! Мы прошли этот урок! Федя, ты большой молодец. Держи награду!"
};

const app = document.getElementById("app");

// --- СИСТЕМА ЗАЩИТЫ ОТ КОПИРОВАНИЯ ---
function showWarning() {
  // Проверяем, нет ли уже таблички, чтобы не спамить
  if (document.getElementById("copy-warning")) return;

  // Создаем затемнение фона
  const overlay = document.createElement("div");
  overlay.id = "copy-warning";
  overlay.style.position = "fixed";
  overlay.style.top = "0"; overlay.style.left = "0";
  overlay.style.width = "100vw"; overlay.style.height = "100vh";
  overlay.style.backgroundColor = "rgba(0,0,0,0.6)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";
  overlay.style.backdropFilter = "blur(4px)";

  // Сама табличка
  const box = document.createElement("div");
  box.style.background = "#fff";
  box.style.padding = "30px 20px";
  box.style.borderRadius = "20px";
  box.style.textAlign = "center";
  box.style.border = "4px solid #ff4d4d";
  box.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
  box.style.maxWidth = "90%";
  box.style.animation = "shake 0.5s"; // Берем анимацию из style.css

  const emoji = document.createElement("div");
  emoji.textContent = "🚫";
  emoji.style.fontSize = "60px";
  emoji.style.marginBottom = "10px";

  const title = document.createElement("h2");
  title.textContent = "Федя, думай сам!";
  title.style.color = "#d32f2f";
  title.style.fontSize = "28px";
  title.style.margin = "0 0 10px 0";
  title.style.fontWeight = "900";

  const text = document.createElement("p");
  text.textContent = "Списывать из интернета или нейросетей нельзя. Реши задачу самостоятельно — я в тебя верю!";
  text.style.color = "#333";
  text.style.fontSize = "16px";
  text.style.margin = "0 0 20px 0";

  const btn = document.createElement("button");
  btn.textContent = "Я всё понял";
  btn.style.padding = "12px 24px";
  btn.style.background = "#ff4d4f";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "10px";
  btn.style.fontSize = "16px";
  btn.style.fontWeight = "bold";
  btn.style.cursor = "pointer";
  
  btn.onclick = () => overlay.remove();

  box.appendChild(emoji);
  box.appendChild(title);
  box.appendChild(text);
  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// Блокируем глобальные попытки копирования/вставки (на всякий случай)
document.addEventListener('copy', (e) => { e.preventDefault(); showWarning(); });
document.addEventListener('paste', (e) => { e.preventDefault(); showWarning(); });

// ---------- утилиты ----------
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
  img.src = "fixik.png"; 
  img.alt = "Фиксик";
  // Защита от перетаскивания картинки
  img.ondragstart = () => false; 
  avatar.appendChild(img);
  
  const speech = el("div", "fixik-speech", text);
  
  box.appendChild(avatar);
  box.appendChild(speech);
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

// ---------- экраны ----------
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
}

function initGame() {
  gameState = { placed: {}, selected: null, wrongIndex: null, feedback: null };
}

function drawGame() {
  clear();
  
  let fixikText = FIXIK_PHRASES.gameStart;
  let mood = "normal";
  if (gameState.feedback) {
    fixikText = FIXIK_PHRASES.error;
    mood = "error";
  } else if (Object.keys(gameState.placed).length > 0 && !gameState.selected) {
    fixikText = FIXIK_PHRASES.success;
    mood = "success";
  }
  
  app.appendChild(renderFixik(fixikText, mood));

  app.appendChild(el("h1", "", `Урок ${lesson.id}. ${lesson.title}`));
  app.appendChild(el("div", "instruction", lesson.game.instruction));

  const bins = el("div", "bins");
  lesson.game.bins.forEach((name, bi) => {
    const bin = el("div", "bin");
    if (gameState.selected !== null) bin.classList.add("active");
    bin.appendChild(el("div", "bin-title", name));
    
    const placedHere = Object.entries(gameState.placed)
      .filter(([i, b]) => b === bi)
      .map(([i]) => lesson.game.items[i].expr);
      
    const itemsDiv = el("div", "bin-items");
    placedHere.forEach(expr => {
       itemsDiv.appendChild(el("span", "", expr + " "));
    });
    bin.appendChild(itemsDiv);
    
    bin.onclick = () => {
      if (gameState.selected === null) return;
      attemptPlace(gameState.selected, bi);
    };
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
      gameState.wrongIndex = null;
      gameState.feedback = null;
      render();
    };
    cards.appendChild(c);
  });
  app.appendChild(cards);

  if (gameState.feedback) {
    const fb = el("div", "feedback err");
    fb.style.padding = "14px"; fb.style.background = "#fff5f5"; fb.style.borderRadius = "12px";
    fb.style.border = "2px solid #ff6b6b"; fb.style.color = "#8a2a2a"; fb.style.fontSize = "15px"; fb.style.marginTop = "16px";
    fb.appendChild(el("strong", "", "Разбор полёта:"));
    fb.appendChild(el("p", "", gameState.feedback.hint));
    if (gameState.feedback.counterexample) {
      fb.appendChild(el("p", "", "Контрпример: " + gameState.feedback.counterexample));
    }
    app.appendChild(fb);
  }

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
  
  // --- БЛОКИРОВКА ВСТАВКИ В САМОМ ПОЛЕ ---
  inp.onpaste = (e) => {
    e.preventDefault();
    showWarning();
  };
  // Блокировка контекстного меню на поле ввода (чтобы не было "Вставить")
  inp.oncontextmenu = (e) => {
    e.preventDefault();
    showWarning();
  };

  inp.oninput = (e) => { consInput = e.target.value; };
  inp.onkeydown = (e) => { if (e.key === "Enter") submitCons(); };
  app.appendChild(inp);

  const btn = el("button", "btn", "Проверить");
  btn.onclick = submitCons;
  app.appendChild(btn);

  if (consFeedback) {
    const fb = el("div", "feedback " + (consFeedback.ok ? "ok" : "err"));
    fb.style.padding = "16px"; fb.style.borderRadius = "14px"; fb.style.marginTop = "16px";
    if (consFeedback.ok) {
       fb.style.background = "#f4fcf7"; fb.style.border = "2px solid #43e97b"; fb.style.color = "#0b4632";
    } else {
       fb.style.background = "#fff5f5"; fb.style.border = "2px solid #ff6b6b"; fb.style.color = "#8a2a2a";
    }
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
    } else {
      setTimeout(() => { consFeedback = null; render(); }, 1500);
    }
  }
  render();
}

// ==========================================
// МУЛЬТФИЛЬМ С ФЕДЕЙ И НАГРАДОЙ
// ==========================================
function drawDone() {
  clear();
  app.appendChild(renderFixik(FIXIK_PHRASES.done, "success"));
  app.appendChild(el("h1", "center", "Урок закрыт!"));
  
  const canvasContainer = el("div", "card");
  canvasContainer.style.padding = "0"; canvasContainer.style.overflow = "hidden";
  canvasContainer.style.display = "flex"; canvasContainer.style.justifyContent = "center";
  canvasContainer.style.background = "#87CEEB";
  
  const canvas = document.createElement("canvas");
  canvas.width = 600; canvas.height = 300;
  canvas.style.width = "100%"; canvas.style.maxWidth = "600px";
  canvasContainer.appendChild(canvas);
  app.appendChild(canvasContainer);

  const btn = el("button", "btn green", "Забрать награду 🏅");
  btn.onclick = () => {
    clear();
    app.appendChild(renderFixik("Ты справился! Прогресс сохранен. До встречи на следующем уроке!", "success"));
    app.appendChild(el("h1", "center", "Уровень пройден!"));
  };
  app.appendChild(btn);

  startAnimation(canvas);
}

function startAnimation(canvas) {
  const ctx = canvas.getContext("2d");
  let t = 0; 

  const fixikImg = new Image();
  fixikImg.src = "fixik.png";

  function drawBoy(ctx, x, y, scale, isClimbing) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    ctx.fillStyle = "#4A90E2"; 
    ctx.beginPath();
    ctx.roundRect(-15, 0, 30, 40, 10);
    ctx.fill();
    
    ctx.fillStyle = "#FFDFC4"; 
    ctx.beginPath();
    ctx.arc(0, -15, 14, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#5C4033";
    ctx.beginPath();
    ctx.arc(0, -20, 14, Math.PI, 0);
    ctx.fill();
    
    if (isClimbing) {
      ctx.fillStyle = "#E74C3C";
      ctx.beginPath();
      ctx.roundRect(-25, 5, 10, 20, 5);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMedal(ctx, x, y) {
    ctx.fillStyle = "#E74C3C";
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 20);
    ctx.lineTo(x + 10, y - 20);
    ctx.lineTo(x, y);
    ctx.fill();
    
    ctx.fillStyle = "#F1C40F";
    ctx.beginPath();
    ctx.arc(x, y + 10, 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#F9E79F";
    ctx.beginPath();
    ctx.arc(x - 5, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function animate() {
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255, 255, 0, 0.8)";
    ctx.beginPath();
    const sunScale = 1 + Math.sin(t * 0.05) * 0.1;
    ctx.arc(500, 60, 30 * sunScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2ECC71"; 
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.lineTo(400, 100);
    ctx.lineTo(600, 300);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(350, 150);
    ctx.lineTo(400, 100);
    ctx.lineTo(450, 150);
    ctx.lineTo(420, 140);
    ctx.lineTo(400, 160);
    ctx.lineTo(380, 140);
    ctx.fill();

    if (t < 100) {
      const progress = t / 100; 
      const bx = 150 + (380 - 150) * progress;
      const by = 300 - (300 - 130) * progress;
      
      drawBoy(ctx, bx, by, 1, true);
      
      if (t % 10 === 0) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.beginPath();
          ctx.arc(bx - 10, by + 40, Math.random() * 5 + 2, 0, Math.PI * 2);
          ctx.fill();
      }
    } else {
      drawBoy(ctx, 380, 130, 1, false);
      
      if (t > 100) {
        const fixikProgress = Math.min((t - 100) / 50, 1); 
        const fx = 50 + (300 - 50) * fixikProgress;
        const fy = 50 + Math.sin(t * 0.1) * 10; 
        
        if (fixikImg.complete && fixikImg.naturalWidth > 0) {
            ctx.drawImage(fixikImg, fx - 40, fy - 40, 80, 80);
        } else {
            ctx.fillStyle = "#00BFFF";
            ctx.beginPath();
            ctx.arc(fx, fy, 25, 0, Math.PI * 2);
            ctx.fill();
        }

        if (t > 150) {
           const medalY = fy + 40 + ((t - 150) / 50) * 20;
           drawMedal(ctx, fx + 20, Math.min(medalY, fy + 60));
        }
      }

      if (t > 200) {
          if (t % 20 === 0) {
              const colors = ["#FF5733", "#33FF57", "#3357FF", "#F1C40F", "#9B59B6"];
              ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
              for (let i = 0; i < 10; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = Math.random() * 50 + 10;
                  ctx.beginPath();
                  ctx.arc(400 + Math.cos(angle) * dist, 50 + Math.sin(angle) * dist, 3, 0, Math.PI * 2);
                  ctx.fill();
              }
          }
      }
    }

    if (t > 200) {
        ctx.fillStyle = "#232832";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText("I УРОВЕНЬ ПРОЙДЕН!", canvas.width / 2, 40);
    }

    t++;
    animFrameId = requestAnimationFrame(animate);
  }

  animate();
}

function render() {
  if (stage === "explain") drawExplain();
  else if (stage === "game") drawGame();
  else if (stage === "consolidation") drawConsolidation();
  else if (stage === "done") drawDone();
}

fetch("lesson_06.json")
  .then(r => r.json())
  .then(data => { lesson = data; render(); })
  .catch(err => {
    app.innerHTML = "<h1>Ошибка загрузки</h1><p>Не удалось загрузить lesson_06.json.</p>";
    console.error(err);
  });
