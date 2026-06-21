import { NextResponse } from 'next/server';

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary:   '거의 운동 안 함 (앉아서 주로 생활)',
  light:       '가벼운 활동 (주 1-3일 운동)',
  moderate:    '보통 활동 (주 3-5일 운동)',
  active:      '활발한 활동 (주 6-7일 운동)',
  very_active: '매우 활발한 활동 (하루 2회 or 육체 노동)',
};

const GOAL_LABELS: Record<string, string> = {
  lose:     '체중 감량',
  maintain: '체중 유지',
  gain:     '근육 증량',
};

function buildDietPrompt(p: Record<string, unknown>): string {
  return `당신은 한국인을 위한 전문 영양사입니다. 아래 사용자 정보를 바탕으로 하루 맞춤 식단을 추천해주세요. 한국 음식 위주로, 목표 칼로리에 맞게, 현실적으로 먹을 수 있는 음식으로 추천하세요.

사용자 정보:
- 나이: ${p.age ?? '미입력'}세 / 성별: ${p.gender === 'male' ? '남성' : '여성'}
- 키: ${p.height ?? '미입력'}cm / 몸무게: ${p.weight ?? '미입력'}kg
- 활동 수준: ${ACTIVITY_LABELS[p.activityLevel as string] ?? p.activityLevel}
- 목표: ${GOAL_LABELS[p.goalType as string] ?? p.goalType}
- 일일 목표 칼로리: ${p.targetCalories ?? 2000}kcal

반드시 아래 JSON 형식으로만 응답하세요:
{"totalCalories":1800,"meals":{"breakfast":[{"name":"음식명","amount":"1공기(210g)","calories":300}],"lunch":[{"name":"음식명","amount":"1인분","calories":500}],"dinner":[{"name":"음식명","amount":"1인분","calories":450}],"snack":[{"name":"음식명","amount":"1개","calories":150}]},"macros":{"carbs":225,"protein":90,"fat":50},"tips":["팁1","팁2","팁3"]}`;
}

function buildExercisePrompt(p: Record<string, unknown>): string {
  return `당신은 전문 퍼스널 트레이너입니다. 아래 사용자 정보를 바탕으로 1주일 맞춤 운동 루틴을 추천해주세요. 현실적으로 실천 가능한 수준으로, 목표에 최적화된 루틴을 짜주세요.

사용자 정보:
- 나이: ${p.age ?? '미입력'}세 / 성별: ${p.gender === 'male' ? '남성' : '여성'}
- 키: ${p.height ?? '미입력'}cm / 몸무게: ${p.weight ?? '미입력'}kg
- 활동 수준: ${ACTIVITY_LABELS[p.activityLevel as string] ?? p.activityLevel}
- 목표: ${GOAL_LABELS[p.goalType as string] ?? p.goalType}

반드시 아래 JSON 형식으로만 응답하세요:
{"schedule":[{"day":"월요일","focus":"하체","exercises":[{"name":"스쿼트","sets":3,"reps":"15회","rest":"60초"},{"name":"런지","sets":3,"reps":"12회","rest":"60초"}],"duration":"45분"}],"restDays":["목요일","일요일"],"weeklyCaloriesBurned":1200,"tips":["팁1","팁2"]}`;
}

export async function POST(request: Request) {
  try {
    const { type, profile } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다. OPENAI_API_KEY 환경변수를 확인하세요.' }, { status: 500 });
    }

    const prompt = type === 'diet' ? buildDietPrompt(profile) : buildExercisePrompt(profile);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('OpenAI API error:', errText);
      return NextResponse.json({ error: 'AI 서비스 오류가 발생했습니다.' }, { status: 500 });
    }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';

    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
