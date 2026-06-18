import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from app.models.food_item import FoodItem
from app.database import Base

# 한국 식약처(MFDS) 식품영양성분 데이터베이스 기준
SEED_FOODS = [
    # ── 한식 주식 (밥류) ──────────────────────────────────────────────
    {"food_name": "흰쌀밥", "serving_size": 210, "serving_unit": "g", "calories": 300, "carbs": 65.8, "protein": 5.0, "fat": 0.5, "use_count": 500000},
    {"food_name": "현미밥", "serving_size": 210, "serving_unit": "g", "calories": 317, "carbs": 67.2, "protein": 6.3, "fat": 2.1, "use_count": 200000},
    {"food_name": "잡곡밥", "serving_size": 210, "serving_unit": "g", "calories": 307, "carbs": 64.7, "protein": 6.5, "fat": 1.5, "use_count": 180000},
    {"food_name": "볶음밥", "serving_size": 300, "serving_unit": "g", "calories": 490, "carbs": 70.0, "protein": 12.0, "fat": 16.0, "use_count": 150000},
    {"food_name": "비빔밥", "serving_size": 450, "serving_unit": "g", "calories": 580, "carbs": 95.0, "protein": 20.0, "fat": 12.0, "use_count": 200000},
    {"food_name": "돌솥비빔밥", "serving_size": 500, "serving_unit": "g", "calories": 650, "carbs": 100.0, "protein": 22.0, "fat": 16.0, "use_count": 120000},
    {"food_name": "김치볶음밥", "serving_size": 350, "serving_unit": "g", "calories": 530, "carbs": 72.0, "protein": 15.0, "fat": 18.0, "use_count": 250000},
    {"food_name": "새우볶음밥", "serving_size": 350, "serving_unit": "g", "calories": 510, "carbs": 70.0, "protein": 18.0, "fat": 15.0, "use_count": 150000},
    {"food_name": "카레라이스", "serving_size": 400, "serving_unit": "g", "calories": 620, "carbs": 90.0, "protein": 18.0, "fat": 18.0, "use_count": 200000},
    {"food_name": "오므라이스", "serving_size": 350, "serving_unit": "g", "calories": 550, "carbs": 68.0, "protein": 18.0, "fat": 22.0, "use_count": 150000},
    {"food_name": "연어덮밥", "serving_size": 400, "serving_unit": "g", "calories": 650, "carbs": 72.0, "protein": 35.0, "fat": 20.0, "use_count": 100000},
    {"food_name": "참치마요덮밥", "serving_size": 350, "serving_unit": "g", "calories": 570, "carbs": 72.0, "protein": 22.0, "fat": 16.0, "use_count": 120000},
    {"food_name": "소고기덮밥", "serving_size": 400, "serving_unit": "g", "calories": 620, "carbs": 72.0, "protein": 30.0, "fat": 20.0, "use_count": 100000},
    {"food_name": "주먹밥 (1개)", "serving_size": 120, "serving_unit": "g", "calories": 190, "carbs": 40.0, "protein": 4.5, "fat": 1.5, "use_count": 150000},
    # ── 한식 면류 ──────────────────────────────────────────────────────
    {"food_name": "김밥 (1줄)", "serving_size": 300, "serving_unit": "g", "calories": 480, "carbs": 76.0, "protein": 15.0, "fat": 11.0, "use_count": 250000},
    {"food_name": "떡볶이", "serving_size": 300, "serving_unit": "g", "calories": 450, "carbs": 80.0, "protein": 10.0, "fat": 8.0, "use_count": 300000},
    {"food_name": "라면 (봉지)", "serving_size": 500, "serving_unit": "g", "calories": 500, "carbs": 73.0, "protein": 10.0, "fat": 16.0, "use_count": 400000},
    {"food_name": "짜장면", "serving_size": 500, "serving_unit": "g", "calories": 670, "carbs": 110.0, "protein": 18.0, "fat": 16.0, "use_count": 200000},
    {"food_name": "짬뽕", "serving_size": 700, "serving_unit": "g", "calories": 560, "carbs": 75.0, "protein": 25.0, "fat": 15.0, "use_count": 180000},
    {"food_name": "냉면 (물냉면)", "serving_size": 500, "serving_unit": "g", "calories": 480, "carbs": 90.0, "protein": 15.0, "fat": 5.0, "use_count": 150000},
    {"food_name": "우동", "serving_size": 500, "serving_unit": "g", "calories": 400, "carbs": 72.0, "protein": 12.0, "fat": 5.0, "use_count": 120000},
    {"food_name": "칼국수", "serving_size": 600, "serving_unit": "g", "calories": 520, "carbs": 90.0, "protein": 18.0, "fat": 8.0, "use_count": 180000},
    {"food_name": "수제비", "serving_size": 500, "serving_unit": "g", "calories": 450, "carbs": 78.0, "protein": 12.0, "fat": 8.0, "use_count": 80000},
    {"food_name": "잔치국수", "serving_size": 500, "serving_unit": "g", "calories": 420, "carbs": 72.0, "protein": 14.0, "fat": 6.0, "use_count": 100000},
    {"food_name": "콩국수", "serving_size": 600, "serving_unit": "g", "calories": 490, "carbs": 68.0, "protein": 22.0, "fat": 10.0, "use_count": 80000},
    {"food_name": "소면 (삶은)", "serving_size": 200, "serving_unit": "g", "calories": 280, "carbs": 56.0, "protein": 9.0, "fat": 1.5, "use_count": 100000},
    {"food_name": "파스타 (삶은)", "serving_size": 200, "serving_unit": "g", "calories": 260, "carbs": 50.0, "protein": 9.2, "fat": 1.3, "use_count": 80000},
    {"food_name": "스파게티 (볼로네이즈)", "serving_size": 350, "serving_unit": "g", "calories": 580, "carbs": 72.0, "protein": 25.0, "fat": 20.0, "use_count": 100000},
    {"food_name": "스파게티 (까르보나라)", "serving_size": 350, "serving_unit": "g", "calories": 680, "carbs": 68.0, "protein": 22.0, "fat": 32.0, "use_count": 100000},
    {"food_name": "스파게티 (토마토)", "serving_size": 350, "serving_unit": "g", "calories": 520, "carbs": 72.0, "protein": 18.0, "fat": 16.0, "use_count": 80000},
    # ── 한식 국/탕/찌개 ────────────────────────────────────────────────
    {"food_name": "김치찌개", "serving_size": 350, "serving_unit": "g", "calories": 245, "carbs": 12.0, "protein": 15.0, "fat": 13.0, "use_count": 300000},
    {"food_name": "된장찌개", "serving_size": 350, "serving_unit": "g", "calories": 210, "carbs": 14.0, "protein": 12.0, "fat": 9.0, "use_count": 280000},
    {"food_name": "순두부찌개", "serving_size": 350, "serving_unit": "g", "calories": 195, "carbs": 9.0, "protein": 14.0, "fat": 10.0, "use_count": 200000},
    {"food_name": "부대찌개", "serving_size": 500, "serving_unit": "g", "calories": 450, "carbs": 35.0, "protein": 25.0, "fat": 18.0, "use_count": 250000},
    {"food_name": "청국장찌개", "serving_size": 350, "serving_unit": "g", "calories": 200, "carbs": 12.0, "protein": 14.0, "fat": 9.0, "use_count": 120000},
    {"food_name": "동태찌개", "serving_size": 400, "serving_unit": "g", "calories": 210, "carbs": 10.0, "protein": 25.0, "fat": 7.0, "use_count": 100000},
    {"food_name": "미역국", "serving_size": 350, "serving_unit": "g", "calories": 105, "carbs": 5.0, "protein": 8.0, "fat": 5.0, "use_count": 150000},
    {"food_name": "콩나물국", "serving_size": 250, "serving_unit": "g", "calories": 52, "carbs": 4.0, "protein": 4.0, "fat": 2.0, "use_count": 200000},
    {"food_name": "된장국", "serving_size": 250, "serving_unit": "g", "calories": 75, "carbs": 6.0, "protein": 5.0, "fat": 3.0, "use_count": 200000},
    {"food_name": "북어국", "serving_size": 300, "serving_unit": "g", "calories": 140, "carbs": 8.0, "protein": 19.0, "fat": 3.0, "use_count": 100000},
    {"food_name": "육개장", "serving_size": 500, "serving_unit": "g", "calories": 295, "carbs": 15.0, "protein": 22.0, "fat": 14.0, "use_count": 150000},
    {"food_name": "갈비탕", "serving_size": 700, "serving_unit": "g", "calories": 420, "carbs": 22.0, "protein": 38.0, "fat": 20.0, "use_count": 100000},
    {"food_name": "설렁탕", "serving_size": 700, "serving_unit": "g", "calories": 350, "carbs": 28.0, "protein": 30.0, "fat": 13.0, "use_count": 90000},
    {"food_name": "해장국", "serving_size": 600, "serving_unit": "g", "calories": 410, "carbs": 32.0, "protein": 28.0, "fat": 18.0, "use_count": 80000},
    {"food_name": "감자탕", "serving_size": 600, "serving_unit": "g", "calories": 520, "carbs": 30.0, "protein": 38.0, "fat": 25.0, "use_count": 120000},
    {"food_name": "매운탕", "serving_size": 500, "serving_unit": "g", "calories": 240, "carbs": 12.0, "protein": 28.0, "fat": 8.0, "use_count": 100000},
    {"food_name": "추어탕", "serving_size": 400, "serving_unit": "g", "calories": 180, "carbs": 10.0, "protein": 18.0, "fat": 6.0, "use_count": 70000},
    {"food_name": "삼계탕", "serving_size": 800, "serving_unit": "g", "calories": 700, "carbs": 55.0, "protein": 55.0, "fat": 22.0, "use_count": 120000},
    # ── 한식 반찬 ──────────────────────────────────────────────────────
    {"food_name": "김치", "serving_size": 100, "serving_unit": "g", "calories": 18, "carbs": 3.5, "protein": 1.5, "fat": 0.5, "use_count": 500000},
    {"food_name": "깍두기", "serving_size": 100, "serving_unit": "g", "calories": 30, "carbs": 6.5, "protein": 1.0, "fat": 0.5, "use_count": 200000},
    {"food_name": "계란말이", "serving_size": 100, "serving_unit": "g", "calories": 165, "carbs": 2.0, "protein": 12.0, "fat": 12.0, "use_count": 180000},
    {"food_name": "두부조림", "serving_size": 150, "serving_unit": "g", "calories": 175, "carbs": 8.0, "protein": 11.0, "fat": 10.0, "use_count": 120000},
    {"food_name": "잡채", "serving_size": 200, "serving_unit": "g", "calories": 300, "carbs": 50.0, "protein": 8.0, "fat": 8.0, "use_count": 150000},
    {"food_name": "나물 (시금치)", "serving_size": 100, "serving_unit": "g", "calories": 55, "carbs": 4.0, "protein": 3.0, "fat": 3.0, "use_count": 100000},
    {"food_name": "계란 프라이", "serving_size": 50, "serving_unit": "g", "calories": 98, "carbs": 0.4, "protein": 6.3, "fat": 7.8, "use_count": 350000},
    {"food_name": "삶은 계란", "serving_size": 60, "serving_unit": "g", "calories": 78, "carbs": 0.6, "protein": 6.5, "fat": 5.3, "use_count": 300000},
    {"food_name": "스크램블에그", "serving_size": 100, "serving_unit": "g", "calories": 150, "carbs": 1.5, "protein": 10.0, "fat": 11.0, "use_count": 120000},
    # ── 한식 육류 ──────────────────────────────────────────────────────
    {"food_name": "삼겹살 (구운)", "serving_size": 200, "serving_unit": "g", "calories": 790, "carbs": 0.0, "protein": 36.0, "fat": 70.0, "use_count": 300000},
    {"food_name": "불고기", "serving_size": 200, "serving_unit": "g", "calories": 380, "carbs": 16.0, "protein": 40.0, "fat": 16.0, "use_count": 250000},
    {"food_name": "제육볶음", "serving_size": 200, "serving_unit": "g", "calories": 400, "carbs": 15.0, "protein": 25.0, "fat": 25.0, "use_count": 200000},
    {"food_name": "닭갈비", "serving_size": 250, "serving_unit": "g", "calories": 380, "carbs": 20.0, "protein": 30.0, "fat": 18.0, "use_count": 180000},
    {"food_name": "닭가슴살 (구운)", "serving_size": 100, "serving_unit": "g", "calories": 165, "carbs": 0.0, "protein": 31.0, "fat": 3.6, "use_count": 250000},
    {"food_name": "치킨 (후라이드)", "serving_size": 250, "serving_unit": "g", "calories": 640, "carbs": 32.0, "protein": 40.0, "fat": 38.0, "use_count": 400000},
    {"food_name": "치킨 (양념)", "serving_size": 250, "serving_unit": "g", "calories": 700, "carbs": 50.0, "protein": 38.0, "fat": 35.0, "use_count": 350000},
    {"food_name": "소불고기", "serving_size": 150, "serving_unit": "g", "calories": 285, "carbs": 10.0, "protein": 30.0, "fat": 13.0, "use_count": 150000},
    {"food_name": "갈비구이", "serving_size": 200, "serving_unit": "g", "calories": 540, "carbs": 15.0, "protein": 35.0, "fat": 35.0, "use_count": 200000},
    {"food_name": "돼지고기 목살 (구운)", "serving_size": 200, "serving_unit": "g", "calories": 660, "carbs": 0.0, "protein": 38.0, "fat": 56.0, "use_count": 150000},
    {"food_name": "돼지갈비 (구운)", "serving_size": 200, "serving_unit": "g", "calories": 590, "carbs": 12.0, "protein": 36.0, "fat": 43.0, "use_count": 180000},
    {"food_name": "수육", "serving_size": 200, "serving_unit": "g", "calories": 400, "carbs": 0.0, "protein": 40.0, "fat": 26.0, "use_count": 100000},
    {"food_name": "닭다리 (구운)", "serving_size": 100, "serving_unit": "g", "calories": 185, "carbs": 0.0, "protein": 25.0, "fat": 9.0, "use_count": 150000},
    {"food_name": "닭날개 (구운)", "serving_size": 100, "serving_unit": "g", "calories": 203, "carbs": 0.0, "protein": 19.0, "fat": 14.0, "use_count": 100000},
    {"food_name": "닭볶음탕", "serving_size": 300, "serving_unit": "g", "calories": 440, "carbs": 25.0, "protein": 35.0, "fat": 22.0, "use_count": 150000},
    {"food_name": "오징어볶음", "serving_size": 200, "serving_unit": "g", "calories": 260, "carbs": 18.0, "protein": 22.0, "fat": 8.0, "use_count": 150000},
    {"food_name": "낙지볶음", "serving_size": 200, "serving_unit": "g", "calories": 280, "carbs": 20.0, "protein": 22.0, "fat": 10.0, "use_count": 100000},
    # ── 분식/패스트푸드 ────────────────────────────────────────────────
    {"food_name": "순대", "serving_size": 200, "serving_unit": "g", "calories": 360, "carbs": 30.0, "protein": 18.0, "fat": 17.0, "use_count": 150000},
    {"food_name": "파전", "serving_size": 200, "serving_unit": "g", "calories": 380, "carbs": 45.0, "protein": 10.0, "fat": 16.0, "use_count": 100000},
    {"food_name": "해물파전", "serving_size": 200, "serving_unit": "g", "calories": 370, "carbs": 40.0, "protein": 14.0, "fat": 16.0, "use_count": 80000},
    {"food_name": "만두 (군만두, 5개)", "serving_size": 150, "serving_unit": "g", "calories": 330, "carbs": 35.0, "protein": 12.0, "fat": 14.0, "use_count": 200000},
    {"food_name": "만두국", "serving_size": 400, "serving_unit": "g", "calories": 350, "carbs": 40.0, "protein": 16.0, "fat": 12.0, "use_count": 120000},
    {"food_name": "핫도그", "serving_size": 100, "serving_unit": "g", "calories": 260, "carbs": 28.0, "protein": 9.0, "fat": 12.0, "use_count": 120000},
    {"food_name": "어묵 (오뎅)", "serving_size": 100, "serving_unit": "g", "calories": 113, "carbs": 13.0, "protein": 8.0, "fat": 3.0, "use_count": 150000},
    {"food_name": "피자 (1조각)", "serving_size": 100, "serving_unit": "g", "calories": 266, "carbs": 33.0, "protein": 11.0, "fat": 10.0, "use_count": 250000},
    {"food_name": "햄버거", "serving_size": 200, "serving_unit": "g", "calories": 480, "carbs": 45.0, "protein": 25.0, "fat": 22.0, "use_count": 300000},
    {"food_name": "떡 (백설기)", "serving_size": 100, "serving_unit": "g", "calories": 212, "carbs": 48.0, "protein": 4.0, "fat": 0.5, "use_count": 80000},
    {"food_name": "호떡", "serving_size": 100, "serving_unit": "g", "calories": 290, "carbs": 50.0, "protein": 5.0, "fat": 8.0, "use_count": 80000},
    {"food_name": "붕어빵 (1개)", "serving_size": 60, "serving_unit": "g", "calories": 130, "carbs": 24.0, "protein": 4.0, "fat": 2.5, "use_count": 100000},
    {"food_name": "새우튀김 (1개)", "serving_size": 30, "serving_unit": "g", "calories": 60, "carbs": 5.5, "protein": 3.5, "fat": 2.5, "use_count": 100000},
    {"food_name": "프렌치프라이 (소)", "serving_size": 117, "serving_unit": "g", "calories": 320, "carbs": 42.0, "protein": 4.0, "fat": 15.0, "use_count": 200000},
    # ── 편의점 음식 ────────────────────────────────────────────────────
    {"food_name": "삼각김밥 (참치마요)", "serving_size": 100, "serving_unit": "g", "calories": 194, "carbs": 31.0, "protein": 7.0, "fat": 5.0, "use_count": 400000},
    {"food_name": "삼각김밥 (불고기)", "serving_size": 100, "serving_unit": "g", "calories": 183, "carbs": 33.0, "protein": 6.0, "fat": 3.0, "use_count": 300000},
    {"food_name": "삼각김밥 (명란)", "serving_size": 100, "serving_unit": "g", "calories": 178, "carbs": 33.0, "protein": 5.0, "fat": 3.0, "use_count": 200000},
    {"food_name": "컵라면 (신라면)", "serving_size": 114, "serving_unit": "g", "calories": 510, "carbs": 71.0, "protein": 10.0, "fat": 20.0, "use_count": 500000},
    {"food_name": "에그마요 샌드위치", "serving_size": 130, "serving_unit": "g", "calories": 310, "carbs": 35.0, "protein": 10.0, "fat": 14.0, "use_count": 200000},
    {"food_name": "핫바", "serving_size": 80, "serving_unit": "g", "calories": 190, "carbs": 18.0, "protein": 8.0, "fat": 9.0, "use_count": 200000},
    {"food_name": "편의점 도시락", "serving_size": 380, "serving_unit": "g", "calories": 650, "carbs": 92.0, "protein": 20.0, "fat": 20.0, "use_count": 300000},
    # ── 라면류 ─────────────────────────────────────────────────────────
    {"food_name": "불닭볶음면", "serving_size": 140, "serving_unit": "g", "calories": 530, "carbs": 73.0, "protein": 10.0, "fat": 19.0, "use_count": 400000},
    {"food_name": "짜파게티", "serving_size": 140, "serving_unit": "g", "calories": 555, "carbs": 79.0, "protein": 10.0, "fat": 20.0, "use_count": 300000},
    {"food_name": "너구리", "serving_size": 120, "serving_unit": "g", "calories": 500, "carbs": 73.0, "protein": 9.0, "fat": 17.0, "use_count": 200000},
    {"food_name": "진라면 (매운)", "serving_size": 120, "serving_unit": "g", "calories": 510, "carbs": 73.0, "protein": 10.0, "fat": 18.0, "use_count": 250000},
    # ── 빵류 ───────────────────────────────────────────────────────────
    {"food_name": "식빵 (1장)", "serving_size": 30, "serving_unit": "g", "calories": 79, "carbs": 14.7, "protein": 2.6, "fat": 1.1, "use_count": 200000},
    {"food_name": "토스트 (1장)", "serving_size": 30, "serving_unit": "g", "calories": 84, "carbs": 15.5, "protein": 2.7, "fat": 1.5, "use_count": 150000},
    {"food_name": "크루아상", "serving_size": 60, "serving_unit": "g", "calories": 231, "carbs": 26.0, "protein": 4.7, "fat": 12.0, "use_count": 100000},
    {"food_name": "베이글", "serving_size": 100, "serving_unit": "g", "calories": 270, "carbs": 53.0, "protein": 10.0, "fat": 1.5, "use_count": 80000},
    {"food_name": "도넛", "serving_size": 60, "serving_unit": "g", "calories": 220, "carbs": 28.0, "protein": 3.5, "fat": 10.0, "use_count": 100000},
    {"food_name": "와플", "serving_size": 100, "serving_unit": "g", "calories": 290, "carbs": 38.0, "protein": 8.0, "fat": 12.0, "use_count": 100000},
    {"food_name": "팬케이크 (1장)", "serving_size": 80, "serving_unit": "g", "calories": 195, "carbs": 28.0, "protein": 5.0, "fat": 7.0, "use_count": 100000},
    {"food_name": "머핀", "serving_size": 100, "serving_unit": "g", "calories": 340, "carbs": 48.0, "protein": 5.0, "fat": 14.0, "use_count": 80000},
    {"food_name": "카스테라", "serving_size": 50, "serving_unit": "g", "calories": 178, "carbs": 30.0, "protein": 4.0, "fat": 5.0, "use_count": 100000},
    {"food_name": "약과 (1개)", "serving_size": 35, "serving_unit": "g", "calories": 145, "carbs": 23.0, "protein": 1.5, "fat": 5.5, "use_count": 60000},
    # ── 단백질/유제품 ──────────────────────────────────────────────────
    {"food_name": "우유 (1잔)", "serving_size": 200, "serving_unit": "ml", "calories": 130, "carbs": 9.6, "protein": 6.8, "fat": 7.8, "use_count": 300000},
    {"food_name": "두유 (1팩)", "serving_size": 190, "serving_unit": "ml", "calories": 90, "carbs": 10.0, "protein": 6.0, "fat": 3.0, "use_count": 150000},
    {"food_name": "그릭요거트", "serving_size": 150, "serving_unit": "g", "calories": 133, "carbs": 7.5, "protein": 15.0, "fat": 4.5, "use_count": 120000},
    {"food_name": "요거트 (플레인)", "serving_size": 150, "serving_unit": "g", "calories": 93, "carbs": 11.0, "protein": 5.3, "fat": 2.6, "use_count": 100000},
    {"food_name": "슬라이스 치즈 (1장)", "serving_size": 20, "serving_unit": "g", "calories": 65, "carbs": 0.5, "protein": 4.0, "fat": 5.0, "use_count": 150000},
    {"food_name": "바나나 우유 (1팩)", "serving_size": 240, "serving_unit": "ml", "calories": 204, "carbs": 36.0, "protein": 6.5, "fat": 4.5, "use_count": 200000},
    {"food_name": "초코 우유 (1팩)", "serving_size": 240, "serving_unit": "ml", "calories": 200, "carbs": 34.0, "protein": 7.0, "fat": 4.5, "use_count": 150000},
    # ── 해산물 ─────────────────────────────────────────────────────────
    {"food_name": "연어 (구운)", "serving_size": 100, "serving_unit": "g", "calories": 208, "carbs": 0.0, "protein": 20.0, "fat": 13.0, "use_count": 200000},
    {"food_name": "참치 통조림", "serving_size": 100, "serving_unit": "g", "calories": 116, "carbs": 0.0, "protein": 25.5, "fat": 1.0, "use_count": 250000},
    {"food_name": "연어회", "serving_size": 100, "serving_unit": "g", "calories": 208, "carbs": 0.0, "protein": 20.0, "fat": 13.0, "use_count": 150000},
    {"food_name": "광어회", "serving_size": 100, "serving_unit": "g", "calories": 94, "carbs": 0.0, "protein": 19.0, "fat": 2.0, "use_count": 100000},
    {"food_name": "참치회", "serving_size": 100, "serving_unit": "g", "calories": 131, "carbs": 0.0, "protein": 23.0, "fat": 4.0, "use_count": 100000},
    {"food_name": "오징어 (구운)", "serving_size": 100, "serving_unit": "g", "calories": 98, "carbs": 0.0, "protein": 17.0, "fat": 2.0, "use_count": 120000},
    {"food_name": "새우 (볶음)", "serving_size": 100, "serving_unit": "g", "calories": 120, "carbs": 2.0, "protein": 22.0, "fat": 3.0, "use_count": 150000},
    {"food_name": "고등어 (구운)", "serving_size": 150, "serving_unit": "g", "calories": 315, "carbs": 0.0, "protein": 30.0, "fat": 21.0, "use_count": 200000},
    {"food_name": "갈치 (구운)", "serving_size": 100, "serving_unit": "g", "calories": 135, "carbs": 0.0, "protein": 18.0, "fat": 7.0, "use_count": 120000},
    {"food_name": "삼치 (구운)", "serving_size": 100, "serving_unit": "g", "calories": 155, "carbs": 0.0, "protein": 20.0, "fat": 8.0, "use_count": 80000},
    {"food_name": "꽃게 (찐)", "serving_size": 200, "serving_unit": "g", "calories": 140, "carbs": 2.0, "protein": 24.0, "fat": 3.0, "use_count": 80000},
    {"food_name": "굴", "serving_size": 100, "serving_unit": "g", "calories": 66, "carbs": 7.0, "protein": 8.0, "fat": 2.0, "use_count": 80000},
    {"food_name": "홍합 (찐)", "serving_size": 100, "serving_unit": "g", "calories": 86, "carbs": 4.0, "protein": 12.0, "fat": 2.0, "use_count": 80000},
    {"food_name": "전복 (구운)", "serving_size": 100, "serving_unit": "g", "calories": 106, "carbs": 5.0, "protein": 20.0, "fat": 1.0, "use_count": 60000},
    # ── 두부/콩 ────────────────────────────────────────────────────────
    {"food_name": "두부", "serving_size": 100, "serving_unit": "g", "calories": 84, "carbs": 2.0, "protein": 8.0, "fat": 4.8, "use_count": 200000},
    {"food_name": "콩나물", "serving_size": 100, "serving_unit": "g", "calories": 30, "carbs": 3.0, "protein": 3.5, "fat": 0.5, "use_count": 150000},
    {"food_name": "검은콩", "serving_size": 100, "serving_unit": "g", "calories": 376, "carbs": 59.0, "protein": 35.0, "fat": 15.0, "use_count": 80000},
    # ── 가공육 ─────────────────────────────────────────────────────────
    {"food_name": "소시지 (프랑크)", "serving_size": 70, "serving_unit": "g", "calories": 202, "carbs": 2.0, "protein": 7.0, "fat": 18.0, "use_count": 200000},
    {"food_name": "베이컨 (팬프라이, 2줄)", "serving_size": 40, "serving_unit": "g", "calories": 216, "carbs": 0.2, "protein": 7.0, "fat": 20.0, "use_count": 150000},
    {"food_name": "햄 (슬라이스, 2장)", "serving_size": 40, "serving_unit": "g", "calories": 72, "carbs": 1.5, "protein": 6.5, "fat": 4.0, "use_count": 150000},
    # ── 일식 ───────────────────────────────────────────────────────────
    {"food_name": "초밥 (1개)", "serving_size": 30, "serving_unit": "g", "calories": 52, "carbs": 9.0, "protein": 3.0, "fat": 0.5, "use_count": 200000},
    {"food_name": "돈가스", "serving_size": 150, "serving_unit": "g", "calories": 430, "carbs": 25.0, "protein": 28.0, "fat": 26.0, "use_count": 200000},
    {"food_name": "라멘", "serving_size": 500, "serving_unit": "g", "calories": 550, "carbs": 72.0, "protein": 22.0, "fat": 18.0, "use_count": 150000},
    {"food_name": "텐동", "serving_size": 400, "serving_unit": "g", "calories": 720, "carbs": 95.0, "protein": 22.0, "fat": 25.0, "use_count": 80000},
    {"food_name": "오야코동", "serving_size": 400, "serving_unit": "g", "calories": 620, "carbs": 72.0, "protein": 28.0, "fat": 20.0, "use_count": 80000},
    {"food_name": "카츠동", "serving_size": 450, "serving_unit": "g", "calories": 750, "carbs": 82.0, "protein": 32.0, "fat": 28.0, "use_count": 80000},
    {"food_name": "미소된장국", "serving_size": 200, "serving_unit": "g", "calories": 40, "carbs": 4.0, "protein": 2.5, "fat": 1.5, "use_count": 100000},
    {"food_name": "타코야키 (6개)", "serving_size": 150, "serving_unit": "g", "calories": 330, "carbs": 38.0, "protein": 12.0, "fat": 14.0, "use_count": 80000},
    # ── 중식 ───────────────────────────────────────────────────────────
    {"food_name": "탕수육", "serving_size": 200, "serving_unit": "g", "calories": 480, "carbs": 40.0, "protein": 22.0, "fat": 24.0, "use_count": 200000},
    {"food_name": "깐풍기", "serving_size": 200, "serving_unit": "g", "calories": 430, "carbs": 22.0, "protein": 30.0, "fat": 24.0, "use_count": 100000},
    {"food_name": "마파두부", "serving_size": 200, "serving_unit": "g", "calories": 240, "carbs": 12.0, "protein": 14.0, "fat": 14.0, "use_count": 80000},
    {"food_name": "고추잡채", "serving_size": 200, "serving_unit": "g", "calories": 350, "carbs": 18.0, "protein": 20.0, "fat": 20.0, "use_count": 80000},
    # ── 양식 ───────────────────────────────────────────────────────────
    {"food_name": "스테이크 (등심, 200g)", "serving_size": 200, "serving_unit": "g", "calories": 480, "carbs": 0.0, "protein": 44.0, "fat": 32.0, "use_count": 100000},
    {"food_name": "시저 샐러드", "serving_size": 200, "serving_unit": "g", "calories": 280, "carbs": 12.0, "protein": 12.0, "fat": 20.0, "use_count": 80000},
    {"food_name": "BLT 샌드위치", "serving_size": 200, "serving_unit": "g", "calories": 430, "carbs": 36.0, "protein": 18.0, "fat": 22.0, "use_count": 80000},
    {"food_name": "클럽 샌드위치", "serving_size": 250, "serving_unit": "g", "calories": 520, "carbs": 42.0, "protein": 28.0, "fat": 24.0, "use_count": 80000},
    {"food_name": "리조또", "serving_size": 350, "serving_unit": "g", "calories": 520, "carbs": 68.0, "protein": 14.0, "fat": 20.0, "use_count": 60000},
    {"food_name": "쌀국수 (퍼)", "serving_size": 500, "serving_unit": "g", "calories": 400, "carbs": 70.0, "protein": 18.0, "fat": 5.0, "use_count": 120000},
    {"food_name": "팟타이", "serving_size": 350, "serving_unit": "g", "calories": 550, "carbs": 65.0, "protein": 22.0, "fat": 22.0, "use_count": 80000},
    # ── 채소 ───────────────────────────────────────────────────────────
    {"food_name": "브로콜리", "serving_size": 100, "serving_unit": "g", "calories": 34, "carbs": 6.6, "protein": 2.8, "fat": 0.4, "use_count": 150000},
    {"food_name": "시금치", "serving_size": 100, "serving_unit": "g", "calories": 23, "carbs": 3.6, "protein": 2.9, "fat": 0.4, "use_count": 120000},
    {"food_name": "당근", "serving_size": 100, "serving_unit": "g", "calories": 41, "carbs": 9.6, "protein": 0.9, "fat": 0.2, "use_count": 120000},
    {"food_name": "오이", "serving_size": 100, "serving_unit": "g", "calories": 15, "carbs": 3.6, "protein": 0.7, "fat": 0.1, "use_count": 100000},
    {"food_name": "토마토", "serving_size": 150, "serving_unit": "g", "calories": 27, "carbs": 5.8, "protein": 1.3, "fat": 0.3, "use_count": 120000},
    {"food_name": "방울토마토 (1개)", "serving_size": 15, "serving_unit": "g", "calories": 3, "carbs": 0.6, "protein": 0.1, "fat": 0.0, "use_count": 100000},
    {"food_name": "양상추 샐러드", "serving_size": 50, "serving_unit": "g", "calories": 9, "carbs": 1.8, "protein": 0.7, "fat": 0.1, "use_count": 150000},
    {"food_name": "혼합 샐러드 (잎채소)", "serving_size": 50, "serving_unit": "g", "calories": 12, "carbs": 1.5, "protein": 1.0, "fat": 0.3, "use_count": 200000},
    {"food_name": "닭가슴살 샐러드", "serving_size": 250, "serving_unit": "g", "calories": 220, "carbs": 10.0, "protein": 30.0, "fat": 7.0, "use_count": 150000},
    {"food_name": "고구마 (구운)", "serving_size": 150, "serving_unit": "g", "calories": 164, "carbs": 38.0, "protein": 2.7, "fat": 0.2, "use_count": 200000},
    {"food_name": "감자 (삶은)", "serving_size": 150, "serving_unit": "g", "calories": 117, "carbs": 26.7, "protein": 2.5, "fat": 0.1, "use_count": 150000},
    {"food_name": "아보카도 (반 개)", "serving_size": 100, "serving_unit": "g", "calories": 160, "carbs": 8.5, "protein": 2.0, "fat": 14.7, "use_count": 100000},
    {"food_name": "버섯 (느타리)", "serving_size": 100, "serving_unit": "g", "calories": 27, "carbs": 5.2, "protein": 2.5, "fat": 0.3, "use_count": 80000},
    {"food_name": "양파 (중)", "serving_size": 200, "serving_unit": "g", "calories": 82, "carbs": 19.0, "protein": 2.2, "fat": 0.2, "use_count": 150000},
    {"food_name": "대파 (반 대)", "serving_size": 50, "serving_unit": "g", "calories": 21, "carbs": 4.8, "protein": 0.9, "fat": 0.1, "use_count": 100000},
    # ── 과일 ───────────────────────────────────────────────────────────
    {"food_name": "바나나 (1개)", "serving_size": 100, "serving_unit": "g", "calories": 89, "carbs": 23.0, "protein": 1.1, "fat": 0.3, "use_count": 300000},
    {"food_name": "사과 (1개)", "serving_size": 200, "serving_unit": "g", "calories": 104, "carbs": 28.0, "protein": 0.5, "fat": 0.3, "use_count": 250000},
    {"food_name": "오렌지 (1개)", "serving_size": 150, "serving_unit": "g", "calories": 71, "carbs": 17.8, "protein": 1.3, "fat": 0.2, "use_count": 200000},
    {"food_name": "포도 (한 송이)", "serving_size": 150, "serving_unit": "g", "calories": 104, "carbs": 27.0, "protein": 1.1, "fat": 0.2, "use_count": 150000},
    {"food_name": "수박 (1조각)", "serving_size": 200, "serving_unit": "g", "calories": 60, "carbs": 15.2, "protein": 1.2, "fat": 0.2, "use_count": 150000},
    {"food_name": "딸기 (5개)", "serving_size": 75, "serving_unit": "g", "calories": 24, "carbs": 5.8, "protein": 0.5, "fat": 0.2, "use_count": 180000},
    {"food_name": "블루베리 (한 줌)", "serving_size": 80, "serving_unit": "g", "calories": 46, "carbs": 11.7, "protein": 0.6, "fat": 0.3, "use_count": 120000},
    {"food_name": "귤 (1개)", "serving_size": 90, "serving_unit": "g", "calories": 47, "carbs": 11.7, "protein": 0.7, "fat": 0.2, "use_count": 150000},
    {"food_name": "키위 (1개)", "serving_size": 100, "serving_unit": "g", "calories": 61, "carbs": 15.0, "protein": 1.1, "fat": 0.5, "use_count": 150000},
    {"food_name": "망고 (1/2개)", "serving_size": 150, "serving_unit": "g", "calories": 99, "carbs": 25.0, "protein": 1.4, "fat": 0.4, "use_count": 100000},
    {"food_name": "배 (1/2개)", "serving_size": 200, "serving_unit": "g", "calories": 104, "carbs": 28.0, "protein": 0.7, "fat": 0.1, "use_count": 120000},
    {"food_name": "복숭아 (1개)", "serving_size": 180, "serving_unit": "g", "calories": 72, "carbs": 18.0, "protein": 1.4, "fat": 0.2, "use_count": 100000},
    {"food_name": "참외 (1/2개)", "serving_size": 200, "serving_unit": "g", "calories": 66, "carbs": 16.0, "protein": 1.4, "fat": 0.2, "use_count": 100000},
    {"food_name": "메론 (1조각)", "serving_size": 200, "serving_unit": "g", "calories": 68, "carbs": 17.0, "protein": 1.0, "fat": 0.2, "use_count": 80000},
    # ── 음료 ───────────────────────────────────────────────────────────
    {"food_name": "아메리카노", "serving_size": 300, "serving_unit": "ml", "calories": 10, "carbs": 0.5, "protein": 0.5, "fat": 0.0, "use_count": 500000},
    {"food_name": "아이스아메리카노", "serving_size": 350, "serving_unit": "ml", "calories": 10, "carbs": 0.5, "protein": 0.5, "fat": 0.0, "use_count": 500000},
    {"food_name": "카페라떼", "serving_size": 300, "serving_unit": "ml", "calories": 150, "carbs": 12.0, "protein": 8.0, "fat": 6.5, "use_count": 350000},
    {"food_name": "카푸치노", "serving_size": 250, "serving_unit": "ml", "calories": 120, "carbs": 10.0, "protein": 7.0, "fat": 5.0, "use_count": 200000},
    {"food_name": "녹차 (1잔)", "serving_size": 200, "serving_unit": "ml", "calories": 2, "carbs": 0.5, "protein": 0.2, "fat": 0.0, "use_count": 200000},
    {"food_name": "오렌지 주스 (1잔)", "serving_size": 200, "serving_unit": "ml", "calories": 90, "carbs": 22.0, "protein": 1.4, "fat": 0.4, "use_count": 200000},
    {"food_name": "콜라 (1캔)", "serving_size": 355, "serving_unit": "ml", "calories": 140, "carbs": 38.0, "protein": 0.0, "fat": 0.0, "use_count": 300000},
    {"food_name": "사이다 (1캔)", "serving_size": 355, "serving_unit": "ml", "calories": 132, "carbs": 35.5, "protein": 0.0, "fat": 0.0, "use_count": 250000},
    {"food_name": "맥주 (1캔)", "serving_size": 355, "serving_unit": "ml", "calories": 154, "carbs": 13.0, "protein": 1.6, "fat": 0.0, "use_count": 250000},
    {"food_name": "소주 (1잔)", "serving_size": 50, "serving_unit": "ml", "calories": 64, "carbs": 0.0, "protein": 0.0, "fat": 0.0, "use_count": 200000},
    {"food_name": "에너지드링크 (1캔)", "serving_size": 250, "serving_unit": "ml", "calories": 113, "carbs": 28.0, "protein": 0.3, "fat": 0.0, "use_count": 150000},
    {"food_name": "이온음료 (1병)", "serving_size": 500, "serving_unit": "ml", "calories": 125, "carbs": 31.0, "protein": 0.0, "fat": 0.0, "use_count": 150000},
    {"food_name": "프로틴 쉐이크 (1팩)", "serving_size": 250, "serving_unit": "ml", "calories": 165, "carbs": 15.0, "protein": 25.0, "fat": 2.0, "use_count": 150000},
    {"food_name": "식혜 (1캔)", "serving_size": 240, "serving_unit": "ml", "calories": 120, "carbs": 29.0, "protein": 1.0, "fat": 0.0, "use_count": 100000},
    {"food_name": "매실차", "serving_size": 200, "serving_unit": "ml", "calories": 60, "carbs": 15.0, "protein": 0.0, "fat": 0.0, "use_count": 100000},
    # ── 스낵/과자 ──────────────────────────────────────────────────────
    {"food_name": "아몬드 (한 줌)", "serving_size": 30, "serving_unit": "g", "calories": 173, "carbs": 6.0, "protein": 6.0, "fat": 15.0, "use_count": 150000},
    {"food_name": "땅콩", "serving_size": 30, "serving_unit": "g", "calories": 171, "carbs": 4.5, "protein": 7.7, "fat": 14.6, "use_count": 100000},
    {"food_name": "감자칩 (1봉)", "serving_size": 55, "serving_unit": "g", "calories": 294, "carbs": 30.0, "protein": 3.5, "fat": 18.0, "use_count": 200000},
    {"food_name": "새우깡 (1봉)", "serving_size": 75, "serving_unit": "g", "calories": 380, "carbs": 50.0, "protein": 6.0, "fat": 17.0, "use_count": 200000},
    {"food_name": "포카칩 (1봉)", "serving_size": 66, "serving_unit": "g", "calories": 354, "carbs": 38.0, "protein": 4.0, "fat": 21.0, "use_count": 180000},
    {"food_name": "오레오 쿠키 (3개)", "serving_size": 33, "serving_unit": "g", "calories": 160, "carbs": 25.0, "protein": 2.0, "fat": 6.0, "use_count": 150000},
    {"food_name": "초콜릿 (1조각)", "serving_size": 40, "serving_unit": "g", "calories": 216, "carbs": 24.0, "protein": 3.0, "fat": 12.0, "use_count": 200000},
    {"food_name": "젤리 (1봉)", "serving_size": 50, "serving_unit": "g", "calories": 140, "carbs": 35.0, "protein": 2.5, "fat": 0.0, "use_count": 100000},
    {"food_name": "프로틴바", "serving_size": 60, "serving_unit": "g", "calories": 220, "carbs": 22.0, "protein": 20.0, "fat": 7.0, "use_count": 100000},
    {"food_name": "오트밀", "serving_size": 40, "serving_unit": "g", "calories": 154, "carbs": 27.0, "protein": 5.4, "fat": 2.7, "use_count": 100000},
    {"food_name": "시리얼 (콘플레이크)", "serving_size": 30, "serving_unit": "g", "calories": 113, "carbs": 25.5, "protein": 2.2, "fat": 0.3, "use_count": 80000},
    {"food_name": "그래놀라", "serving_size": 50, "serving_unit": "g", "calories": 224, "carbs": 33.0, "protein": 5.0, "fat": 8.5, "use_count": 80000},
    # ── 디저트 ─────────────────────────────────────────────────────────
    {"food_name": "케이크 (치즈케이크 1조각)", "serving_size": 100, "serving_unit": "g", "calories": 321, "carbs": 26.0, "protein": 6.0, "fat": 21.0, "use_count": 120000},
    {"food_name": "초코케이크 (1조각)", "serving_size": 100, "serving_unit": "g", "calories": 380, "carbs": 50.0, "protein": 5.0, "fat": 18.0, "use_count": 100000},
    {"food_name": "아이스크림 (바닐라)", "serving_size": 100, "serving_unit": "g", "calories": 207, "carbs": 24.0, "protein": 3.5, "fat": 11.0, "use_count": 200000},
    {"food_name": "마카롱 (1개)", "serving_size": 20, "serving_unit": "g", "calories": 82, "carbs": 13.0, "protein": 1.0, "fat": 3.0, "use_count": 80000},
    {"food_name": "붕어빵 아이스크림", "serving_size": 130, "serving_unit": "ml", "calories": 280, "carbs": 42.0, "protein": 5.0, "fat": 10.0, "use_count": 100000},
    # ── 소스/양념 ──────────────────────────────────────────────────────
    {"food_name": "버터", "serving_size": 10, "serving_unit": "g", "calories": 72, "carbs": 0.0, "protein": 0.1, "fat": 8.0, "use_count": 200000},
    {"food_name": "땅콩버터 (1스푼)", "serving_size": 16, "serving_unit": "g", "calories": 94, "carbs": 3.5, "protein": 4.0, "fat": 8.0, "use_count": 80000},
    {"food_name": "꿀 (1스푼)", "serving_size": 21, "serving_unit": "g", "calories": 64, "carbs": 17.3, "protein": 0.1, "fat": 0.0, "use_count": 100000},
    {"food_name": "올리브유 (1스푼)", "serving_size": 13, "serving_unit": "ml", "calories": 119, "carbs": 0.0, "protein": 0.0, "fat": 13.5, "use_count": 100000},
    {"food_name": "마요네즈 (1스푼)", "serving_size": 15, "serving_unit": "g", "calories": 103, "carbs": 0.4, "protein": 0.2, "fat": 11.5, "use_count": 100000},
    {"food_name": "된장 (1스푼)", "serving_size": 15, "serving_unit": "g", "calories": 28, "carbs": 3.0, "protein": 2.0, "fat": 0.5, "use_count": 150000},
    {"food_name": "고추장 (1스푼)", "serving_size": 15, "serving_unit": "g", "calories": 35, "carbs": 6.0, "protein": 1.0, "fat": 0.5, "use_count": 150000},
    {"food_name": "간장 (1스푼)", "serving_size": 15, "serving_unit": "ml", "calories": 8, "carbs": 1.0, "protein": 1.0, "fat": 0.0, "use_count": 200000},
    {"food_name": "케첩 (1스푼)", "serving_size": 15, "serving_unit": "g", "calories": 20, "carbs": 5.0, "protein": 0.3, "fat": 0.0, "use_count": 100000},
    {"food_name": "설탕 (1스푼)", "serving_size": 12, "serving_unit": "g", "calories": 46, "carbs": 12.0, "protein": 0.0, "fat": 0.0, "use_count": 150000},
    # ── 원재료 ─────────────────────────────────────────────────────────
    {"food_name": "소고기 등심 (생)", "serving_size": 100, "serving_unit": "g", "calories": 213, "carbs": 0.0, "protein": 21.0, "fat": 14.0, "use_count": 100000},
    {"food_name": "돼지고기 삼겹살 (생)", "serving_size": 100, "serving_unit": "g", "calories": 395, "carbs": 0.0, "protein": 18.0, "fat": 35.0, "use_count": 150000},
    {"food_name": "닭가슴살 (생)", "serving_size": 100, "serving_unit": "g", "calories": 109, "carbs": 0.0, "protein": 23.0, "fat": 1.2, "use_count": 200000},
    {"food_name": "계란 (1개)", "serving_size": 60, "serving_unit": "g", "calories": 90, "carbs": 0.6, "protein": 7.7, "fat": 6.3, "use_count": 400000},
    {"food_name": "마늘 (5쪽)", "serving_size": 25, "serving_unit": "g", "calories": 33, "carbs": 7.4, "protein": 1.6, "fat": 0.1, "use_count": 100000},
    {"food_name": "베이크드 빈스", "serving_size": 100, "serving_unit": "g", "calories": 73, "carbs": 13.5, "protein": 4.8, "fat": 0.5, "use_count": 50000},
]


