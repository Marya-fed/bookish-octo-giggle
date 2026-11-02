import pygame
import sys
from lesson_engine import LessonEngine
from progress import Progress

WIDTH, HEIGHT = 1000, 700
FPS = 60

def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Репетитор по математике — 10 класс")
    clock = pygame.time.Clock()

    progress = Progress.load("progress.json")
    engine = LessonEngine(screen, progress, lesson_id=progress.current_lesson)

    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            else:
                engine.handle_event(event)

        engine.update(dt)
        engine.draw()
        pygame.display.flip()

    progress.save("progress.json")
    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()