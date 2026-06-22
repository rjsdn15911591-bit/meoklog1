import random
import string
import uuid as _uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import date as dt_date

from app.database import get_db
from app.models.user import User
from app.models.meal import MealRecord, MealGroupShare
from app.models.group import Group, GroupMember
from app.models.social import Reaction, Comment
from app.middleware.auth_middleware import get_current_user
from app.schemas.group import GroupCreate, GroupJoin, GroupUpdate, GroupTransfer

router = APIRouter()


def _generate_group_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


async def _get_member_today_stats(db: AsyncSession, user_id, log_date: dt_date) -> dict:
    result = await db.execute(
        select(MealRecord).where(
            and_(MealRecord.user_id == user_id, MealRecord.log_date == log_date)
        )
    )
    meals = result.scalars().all()
    return {
        "today_calories": sum(m.total_calories for m in meals),
        "total_carbs": round(sum(float(m.total_carbs) for m in meals), 1),
        "total_protein": round(sum(float(m.total_protein) for m in meals), 1),
        "total_fat": round(sum(float(m.total_fat) for m in meals), 1),
    }


@router.post("")
async def create_group(
    body: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 중복 코드 방지
    for _ in range(10):
        code = _generate_group_code()
        exists = await db.execute(select(Group).where(Group.group_code == code))
        if not exists.scalar_one_or_none():
            break

    group = Group(group_name=body.group_name, group_code=code, owner_id=current_user.id)
    db.add(group)
    await db.flush()

    member = GroupMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    await db.commit()
    await db.refresh(group)

    return {
        "success": True,
        "data": {
            "id": str(group.id),
            "group_name": group.group_name,
            "group_code": group.group_code,
            "owner_id": str(group.owner_id),
            "created_at": group.created_at.isoformat(),
            "member_count": 1,
            "is_owner": True,
            "is_personal": group.is_personal,
        },
    }


@router.post("/join")
async def join_group(
    body: GroupJoin,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Group).where(Group.group_code == body.group_code.upper()))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="GROUP_001")

    if group.is_personal:
        raise HTTPException(status_code=403, detail="GROUP_004")

    existing = await db.execute(
        select(GroupMember).where(
            and_(GroupMember.group_id == group.id, GroupMember.user_id == current_user.id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="GROUP_002")

    # 인원 제한 확인 (최소 2명 ~ 최대 12명)
    count_res = await db.execute(
        select(func.count()).select_from(GroupMember).where(GroupMember.group_id == group.id)
    )
    if (count_res.scalar() or 0) >= (group.max_members or 12):
        raise HTTPException(status_code=400, detail="GROUP_003")

    member = GroupMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    await db.commit()

    return {
        "success": True,
        "data": {"id": str(group.id), "group_name": group.group_name, "group_code": group.group_code},
    }


@router.get("")
async def get_my_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == current_user.id)
    )
    groups = result.scalars().all()

    data = []
    for g in groups:
        count_res = await db.execute(
            select(func.count()).select_from(GroupMember).where(GroupMember.group_id == g.id)
        )
        count = count_res.scalar() or 0
        data.append({
            "id": str(g.id),
            "group_name": g.group_name,
            "group_code": g.group_code,
            "owner_id": str(g.owner_id),
            "created_at": g.created_at.isoformat(),
            "member_count": count,
            "is_owner": str(g.owner_id) == str(current_user.id),
            "is_personal": g.is_personal,
            "max_members": g.max_members or 12,
        })

    return {"success": True, "data": data}


