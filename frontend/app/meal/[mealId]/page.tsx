"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, MessageCircle, Send } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { mealApi } from "@/lib/api";
import { REACTION_EMOJIS, MEAL_TYPE_LABELS } from "@/lib/constants";
import { formatTime, formatCalories } from "@/lib/utils";
import { NutritionDetail } from "@/components/meal/NutritionDetail";

export default function MealDetailPage() {
  const { mealId } = useParams<{ mealId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const { data: mealData } = useQuery({
    queryKey: ["meal", mealId],
    queryFn: () => mealApi.get(`/${mealId}`).then((r) => r.data.data),
  });

  const { data: commentsData } = useQuery({
    queryKey: ["comments", mealId],
    queryFn: () => mealApi.get(`/${mealId}/comments`).then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => mealApi.delete(`/${mealId}`),
    onSuccess: () => router.back(),
  });

  const reactionMutation = useMutation({
    mutationFn: (type: string) =>
      mealApi.post(`/${mealId}/reactions`, { type }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meal", mealId] }),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      mealApi.post(`/${mealId}/comments`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", mealId] });
      setCommentText("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      mealApi.delete(`/${mealId}/comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", mealId] }),
  });

  if (!mealData) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <div className="w-8 h-8 border-2 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const meal = mealData;
  const myReactions: string[] = meal.my_reactions ?? [];
  const reactionSummary: Record<string, number> = meal.reaction_summary ?? {};
  const isOwner =
    session?.user?.email && meal.user?.id === session.user.image;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-card border-b border-hairline">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} className="text-ink" />
        </button>
        <span className="font-myeong text-base font-semibold text-ink">
          {MEAL_TYPE_LABELS[meal.meal_type as keyof typeof MEAL_TYPE_LABELS]}
        </span>
        {isOwner && (
          <button
            onClick={() => deleteMutation.mutate()}
            className="p-2 -mr-2 text-coral"
          >
            <Trash2 size={18} />
          </button>
        )}
        {!isOwner && <div className="w-10" />}
      </div>

      <div className="pb-24">
        {/* Meal Image */}
        <div className="relative w-full aspect-[4/3] bg-surface-soft">
          <Image
            src={meal.image_url}
            alt="식사 사진"
            fill
            className="object-cover"
          />
        </div>

        {/* Meal Info */}
        <div className="px-4 pt-4 pb-3">
          {meal.user && (
            <div className="flex items-center gap-2 mb-3">
              {meal.user.avatar_url && (
                <Image
                  src={meal.user.avatar_url}
                  alt={meal.user.name}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-body font-medium">
                {meal.user.name}
              </span>
              <span className="text-xs text-muted ml-auto">
                {formatTime(meal.uploaded_at)}
              </span>
            </div>
          )}

          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-kedu text-3xl text-cobalt">
              {formatCalories(meal.total_calories)}
            </span>
            <span className="text-sm text-muted">kcal</span>
          </div>

          <NutritionDetail
            carbs={meal.total_carbs}
            protein={meal.total_protein}
            fat={meal.total_fat}
          />

          {meal.caption && (
            <p className="mt-3 text-sm text-body leading-relaxed">
              {meal.caption}
            </p>
          )}
        </div>

        {/* Detected Foods */}
        {meal.detected_foods && meal.detected_foods.length > 0 && (
          <div className="mx-4 mb-4 p-3 bg-surface-card rounded-md border border-hairline">
            <p className="text-xs text-muted mb-2">인식된 음식</p>
            <div className="space-y-2">
              {meal.detected_foods.map((food: any, idx: number) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-body">{food.food_name}</span>
                  <span className="text-muted">
                    {food.serving_size}g · {food.calories}kcal
                  </span>
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
                  onClick={() => reactionMutation.mutate(type)}
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
        </div>

        {/* Comments */}
        <div className="px-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={16} className="text-muted" />
            <span className="text-sm font-medium text-body">
              댓글 {commentsData?.length ?? 0}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            {commentsData?.map((comment: any) => (
              <div key={comment.id} className="flex gap-2">
                {comment.user?.avatar_url && (
                  <Image
                    src={comment.user.avatar_url}
                    alt={comment.user.name}
                    width={28}
                    height={28}
                    className="rounded-full flex-shrink-0"
                  />
                )}
                <div className="flex-1 bg-surface-card rounded-md px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-body">
                      {comment.user?.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">
                        {formatTime(comment.created_at)}
                      </span>
                      {comment.user_id ===
                        session?.user?.email && (
                        <button
                          onClick={() =>
                            deleteCommentMutation.mutate(comment.id)
                          }
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
            disabled={!commentText.trim()}
            className="p-2 text-cobalt disabled:text-muted"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
