from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Announcement
from app.schemas import AnnouncementResponse

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("", response_model=List[AnnouncementResponse])
async def get_active_announcements(db: Session = Depends(get_db)):
    """获取所有有效公告（用户端调用，无需认证）"""
    now = datetime.utcnow()
    announcements = (
        db.query(Announcement)
        .filter(
            Announcement.is_active.is_(True),
            (Announcement.expires_at.is_(None)) | (Announcement.expires_at > now),
        )
        .order_by(Announcement.created_at.desc())
        .all()
    )
    return announcements
