import numpy as np
import json
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)


class FoodAIService:
    """MobileNetV2 기반 음식 분류 서비스 — 싱글톤"""

    _instance = None
    _model = None
    _labels: dict = {}
    _loaded: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load_model(self):
        labels_path = Path(settings.FOOD_LABELS_PATH)
        if labels_path.exists():
            with open(labels_path, encoding="utf-8") as f:
                self._labels = json.load(f)
            logger.info(f"음식 라벨 로드 완료: {len(self._labels)}개")

        model_path = Path(settings.MODEL_PATH)
        if model_path.exists():
            try:
                import tensorflow as tf
                self._model = tf.keras.models.load_model(str(model_path))
                logger.info("AI 모델 로드 완료")
            except Exception as e:
                logger.warning(f"AI 모델 로드 실패 (더미 모드로 동작): {e}")
        else:
            logger.warning(f"AI 모델 파일 없음: {model_path} — 더미 모드로 동작")

        self._loaded = True

    def preprocess_image(self, image_bytes: bytes) -> "np.ndarray":
        import io
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize((224, 224))
        img_array = np.array(img, dtype=np.float32)

        # MobileNetV2 정규화 [-1, 1]
        img_array = (img_array / 127.5) - 1.0
        return np.expand_dims(img_array, axis=0)

    def predict(self, image_bytes: bytes, top_k: int = 3) -> list[dict]:
        """Top-K 음식 예측 반환. 모델 없으면 더미 반환."""
        if self._model is None:
            return self._dummy_predict(top_k)

        processed = self.preprocess_image(image_bytes)
        predictions = self._model.predict(processed, verbose=0)[0]
        top_indices = np.argsort(predictions)[-top_k:][::-1]

        results = []
        for idx in top_indices:
            conf = float(predictions[idx])
            if conf < 0.01:
                continue
            results.append(
                {
                    "food_name": self._labels.get(str(idx), "알 수 없는 음식"),
                    "confidence": conf,
                    "label_index": int(idx),
                }
            )
        return results if results else self._dummy_predict(top_k)

    def _dummy_predict(self, top_k: int = 3) -> list[dict]:
        """모델 없을 때 더미 결과"""
        dummy_foods = [
            {"food_name": "흰쌀밥", "confidence": 0.85, "label_index": 0},
            {"food_name": "제육볶음", "confidence": 0.10, "label_index": 1},
            {"food_name": "김치", "confidence": 0.05, "label_index": 2},
        ]
        return dummy_foods[:top_k]


food_ai_service = FoodAIService()
