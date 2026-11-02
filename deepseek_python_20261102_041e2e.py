import pygame

WHITE = (255, 255, 255)
BG = (245, 247, 250)
DARK = (35, 40, 50)
ACCENT = (70, 130, 220)
GREEN = (80, 180, 120)
RED = (220, 90, 90)
CARD = (255, 255, 255)

FONT_CACHE = {}

def get_font(size, bold=False):
    key = (size, bold)
    if key not in FONT_CACHE:
        FONT_CACHE[key] = pygame.font.SysFont("arial", size, bold=bold)
    return FONT_CACHE[key]

def draw_text(screen, text, pos, size=24, color=DARK, bold=False, center=False):
    font = get_font(size, bold)
    surf = font.render(text, True, color)
    rect = surf.get_rect()
    if center:
        rect.center = pos
    else:
        rect.topleft = pos
    screen.blit(surf, rect)
    return rect

def draw_wrapped(screen, text, rect, size=22, color=DARK, line_h=30):
    font = get_font(size)
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if font.size(test)[0] <= rect.width:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    y = rect.top
    for line in lines:
        screen.blit(font.render(line, True, color), (rect.left, y))
        y += line_h
    return y

def draw_button(screen, rect, label, color=ACCENT, text_color=WHITE, hover=False):
    c = tuple(min(255, v + 20) for v in color) if hover else color
    pygame.draw.rect(screen, c, rect, border_radius=12)
    draw_text(screen, label, rect.center, size=22, color=text_color, bold=True, center=True)

def draw_card(screen, rect, radius=14):
    pygame.draw.rect(screen, CARD, rect, border_radius=radius)
    pygame.draw.rect(screen, (220, 225, 235), rect, width=2, border_radius=radius)

def draw_progress_bar(screen, rect, ratio):
    pygame.draw.rect(screen, (220, 225, 235), rect, border_radius=8)
    w = int(rect.width * max(0.0, min(1.0, ratio)))
    if w > 0:
        pygame.draw.rect(screen, GREEN, (rect.x, rect.y, w, rect.height), border_radius=8)