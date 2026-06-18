from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
import httpx

from app.database import get_db
from app.models.user import User
from app.models.group import Group, GroupMember
from app.config import settings

router = APIRouter()


class GoogleLoginRequest(BaseModel):
    id_token: str = ""
    code: str = ""
    redirect_uri: str = ""


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


@router.post("/google")
async def google_login(body: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """Google OAuth 로그인/회원가입"""
    user_info = None

    if body.id_token:
        # ID Token 검증
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={body.id_token}"
            )
            if res.status_code != 200:
                raise HTTPException(status_code=401, detail="유효하지 않은 Google 토큰입니다.")
            user_info = res.json()

    elif body.code and body.redirect_uri:
        # Authorization Code → Access Token 교환
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": body.code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": body.redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_res.status_code != 200:
                raise HTTPException(status_code=401, detail="Google 인증에 실패했습니다.")
            tokens = token_res.json()

            info_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            user_info = info_res.json()
    else:
        raise HTTPException(status_code=400, detail="id_token 또는 code가 필요합니다.")

    email = user_info.get("email")
    name = user_info.get("name", email.split("@")[0])
    avatar_url = user_info.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="이메일 정보를 가져올 수 없습니다.")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    is_new_user = user is None

    if is_new_user:
        user = User(email=email, name=name, avatar_url=avatar_url)
        db.add(user)
        await db.flush()

        # 개인 하루로그 그룹 자동 생성
        personal_group = Group(
            group_name="개인 하루로그",
            group_code=f"PERSONAL-{str(user.id)[:8].upper()}",
            owner_id=user.id,
            is_personal=True,
        )
        db.add(personal_group)
        await db.flush()

        db.add(GroupMember(group_id=personal_group.id, user_id=user.id))
        await db.commit()
        await db.refresh(user)
    else:
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url
            await db.commit()

    access_token = create_access_token(str(user.id))

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url,
                "is_new_user": is_new_user,
            },
        },
    }


class DevLoginRequest(BaseModel):
    email: str
    name: str = ""

@router.post("/dev-login")
async def dev_login(body: DevLoginRequest, db: AsyncSession = Depends(get_db)):
    """개발 환경 전용 — 목 유저로 즉시 로그인 (DB 유저 자동 생성)"""
    if settings.ENVIRONMENT != "development":
        raise HTTPException(status_code=403, detail="개발 환경에서만 사용 가능합니다.")

    email = body.email
    name  = body.name or email

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=email, name=name)
        db.add(user)
        await db.flush()

        personal_group = Group(
            group_name="개인 하루로그",
            group_code=f"PERSONAL-{str(user.id)[:8].upper()}",
            owner_id=user.id,
            is_personal=True,
        )
        db.add(personal_group)
        await db.flush()

        db.add(GroupMember(group_id=personal_group.id, user_id=user.id))
        await db.commit()
        await db.refresh(user)

    token = create_access_token(str(user.id))
    return {
        "success": True,
        "data": {
            "access_token": token,
            "user": {
                "id":    str(user.id),
                "email": user.email,
                "name":  user.name,
                "avatar_url": user.avatar_url,
            },
        },
    }


@router.post("/logout")
async def logout():
    return {"success": True, "message": "로그아웃 완료"}
