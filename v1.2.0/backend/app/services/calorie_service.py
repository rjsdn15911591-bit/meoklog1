def calculate_bmr(weight: float, height: float, age: int, gender: str) -> float:
    base = 10 * weight + 6.25 * height - 5 * age
    return base + 5 if gender == "male" else base - 161


ACTIVITY_FACTORS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}


def calculate_tdee(bmr: float, activity_level: str) -> float:
    factor = ACTIVITY_FACTORS.get(activity_level, 1.55)
    return round(bmr * factor)


def calculate_target_calories(tdee: float, goal_type: str) -> int:
    adjustments = {"lose": -500, "maintain": 0, "gain": 300}
    adjustment = adjustments.get(goal_type, 0)
    return max(1200, int(tdee + adjustment))


def calculate_targets_from_calories(target_calories: int) -> dict:
    """탄단지 목표 계산 (탄수화물 55%, 단백질 25%, 지방 20%)"""
    carbs = round(target_calories * 0.55 / 4)
    protein = round(target_calories * 0.25 / 4)
    fat = round(target_calories * 0.20 / 9)
    return {"carbs": carbs, "protein": protein, "fat": fat}
