from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.database import get_db
from app.models.user import User
from app.models.food_item import FoodItem
from app.middleware.auth_middleware import get_current_user
from app.services.ai_service import food_ai_service

router = APIRouter()
_executor = ThreadPoolExecutor(max_workers=2)


def _run_predict(image_bytes: bytes) -> list:
    return food_ai_service.predict(image_bytes, top_k=3)


@router.post("/analyze")
async def analyze_food_image(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    image_bytes = await image.read()

    loop = asyncio.get_event_loop()
    predictions = await loop.run_in_executor(_executor, _run_predict, image_bytes)

    enriched = []
    for pred in predictions:
        result = await db.execute(
            select(FoodItem).where(FoodItem.food_name == pred["food_name"])
        )
        item = result.scalar_one_or_none()

        if item:
            ratio = float(item.serving_size) / 100.0
            enriched.append({
                "food_name": pred["food_name"],
                "confidence": pred["confidence"],
                "food_item_id": str(item.id),
                "serving_size": float(item.serving_size),
                "calories": round(float(item.calories) * ratio),
                "carbs": round(float(item.carbs) * ratio, 1),
                "protein": round(float(item.protein) * ratio, 1),
                "fat": round(float(item.fat) * ratio, 1),
            })
        else:
            enriched.append({
                "food_name": pred["food_name"],
                "confidence": pred["confidence"],
                "food_item_id": None,
                "serving_size": 150.0,
                "calories": 200,
                "carbs": 25.0,
                "protein": 10.0,
                "fat": 8.0,
            })

    total_cal = sum(f["calories"] for f in enriched)
    total_carbs = sum(f["carbs"] for f in enriched)
    total_protein = sum(f["protein"] for f in enriched)
    total_fat = sum(f["fat"] for f in enriched)

    return {
        "success": True,
        "data": {
            "detected_foods": enriched,
            "total_calories": total_cal,
            "total_carbs": round(total_carbs, 1),
            "total_protein": round(total_protein, 1),
            "total_fat": round(total_fat, 1),
            "is_multi_food_detected": len(enriched) > 1,
        },
    }


@router.get("/foods/search")
async def search_foods(
    q: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FoodItem).where(
            or_(
                FoodItem.food_name.ilike(f"%{q}%"),
                FoodItem.food_name_en.ilike(f"%{q}%"),
            )
        ).limit(20)
    )
    items = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": str(item.id),
                "food_name": item.food_name,
                "food_name_en": item.food_name_en,
                "serving_size": float(item.serving_size),
                "calories": float(item.calories),
                "carbs": float(item.carbs),
                "protein": float(item.protein),
                "fat": float(item.fat),
                "category": item.category,
                "is_korean": item.is_korean,
            }
            for item in items
        ],
    }
