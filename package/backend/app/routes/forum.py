import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import ForumCategory, ForumPost, ForumReply, ForumReport, User
from app.schemas import (
    ForumCategoryResponse,
    ForumPostCreate,
    ForumPostListResponse,
    ForumPostResponse,
    ForumReplyCreate,
    ForumReplyResponse,
    ForumReportCreate,
    ForumReportResponse,
)
from app.utils.auth import get_current_user_from_token

router = APIRouter(prefix="/forum", tags=["forum"])

MAX_FORUM_IMAGE_SIZE = 5 * 1024 * 1024
ALLOWED_FORUM_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
UPLOAD_ROOT = Path(__file__).resolve().parents[3] / "uploads" / "forum"


def _parse_image_urls(value: Optional[str]) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [url for url in parsed if isinstance(url, str)]


def _serialize_image_urls(urls: list[str]) -> str:
    cleaned = []
    for url in urls[:6]:
        if isinstance(url, str) and url.startswith("/uploads/forum/"):
            cleaned.append(url)
    return json.dumps(cleaned, ensure_ascii=False)


def _attach_post_images(post: ForumPost) -> ForumPost:
    post.image_urls = _parse_image_urls(post.image_urls)
    return post


def _attach_posts_images(posts: list[ForumPost]) -> list[ForumPost]:
    for post in posts:
        _attach_post_images(post)
    return posts


def get_optional_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        return get_current_user_from_token(token, db)
    except HTTPException:
        return None


def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    token = authorization.split(" ", 1)[1]
    return get_current_user_from_token(token, db)


def _ensure_category(db: Session, category_id: int) -> ForumCategory:
    category = db.query(ForumCategory).filter(
        ForumCategory.id == category_id,
        ForumCategory.is_active.is_(True),
    ).first()
    if not category:
        raise HTTPException(status_code=400, detail="分类不存在或已禁用")
    return category


def _check_rate_limit(db: Session, model, user_id: int, seconds: int, label: str) -> None:
    latest = (
        db.query(model)
        .filter(model.user_id == user_id)
        .order_by(model.created_at.desc())
        .first()
    )
    if latest and latest.created_at and latest.created_at > datetime.utcnow() - timedelta(seconds=seconds):
        raise HTTPException(status_code=429, detail=f"操作太频繁，请稍后再{label}")


@router.get("/categories", response_model=list[ForumCategoryResponse])
async def list_categories(db: Session = Depends(get_db)):
    return (
        db.query(ForumCategory)
        .filter(ForumCategory.is_active.is_(True))
        .order_by(ForumCategory.sort_order.asc(), ForumCategory.id.asc())
        .all()
    )


@router.post("/upload-image")
async def upload_forum_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    ext = ALLOWED_FORUM_IMAGE_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=400, detail="仅支持 JPG、PNG、WEBP、GIF 图片")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="图片不能为空")
    if len(content) > MAX_FORUM_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="单张图片不能超过 5MB")

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    filename = f"{current_user.id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid4().hex}{ext}"
    target = UPLOAD_ROOT / filename
    with open(target, "wb") as f:
        f.write(content)

    return {"url": f"/uploads/forum/{filename}"}


