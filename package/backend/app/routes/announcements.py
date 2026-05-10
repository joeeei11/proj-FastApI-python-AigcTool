from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Announcement
from app.schemas import AnnouncementResponse

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("", response_model=List[AnnouncementResponse])
async def get_active_announcements(
    login_push_only: bool = False,
    db: Session = Depends(get_db),
):
    """获取所有有效公告（用户端调用，无需认证）"""
    now = datetime.utcnow()
    query = db.query(Announcement).filter(
        Announcement.is_active.is_(True),
        (Announcement.expires_at.is_(None)) | (Announcement.expires_at > now),
    )
    if login_push_only:
        query = query.filter(Announcement.show_on_login.is_(True))
    return query.order_by(Announcement.created_at.desc()).all()
