from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, delete
from datetime import date as date_type, datetime
from typing import Optional
from pydantic import BaseModel
import uuid as _uuid
import calendar

from app.database import get_db
from app.models.user import User
from app.models.meal import MealRecord, DetectedFood
from app.models.food_item import FoodItem
from app.models.weight_record import WeightRecord
from app.models.favorite import UserFavoriteFood
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

    target_carbs   = current_user.target_carbs   or round(target * 0.55 / 4)
    target_protein = current_user.target_protein or round(target * 0.25 / 4)
    target_fat     = current_user.target_fat     or round(target * 0.20 / 9)

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
            "target_carbs": target_carbs,
            "target_protein": target_protein,
            "target_fat": target_fat,
            "achievement_rate": achievement,
            "meal_count": len(meals),
            "breakdown": breakdown,
        },
    }


# ── 체중 기록 ──────────────────────────────────────────────

class _WeightCreate(BaseModel):
    weight: float
    date: Optional[str] = None
    note: Optional[str] = None


@router.get("/me/weight")
async def get_weight_records(
    days: int = Query(default=90, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timedelta
    cutoff = date_type.today() - timedelta(days=days)
    result = await db.execute(
        select(WeightRecord)
        .where(and_(WeightRecord.user_id == current_user.id, WeightRecord.recorded_at >= cutoff))
        .order_by(WeightRecord.recorded_at)
    )
    records = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": str(r.id),
                "weight": float(r.weight),
                "recorded_at": str(r.recorded_at),
                "note": r.note,
            }
            for r in records
        ],
    }


@router.post("/me/weight")
async def create_weight_record(
    body: _WeightCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.weight <= 0 or body.weight > 500:
        raise HTTPException(status_code=422, detail="체중 값이 올바르지 않습니다.")

    if body.date:
        try:
            recorded_at = date_type.fromisoformat(body.date)
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail="날짜는 YYYY-MM-DD 형식으로 입력해주세요.")
    else:
        recorded_at = date_type.today()

    # 같은 날짜 기록이 있으면 덮어쓰기
    existing = await db.execute(
        select(WeightRecord).where(
            and_(WeightRecord.user_id == current_user.id, WeightRecord.recorded_at == recorded_at)
        )
    )
    record = existing.scalar_one_or_none()
    if record:
        record.weight = body.weight
        record.note = body.note
    else:
        record = WeightRecord(
            user_id=current_user.id,
            weight=body.weight,
            recorded_at=recorded_at,
            note=body.note,
        )
        db.add(record)

    await db.commit()
    await db.refresh(record)
    return {
        "success": True,
        "data": {
            "id": str(record.id),
            "weight": float(record.weight),
            "recorded_at": str(record.recorded_at),
            "note": record.note,
        },
    }


@router.delete("/me/weight/{record_id}")
async def delete_weight_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        rid = _uuid.UUID(record_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="기록을 찾을 수 없습니다.")
    result = await db.execute(
        select(WeightRecord).where(
            and_(WeightRecord.id == rid, WeightRecord.user_id == current_user.id)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="기록을 찾을 수 없습니다.")
    await db.delete(record)
    await db.commit()
    return {"success": True}


# ── 즐겨찾기 ──────────────────────────────────────────────

@router.get("/me/favorites")
async def get_favorites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FoodItem)
        .join(UserFavoriteFood, UserFavoriteFood.food_id == FoodItem.id)
        .where(UserFavoriteFood.user_id == current_user.id)
        .order_by(UserFavoriteFood.created_at.desc())
    )
    foods = result.scalars().all()
    return {"success": True, "data": [_food_to_dict(f) for f in foods]}


