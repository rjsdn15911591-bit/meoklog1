from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date as date_type

from app.database import get_db
from app.models.user import User
from app.models.meal import MealRecord
from app.middleware.auth_middleware import get_current_user
from app.schemas.user import UserResponse, UserUpdate, DailySummaryResponse
from app.services.calorie_service import (
    calculate_bmr, calculate_tdee, calculate_target_calories, calculate_targets_from_calories
)

router = APIRouter()


@router.get("/me", response_model=dict)
async def get_me(current_user: User = Depends(get_current_user)):
    return {"success": True, "data": UserResponse.model_validate(current_user)}


@router.patch("/me", response_model=dict)
async def update_me(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)

    # 신체 정보 변경 시 목표 칼로리 재계산
    if (current_user.age and current_user.height and
            current_user.weight and current_user.gender and
            current_user.activity_level and current_user.goal_type):
        bmr = calculate_bmr(
            float(current_user.weight),
            float(current_user.height),
            current_user.age,
            current_user.gender,
        )
        tdee = calculate_tdee(bmr, current_user.activity_level)
        target_cal = calculate_target_calories(tdee, current_user.goal_type)
        targets = calculate_targets_from_calories(target_cal)

        current_user.target_calories = target_cal
        current_user.target_carbs = targets["carbs"]
        current_user.target_protein = targets["protein"]
        current_user.target_fat = targets["fat"]

    await db.commit()
    await db.refresh(current_user)
    return {"success": True, "data": UserResponse.model_validate(current_user), "message": "프로필이 업데이트되었습니다."}


@router.get("/me/daily-summary", response_model=dict)
async def get_daily_summary(
    date: str = Query(default=None, description="YYYY-MM-DD 형식 (생략 시 오늘)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as dt_date
    if date:
        try:
            log_date = dt_date.fromisoformat(date)
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail="날짜는 YYYY-MM-DD 형식으로 입력해주세요.")
    else:
        log_date = dt_date.today()

    result = await db.execute(
        select(MealRecord).where(
            and_(
                MealRecord.user_id == current_user.id,
                MealRecord.log_date == log_date,
            )
        )
    )
    meals = result.scalars().all()

    total_cal = sum(m.total_calories for m in meals)
    total_carbs = sum(float(m.total_carbs) for m in meals)
    total_protein = sum(float(m.total_protein) for m in meals)
    total_fat = sum(float(m.total_fat) for m in meals)
    target = current_user.target_calories or 2000
    achievement = round(total_cal / target * 100, 1) if target > 0 else 0

    breakdown = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    for m in meals:
        breakdown[m.meal_type] = breakdown.get(m.meal_type, 0) + m.total_calories

    return {
        "success": True,
        "data": {
            "log_date": str(log_date),
            "total_calories": total_cal,
            "total_carbs": round(total_carbs, 1),
            "total_protein": round(total_protein, 1),
            "total_fat": round(total_fat, 1),
            "target_calories": target,
            "achievement_rate": achievement,
            "meal_count": len(meals),
            "breakdown": breakdown,
        },
    }
