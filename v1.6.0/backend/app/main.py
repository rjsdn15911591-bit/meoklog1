import traceback
import logging
import uuid as _uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base
from app.routers import auth, users, meals, groups, ai_analysis, foods
from app.models import WeightRecord, UserFavoriteFood  # noqa: F401 — create_all 인식용

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from seed_foods import SEED_FOODS as _SEED_FOODS
except ImportError:
    _SEED_FOODS = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text

        # 1단계: 스키마 생성 + 마이그레이션 (하나의 트랜잭션)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            migration_sqls = [
                "ALTER TABLE food_items ADD COLUMN brand_name VARCHAR(100)",
                "ALTER TABLE food_items ADD COLUMN serving_unit VARCHAR(10) DEFAULT 'g' NOT NULL",
                "ALTER TABLE food_items ADD COLUMN source VARCHAR(20) DEFAULT 'system' NOT NULL",
                "ALTER TABLE food_items ADD COLUMN created_by VARCHAR(36)",
                "ALTER TABLE food_items ADD COLUMN is_public BOOLEAN DEFAULT 1 NOT NULL",
                "ALTER TABLE food_items ADD COLUMN use_count INTEGER DEFAULT 0 NOT NULL",
                "ALTER TABLE reactions ADD COLUMN count INTEGER DEFAULT 1 NOT NULL",
                "ALTER TABLE groups ADD COLUMN max_members INTEGER DEFAULT 12 NOT NULL",
            ]
            for sql in migration_sqls:
                try:
                    await conn.execute(text(sql))
                except Exception as e:
                    if "duplicate column" not in str(e).lower() and "already exists" not in str(e).lower():
                        logger.warning(f"Migration SQL 실패 (무시): {e}")

        # 2단계: 시딩 — 완전히 분리된 트랜잭션, 실패해도 서버 시작에 영향 없음
        if _SEED_FOODS:
            try:
                async with engine.begin() as seed_conn:
                    count_result = await seed_conn.execute(
                        text("SELECT COUNT(*) FROM food_items WHERE source='system'")
                    )
                    if count_result.scalar() == 0:
                        now_str = datetime.now(timezone.utc).isoformat()
                        for food_data in _SEED_FOODS:
                            await seed_conn.execute(
                                text(
                                    "INSERT INTO food_items "
                                    "(id, food_name, brand_name, serving_size, serving_unit, calories, carbs, protein, fat, source, is_public, use_count, is_korean, created_at) "
                                    "VALUES (:id, :fn, :bn, :ss, :su, :cal, :carb, :prot, :fat, :src, :pub, :uc, :ik, :ca)"
                                ),
                                {
                                    "id": _uuid.uuid4().hex,
                                    "fn": food_data["food_name"],
                                    "bn": food_data.get("brand_name"),
                                    "ss": food_data["serving_size"],
                                    "su": food_data.get("serving_unit", "g"),
                                    "cal": food_data["calories"],
                                    "carb": food_data["carbs"],
                                    "prot": food_data["protein"],
                                    "fat": food_data["fat"],
                                    "src": "system",
                                    "pub": 1,
                                    "uc": food_data.get("use_count", 0),
                                    "ik": 1,
                                    "ca": now_str,
                                }
                            )
                        logger.info(f"시스템 음식 자동 시딩 완료: {len(_SEED_FOODS)}개")
            except Exception as seed_err:
                logger.error(f"시딩 실패 (서버는 계속 실행): {seed_err}")
    yield
    await engine.dispose()


app = FastAPI(
    title="먹로그 API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error(f"Unhandled exception [{request.method} {request.url}]:\n{tb}")
    response = JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc), "type": type(exc).__name__},
    )
    origin = request.headers.get("origin", "")
    allowed = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
    if origin and (origin in allowed or "*" in allowed):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(meals.router, prefix="/meals", tags=["meals"])
app.include_router(groups.router, prefix="/groups", tags=["groups"])
app.include_router(ai_analysis.router, prefix="/ai", tags=["ai"])
app.include_router(foods.router, prefix="/foods", tags=["foods"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "muklog-api"}
