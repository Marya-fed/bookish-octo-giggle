import json
import os

class Progress:
    def __init__(self, data=None):
        data = data or {}
        self.current_lesson = data.get("current_lesson", 6)
        self.completed_lessons = data.get("completed_lessons", [])
        self.attempts = data.get("attempts", {})  # {lesson_id: {"sort": n, "consolidation": n}}

    def record_attempt(self, lesson_id, stage, success):
        key = str(lesson_id)
        self.attempts.setdefault(key, {}).setdefault(stage, {"ok": 0, "fail": 0})
        if success:
            self.attempts[key][stage]["ok"] += 1
        else:
            self.attempts[key][stage]["fail"] += 1

    def complete_lesson(self, lesson_id):
        if lesson_id not in self.completed_lessons:
            self.completed_lessons.append(lesson_id)

    def save(self, path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "current_lesson": self.current_lesson,
                "completed_lessons": self.completed_lessons,
                "attempts": self.attempts,
            }, f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path):
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                return cls(json.load(f))
        return cls()