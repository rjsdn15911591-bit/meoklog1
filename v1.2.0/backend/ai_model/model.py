"""
음식 분류 모델 학습 스크립트.
실제 학습 시에만 직접 실행. 서비스 코드는 app/services/ai_service.py 참조.
"""
import os
import json
import numpy as np


def build_model(num_classes: int):
    """MobileNetV2 기반 전이 학습 모델 생성"""
    try:
        import tensorflow as tf
        base = tf.keras.applications.MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            weights="imagenet",
        )
        base.trainable = False
        model = tf.keras.Sequential([
            base,
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(num_classes, activation="softmax"),
        ])
        model.compile(
            optimizer=tf.keras.optimizers.Adam(1e-3),
            loss="categorical_crossentropy",
            metrics=["accuracy"],
        )
        return model
    except ImportError:
        raise RuntimeError("TensorFlow가 설치되어 있지 않습니다.")


def save_model(model, output_path: str = "food_classifier.h5"):
    model.save(output_path)
    print(f"모델 저장: {output_path}")


if __name__ == "__main__":
    labels_path = os.path.join(os.path.dirname(__file__), "food_labels.json")
    with open(labels_path) as f:
        labels_data = json.load(f)
    num_classes = len(labels_data["labels"])
    print(f"클래스 수: {num_classes}")

    model = build_model(num_classes)
    model.summary()
    print("모델 빌드 완료. 데이터셋으로 학습 후 save_model()을 호출하세요.")
