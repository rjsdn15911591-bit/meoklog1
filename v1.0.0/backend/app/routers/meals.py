from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.database import get_db
from app.models.user import User
from app.models.meal import MealRecord, DetectedFood
from app.models.food_item import FoodItem
from app.models.social import Reaction, Comment
from app.middleware.auth_middleware import get_current_user
from app.services.ai_service import food_ai_service
from app.services.cloudinary_service import upload_meal_image, delete_meal_image
from app.schemas.meal import MealFoodsUpdate
from app.utils.date_utils import get_log_date

router = APIRouter()
_executor = ThreadPoolExecutor(max_workers=2)


def _run_ai_predict(image_bytes: bytes) -> list:
    return food_ai_service.predict(image_bytes, top_k=3)


async def get_nutrition_for_food(db: AsyncSession, food_name: str, food_name_en: str = None) -> dict:
    """음식 이름으로 영양 DB 조회"""
    query = select(FoodItem).where(FoodItem.food_name == food_name)
    result = await db.execute(query)
    item = result.scalar_one_or_none()

    if not item and food_name_en:
        query2 = select(FoodItem).where(FoodItem.food_name_en == food_name_en)
        result2 = await db.execute(query2)
        item = result2.scalar_one_or_none()

    if item:
        ratio = float(item.serving_size) / 100.0
        return {
            "food_item_id": str(item.id),
            "calories": round(float(item.calories) * ratio),
            "carbs": round(float(item.carbs) * ratio, 1),
            "protein": round(float(item.protein) * ratio, 1),
            "fat": round(float(item.fat) * ratio, 1),
            "serving_size": float(item.serving_size),
        }
    return {"food_item_id": None, "calories": 200, "carbs": 25.0, "protein": 10.0, "fat": 8.0, "serving_size": 150.0}


@router.post("")
async def create_meal(
    image: UploadFile = File(...),
    meal_type: str = Form(...),
    caption: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    image_bytes = await image.read()

    # 1. Cloudinary 업로드
    upload_result = await upload_meal_image(image_bytes, str(current_user.id))

    # 2. AI 분석 (비동기)
    loop = asyncio.get_event_loop()
    ai_predictions = await loop.run_in_executor(_executor, _run_ai_predict, image_bytes)

    # 3. 영양 DB 매핑
    detected_foods = []
    for pred in ai_predictions:
        nutrition = await get_nutrition_for_food(db, pred["food_name"])
        detected_foods.append({
            **nutrition,
            "food_name": pred["food_name"],
            "confidence": pred["confidence"],
            "is_edited": False,
        })

    total_cal = sum(f["calories"] for f in detected_foods)
    total_carbs = sum(f["carbs"] for f in detected_foods)
    total_protein = sum(f["protein"] for f in detected_foods)
    total_fat = sum(f["fat"] for f in detected_foods)

    uploaded_at = datetime.utcnow()
    log_date = get_log_date(uploaded_at)

    # 4. DB 저장
    meal = MealRecord(
        user_id=current_user.id,
        image_url=upload_result["image_url"],
        thumbnail_url=upload_result["thumbnail_url"],
        meal_type=meal_type,
        uploaded_at=uploaded_at,
        log_date=log_date,
        total_calories=total_cal,
        total_carbs=round(total_carbs),
        total_protein=round(total_protein),
        total_fat=round(total_fat),
        caption=caption,
    )
    db.add(meal)
    await db.flush()

    food_records = []
    for i, f in enumerate(detected_foods):
        df = DetectedFood(
            meal_id=meal.id,
            food_item_id=f.get("food_item_id"),
            food_name=f["food_name"],
            serving_size=f["serving_size"],
            calories=f["calories"],
            carbs=f["carbs"],
            protein=f["protein"],
            fat=f["fat"],
            confidence=f.get("confidence"),
            is_edited=False,
            sort_order=i,
        )
        db.add(df)
        food_records.append(df)

    await db.commit()
    await db.refresh(meal)

    return {
        "success": True,
        "data": {
            "meal_id": str(meal.id),
            "image_url": meal.image_url,
            "thumbnail_url": meal.thumbnail_url,
            "meal_type": meal.meal_type,
            "uploaded_at": meal.uploaded_at.isoformat(),
            "log_date": str(meal.log_date),
            "ai_result": {
                "detected_foods": [
                    {
                        "id": str(df.id),
                        "food_name": df.food_name,
                        "serving_size": float(df.serving_size),
                        "calories": df.calories,
                        "carbs": float(df.carbs),
                        "protein": float(df.protein),
                        "fat": float(df.fat),
                        "confidence": float(df.confidence) if df.confidence else None,
                        "is_edited": df.is_edited,
                    }
                    for df in food_records
                ],
                "total_calories": total_cal,
                "total_carbs": round(total_carbs, 1),
                "total_protein": round(total_protein, 1),
                "total_fat": round(total_fat, 1),
                "is_multi_food_detected": len(detected_foods) > 1,
            },
        },
    }


@router.patch("/{meal_id}/foods")
async def update_meal_foods(
    meal_id: str,
    body: MealFoodsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MealRecord).where(
            and_(MealRecord.id == meal_id, MealRecord.user_id == current_user.id)
        )
    )
    meal = result.scalar_one_or_none()
    if not meal:
        raise HTTPException(status_code=404, detail="식사 기록을 찾을 수 없습니다.")

    # 기존 detected_foods 삭제 후 재삽입
    existing = await db.execute(select(DetectedFood).where(DetectedFood.meal_id == meal_id))
    for df in existing.scalars().all():
        await db.delete(df)

    total_cal = total_carbs = total_protein = total_fat = 0
    for i, food in enumerate(body.detected_foods):
        df = DetectedFood(
            meal_id=meal.id,
            food_name=food.food_name,
            serving_size=food.serving_size,
            calories=food.calories,
            carbs=food.carbs,
            protein=food.protein,
            fat=food.fat,
            is_edited=True,
            sort_order=i,
        )
        db.add(df)
        total_cal += food.calories
        total_carbs += food.carbs
        total_protein += food.protein
        total_fat += food.fat

    meal.total_calories = total_cal
    meal.total_carbs = round(total_carbs)
    meal.total_protein = round(total_protein)
    meal.total_fat = round(total_fat)

    await db.commit()
    return {"success": True, "data": {"meal_id": str(meal.id), "total_calories": total_cal}}


