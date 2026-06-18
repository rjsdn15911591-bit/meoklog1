import cloudinary
import cloudinary.uploader
from app.config import settings
import logging

logger = logging.getLogger(__name__)

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


async def upload_meal_image(image_bytes: bytes, user_id: str) -> dict:
    """Cloudinary에 음식 사진 업로드"""
    if not settings.CLOUDINARY_CLOUD_NAME:
        logger.warning("Cloudinary 미설정 — 더미 URL 반환")
        return {
            "image_url": "https://placehold.co/600x400?text=MealLog",
            "thumbnail_url": "https://placehold.co/300x300?text=MealLog",
            "public_id": "dummy",
        }

    result = cloudinary.uploader.upload(
        image_bytes,
        folder=f"meallog/{user_id}",
        resource_type="image",
        transformation=[{"quality": "auto", "fetch_format": "auto"}],
        eager=[
            {
                "width": 300,
                "height": 300,
                "crop": "fill",
                "gravity": "auto",
                "quality": "auto",
                "fetch_format": "auto",
            }
        ],
        eager_async=True,
    )

    thumbnail_url = result["secure_url"]
    if result.get("eager"):
        thumbnail_url = result["eager"][0]["secure_url"]

    return {
        "image_url": result["secure_url"],
        "thumbnail_url": thumbnail_url,
        "public_id": result["public_id"],
    }


async def delete_meal_image(public_id: str) -> None:
    if not settings.CLOUDINARY_CLOUD_NAME or public_id == "dummy":
        return
    cloudinary.uploader.destroy(public_id)
