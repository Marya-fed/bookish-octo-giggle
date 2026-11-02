import pygame
from ui import *

class SortMechanic:
    def __init__(self, screen, data, on_complete):
        self.screen = screen
        self.items = data["items"]
        self.bins = data["bins"]
        self.instruction = data["instruction"]
        self.on_complete = on_complete

        self.placed = {}  # item_index -> bin_index
        self.dragging = None
        self.drag_offset = (0, 0)
        self.errors_shown = []  # последняя ошибка: (item, bin_index)
        self.done_count = 0

        self.card_rects = {}
        self._layout()

    def _layout(self):
        # контейнеры сверху
        self.bin_rects = []
        bw, bh = 380, 90
        gap = 60
        total = 2 * bw + gap
        x0 = (1000 - total) // 2
        for i in range(2):
            self.bin_rects.append(pygame.Rect(x0 + i * (bw + gap), 170, bw, bh))

        # карточки в сетке 4x2 внизу
        self.card_w, self.card_h = 210, 80
        cols = 4
        gapx, gapy = 20, 20
        start_y = 320
        x_start = (1000 - (cols * self.card_w + (cols - 1) * gapx)) // 2
        for idx in range(len(self.items)):
            r, c = divmod(idx, cols)
            rect = pygame.Rect(x_start + c * (self.card_w + gapx),
                               start_y + r * (self.card_h + gapy),
                               self.card_w, self.card_h)
            self.card_rects[idx] = rect

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            for idx in reversed(range(len(self.items))):
                if idx in self.placed:
                    continue
                rect = self.card_rects[idx]
                if rect.collidepoint(event.pos):
                    self.dragging = idx
                    self.drag_offset = (event.pos[0] - rect.x, event.pos[1] - rect.y)
                    break
        elif event.type == pygame.MOUSEBUTTONUP and event.button == 1 and self.dragging is not None:
            idx = self.dragging
            self.dragging = None
            for b, brect in enumerate(self.bin_rects):
                if brect.collidepoint(event.pos):
                    self._attempt_place(idx, b)
                    break

    def _attempt_place(self, idx, bin_index):
        item = self.items[idx]
        if item["correct"] == bin_index:
            self.placed[idx] = bin_index
            self.done_count += 1
            self.errors_shown = []
            if len(self.placed) == len(self.items):
                self.on_complete(True)
        else:
            self.errors_shown = [(item, bin_index)]

    def update(self, dt):
        if self.dragging is not None:
            mx, my = pygame.mouse.get_pos()
            self.card_rects[self.dragging].topleft = (mx - self.drag_offset[0], my - self.drag_offset[1])

    def draw(self):
        self.screen.fill(BG)
        draw_text(self.screen, "Урок 6. Свойства корня n-й степени", (40, 30), size=28, bold=True)
        draw_wrapped(self.screen, self.instruction, pygame.Rect(40, 80, 920, 60), size=20)

        # контейнеры
        for i, r in enumerate(self.bin_rects):
            draw_card(self.screen, r)
            draw_text(self.screen, self.bins[i], (r.centerx, r.y + 30), size=22, bold=True, center=True)
            placed_here = [self.items[j]["expr"] for j, b in self.placed.items() if b == i]
            draw_text(self.screen, ", ".join(placed_here), (r.centerx, r.y + 62),
                      size=18, color=(90, 110, 140), center=True)

        # карточки
        for idx, item in enumerate(self.items):
            if idx in self.placed:
                continue
            rect = self.card_rects[idx]
            draw_card(self.screen, rect)
            draw_text(self.screen, item["expr"], rect.center, size=24, bold=True, center=True)

        # фидбек об ошибке
        if self.errors_shown:
            item, _ = self.errors_shown[0]
            fb = pygame.Rect(40, 540, 920, 130)
            draw_card(self.screen, fb)
            draw_text(self.screen, "Не совсем. Разберём вместе:", (60, 555), size=20, bold=True, color=RED)
            draw_wrapped(self.screen, item["hint"], pygame.Rect(60, 585, 880, 40), size=18)
            if "counterexample" in item:
                draw_wrapped(self.screen, "Контрпример: " + item["counterexample"],
                             pygame.Rect(60, 625, 880, 40), size=18, color=(150, 90, 40))

        # прогресс
        ratio = len(self.placed) / len(self.items)
        draw_text(self.screen, f"Размещено: {len(self.placed)} / {len(self.items)}", (40, 680), size=18)
        draw_progress_bar(self.screen, pygame.Rect(260, 688, 700, 14), ratio)