@router.get("")
async def get_meals_by_date(
    date: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as dt_date
    log_date = dt_date.fromisoformat(date)

    result = await db.execute(
        select(MealRecord).where(
            and_(
                MealRecord.user_id == current_user.id,
                MealRecord.log_date == log_date,
            )
        ).order_by(MealRecord.uploaded_at)
    )
    meals = result.scalars().all()

    daily_total = {
        "calories": sum(m.total_calories for m in meals),
        "carbs": sum(float(m.total_carbs) for m in meals),
        "protein": sum(float(m.total_protein) for m in meals),
        "fat": sum(float(m.total_fat) for m in meals),
    }

    return {
        "success": True,
        "data": {
            "log_date": str(log_date),
            "meals": [_meal_to_dict(m) for m in meals],
            "daily_total": daily_total,
        },
    }


@router.get("/{meal_id}")
async def get_meal(
    meal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MealRecord).where(MealRecord.id == meal_id))
    meal = result.scalar_one_or_none()
    if not meal:
        raise HTTPException(status_code=404, detail="식사 기록을 찾을 수 없습니다.")
    return {"success": True, "data": _meal_to_dict(meal, include_foods=True)}


@router.delete("/{meal_id}")
async def delete_meal(
    meal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MealRecord).where(
            and_(MealRecord.id == meal_id, MealRecord.user_id == current_user.id)
        )
    )
    meal = result.scalar_one_or_none()
    if not meal:
        raise HTTPException(status_code=404, detail="식사 기록을 찾을 수 없습니다.")

    await db.delete(meal)
    await db.commit()
    return {"success": True, "message": "삭제되었습니다."}


@router.post("/{meal_id}/reactions")
async def toggle_reaction(
    meal_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reaction_type = body.get("type")
    result = await db.execute(
        select(Reaction).where(
            and_(
                Reaction.meal_id == meal_id,
                Reaction.user_id == current_user.id,
                Reaction.type == reaction_type,
            )
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        action = "removed"
    else:
        reaction = Reaction(meal_id=meal_id, user_id=current_user.id, type=reaction_type)
        db.add(reaction)
        action = "added"

    await db.commit()
    return {"success": True, "data": {"action": action, "type": reaction_type}}


@router.get("/{meal_id}/comments")
async def get_comments(
    meal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Comment).where(Comment.meal_id == meal_id).order_by(Comment.created_at)
    )
    comments = result.scalars().all()
    return {"success": True, "data": [_comment_to_dict(c) for c in comments]}


@router.post("/{meal_id}/comments")
async def add_comment(
    meal_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comment = Comment(
        meal_id=meal_id,
        user_id=current_user.id,
        content=body.get("content", ""),
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return {"success": True, "data": _comment_to_dict(comment)}


@router.delete("/{meal_id}/comments/{comment_id}")
async def delete_comment(
    meal_id: str,
    comment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Comment).where(
            and_(
                Comment.id == comment_id,
                Comment.user_id == current_user.id,
            )
        )
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    await db.delete(comment)
    await db.commit()
    return {"success": True, "message": "댓글이 삭제되었습니다."}


def _meal_to_dict(meal: MealRecord, include_foods: bool = True) -> dict:
    data = {
        "id": str(meal.id),
        "user_id": str(meal.user_id),
        "group_id": str(meal.group_id) if meal.group_id else None,
        "image_url": meal.image_url,
        "thumbnail_url": meal.thumbnail_url,
        "meal_type": meal.meal_type,
        "uploaded_at": meal.uploaded_at.isoformat(),
        "log_date": str(meal.log_date),
        "total_calories": meal.total_calories,
        "total_carbs": float(meal.total_carbs),
        "total_protein": float(meal.total_protein),
        "total_fat": float(meal.total_fat),
        "caption": meal.caption,
    }
    if include_foods and hasattr(meal, "detected_foods"):
        data["detected_foods"] = [
            {
                "id": str(df.id),
                "food_name": df.food_name,
                "serving_size": float(df.serving_size),
                "calories": df.calories,
                "carbs": float(df.carbs),
                "protein": float(df.protein),
                "fat": float(df.fat),
                "confidence": float(df.confidence) if df.confidence else None,
                "is_edited": df.is_edited,
            }
            for df in meal.detected_foods
        ]
    if hasattr(meal, "user") and meal.user:
        data["user"] = {
            "id": str(meal.user.id),
            "name": meal.user.name,
            "avatar_url": meal.user.avatar_url,
        }
    return data


def _comment_to_dict(comment: Comment) -> dict:
    data = {
        "id": str(comment.id),
        "meal_id": str(comment.meal_id),
        "user_id": str(comment.user_id),
        "content": comment.content,
        "created_at": comment.created_at.isoformat(),
    }
    if hasattr(comment, "user") and comment.user:
        data["user"] = {
            "id": str(comment.user.id),
            "name": comment.user.name,
            "avatar_url": comment.user.avatar_url,
        }
    return data
