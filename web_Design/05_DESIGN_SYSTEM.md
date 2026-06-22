# 먹로그 — 디자인 시스템 완전 명세

> **Claude Code 작업 지시 문서 #5**
> 이 문서는 먹로그의 모든 시각 언어를 정의합니다.
> 코드 작성 시 이 문서에서 정의한 토큰 이외의 색상·폰트·여백을 임의로 사용하지 마세요.
> 이 시스템은 **Clay 디자인 시스템**을 기반으로, 먹로그의 맥락에 맞게 전면 재구성되었습니다.

---

## 0. 디자인 철학 (Design Philosophy)

### 핵심 원칙 세 가지

**1. 배경은 비운다, 색은 덩어리로만 쓴다**
앱 전체 배경은 따뜻한 오프화이트(`#f9f6f1`) 단일 컬러로 완전히 비워둔다.
포인트 색상은 카드 배경, 뱃지, 진행바, 아이콘 배경처럼 명확한 '덩어리' 단위에만 쓴다.
배경 자체에 그라디언트나 패턴을 쓰지 않는다.

**2. 차분함과 다채로움은 비율로 만든다**
오프화이트 70% + 흰 카드 20% + 포인트 컬러 10% 비율을 유지한다.
포인트 컬러가 10%를 넘으면 앱이 시끄러워진다.
같은 포인트 컬러가 인접 카드에 연속으로 나타나지 않도록 한다.

**3. 감정은 폰트로, 데이터는 폰트로 분리한다**
케리스 케듀체(KERIS KEDU) = 사람·소통·감정 레이어
나눔명조(Nanum Myeongjo) = 수치·데이터·정보 레이어
이 두 폰트 외 다른 폰트는 절대 사용하지 않는다.

---

## 1. 색상 시스템 (Color System)

### 1.1 기반 색상 (Foundation Colors)

```
canvas          #f9f6f1   앱 전체 배경. 따뜻한 오프화이트. 이 색이 앱의 '공기'다.
surface-card    #ffffff   카드 내부 배경. 캔버스와 분리감을 준다.
surface-soft    #f2ede4   섹션 구분용 약간 어두운 배경. 헤더, CTA 배너에 사용.
surface-strong  #e8e2d6   강조 구분이 필요한 배경. 선택된 상태 등.
hairline        #e0d8cc   카드 테두리, 구분선. 1px에 사용.
hairline-soft   #ece7dd   더 연한 구분선. 내부 섹션 분리.
```

### 1.2 포인트 컬러 (Accent Colors)

> 이 색상들은 서울시청 건축 패널 + 도시 일러스트 이미지에서 추출한 "공공 일러스트 감성" 팔레트다.
> 선명하되 탁하지 않고, 여럿이 함께 있어도 충돌하지 않는다.

```
accent-cobalt       #5058f0   코발트 블루.    그룹 피드 카드, 비교 바 그래프, 링크
accent-sage         #70b080   세이지 그린.    목표 달성, 균형 식단, 단백질 수치
accent-teal         #90c0c0   소프트 틸.      그룹 코드 뱃지, 음료 카테고리
accent-peach        #ffb084   피치 오렌지.    주 행동 버튼, 카메라 탭, 음식 카드 보더
accent-lavender     #c0c0f0   연 라벤더.      AI 분석 카드 배경, 로딩 상태
accent-ochre        #e8b94a   황토색.         칼로리 경고(80~100%), 탄수화물 강조
accent-coral        #e85d4a   코랄 레드.      칼로리 초과, 지방 높음, 경고 메시지
```

### 1.3 텍스트 색상 (Text Colors)

```
ink             #1a1a1a   최우선 텍스트. 타이틀, 강조 본문.
body            #3a3a3a   기본 본문 텍스트.
muted           #6a6a6a   보조 설명, 라벨, 날짜.
muted-soft      #9a9a9a   플레이스홀더, 비활성 텍스트.
on-accent       #ffffff   포인트 컬러 배경 위 텍스트 (cobalt, coral 위에 사용).
on-light-accent #1a1a1a   연한 포인트 컬러 배경 위 텍스트 (lavender, sage, ochre 위에 사용).
```

### 1.4 시맨틱 색상 (Semantic Colors)

```
success         #70b080   성공 상태. accent-sage와 동일 계열.
warning         #e8b94a   경고 상태. accent-ochre와 동일 계열.
error           #e85d4a   오류 상태. accent-coral과 동일 계열.
info            #5058f0   정보 상태. accent-cobalt와 동일 계열.
```

### 1.5 색상 사용 규칙 (Color Usage Rules)

