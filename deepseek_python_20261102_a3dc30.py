import json
import pygame
from ui import *
from game_mechanics import MECHANICS
import feedback as fb

STAGE_EXPLAIN = "explain"
STAGE_GAME = "game"
STAGE_CONSOLIDATION = "consolidation"
STAGE_DONE = "done"

class LessonEngine:
    def __init__(self, screen, progress, lesson_id):
        self.screen = screen
        self.progress = progress
        self.lesson_id = lesson_id
        with open(f"data/lesson_{lesson_id:02d}.json", encoding="utf-8") as f:
            self.lesson = json.load(f)

        self.stage = STAGE_EXPLAIN
        self.mechanic = None
        self.sort_result = None
        self.cons_index = 0
        self.cons_input = ""
        self.cons_feedback = None
        self.cons_ok_count = 0
        self.cons_total = len(self.lesson["consolidation"])
        self.cons_done = False

        self._next_btn = pygame.Rect(400, 620, 200, 56)

    # ---------- события ----------
    def handle_event(self, event):
        if self.stage == STAGE_EXPLAIN:
            if event.type == pygame.MOUSEBUTTONDOWN and self._next_btn.collidepoint(event.pos):
                self._start_game()
        elif self.stage == STAGE_GAME:
            if self.mechanic:
                self.mechanic.handle_event(event)
        elif self.stage == STAGE_CONSOLIDATION:
            self._handle_consolidation(event)
        elif self.stage == STAGE_DONE:
            if event.type == pygame.MOUSEBUTTONDOWN and self._next_btn.collidepoint(event.pos):
                self.progress.complete_lesson(self.lesson_id)
                self.progress.current_lesson = self.lesson_id + 1
                self.progress.save("progress.json")
                self.stage = "finished"

    def _start_game(self):
        self.stage = STAGE_GAME
        mech_cls = MECHANICS[self.lesson["game"]["type"]]
        self.mechanic = mech_cls(self.screen, self.lesson["game"], self._on_game_complete)

    def _on_game_complete(self, success):
        self.progress.record_attempt(self.lesson_id, "sort", success)
        self.stage = STAGE_CONSOLIDATION

    def _handle_consolidation(self, event):
        if self.cons_done:
            if event.type == pygame.MOUSEBUTTONDOWN and self._next_btn.collidepoint(event.pos):
                self.stage = STAGE_DONE
            return
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_RETURN:
                self._submit_cons()
            elif event.key == pygame.K_BACKSPACE:
                self.cons_input = self.cons_input[:-1]
            else:
                self.cons_input += event.unicode

    def _submit_cons(self):
        task = self.lesson["consolidation"][self.cons_index]
        ok, msg = fb.evaluate_consolidation(task, self.cons_input)
        self.progress.record_attempt(self.lesson_id, f"cons_{self.cons_index}", ok)
        self.cons_feedback = (ok, msg)
        if ok:
            self.cons_ok_count += 1
            self.cons_index += 1
            self.cons_input = ""
            if self.cons_index >= self.cons_total:
                self.cons_done = True
                passed = self.cons_ok_count >= int(0.8 * self.cons_total) or self.cons_ok_count == self.cons_total
                if passed:
                    self.progress.complete_lesson(self.lesson_id)
                else:
                    self.cons_feedback = (False, "Почти! Давай вернёмся к игровым карточкам — повторим правило.")
                    self.cons_index = 0
                    self.cons_ok_count = 0
                    self.cons_done = False
                    self.stage = STAGE_GAME
                    self._start_game()
        # при ошибке остаёмся на том же задании

    # ---------- отрисовка ----------
    def update(self, dt):
        if self.mechanic and self.stage == STAGE_GAME:
            self.mechanic.update(dt)

    def draw(self):
        if self.stage == "finished":
            self._draw_finished()
        elif self.stage == STAGE_EXPLAIN:
            self._draw_explain()
        elif self.stage == STAGE_GAME and self.mechanic:
            self.mechanic.draw()
        elif self.stage == STAGE_CONSOLIDATION:
            self._draw_consolidation()
        elif self.stage == STAGE_DONE:
            self._draw_done()

    def _draw_explain(self):
        self.screen.fill(BG)
        draw_text(self.screen, f"Урок {self.lesson['id']}. {self.lesson['title']}",
                  (40, 30), size=28, bold=True)
        card = pygame.Rect(40, 100, 920, 400)
        draw_card(self.screen, card)
        y = draw_wrapped(self.screen, self.lesson["explain"]["text"],
                         pygame.Rect(70, 130, 860, 100), size=22)
        rule = pygame.Rect(70, y + 30, 860, 70)
        pygame.draw.rect(self.screen, (230, 240, 255), rule, border_radius=10)
        draw_text(self.screen, self.lesson["explain"]["rule"], rule.center,
                  size=30, bold=True, color=ACCENT, center=True)
        draw_text(self.screen, "Пример: " + self.lesson["explain"]["example"],
                  (70, rule.bottom + 30), size=22)
        draw_button(self.screen, self._next_btn, "Понятно, дальше →",
                    hover=self._next_btn.collidepoint(pygame.mouse.get_pos()))

    def _draw_consolidation(self):
        self.screen.fill(BG)
        task = self.lesson["consolidation"][self.cons_index]
        draw_text(self.screen, f"Закрепление — задание {self.cons_index + 1} из {self.cons_total}",
                  (40, 30), size=26, bold=True)
        card = pygame.Rect(40, 90, 920, 180)
        draw_card(self.screen, card)
        draw_text(self.screen, task["task"], (70, 120), size=24)

        inp = pygame.Rect(70, 300, 700, 56)
        pygame.draw.rect(self.screen, CARD, inp, border_radius=10)
        pygame.draw.rect(self.screen, ACCENT, inp, width=2, border_radius=10)
        draw_text(self.screen, self.cons_input or "Введи ответ и нажми Enter",
                  (inp.x + 15, inp.y + 15), size=22,
                  color=DARK if self.cons_input else (150, 160, 175))

        if self.cons_feedback:
            ok, msg = self.cons_feedback
            color = GREEN if ok else RED
            draw_text(self.screen, "✓ Верно!" if ok else "✗ Пока не так",
                      (40, 400), size=24, bold=True, color=color)
            draw_wrapped(self.screen, msg, pygame.Rect(40, 440, 920, 120), size=20)

        draw_text(self.screen, "Подсказка: для задачи-объяснения напиши 1–2 предложения своими словами.",
                  (40, 660), size=16, color=(120, 130, 145))

    def _draw_done(self):
        self.screen.fill(BG)
        draw_text(self.screen, "Урок закрыт!", (500, 180), size=44, bold=True, color=GREEN, center=True)
        draw_text(self.screen, f"Ты прошёл все задания урока {self.lesson_id}.",
                  (500, 250), size=24, center=True)
        draw_wrapped(self.screen,
                     "Ты сам разобрался, где корень произведения раскладывается, а где нет — "
                     "это ровно то, что нужно к концу первой четверти.",
                     pygame.Rect(150, 300, 700, 120), size=22)
        draw_button(self.screen, self._next_btn, "Дальше →",
                    hover=self._next_btn.collidepoint(pygame.mouse.get_pos()))

    def _draw_finished(self):
        self.screen.fill(BG)
        draw_text(self.screen, "Готово на сегодня.", (500, 300), size=40, bold=True, center=True)
        draw_text(self.screen, "Прогресс сохранён. До встречи на следующем уроке!",
                  (500, 370), size=22, center=True)