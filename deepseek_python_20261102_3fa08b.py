def evaluate_consolidation(task, user_input):
    """Возвращает (ok, message)."""
    correct = task["answer"].strip().lower()

    if correct == "open":
        text = user_input.strip()
        if len(text) < 15:
            return False, ("Слишком коротко. Попробуй объяснить своими словами и привести числа. "
                           + task["error_feedback"])
        return True, "Ты объяснил словами — это главное. " + task["error_feedback"]

    normalized = user_input.strip().lower().replace(" ", "").replace("·", "*").replace("√", "")
    target = correct.replace(" ", "").replace("·", "*").replace("√", "")
    if normalized == target:
        return True, "Верно. " + task["error_feedback"]
    return False, "Пока не так. " + task["error_feedback"]