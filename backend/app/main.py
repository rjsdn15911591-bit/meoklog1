from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import auth, users, meals, groups, ai_analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    # AI 모델 사전 로드 (실패해도 계속 실행)
    from app.services.ai_service import food_ai_service
    food_ai_service.load_model()
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
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(meals.router, prefix="/meals", tags=["meals"])
app.include_router(groups.router, prefix="/groups", tags=["groups"])
app.include_router(ai_analysis.router, prefix="/ai", tags=["ai"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "muklog-api"}
