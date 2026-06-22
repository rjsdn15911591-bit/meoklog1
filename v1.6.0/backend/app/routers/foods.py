import uuid as _uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models.food_item import FoodItem
from app.models.user import User
from app.middleware.auth_middleware import get_current_user
from app.schemas.food import FoodCreate

router = APIRouter()

# 인증 선택적으로 처리하는 헬퍼
_bearer = HTTPBearer(auto_error=False)

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        from jose import jwt, JWTError
        from app.config import settings
        import uuid as _uuid
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        from sqlalchemy import select as _select
        result = await db.execute(_select(User).where(User.id == _uuid.UUID(user_id_str)))
        return result.scalar_one_or_none()
    except Exception:
        return None


@router.get("/my")
async def get_my_foods(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """내가 직접 등록한 음식 목록"""
    stmt = (
        select(FoodItem)
        .where(FoodItem.created_by == current_user.id)
        .order_by(FoodItem.use_count.desc(), FoodItem.id)
        .limit(50)
    )
    result = await db.execute(stmt)
    foods = result.scalars().all()
    return {"success": True, "data": [_food_to_dict(f) for f in foods]}


@router.get("/search")
async def search_foods(
    q: str = Query(default="", description="검색어"),
    exclude_user: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    stmt = select(FoodItem).where(FoodItem.is_public == True)

    if exclude_user:
        stmt = stmt.where(FoodItem.source == 'system')

    if q:
        stmt = stmt.where(
            or_(
                FoodItem.food_name.ilike(f"%{q}%"),
                FoodItem.brand_name.ilike(f"%{q}%"),
            )
        )

    stmt = stmt.order_by(FoodItem.use_count.desc(), FoodItem.food_name.asc()).limit(30)

    result = await db.execute(stmt)
    foods = result.scalars().all()

    # 로그인된 경우 개인 비공개 음식도 포함
    if current_user and not exclude_user and q:
        personal_stmt = select(FoodItem).where(
            FoodItem.is_public == False,
            FoodItem.created_by == current_user.id,
            or_(
                FoodItem.food_name.ilike(f"%{q}%"),
                FoodItem.brand_name.ilike(f"%{q}%"),
            )
        ).limit(10)
        personal_result = await db.execute(personal_stmt)
        personal_foods = personal_result.scalars().all()
        foods = list(foods) + list(personal_foods)

    return {
        "success": True,
        "data": [_food_to_dict(f) for f in foods]
    }


@router.post("")
async def create_food(
    body: FoodCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    food = FoodItem(
        food_name=body.food_name,
        brand_name=body.brand_name,
        serving_size=body.serving_size,
        serving_unit=body.serving_unit,
        calories=body.calories,
        carbs=body.carbs,
        protein=body.protein,
        fat=body.fat,
        source='user',
        created_by=current_user.id,
        is_public=body.is_public,
        use_count=0,
    )
    db.add(food)
    await db.commit()
    await db.refresh(food)
    return {"success": True, "data": _food_to_dict(food)}


@router.post("/{food_id}/use")
async def increment_use(
    food_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        food_uuid = _uuid.UUID(food_id)
    except (ValueError, AttributeError):
        return {"success": True}  # 잘못된 UUID는 무시 (사용 횟수 집계 실패가 치명적이지 않음)
    result = await db.execute(select(FoodItem).where(FoodItem.id == food_uuid))
    food = result.scalar_one_or_none()
    if food:
        food.use_count = (food.use_count or 0) + 1
        await db.commit()
    return {"success": True}


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
