from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database import get_db
from app.models.user import User
from app.models.food_item import FoodItem
from app.middleware.auth_middleware import get_current_user
from app.services.ai_service import food_vision_service

router = APIRouter()


@router.post("/analyze")
async def analyze_food_image(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    image_bytes = await image.read()
    foods = await food_vision_service.analyze_image(image_bytes)

    enriched = []
    for food in foods:
        enriched.append({
            "food_name": food["food_name"],
            "confidence": 1.0,
            "food_item_id": None,
            "serving_size": float(food.get("serving_size", 150)),
            "calories": int(food.get("calories", 0)),
            "carbs": round(float(food.get("carbs", 0)), 1),
            "protein": round(float(food.get("protein", 0)), 1),
            "fat": round(float(food.get("fat", 0)), 1),
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
