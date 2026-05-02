from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import httpx

from app.config import settings
from app.database import get_db
from app.models.models import User
from app.schemas import ImageGenerateRequest
from app.utils.auth import get_current_user_from_token

router = APIRouter(prefix="/image", tags=["image"])


def _get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="请先登录")
    token = authorization.split(" ", 1)[1]
    return get_current_user_from_token(token, db)


@router.post("/generate")
async def generate_image(
    data: ImageGenerateRequest,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.IMAGE_API_KEY:
        raise HTTPException(status_code=503, detail="图片生成服务未配置，请联系管理员")

    if (current_user.image_credits or 0) <= 0:
        raise HTTPException(status_code=402, detail="图片点数不足，请兑换图片卡券")

    allowed_sizes = {"1024x1024", "1024x1536", "1536x1024"}
    size = data.size if data.size in allowed_sizes else "1024x1024"

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{settings.IMAGE_BASE_URL.rstrip('/')}/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {settings.IMAGE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.IMAGE_MODEL,
                    "prompt": data.prompt,
                    "size": size,
                    "quality": data.quality,
                    "n": 1,
                    "response_format": "b64_json",
                },
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="生图接口超时，请稍后重试")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"生图接口连接失败: {str(e)[:100]}")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"生图接口错误 {resp.status_code}: {resp.text[:200]}",
        )

    try:
        result = resp.json()
        b64 = result["data"][0].get("b64_json") or result["data"][0].get("url", "")
        revised_prompt = result["data"][0].get("revised_prompt", "")
    except Exception:
        raise HTTPException(status_code=502, detail="生图接口返回格式异常")

    # 扣除点数（仅在成功后扣）
    current_user.image_credits = max(0, (current_user.image_credits or 0) - 1)
    db.commit()

    return {
        "b64_json": b64,
        "revised_prompt": revised_prompt,
        "remaining_credits": current_user.image_credits,
    }


@router.get("/credits")
async def get_image_credits(
    current_user: User = Depends(_get_current_user),
):
    return {"image_credits": current_user.image_credits or 0}