async def seed():
    import os
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./dev.db")
    if not DATABASE_URL.startswith("sqlite"):
        DATABASE_URL = "sqlite+aiosqlite:///./dev.db"
    print(f"DB: {DATABASE_URL}")
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # 기존 테이블에 새 컬럼 추가 (없으면 추가, 이미 있으면 무시)
        for sql in [
            "ALTER TABLE food_items ADD COLUMN brand_name VARCHAR(100)",
            "ALTER TABLE food_items ADD COLUMN serving_unit VARCHAR(10) DEFAULT 'g' NOT NULL",
            "ALTER TABLE food_items ADD COLUMN source VARCHAR(20) DEFAULT 'system' NOT NULL",
            "ALTER TABLE food_items ADD COLUMN created_by VARCHAR(36)",
            "ALTER TABLE food_items ADD COLUMN is_public BOOLEAN DEFAULT 1 NOT NULL",
            "ALTER TABLE food_items ADD COLUMN use_count INTEGER DEFAULT 0 NOT NULL",
        ]:
            try:
                await conn.execute(text(sql))
            except Exception:
                pass

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        added = 0
        for food_data in SEED_FOODS:
            # 이미 존재하는지 체크
            result = await session.execute(
                select(FoodItem).where(
                    FoodItem.food_name == food_data["food_name"],
                    FoodItem.source == 'system'
                )
            )
            if result.scalar_one_or_none():
                continue

            item = FoodItem(
                food_name=food_data["food_name"],
                serving_size=food_data["serving_size"],
                serving_unit=food_data.get("serving_unit", "g"),
                calories=food_data["calories"],
                carbs=food_data["carbs"],
                protein=food_data["protein"],
                fat=food_data["fat"],
                source="system",
                is_public=True,
                use_count=food_data.get("use_count", 0),
            )
            session.add(item)
            added += 1

        await session.commit()
        print(f"시딩 완료: {added}개 음식 추가됨")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
