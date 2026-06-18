import traceback
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base
from app.routers import auth, users, meals, groups, ai_analysis, foods

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # SQLite 사용 시 테이블 자동 생성
    if settings.DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # food_items 테이블에 새 컬럼 추가 (이미 있으면 무시)
            migration_sqls = [
                "ALTER TABLE food_items ADD COLUMN brand_name VARCHAR(100)",
                "ALTER TABLE food_items ADD COLUMN serving_unit VARCHAR(10) DEFAULT 'g' NOT NULL",
                "ALTER TABLE food_items ADD COLUMN source VARCHAR(20) DEFAULT 'system' NOT NULL",
                "ALTER TABLE food_items ADD COLUMN created_by VARCHAR(36)",
                "ALTER TABLE food_items ADD COLUMN is_public BOOLEAN DEFAULT 1 NOT NULL",
                "ALTER TABLE food_items ADD COLUMN use_count INTEGER DEFAULT 0 NOT NULL",
            ]
            for sql in migration_sqls:
                try:
                    await conn.execute(text(sql))
                except Exception as e:
                    if "duplicate column" not in str(e).lower() and "already exists" not in str(e).lower():
                        logger.warning(f"Migration SQL 실패 (무시): {e}")
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