@router.get("/{group_id}")
async def get_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        group_uuid = _uuid.UUID(group_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")

    result = await db.execute(select(Group).where(Group.id == group_uuid))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")

    members_res = await db.execute(
        select(GroupMember, User)
        .join(User, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_uuid)
    )
    members_data = []
    today = dt_date.today()
    for gm, user in members_res.all():
        stats = await _get_member_today_stats(db, user.id, today)
        members_data.append({
            "user_id": str(user.id),
            "name": user.name,
            "avatar_url": user.avatar_url,
            "joined_at": gm.joined_at.isoformat() if gm.joined_at else None,
            "today_calories": stats["today_calories"],
            "target_calories": user.target_calories,
        })

    return {
        "success": True,
        "data": {
            "id": str(group.id),
            "group_name": group.group_name,
            "group_code": group.group_code,
            "owner_id": str(group.owner_id),
            "created_at": group.created_at.isoformat() if group.created_at else None,
            "member_count": len(members_data),
            "is_owner": str(group.owner_id) == str(current_user.id),
            "is_personal": group.is_personal,
            "max_members": group.max_members or 12,
            "members": members_data,
        },
    }


@router.get("/{group_id}/feed")
async def get_group_feed(
    group_id: str,
    date: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        group_uuid = _uuid.UUID(group_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")

    log_date = dt_date.fromisoformat(date) if date else dt_date.today()

    # 멤버 확인
    member_check = await db.execute(
        select(GroupMember).where(
            and_(GroupMember.group_id == group_uuid, GroupMember.user_id == current_user.id)
        )
    )
    if not member_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="그룹 멤버가 아닙니다.")

    # 이 그룹에 공유된 식사 기록 (MealGroupShare 기반)
    meals_res = await db.execute(
        select(MealRecord, User)
        .join(User, User.id == MealRecord.user_id)
        .join(MealGroupShare, MealGroupShare.meal_id == MealRecord.id)
        .where(
            and_(
                MealGroupShare.group_id == group_uuid,
                MealRecord.log_date == log_date,
            )
        )
        .order_by(MealRecord.uploaded_at.desc())
    )

    rows = meals_res.all()
    if not rows:
        return {"success": True, "data": {"log_date": str(log_date), "feed": []}}

    meal_ids = [meal.id for meal, _ in rows]

    # 배치: 모든 식사의 리액션을 한 번에 조회
    all_reactions_res = await db.execute(
        select(Reaction.meal_id, Reaction.type, func.sum(Reaction.count))
        .where(Reaction.meal_id.in_(meal_ids))
        .group_by(Reaction.meal_id, Reaction.type)
    )
    reactions_by_meal: dict = {}
    for r_meal_id, r_type, r_count in all_reactions_res.all():
        reactions_by_meal.setdefault(r_meal_id, {})[r_type] = int(r_count)

    # 배치: 내 리액션 한 번에 조회
    my_reactions_res = await db.execute(
        select(Reaction.meal_id, Reaction.type).where(
            and_(Reaction.meal_id.in_(meal_ids), Reaction.user_id == current_user.id)
        )
    )
    my_reactions_by_meal: dict = {}
    for r_meal_id, r_type in my_reactions_res.all():
        my_reactions_by_meal.setdefault(r_meal_id, []).append(r_type)

    # 배치: 댓글 수 한 번에 조회
    comment_counts_res = await db.execute(
        select(Comment.meal_id, func.count(Comment.id))
        .where(Comment.meal_id.in_(meal_ids))
        .group_by(Comment.meal_id)
    )
    comment_count_by_meal = {row[0]: row[1] for row in comment_counts_res.all()}

    feed_items = []
    for meal, user in rows:
        feed_items.append({
            "id": str(meal.id),
            "user": {"id": str(user.id), "name": user.name, "avatar_url": user.avatar_url},
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
            "reaction_summary": reactions_by_meal.get(meal.id, {}),
            "my_reactions": my_reactions_by_meal.get(meal.id, []),
            "comment_count": comment_count_by_meal.get(meal.id, 0),
        })

    return {"success": True, "data": {"log_date": str(log_date), "feed": feed_items}}


@router.get("/{group_id}/compare")
async def get_calorie_compare(
    group_id: str,
    date: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        group_uuid = _uuid.UUID(group_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")

    log_date = dt_date.fromisoformat(date) if date else dt_date.today()

    member_check = await db.execute(
        select(GroupMember).where(
            and_(GroupMember.group_id == group_uuid, GroupMember.user_id == current_user.id)
        )
    )
    if not member_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="그룹 멤버가 아닙니다.")

    members_res = await db.execute(
        select(GroupMember, User)
        .join(User, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_uuid)
    )

    entries = []
    for gm, user in members_res.all():
        stats = await _get_member_today_stats(db, user.id, log_date)
        target = user.target_calories or 2000
        rate = round(stats["today_calories"] / target * 100, 1) if target > 0 else 0
        entries.append({
            "user_id": str(user.id),
            "name": user.name,
            "avatar_url": user.avatar_url,
            "total_calories": stats["today_calories"],
            "target_calories": user.target_calories,
            "achievement_rate": rate,
            "total_carbs": stats["total_carbs"],
            "total_protein": stats["total_protein"],
            "total_fat": stats["total_fat"],
        })

    entries.sort(key=lambda x: x["total_calories"], reverse=True)
    for i, e in enumerate(entries):
        e["rank"] = i + 1

    avg_cal = round(sum(e["total_calories"] for e in entries) / len(entries), 1) if entries else 0

    return {
        "success": True,
        "data": {
            "log_date": str(log_date),
            "group_average_calories": avg_cal,
            "rankings": entries,
        },
    }


@router.patch("/{group_id}")
async def update_group(
    group_id: str,
    body: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        group_uuid = _uuid.UUID(group_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")

    result = await db.execute(select(Group).where(Group.id == group_uuid))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")
    if str(group.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="그룹장만 설정을 변경할 수 있습니다.")
    if group.is_personal:
        raise HTTPException(status_code=400, detail="나만의 공간은 수정할 수 없습니다.")

    if body.group_name is not None:
        name = body.group_name.strip()
        if not name or len(name) > 30:
            raise HTTPException(status_code=400, detail="그룹명은 1~30자여야 합니다.")
        group.group_name = name

    if body.max_members is not None:
        if not (2 <= body.max_members <= 12):
            raise HTTPException(status_code=400, detail="인원 제한은 2~12명이어야 합니다.")
        count_res = await db.execute(
            select(func.count()).select_from(GroupMember).where(GroupMember.group_id == group_uuid)
        )
        current_count = count_res.scalar() or 0
        if body.max_members < current_count:
            raise HTTPException(status_code=400, detail=f"현재 멤버 수({current_count}명)보다 작게 설정할 수 없습니다.")
        group.max_members = body.max_members

    await db.commit()
    await db.refresh(group)
    return {
        "success": True,
        "data": {
            "id": str(group.id),
            "group_name": group.group_name,
            "max_members": group.max_members,
        },
    }


@router.post("/{group_id}/transfer")
async def transfer_ownership(
    group_id: str,
    body: GroupTransfer,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        group_uuid = _uuid.UUID(group_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")

    result = await db.execute(select(Group).where(Group.id == group_uuid))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")
    if str(group.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="그룹장만 양도할 수 있습니다.")
    if group.is_personal:
        raise HTTPException(status_code=400, detail="나만의 공간은 수정할 수 없습니다.")

    try:
        new_owner_uuid = _uuid.UUID(body.new_owner_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="유효하지 않은 사용자 ID입니다.")

    if new_owner_uuid == current_user.id:
        raise HTTPException(status_code=400, detail="자기 자신에게 양도할 수 없습니다.")

    member_check = await db.execute(
        select(GroupMember).where(
            and_(GroupMember.group_id == group_uuid, GroupMember.user_id == new_owner_uuid)
        )
    )
    if not member_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="해당 유저는 그룹 멤버가 아닙니다.")

    group.owner_id = new_owner_uuid
    await db.commit()
    return {"success": True, "message": "그룹장이 양도되었습니다."}


@router.delete("/{group_id}")
async def delete_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        group_uuid = _uuid.UUID(group_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")

    result = await db.execute(select(Group).where(Group.id == group_uuid))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")
    if str(group.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="그룹장만 그룹을 해산할 수 있습니다.")
    if group.is_personal:
        raise HTTPException(status_code=400, detail="나만의 공간은 삭제할 수 없습니다.")

    await db.delete(group)
    await db.commit()
    return {"success": True, "message": "그룹이 해산되었습니다."}


@router.delete("/{group_id}/leave")
async def leave_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        group_uuid = _uuid.UUID(group_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")

    result = await db.execute(select(Group).where(Group.id == group_uuid))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")

    if str(group.owner_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="그룹장은 탈퇴할 수 없습니다. 그룹을 삭제하거나 그룹장을 양도하세요.")

    member_res = await db.execute(
        select(GroupMember).where(
            and_(GroupMember.group_id == group_uuid, GroupMember.user_id == current_user.id)
        )
    )
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="그룹 멤버가 아닙니다.")

    await db.delete(member)
    await db.commit()
    return {"success": True, "message": "그룹에서 탈퇴했습니다."}
