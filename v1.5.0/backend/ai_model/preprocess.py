import numpy as np
from PIL import Image
import io

IMG_SIZE = (224, 224)


def load_image_bytes(image_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def preprocess_for_mobilenet(image_bytes: bytes) -> np.ndarray:
    img = load_image_bytes(image_bytes)
    img = img.resize(IMG_SIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.float32)
    # MobileNetV2 전처리: [-1, 1] 정규화
    arr = (arr / 127.5) - 1.0
    return np.expand_dims(arr, axis=0)