@router.get("/posts", response_model=ForumPostListResponse)
async def list_posts(
    category_id: Optional[int] = None,
    post_type: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    include_deleted: bool = False,
    db: Session = Depends(get_db),
):
    query = (
        db.query(ForumPost)
        .options(joinedload(ForumPost.author), joinedload(ForumPost.category))
    )
    if not include_deleted:
        query = query.filter(ForumPost.is_deleted.is_(False))
    if category_id:
        query = query.filter(ForumPost.category_id == category_id)
    if post_type:
        query = query.filter(ForumPost.post_type == post_type)
    if keyword:
        like = f"%{keyword.strip()}%"
        query = query.filter(or_(ForumPost.title.like(like), ForumPost.content.like(like)))

    total = query.count()
    items = (
        query.order_by(
            ForumPost.is_pinned.desc(),
            ForumPost.last_replied_at.desc().nullslast(),
            ForumPost.created_at.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    _attach_posts_images(items)
    return ForumPostListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/posts", response_model=ForumPostResponse)
async def create_post(
    data: ForumPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_category(db, data.category_id)
    _check_rate_limit(db, ForumPost, current_user.id, 60, "发帖")
    post = ForumPost(
        user_id=current_user.id,
        category_id=data.category_id,
        post_type=data.post_type,
        title=data.title.strip(),
        content=data.content.strip(),
        image_urls=_serialize_image_urls(data.image_urls),
        last_replied_at=datetime.utcnow(),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    created = (
        db.query(ForumPost)
        .options(joinedload(ForumPost.author), joinedload(ForumPost.category))
        .filter(ForumPost.id == post.id)
        .first()
    )
    return _attach_post_images(created)


@router.get("/posts/{post_id}", response_model=ForumPostResponse)
async def get_post(post_id: int, db: Session = Depends(get_db)):
    post = (
        db.query(ForumPost)
        .options(joinedload(ForumPost.author), joinedload(ForumPost.category))
        .filter(ForumPost.id == post_id, ForumPost.is_deleted.is_(False))
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    post.view_count = (post.view_count or 0) + 1
    db.commit()
    db.refresh(post)
    _attach_post_images(post)
    return post


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post or post.is_deleted:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能删除自己的帖子")
    post.is_deleted = True
    db.commit()
    return {"message": "帖子已删除"}


@router.patch("/posts/{post_id}/solve", response_model=ForumPostResponse)
async def solve_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(ForumPost).filter(ForumPost.id == post_id, ForumPost.is_deleted.is_(False)).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能标记自己的提问帖")
    if post.post_type != "question":
        raise HTTPException(status_code=400, detail="只有提问帖可以标记已解决")
    post.is_solved = True
    post.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    _attach_post_images(post)
    return post


@router.get("/posts/{post_id}/replies", response_model=list[ForumReplyResponse])
async def list_replies(post_id: int, db: Session = Depends(get_db)):
    post = db.query(ForumPost).filter(ForumPost.id == post_id, ForumPost.is_deleted.is_(False)).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return (
        db.query(ForumReply)
        .options(joinedload(ForumReply.author))
        .filter(ForumReply.post_id == post_id, ForumReply.is_deleted.is_(False))
        .order_by(ForumReply.created_at.asc())
        .all()
    )


@router.post("/posts/{post_id}/replies", response_model=ForumReplyResponse)
async def create_reply(
    post_id: int,
    data: ForumReplyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(ForumPost).filter(ForumPost.id == post_id, ForumPost.is_deleted.is_(False)).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if post.is_locked:
        raise HTTPException(status_code=400, detail="该帖子已锁定，无法继续回复")
    _check_rate_limit(db, ForumReply, current_user.id, 30, "回复")
    reply = ForumReply(post_id=post.id, user_id=current_user.id, content=data.content.strip())
    db.add(reply)
    post.reply_count = (post.reply_count or 0) + 1
    post.last_replied_at = datetime.utcnow()
    db.commit()
    db.refresh(reply)
    return (
        db.query(ForumReply)
        .options(joinedload(ForumReply.author))
        .filter(ForumReply.id == reply.id)
        .first()
    )


@router.delete("/replies/{reply_id}")
async def delete_reply(
    reply_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reply = db.query(ForumReply).filter(ForumReply.id == reply_id).first()
    if not reply or reply.is_deleted:
        raise HTTPException(status_code=404, detail="回复不存在")
    if reply.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能删除自己的回复")
    reply.is_deleted = True
    post = db.query(ForumPost).filter(ForumPost.id == reply.post_id).first()
    if post and post.reply_count > 0:
        post.reply_count -= 1
    db.commit()
    return {"message": "回复已删除"}


@router.post("/reports", response_model=ForumReportResponse)
async def create_report(
    data: ForumReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.target_type == "post":
        exists = db.query(ForumPost).filter(ForumPost.id == data.target_id).first()
    else:
        exists = db.query(ForumReply).filter(ForumReply.id == data.target_id).first()
    if not exists:
        raise HTTPException(status_code=404, detail="举报对象不存在")
    report = ForumReport(
        reporter_id=current_user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        description=data.description,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