@router.post("/me/favorites/{food_id}")
async def add_favorite(
    food_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        fid = _uuid.UUID(food_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="음식을 찾을 수 없습니다.")

    food_res = await db.execute(select(FoodItem).where(FoodItem.id == fid))
    if not food_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="음식을 찾을 수 없습니다.")

    existing = await db.execute(
        select(UserFavoriteFood).where(
            and_(UserFavoriteFood.user_id == current_user.id, UserFavoriteFood.food_id == fid)
        )
    )
    if not existing.scalar_one_or_none():
        db.add(UserFavoriteFood(user_id=current_user.id, food_id=fid))
        await db.commit()
    return {"success": True}


@router.delete("/me/favorites/{food_id}")
async def remove_favorite(
    food_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        fid = _uuid.UUID(food_id)
    except (ValueError, AttributeError):
        return {"success": True}
    await db.execute(
        delete(UserFavoriteFood).where(
            and_(UserFavoriteFood.user_id == current_user.id, UserFavoriteFood.food_id == fid)
        )
    )
    await db.commit()
    return {"success": True}


# ── 월간 통계 ──────────────────────────────────────────────

@router.get("/me/monthly-stats")
async def get_monthly_stats(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _, days_in_month = calendar.monthrange(year, month)
    start_date = date_type(year, month, 1)
    end_date = date_type(year, month, days_in_month)

    meals_res = await db.execute(
        select(MealRecord).where(
            and_(
                MealRecord.user_id == current_user.id,
                MealRecord.log_date >= start_date,
                MealRecord.log_date <= end_date,
            )
        )
    )
    meals = meals_res.scalars().all()

    target = current_user.target_calories or 2000

    # 일별 집계
    daily_map: dict = {}
    for m in meals:
        key = str(m.log_date)
        if key not in daily_map:
            daily_map[key] = {"calories": 0, "meal_count": 0}
        daily_map[key]["calories"] += m.total_calories
        daily_map[key]["meal_count"] += 1

    daily = []
    for d in range(1, days_in_month + 1):
        key = str(date_type(year, month, d))
        entry = daily_map.get(key, {"calories": 0, "meal_count": 0})
        achievement = round(entry["calories"] / target * 100, 1) if entry["calories"] > 0 else 0
        daily.append({
            "date": key,
            "calories": entry["calories"],
            "meal_count": entry["meal_count"],
            "achievement_rate": achievement,
        })

    # 음식 Top 5
    if meals:
        meal_ids = [m.id for m in meals]
        foods_res = await db.execute(
            select(DetectedFood.food_name, func.count(DetectedFood.id), func.sum(DetectedFood.calories))
            .where(DetectedFood.meal_id.in_(meal_ids))
            .group_by(DetectedFood.food_name)
            .order_by(func.count(DetectedFood.id).desc())
            .limit(5)
        )
        top_foods = [
            {"food_name": row[0], "count": int(row[1]), "total_calories": int(row[2] or 0)}
            for row in foods_res.all()
        ]
    else:
        top_foods = []

    logged_days = len(daily_map)
    avg_calories = round(sum(d["calories"] for d in daily) / logged_days) if logged_days else 0
    avg_achievement = round(sum(d["achievement_rate"] for d in daily if d["calories"] > 0) / logged_days, 1) if logged_days else 0
    total_meals = sum(d["meal_count"] for d in daily)

    return {
        "success": True,
        "data": {
            "year": year,
            "month": month,
            "daily": daily,
            "top_foods": top_foods,
            "summary": {
                "logged_days": logged_days,
                "total_days": days_in_month,
                "avg_calories": avg_calories,
                "avg_achievement": avg_achievement,
                "total_meals": total_meals,
                "target_calories": target,
            },
        },
    }


def _food_to_dict(food: FoodItem) -> dict:
    return {
        "id": str(food.id),
        "food_name": food.food_name,
        "brand_name": food.brand_name,
        "serving_size": float(food.serving_size),
        "serving_unit": food.serving_unit or "g",
        "calories": float(food.calories),
        "carbs": float(food.carbs),
        "protein": float(food.protein),
        "fat": float(food.fat),
        "source": food.source or "system",
        "is_public": food.is_public,
        "use_count": food.use_count or 0,
    }