```
규칙 1. 캔버스 (#f9f6f1)는 절대 다른 색으로 바꾸지 않는다.
규칙 2. 포인트 컬러 7종 중 같은 색이 인접 카드에 연속 사용되면 안 된다.
         cobalt 카드 → (흰 카드 또는 여백) → sage 카드 ✅
         cobalt 카드 → cobalt 카드 ❌
규칙 3. 카드 배경에 포인트 컬러를 쓸 때 그라디언트나 혼합은 금지. 단색만.
규칙 4. 텍스트 색상을 포인트 컬러로 쓰지 않는다.
         (예외: 링크 텍스트에 accent-cobalt 사용 가능)
규칙 5. 다크 모드는 이 시스템의 범위 밖이다. 구현하지 않는다.
```

### 1.6 Tailwind CSS 설정 (tailwind.config.ts)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas:           '#f9f6f1',
        'surface-card':   '#ffffff',
        'surface-soft':   '#f2ede4',
        'surface-strong': '#e8e2d6',
        hairline:         '#e0d8cc',
        'hairline-soft':  '#ece7dd',
        cobalt:           '#5058f0',
        sage:             '#70b080',
        teal:             '#90c0c0',
        peach:            '#ffb084',
        lavender:         '#c0c0f0',
        ochre:            '#e8b94a',
        coral:            '#e85d4a',
        ink:              '#1a1a1a',
        body:             '#3a3a3a',
        muted:            '#6a6a6a',
        'muted-soft':     '#9a9a9a',
      },
      borderRadius: {
        xs:   '6px',
        sm:   '8px',
        md:   '12px',
        lg:   '16px',
        xl:   '24px',
        pill: '9999px',
      },
      spacing: {
        xxs:     '4px',
        xs:      '8px',
        sm:      '12px',
        md:      '16px',
        lg:      '24px',
        xl:      '32px',
        xxl:     '48px',
        section: '80px',
      },
      fontFamily: {
        kedu:   ['KERIS-KEDU', 'sans-serif'],
        myeong: ['Nanum-Myeongjo', 'serif'],
        jalnan: ['Jalnan', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 2. 타이포그래피 시스템 (Typography System)

### 2.1 폰트 패밀리 정의

> ⚠️ 아래 세 폰트 외 다른 어떤 폰트도 사용하지 않는다.
> system-ui, sans-serif 등 시스템 폰트는 해당 폰트 로드 실패 시 fallback으로만 허용한다.

#### 폰트 A — 케리스 케듀체 (KERIS KEDU)
**역할: 감정 레이어 (Emotional Layer)**
앱의 "목소리"이자 브랜드 아이덴티티.
사람 이름, 그룹명, 앱 타이틀, 버튼, 탭 레이블, 댓글처럼
사람과 직접 연결된 텍스트에 사용.

```
파일 목록:
  KERISKEDU_B.ttf    / KERISKEDU_B.otf     → font-weight: 700  (Bold)
  KERISKEDU_R.ttf    / KERISKEDU_R.otf     → font-weight: 400  (Regular)
  KERISKEDU_Line.ttf / KERISKEDU_Line.otf  → font-weight: 300  (Line/Thin)

CSS font-family 이름: 'KERIS-KEDU'
Tailwind 클래스:      font-kedu
```

#### 폰트 B — 나눔명조 (Nanum Myeongjo)
**역할: 데이터 레이어 (Data Layer)**
숫자, 칼로리, 영양소 수치, 날짜, 음식명 테이블처럼
정보를 정확하게 전달해야 하는 텍스트에 사용.
삐침(세리프)이 수치의 신뢰감을 높인다.

```
파일 목록:
  NanumMyeongjo.ttf          / NanumMyeongjo.otf          → font-weight: 400  (Regular)
  NanumMyeongjoBold.ttf      / NanumMyeongjoBold.otf      → font-weight: 700  (Bold)
  NanumMyeongjoExtraBold.ttf / NanumMyeongjoExtraBold.otf → font-weight: 800  (ExtraBold)

CSS font-family 이름: 'Nanum-Myeongjo'
Tailwind 클래스:      font-myeong
```

#### 폰트 C — 잘난체 (Jalnan)
**역할: 네비게이션 레이어 (Navigation Layer)**
날짜 네비게이션 텍스트처럼 가볍고 귀여운 톤이 필요한 UI 요소에만 제한적으로 사용.

```
파일 목록:
  Jalnan2TTF.ttf → font-weight: 400

CSS font-family 이름: 'Jalnan'
Tailwind 클래스:      font-jalnan

사용처: 날짜 네비게이션 표시 텍스트 (로그·분석·비교·그룹 상세 페이지)
```

### 2.2 @font-face 선언 (app/globals.css)

```css
/* ── 케리스 케듀체 ── */
@font-face {
  font-family: 'KERIS-KEDU';
  src: url('/fonts/KERISKEDU_B.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'KERIS-KEDU';
  src: url('/fonts/KERISKEDU_R.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'KERIS-KEDU';
  src: url('/fonts/KERISKEDU_Line.ttf') format('truetype');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}

/* ── 나눔명조 ── */
@font-face {
  font-family: 'Nanum-Myeongjo';
  src: url('/fonts/NanumMyeongjo.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Nanum-Myeongjo';
  src: url('/fonts/NanumMyeongjoBold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Nanum-Myeongjo';
  src: url('/fonts/NanumMyeongjoExtraBold.ttf') format('truetype');
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}

/* ── 전역 기본값 ── */
html, body {
  background-color: #f9f6f1;
  color: #1a1a1a;
}
```

**폰트 파일 배치 위치:** `/public/fonts/` 에 .ttf 파일 복사

```
public/
└── fonts/
    ├── KERISKEDU_B.ttf
    ├── KERISKEDU_R.ttf
    ├── KERISKEDU_Line.ttf
    ├── NanumMyeongjo.ttf
    ├── NanumMyeongjoBold.ttf
    └── NanumMyeongjoExtraBold.ttf
```

### 2.3 타이포그래피 토큰

#### 케리스 케듀체 토큰 (감정 레이어)

| 토큰명 | 크기 | 굵기 | 줄높이 | 자간 | 사용처 |
|--------|------|------|--------|------|--------|
| `app-title` | 28px | 700 | 1.1 | -0.5px | 앱 타이틀 "먹로그" |
| `display-lg` | 24px | 700 | 1.2 | -0.3px | 탭 헤더, 섹션 제목 |
| `display-md` | 20px | 700 | 1.25 | 0 | 카드 제목, 그룹명 |
| `display-sm` | 17px | 700 | 1.3 | 0 | 소카드 제목, 강조 레이블 |
| `ui-button` | 15px | 700 | 1.0 | 0 | 버튼 텍스트 전체 |
| `ui-tab` | 11px | 400 | 1.0 | 0 | 하단 탭 바 레이블 |
| `ui-category` | 13px | 400 | 1.0 | 0 | 아침/점심/저녁/간식 태그 |
| `social-name` | 14px | 700 | 1.3 | 0 | 그룹 피드 사용자 이름 |
| `social-comment` | 13px | 400 | 1.5 | 0 | 댓글 내용, 채팅 메시지 |
| `empty-state` | 15px | 400 | 1.5 | 0 | 빈 화면 안내 문구 |
| `badge-label` | 11px | 700 | 1.0 | 0.5px | 뱃지, 태그 텍스트 |

#### 나눔명조 토큰 (데이터 레이어)

| 토큰명 | 크기 | 굵기 | 줄높이 | 자간 | 사용처 |
|--------|------|------|--------|------|--------|
| `data-xl` | 32px | 800 | 1.0 | -1px | 하루 총 칼로리 숫자 |
| `data-lg` | 24px | 700 | 1.1 | -0.5px | 섭취량 큰 수치, 1위 칼로리 |
| `data-md` | 18px | 700 | 1.2 | 0 | 끼니별 칼로리, 목표 칼로리 |
| `data-sm` | 15px | 400 | 1.4 | 0 | 음식명, 영양소 수치 (g) |
| `data-xs` | 13px | 400 | 1.4 | 0 | 테이블 보조 수치 |
| `data-unit` | 12px | 400 | 1.0 | 0 | kcal, g 단위 텍스트 |
| `data-date` | 13px | 400 | 1.3 | 0 | 날짜 (2026.05.24) |
| `data-caption` | 11px | 400 | 1.4 | 0 | AI 신뢰도, 미세 부연 |
| `data-label` | 11px | 700 | 1.0 | 1px | 탄수화물/단백질/지방 레이블 |

### 2.4 폰트 결정 트리 (판단 기준)

```
이 텍스트가 사람·감정·행동과 연결되어 있나?
  ├─ YES → 케리스 케듀체 (font-kedu)
  │         이름, 댓글, 그룹명, 버튼, 안내문, 탭 레이블
  │
  └─ NO  → 나눔명조 (font-myeong)
            숫자, 날짜, 단위, 음식명, 영양소, 테이블

실제 예시:
  "1,540"       → font-myeong font-extrabold text-3xl   (data-xl)
  "kcal"        → font-myeong font-normal text-xs       (data-unit)
  "오늘 목표의"  → font-kedu font-normal text-sm        (empty-state)
  "70%"         → font-myeong font-bold text-lg         (data-md)
  "민수"         → font-kedu font-bold text-sm          (social-name)
  "점심"         → font-kedu font-normal text-xs        (ui-category)
  "720 kcal"    → font-myeong font-bold text-base       (data-md)
  "맛있겠다 ㅠㅠ" → font-kedu font-normal text-xs       (social-comment)
  "저장하기"     → font-kedu font-bold text-sm          (ui-button)
  "2026.05.24"  → font-myeong font-normal text-xs       (data-date)
```

---

## 3. 간격 시스템 (Spacing)

기본 단위 4px. 이 배수 이외의 임의 값을 쓰지 않는다.

```
4px   xxs   아이콘 내부 패딩, 뱃지 최소 여백
8px   xs    인라인 요소 간 간격
12px  sm    작은 카드 내부 패딩
16px  md    기본 카드 내부 패딩 ← 가장 많이 사용
24px  lg    카드 간 간격, 중형 카드 패딩
32px  xl    대형 카드 패딩
48px  xxl   섹션 간 여백
80px  section  탭 콘텐츠 최상단/최하단
```

---

## 4. 모서리 반지름 (Border Radius)

```
6px    xs    작은 뱃지, 드롭다운 항목
8px    sm    소형 버튼, 인라인 태그
12px   md    입력창, 보조 버튼
16px   lg    일반 카드 (음식 카드, 댓글 영역)
24px   xl    강조 카드 (포인트 컬러 카드, 그룹 피드 카드)
9999px pill  카테고리 탭, 태그 뱃지, 이모지 반응 버튼
9999px full  아바타, 프로필 이미지
```

---

## 5. 컴포넌트 명세 (Components)

### 5.1 앱 전체 레이아웃

```
앱 배경:              #f9f6f1 (canvas)
하단 탭 바 높이:       64px + safe-area-inset-bottom
하단 탭 바 배경:       #ffffff (surface-card)
하단 탭 바 상단 보더:  1px hairline (#e0d8cc)
콘텐츠 하단 패딩:      80px (탭 바 영역 확보)
콘텐츠 상단 패딩:      16px
좌우 기본 패딩:        16px
```

### 5.2 하단 탭 바 (BottomTabBar)

```
높이:       64px
배경:       #ffffff
상단 보더:  1px  #e0d8cc
아이콘:     22px  Lucide icons
레이블:     font-kedu  400  11px  (ui-tab)
활성 색:    cobalt (#5058f0)  — 아이콘 + 레이블 모두
비활성 색:  muted (#6a6a6a)
탭 항목:    카메라 | 로그 | 분석 | 그룹 | 비교
```

### 5.3 음식 사진 카드 (MealCard)

```
배경:          #ffffff
보더:          1.5px  peach (#ffb084)
모서리:        24px (rounded-xl)
내부 패딩:     16px
그림자:        없음

사진 영역:     width 100%  aspect-ratio 4:3  rounded-lg (16px)
사용자 이름:   font-kedu 700 14px (social-name)   ink
카테고리 태그: font-kedu 400 13px (ui-category)   muted
칼로리:        font-myeong 700 18px (data-md)      ink
시간:          font-myeong 400 12px (data-date)    muted-soft
```

### 5.4 포인트 컬러 카드 (AccentCard)

```
배경:       포인트 컬러 단색 (그라디언트 금지)
보더:       없음
모서리:     24px (rounded-xl)
내부 패딩:  20px

상황별 배경색:
  AI 분석 중 / 결과   → lavender  (#c0c0f0)   텍스트: ink (#1a1a1a)
  목표 달성 완료      → sage      (#70b080)   텍스트: #ffffff
  칼로리 경고 80~99%  → ochre     (#e8b94a)   텍스트: ink (#1a1a1a)
  칼로리 초과 100%+   → coral     (#e85d4a)   텍스트: #ffffff
  그룹 피드 헤더      → cobalt    (#5058f0)   텍스트: #ffffff
  그룹 순위 1위       → cobalt    (#5058f0)   텍스트: #ffffff
  음료 카테고리       → teal      (#90c0c0)   텍스트: ink (#1a1a1a)
```

### 5.5 버튼 (Button)

#### Primary Button
```
배경:           peach (#ffb084)
텍스트:         ink (#1a1a1a)   ← on-accent 흰색 아님 (대비율 이슈)
폰트:           font-kedu  700  15px
모서리:         12px (rounded-md)
패딩:           12px 24px
높이:           48px
비활성 배경:    hairline (#e0d8cc)
비활성 텍스트:  muted (#6a6a6a)
사용처:         저장하기, 분석 시작, 로그인, 그룹 참여
```

#### Secondary Button
```
배경:    #ffffff
텍스트:  ink (#1a1a1a)
보더:    1px  hairline (#e0d8cc)
폰트:    font-kedu  700  15px
모서리:  12px
높이:    48px
사용처:  취소, 뒤로가기, 수정하기
```

#### Danger Button
```
배경:    coral (#e85d4a)
텍스트:  #ffffff
폰트:    font-kedu  700  15px
모서리:  12px
높이:    48px
사용처:  삭제, 그룹 탈퇴
```

#### Text Link Button
```
배경:    없음 (transparent)
텍스트:  cobalt (#5058f0)
폰트:    font-kedu  400  14px
사용처:  인라인 링크, "자세히 보기", "수정"
```

### 5.6 입력창 (TextInput)

```
배경:           #ffffff
보더:           1px  hairline (#e0d8cc)
포커스 보더:    2px  cobalt (#5058f0)
모서리:         12px (rounded-md)
패딩:           12px 16px
높이:           48px
본문 폰트:      font-kedu  400  15px   ink
플레이스홀더:   font-myeong 400 14px   muted-soft (#9a9a9a)
```

### 5.7 카테고리 탭 (CategoryTab)

```
비활성 배경:    투명
비활성 텍스트:  muted (#6a6a6a)
비활성 보더:    1px  hairline (#e0d8cc)
활성 배경:      peach (#ffb084)
활성 텍스트:    ink (#1a1a1a)
활성 보더:      없음
폰트:           font-kedu  400  13px  (ui-category)
모서리:         9999px (pill)
패딩:           8px 16px
높이:           36px
```

### 5.8 뱃지 (Badge)

```
폰트:     font-kedu  700  11px  uppercase  자간 0.5px
모서리:   9999px (pill)
패딩:     4px 10px

종류별:
  AI 뱃지      → lavender 배경  font-myeong 텍스트
  달성 뱃지    → sage 배경      font-kedu 텍스트  흰색
  그룹코드 뱃지 → teal 배경     font-myeong 텍스트
  경고 뱃지    → ochre 배경     font-kedu 텍스트
```

### 5.9 진행 바 (ProgressBar)

```
트랙 배경:   surface-strong (#e8e2d6)
트랙 높이:   8px
트랙 모서리: 9999px (pill)

달성률별 진행 색:
  0 ~ 79%    sage   (#70b080)   건강한 페이스
  80 ~ 99%   ochre  (#e8b94a)   목표 근접
  100 ~ 109% cobalt (#5058f0)   목표 달성
  110% +     coral  (#e85d4a)   초과 주의

수치:  font-myeong  700  14px  (data-sm)
레이블: font-myeong  700  11px  uppercase  1px 자간  (data-label)
```

### 5.10 이모티콘 반응 버튼 (ReactionButton)

```
비활성 배경:  surface-soft (#f2ede4)
활성 배경:    peach (#ffb084) 20% opacity
모서리:       9999px (pill)
패딩:         6px 10px
이모지:       16px
숫자:         font-myeong  400  12px  (data-xs)
종류:         👍 😋 🔥 💪 😭
```

### 5.11 아바타 (Avatar)

```
모서리:    9999px (full, 완전한 원형)
크기:
  xs  24px   댓글, 채팅 메시지
  sm  32px   그룹 피드 카드
  md  40px   그룹 멤버 목록
  lg  56px   프로필 페이지
보더:  2px  canvas (#f9f6f1)  (아바타 겹칠 때 구분용)
```

### 5.12 칼로리 수치 표시 조합 (CalorieDisplay)

폰트 혼합의 핵심 패턴. 이 패턴을 반복 사용한다.

```tsx
<div className="flex items-baseline gap-1">
  <span className="font-myeong font-extrabold text-3xl text-ink">
    1,540
  </span>
  <span className="font-myeong font-normal text-xs text-muted">
    kcal
  </span>
</div>
<p className="font-kedu font-normal text-sm text-muted mt-1">
  오늘 목표의 70%
</p>
```

### 5.13 영양 테이블 행 (NutritionRow)

```tsx
<div className="flex items-center justify-between py-2 border-b border-hairline-soft">
  <span className="font-myeong text-sm text-ink">
    흰쌀밥
  </span>
  <div className="flex gap-3 text-right">
    <span className="font-myeong font-bold text-sm text-ink w-16">
      260 kcal
    </span>
    <span className="font-myeong text-xs text-muted w-10">탄 56g</span>
    <span className="font-myeong text-xs text-muted w-10">단 5g</span>
    <span className="font-myeong text-xs text-muted w-10">지 0.6g</span>
  </div>
</div>
```

---

## 6. 화면별 적용 요약

### 카메라 탭
```
배경:           canvas
업로드 영역:     surface-card  +  1.5px peach 보더
카테고리 탭:    기본 hairline 보더 / 활성 peach 배경
분석 중 카드:   lavender 배경 AccentCard
분석 결과 카드: surface-card  +  hairline 보더
저장 버튼:      peach 배경  font-kedu Bold
```

### 로그 탭
```
배경:           canvas
날짜 네비:      font-kedu Bold 24px (display-lg)
식사 카드:      surface-card  +  peach 보더  +  rounded-xl
총 칼로리:      font-myeong ExtraBold 32px (data-xl)
진행 바:        달성률 동적 색상
끼니 없음:      font-kedu Regular (empty-state)
```

### 분석 탭
```
배경:           canvas
BMI 카드:       surface-card  +  hairline 보더
목표 카드:      달성률 기반 AccentCard (sage / ochre / cobalt / coral)
탄단지 차트:    ochre(탄) / sage(단) / coral(지)
모든 수치:      font-myeong
모든 레이블:    font-myeong Bold uppercase
```

### 그룹 탭
```
배경:           canvas
헤더 배너:      cobalt 배경 AccentCard
피드 카드:      surface-card  +  peach 보더  +  rounded-xl
사용자 이름:    font-kedu Bold (social-name)
칼로리 수치:    font-myeong Bold (data-md)
댓글:           font-kedu Regular (social-comment)
이모지 반응:    surface-soft 배경 pill
```

### 비교 탭
```
배경:           canvas
1위 카드:       cobalt 배경 AccentCard
2·3위 카드:     surface-card  +  hairline 보더
순위 숫자:      font-myeong ExtraBold (data-xl)
사용자 이름:    font-kedu Bold (social-name)
달성률 수치:    font-myeong Bold (data-md)  동적 색상
바 그래프:      달성률 동적 포인트 컬러
```

---

## 7. 접근성 (Accessibility)

WCAG AA 기준 대비율 확인.

```
ink (#1a1a1a)     위  canvas (#f9f6f1)      → ~16:1   AAA ✅
ink (#1a1a1a)     위  #ffffff               → ~18:1   AAA ✅
#ffffff           위  cobalt (#5058f0)      → ~5.2:1  AA  ✅
#ffffff           위  coral  (#e85d4a)      → ~4.6:1  AA  ✅
ink (#1a1a1a)     위  lavender (#c0c0f0)    → ~7.1:1  AAA ✅
ink (#1a1a1a)     위  ochre    (#e8b94a)    → ~5.8:1  AA  ✅
ink (#1a1a1a)     위  sage     (#70b080)    → ~4.5:1  AA  ✅
ink (#1a1a1a)     위  peach    (#ffb084)    → ~4.1:1  AA  ✅  (버튼 텍스트 ink 사용 근거)
```

---

## 8. CSS 변수 전체 선언 (app/globals.css)

```css
:root {
  /* Foundation */
  --color-canvas:          #f9f6f1;
  --color-surface-card:    #ffffff;
  --color-surface-soft:    #f2ede4;
  --color-surface-strong:  #e8e2d6;
  --color-hairline:        #e0d8cc;
  --color-hairline-soft:   #ece7dd;

  /* Accent */
  --color-cobalt:    #5058f0;
  --color-sage:      #70b080;
  --color-teal:      #90c0c0;
  --color-peach:     #ffb084;
  --color-lavender:  #c0c0f0;
  --color-ochre:     #e8b94a;
  --color-coral:     #e85d4a;

  /* Text */
  --color-ink:          #1a1a1a;
  --color-body:         #3a3a3a;
  --color-muted:        #6a6a6a;
  --color-muted-soft:   #9a9a9a;
  --color-on-accent:    #ffffff;
  --color-on-light:     #1a1a1a;

  /* Semantic */
  --color-success: #70b080;
  --color-warning: #e8b94a;
  --color-error:   #e85d4a;
  --color-info:    #5058f0;

  /* Radius */
  --radius-xs:   6px;
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-pill: 9999px;

  /* Spacing */
  --space-xxs:     4px;
  --space-xs:      8px;
  --space-sm:      12px;
  --space-md:      16px;
  --space-lg:      24px;
  --space-xl:      32px;
  --space-xxl:     48px;
  --space-section: 80px;
}
```

---

## 9. 애니메이션 유틸 클래스 (app/globals.css)

```css
/* GPU 컴포지팅 최적화 — will-change 포함 */
.animate-float-slow  { animation: floatSlow  3.5s ease-in-out infinite; will-change: transform; }
.animate-float-med   { animation: floatMed   2.8s ease-in-out infinite; will-change: transform; }
.animate-pulse-ring  { animation: pulseRing  1.6s ease-out   infinite; will-change: transform, opacity; }
.animate-bounce-dot  { animation: bounceDot  1.2s ease-in-out infinite; will-change: transform; }
.animate-spin-slow   { animation: spinSlow   8s linear       infinite; will-change: transform; }
.animate-fade-slide-up { animation: fadeSlideUp 0.4s ease both; }
.animate-scale-in    { animation: scaleIn    0.3s ease both; }
.animate-scan-line   { animation: scanLine   2.2s ease-in-out infinite; }
.animate-shimmer-fill { animation: shimmerFill 1.8s ease-in-out infinite; }

/* 이모지 플로팅 (리액션 클릭 시 인스타 라이브 스타일) */
/* CSS 변수 --emoji-drift로 랜덤 좌우 drift 제어 */
.animate-float-emoji { animation: floatEmojiUp 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; will-change: transform, opacity; }

/* 지연 단계별 클래스 */
.stagger-1 { animation-delay: 0.05s; }
.stagger-2 { animation-delay: 0.10s; }
.stagger-3 { animation-delay: 0.15s; }
.stagger-4 { animation-delay: 0.20s; }
.stagger-5 { animation-delay: 0.25s; }
```

**이모지 궤도 애니메이션 규칙:** `floatSlow` 키프레임은 `transform`을 직접 변경하므로,
위치 지정(translate -50%/-50%)과 같은 `transform`이 동일 요소에 있으면 충돌한다.
반드시 **두 div 분리 패턴**을 사용한다:
- 외부 div: `transform: translate(-50%, -50%)` 위치 지정만
- 내부 div: `animation: floatSlow` 애니메이션만

```css
/* 브라우저 기본 비밀번호 눈 버튼 제거 */
input[type="password"]::-ms-reveal,
input[type="password"]::-ms-clear { display: none !important; }
```

---

## 10. 개발자 모드 오버레이 (DevSidebar)

DevSidebar는 프로덕션 UI와 완전히 분리된 개발자 전용 오버레이이다.
**기존 디자인 시스템 색상 규칙(캔버스, 포인트 컬러 연속 금지 등)이 적용되지 않는다.**
DevSidebar 내부에서는 아래 별도 팔레트를 사용한다.

### 10.1 DevSidebar 색상 팔레트

```
dev-bg-header    #5058f0   cobalt — 사이드바 헤더, 탭 활성 바
dev-bg-body      #ffffff   surface-card — 탭 콘텐츠 본문 배경
dev-tab-active   #c0c0f0   lavender — 활성 탭 배경
dev-tab-idle     #e8e2d6   surface-strong — 비활성 탭 배경
dev-row-even     #f9f6f1   canvas — 짝수 행 배경 (가독성)
dev-border       #e0d8cc   hairline — 행 구분선

로그 상태코드 색:
  2xx  →  sage    #70b080
  3xx  →  teal    #90c0c0
  4xx  →  ochre   #e8b94a
  5xx  →  coral   #e85d4a

에러 타입 색:
  runtime  →  coral   #e85d4a
  promise  →  ochre   #e8b94a
  console  →  muted   #6a6a6a
```

### 10.2 DevSidebar 레이아웃 명세

```
위치:       position: fixed; right: 0; top: 0; height: 100vh
기본 너비:  360px  (드래그로 220px ~ 800px 조절)
z-index:    9999
배경:       헤더 cobalt / 본문 surface-card

헤더 영역 (48px):
  - 좌: "먹로그 Dev" 텍스트  font-kedu 700 14px  on-accent
  - 중: 탭 버튼 (에러 / 네트워크 / AI / 기타)
  - 우: × 닫기 버튼

탭 버튼:
  활성:    lavender 배경  ink 텍스트  font-kedu 400 12px
  비활성:  투명 배경       on-accent 텍스트

본문 영역:
  에러 콘솔 탭:    ErrorLog 목록 (type 뱃지 + message + timestamp)
  네트워크 탭:     ApiLog 목록 (method 뱃지 + URL + status + ms)
  AI 분석 탭:     AiDebug 카드 (STEP1/2/3 펼침 섹션)
  기타 탭:        페이지 정보 + 인증 상태 + 색상 팔레트 미리보기

리사이즈 핸들:
  좌측 4px 영역, cursor: ew-resize
```

### 10.3 DevSidebar 접근 방법

```
1. Ctrl + F11 → 비밀번호 입력 모달 (비밀번호: 별도 관리)
2. 인증 성공 → 우측 상단에 "Dev" 토글 버튼 노출
3. 버튼 클릭 또는 Ctrl+F11 재입력 → 사이드바 열림/닫힘
4. 유틸 탭 → [개발자 모드 켜기/끄기] 토글 버튼
```

---

## 11. 절대 금지 사항 (DO NOT)

```
❌  KERIS-KEDU, Nanum-Myeongjo, Jalnan 외 다른 폰트 사용
❌  배경색 canvas (#f9f6f1) 변경
❌  포인트 컬러에 그라디언트 적용
❌  같은 포인트 컬러 카드를 바로 인접하여 연속 배치
❌  카드에 box-shadow 강하게 적용 (시스템은 그림자 최소화)
❌  포인트 컬러를 본문 텍스트 색으로 사용 (cobalt 링크 제외)
❌  font-weight 토큰 외 임의 값 지정
❌  색상 hex 값 인라인 직접 작성 (반드시 Tailwind 클래스 사용)
❌  다크 모드 구현 (이 시스템 범위 밖)
❌  임의 간격 값 사용 (4px 배수 토큰만 허용)
```

---

## 12. 빠른 참조 (Quick Reference)

```
상황                        폰트                    색상
─────────────────────────────────────────────────────────
앱 타이틀 "먹로그"           font-kedu 700 28px      ink
탭 헤더                     font-kedu 700 24px      ink
카드 제목                   font-kedu 700 20px      ink
버튼 텍스트                 font-kedu 700 15px      ink
탭 레이블                   font-kedu 400 11px      muted / cobalt(활성)
카테고리 태그               font-kedu 400 13px      muted / ink(활성)
사용자 이름                 font-kedu 700 14px      ink
댓글 / 채팅                font-kedu 400 13px      body
빈 화면 안내                font-kedu 400 15px      muted

하루 총 칼로리 숫자          font-myeong 800 32px    ink
끼니별 칼로리               font-myeong 700 18px    ink
단위 (kcal, g)              font-myeong 400 12px    muted
음식명                      font-myeong 400 15px    ink
영양소 수치                 font-myeong 400 13px    muted
날짜 / 시간                 font-myeong 400 13px    muted-soft
탄단지 레이블               font-myeong 700 11px    muted (uppercase)

앱 전체 배경                                         canvas #f9f6f1
카드 배경                                            surface-card #ffffff
카드 테두리                                          peach 1.5px #ffb084
AI 분석 카드                                         lavender #c0c0f0
목표 달성 카드                                       sage #70b080
경고 카드 (80~99%)                                   ochre #e8b94a
초과 카드 (100%+)                                    coral #e85d4a
그룹/비교 강조                                       cobalt #5058f0
주 버튼                                              peach 배경 #ffb084
```

---

---

## 13. Toast 알림 컴포넌트 스펙 — v1.6 추가

### 위치 & 레이어
```
position:  fixed
inset-x:   0 (좌우 전체 너비)
bottom:    96px (bottom-24 = 24×4px, 하단 탭바 위)
z-index:   300
pointer-events: none (클릭 통과)
```

### 시각 스타일
```
배경:       ink (#1a1a1a) 90% 불투명 (bg-ink/90)
텍스트:     흰색  font-kedu  14px
아이콘:     Check (lucide-react)  14px  sage (#70b080)
모서리:     9999px (pill)
패딩:       10px 16px (py-2.5 px-4)
그림자:     shadow-lg
```

### 애니메이션
```css
진입: opacity-0 translate-y-2  →  opacity-100 translate-y-0
퇴장: opacity-100 translate-y-0 →  opacity-0 translate-y-2
transition: all 300ms ease
지속 시간: 1800ms (useToast 기본값)
```

### 사용 패턴
```tsx
const toast = useToast();       // hooks/useToast.ts
toast.show('메시지');           // 호출 시 자동 표시 후 사라짐

// JSX (Fragment 필요 — Toast는 형제 요소로 추가)
<>
  <div>...</div>
  <Toast visible={toast.visible} message={toast.message} />
</>
```

> **주의:** `<Toast>` 를 다른 JSX 형제 옆에 바로 추가하면 "JSX expressions must have one parent element" 빌드 에러 발생 → 반드시 `<>...</>` Fragment로 감쌀 것.

---

*문서 버전: v1.6 | 최초 작성: 2026-06 | 최종 수정: 2026-06-22*
*참조: Clay Design System (DESIGN-clay.md), KERIS KEDU Font, Nanum Myeongjo Font*
*레퍼런스: 셋로그(Setlog) 앱 UI, 서울시청 건축 패널, 도시 일러스트 색상 팔레트*
