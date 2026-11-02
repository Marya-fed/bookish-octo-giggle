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

// --- СИСТЕМА ЗАЩИТЫ ---
function showWarning() {
  if (document.getElementById("copy-warning")) return;
  const overlay = document.createElement("div");
  overlay.id = "copy-warning";
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);";
  
  const box = document.createElement("div");
  box.style.cssText = "background:#fff;padding:30px 20px;border-radius:20px;text-align:center;border:4px solid #ff4d4d;box-shadow:0 10px 30px rgba(0,0,0,0.3);max-width:90%;animation:shake 0.5s;";
  
  box.innerHTML = `
    <div style="font-size:60px;margin-bottom:10px;">🚫</div>
    <h2 style="color:#d32f2f;font-size:28px;margin:0 0 10px 0;font-weight:900;">Федя, думай сам!</h2>
    <p style="color:#333;font-size:16px;margin:0 0 20px 0;">Списывать из интернета или нейросетей нельзя. Реши задачу самостоятельно — я в тебя верю!</p>
    <button id="close-warning" style="padding:12px 24px;background:#ff4d4f;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer;">Я всё понял</button>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  document.getElementById("close-warning").onclick = () => overlay.remove();
}

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
      gameState.wrongIndex = null;
      gameState.feedback = null;
      render();
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
  bar.appendChild(fill);
  pr.appendChild(bar);
  app.appendChild(pr);
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
// 3D-МУЛЬТФИЛЬМ: СУПЕРГЕРОЙ ФЕДЯ И НАГРАДА
// ==========================================
function drawDone() {
  clear();
  app.appendChild(renderFixik(FIXIK_PHRASES.done, "success"));
  app.appendChild(el("h1", "center", "Урок закрыт!"));
  
  const canvasContainer = el("div", "card");
  canvasContainer.style.cssText = "padding:0;overflow:hidden;display:flex;justify-content:center;background:#87CEEB;border-radius:18px;border:4px solid #fff;box-shadow:0 10px 30px rgba(0,0,0,0.1);";
  
  const canvas = document.createElement("canvas");
  canvas.width = 600; canvas.height = 350;
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

  start3DAnimation(canvas);
}

function start3DAnimation(canvas) {
  const ctx = canvas.getContext("2d");
  let t = 0; 
  const fixikImg = new Image();
  fixikImg.src = "fixik.png";

  // Функция рисования Феди в плаще (объемный стиль)
  function drawSuperFedia(ctx, x, y, scale, step) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Плащ супергероя (развевается)
    const capeWave = Math.sin(t * 0.1) * 10;
    const gradientCape = ctx.createLinearGradient(-20, 0, -60, 40);
    gradientCape.addColorStop(0, "#E74C3C");
    gradientCape.addColorStop(1, "#922B21");
    ctx.fillStyle = gradientCape;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-40, 20 + capeWave, -60, 40 + capeWave);
    ctx.lineTo(-30, 50);
    ctx.lineTo(10, 10);
    ctx.fill();

    // Тело (супергеройский костюм)
    const gradientSuit = ctx.createLinearGradient(0, 0, 0, 50);
    gradientSuit.addColorStop(0, "#3498DB");
    gradientSuit.addColorStop(1, "#2874A6");
    ctx.fillStyle = gradientSuit;
    ctx.beginPath();
    ctx.roundRect(-15, 0, 30, 45, 8);
    ctx.fill();

    // Эмблема на груди (молния)
    ctx.fillStyle = "#F1C40F";
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(5, 20);
    ctx.lineTo(-2, 20);
    ctx.lineTo(2, 30);
    ctx.lineTo(-5, 18);
    ctx.lineTo(1, 18);
    ctx.fill();

    // Руки (одна поднята в победном жесте)
    ctx.fillStyle = "#2874A6";
    ctx.beginPath(); ctx.roundRect(-20, 10, 8, 20, 4); ctx.fill();
    ctx.beginPath(); ctx.roundRect(12, -5, 8, 20, 4); ctx.fill(); // Поднятая рука

    // Голова
    ctx.fillStyle = "#FFDFC4";
    ctx.beginPath(); ctx.arc(0, -15, 14, 0, Math.PI * 2); ctx.fill();

    // Маска супергероя
    ctx.fillStyle = "#2C3E50";
    ctx.beginPath();
    ctx.arc(0, -18, 14, Math.PI, 0); // Верхняя часть
    ctx.fill();
    // Прорези для глаз (белые)
    ctx.fillStyle = "#FFF";
    ctx.beginPath(); ctx.arc(-6, -16, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -16, 4, 0, Math.PI * 2); ctx.fill();

    // Волосы (торчат из-под маски)
    ctx.fillStyle = "#5C4033";
    ctx.beginPath(); ctx.moveTo(-12, -25); ctx.lineTo(-5, -35); ctx.lineTo(0, -25); ctx.fill();

    ctx.restore();
  }

  // Функция рисования медали
  function drawMedal(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    // Лента
    ctx.fillStyle = "#C0392B";
    ctx.beginPath(); ctx.moveTo(-8, -30); ctx.lineTo(8, -30); ctx.lineTo(0, -5); ctx.fill();
    ctx.fillStyle = "#E74C3C";
    ctx.beginPath(); ctx.moveTo(-8, -30); ctx.lineTo(0, -20); ctx.lineTo(-8, -5); ctx.fill();

    // Сама медаль (объемная)
    const gradientGold = ctx.createRadialGradient(-5, -5, 2, 0, 0, 15);
    gradientGold.addColorStop(0, "#F9E79F");
    gradientGold.addColorStop(0.5, "#F1C40F");
    gradientGold.addColorStop(1, "#B7950B");
    ctx.fillStyle = gradientGold;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    
    // Звезда на медали
    ctx.fillStyle = "#D4AC0D";
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function animate() {
    // Фон: небо и земля
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Солнце с 3D-бликом
    const sunGrad = ctx.createRadialGradient(500, 60, 10, 500, 60, 40);
    sunGrad.addColorStop(0, "#FFF9C4");
    sunGrad.addColorStop(1, "#FBC02D");
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(500, 60, 30 + Math.sin(t*0.05)*5, 0, Math.PI*2); ctx.fill();

    // Земля (объемная)
    ctx.fillStyle = "#27AE60";
    ctx.beginPath();
    ctx.moveTo(0, 280);
    ctx.quadraticCurveTo(300, 230, 600, 280);
    ctx.lineTo(600, 350); ctx.lineTo(0, 350);
    ctx.fill();

    // Пьедестал (торжественный)
    const pedGrad = ctx.createLinearGradient(0, 250, 0, 350);
    pedGrad.addColorStop(0, "#BDC3C7");
    pedGrad.addColorStop(1, "#7F8C8D");
    ctx.fillStyle = pedGrad;
    ctx.fillRect(350, 250, 100, 100);
    ctx.fillStyle = "#95A5A6";
    ctx.fillRect(340, 240, 120, 10);

    // Тайминги
    if (t < 80) {
      // Федя выпрыгивает на пьедестал
      const jump = Math.sin((t / 80) * Math.PI) * 50;
      drawSuperFedia(ctx, 400, 240 - jump, 1.5, t);
    } else {
      // Федя стоит на пьедестале
      drawSuperFedia(ctx, 400, 240, 1.5, 0);
      
      // Фиксик торжественно подходит (с 80 по 150 кадр)
      if (t > 80) {
        let fixikX = 150 + ((t - 80) / 70) * 180; // Идет слева
        if (fixikX > 330) fixikX = 330; // Останавливается рядом
        
        // Легкое покачивание при ходьбе
        let walkBob = 0;
        if (t < 150) walkBob = Math.abs(Math.sin(t * 0.2)) * 5;

        if (fixikImg.complete && fixikImg.naturalWidth > 0) {
          ctx.drawImage(fixikImg, fixikX, 200 - walkBob, 80, 80);
        } else {
          ctx.fillStyle = "#00BFFF";
          ctx.beginPath(); ctx.arc(fixikX + 40, 240, 30, 0, Math.PI * 2); ctx.fill();
        }

        // Вручение медали (с 150 кадра)
        if (t > 150) {
           const medalProgress = Math.min((t - 150) / 40, 1);
           // Медаль летит от Фиксика к шее Феди
           const startX = 330 + 40, startY = 200; 
           const endX = 400, endY = 240 - 15; // Шея Феди
           
           const mx = startX + (endX - startX) * medalProgress;
           const my = startY + (endY - startY) * medalProgress - Math.sin(medalProgress * Math.PI) * 30; // Дуга
           
           drawMedal(ctx, mx, my, medalProgress);
        }
      }
    }

    // Салют и текст
    if (t > 200) {
        if (t % 15 === 0) {
            const colors = ["#FF5733", "#33FF57", "#3357FF", "#F1C40F", "#9B59B6"];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 80 + 20;
                ctx.beginPath();
                ctx.arc(400 + Math.cos(angle) * dist, 100 + Math.sin(angle) * dist, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Текст с обводкой
        ctx.font = "900 32px Arial";
        ctx.textAlign = "center";
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#fff";
        ctx.strokeText("СУПЕРГЕРОЙ!", canvas.width / 2, 60);
        ctx.fillStyle = "#E74C3C";
        ctx.fillText("СУПЕРГЕРОЙ!", canvas.width / 2, 60);
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
