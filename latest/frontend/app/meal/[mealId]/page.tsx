"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, MessageCircle, Send } from "lucide-react";
import Image from "next/image";
import { mealApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { REACTION_EMOJIS, MEAL_TYPE_LABELS } from "@/lib/constants";
import { formatTime, formatCalories } from "@/lib/utils";
import { NutritionDetail } from "@/components/meal/NutritionDetail";

type FloatingEmoji = { id: number; emoji: string; x: number; y: number; drift: number; delay: number };

export default function MealDetailPage() {
  const { mealId } = useParams<{ mealId: string }>();
  const router = useRouter();
  const { user: authUser } = useAuthStore();
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  const spawnEmojis = useCallback((emoji: string, btn: HTMLButtonElement) => {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - 13;
    const cy = rect.top;
    const newEmojis: FloatingEmoji[] = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      emoji,
      x: cx + (Math.random() - 0.5) * 6,
      y: cy,
      drift: (Math.random() - 0.5) * 70,
      delay: i * 0.12,
    }));
    setFloatingEmojis((prev) => [...prev, ...newEmojis]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => !newEmojis.find((n) => n.id === e.id)));
    }, 2200);
  }, []);

  const { data: meal } = useQuery({
    queryKey: ["meal", mealId],
    queryFn: () => mealApi.getById(mealId).then((r) => r.data.data),
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", mealId],
    queryFn: () => mealApi.getComments(mealId).then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => mealApi.delete(mealId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      router.back();
    },
  });

  const reactionMutation = useMutation({
    mutationFn: (type: string) => mealApi.addReaction(mealId, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meal", mealId] }),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => mealApi.addComment(mealId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", mealId] });
      setCommentText("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => mealApi.deleteComment(mealId, commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", mealId] }),
  });

  if (!meal) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <div className="w-8 h-8 border-2 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myReactions: string[] = meal.myReactions ?? [];
  const reactionSummary: Record<string, number> = meal.reactionSummary ?? {};
  const isOwner = !!authUser && meal.user?.id === authUser.id;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-card border-b border-hairline">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} className="text-ink" />
        </button>
        <span className="font-myeong text-base font-semibold text-ink">
          {MEAL_TYPE_LABELS[meal.mealType as keyof typeof MEAL_TYPE_LABELS]}
        </span>
        {isOwner ? (
          <button
            onClick={() => {
              if (confirm("이 식사를 삭제하시겠어요?")) deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
            className="p-2 -mr-2 text-coral disabled:opacity-50"
          >
            <Trash2 size={18} />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      <div className="pb-24">
        {/* Meal Image */}
        <div className="relative w-full aspect-[4/3] bg-surface-soft">
          <Image src={meal.imageUrl} alt="식사 사진" fill className="object-cover" />
        </div>

        {/* Meal Info */}
        <div className="px-4 pt-4 pb-3">
          {meal.user && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                {meal.user.avatarUrl ? (
                  <Image
                    src={meal.user.avatarUrl}
                    alt={meal.user.name}
                    width={28}
                    height={28}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-ochre flex items-center justify-center font-kedu font-bold text-xs text-white">
                    {meal.user.name[0]}
                  </div>
                )}
              </div>
              <span className="text-sm text-body font-medium">{meal.user.name}</span>
              <span className="text-xs text-muted ml-auto">{formatTime(meal.uploadedAt)}</span>
            </div>
          )}

          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-kedu text-3xl text-cobalt">{formatCalories(meal.totalCalories)}</span>
            <span className="text-sm text-muted">kcal</span>
          </div>

          <NutritionDetail
            carbs={meal.totalCarbs}
            protein={meal.totalProtein}
            fat={meal.totalFat}
          />

          {meal.caption && (
            <p className="mt-3 text-sm text-body leading-relaxed">{meal.caption}</p>
          )}
        </div>

        {/* Detected Foods */}
        {meal.detectedFoods && meal.detectedFoods.length > 0 && (
          <div className="mx-4 mb-4 p-3 bg-surface-card rounded-md border border-hairline">
            <p className="text-xs text-muted mb-2">인식된 음식</p>
            <div className="space-y-2">
              {meal.detectedFoods.map((food: { foodName: string; servingSize: number; calories: number }, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-body">{food.foodName}</span>
                  <span className="text-muted">{food.servingSize}g · {food.calories}kcal</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reactions */}
        <div className="px-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => {
              const count = reactionSummary[type] || 0;
              const isActive = myReactions.includes(type);
              return (
                <button
                  key={type}
                  onClick={(e) => {
                    reactionMutation.mutate(type);
                    spawnEmojis(emoji, e.currentTarget);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-pill text-sm border transition-colors ${
                    isActive
                      ? "bg-cobalt/10 border-cobalt text-cobalt"
                      : "bg-surface-card border-hairline text-body"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* 이모지 플로팅 오버레이 */}
          {floatingEmojis.map((fe) => (
            <span
              key={fe.id}
              className="fixed pointer-events-none select-none text-2xl z-50 animate-float-emoji"
              style={{
                left: fe.x,
                top: fe.y,
                ['--emoji-drift' as string]: `${fe.drift}px`,
                animationDelay: `${fe.delay}s`,
              }}
            >
              {fe.emoji}
            </span>
          ))}
        </div>

        {/* Comments */}
        <div className="px-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={16} className="text-muted" />
            <span className="text-sm font-medium text-body">댓글 {comments?.length ?? 0}</span>
          </div>

          <div className="space-y-3 mb-4">
            {comments?.map((comment: { id: string; userId: string; createdAt: string; content: string; user?: { avatarUrl?: string; name: string } }) => (
              <div key={comment.id} className="flex gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                  {comment.user?.avatarUrl ? (
                    <Image
                      src={comment.user.avatarUrl}
                      alt={comment.user?.name ?? ''}
                      width={28}
                      height={28}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-ochre flex items-center justify-center font-kedu font-bold text-xs text-white">
                      {comment.user?.name?.[0] ?? '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-surface-card rounded-md px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-body">{comment.user?.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{formatTime(comment.createdAt)}</span>
                      {comment.userId === authUser?.id && (
                        <button
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                          className="text-xs text-muted hover:text-coral"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-body">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comment Input */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-surface-card border-t border-hairline px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="flex-1 bg-surface-soft rounded-pill px-4 py-2 text-sm text-body outline-none placeholder:text-muted-soft"
            onKeyDown={(e) => {
              if (e.key === "Enter" && commentText.trim()) {
                commentMutation.mutate(commentText.trim());
              }
            }}
          />
          <button
            onClick={() => {
              if (commentText.trim()) commentMutation.mutate(commentText.trim());
            }}
            disabled={!commentText.trim() || commentMutation.isPending}
            className="p-2 text-cobalt disabled:text-muted"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
