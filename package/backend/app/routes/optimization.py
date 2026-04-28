from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Header, UploadFile, File
from sqlalchemy.orm import Session, defer
from sqlalchemy import func, and_, case
from typing import List, Optional
import json
from app.database import get_db
from app.models.models import User, OptimizationSession, OptimizationSegment, ChangeLog
from app.schemas import (
    OptimizationCreate, SessionResponse, SessionDetailResponse,
    QueueStatusResponse, ProgressUpdate, ChangeLogResponse, ExportConfirmation
)
from app.services.optimization_service import OptimizationService
from app.services.concurrency import concurrency_manager
from app.services.stream_manager import stream_manager
from app.utils.auth import generate_session_id, verify_token, get_current_user_from_token
from datetime import datetime
import asyncio
from app.config import settings
from sse_starlette.sse import EventSourceResponse

router = APIRouter(prefix="/optimization", tags=["optimization"])


def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User:
    """从 JWT Bearer token 获取当前用户"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="请先登录")
    token = authorization.split(" ", 1)[1]
    return get_current_user_from_token(token, db)


async def run_optimization(session_id: int, db: Session):
    """后台运行优化任务"""
    session_obj = db.query(OptimizationSession).filter(
        OptimizationSession.id == session_id
    ).first()

    if not session_obj:
        return

    service = OptimizationService(db, session_obj)
    await service.start_optimization()


@router.post("/start", response_model=SessionResponse)
async def start_optimization(
    data: OptimizationCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """开始优化任务"""
    remaining = user.remaining_uses
    if user.usage_limit > 0 and remaining <= 0:
        raise HTTPException(status_code=403, detail="使用次数已耗尽，请兑换卡券获取更多次数")

    valid_modes = ['paper_polish', 'paper_enhance', 'paper_polish_enhance', 'emotion_polish']
    if data.processing_mode not in valid_modes:
        raise HTTPException(
            status_code=400,
            detail=f"无效的处理模式。支持的模式: {', '.join(valid_modes)}"
        )

    if data.processing_mode == 'emotion_polish':
        initial_stage = 'emotion_polish'
    elif data.processing_mode == 'paper_enhance':
        initial_stage = 'enhance'
    else:
        initial_stage = 'polish'

    session_id = generate_session_id()
    session = OptimizationSession(
        user_id=user.id,
        session_id=session_id,
        original_text=data.original_text,
        processing_mode=data.processing_mode,
        current_stage=initial_stage,
        status="queued",
        progress=0.0,
        polish_model=data.polish_config.model if data.polish_config else None,
        polish_api_key=data.polish_config.api_key if data.polish_config else None,
        polish_base_url=data.polish_config.base_url if data.polish_config else None,
        enhance_model=data.enhance_config.model if data.enhance_config else None,
        enhance_api_key=data.enhance_config.api_key if data.enhance_config else None,
        enhance_base_url=data.enhance_config.base_url if data.enhance_config else None,
        emotion_model=data.emotion_config.model if data.emotion_config else None,
        emotion_api_key=data.emotion_config.api_key if data.emotion_config else None,
        emotion_base_url=data.emotion_config.base_url if data.emotion_config else None,
    )

    db.add(session)
    user.usage_count = (user.usage_count or 0) + 1
    user.last_used = datetime.utcnow()
    db.commit()
    db.refresh(session)

    background_tasks.add_task(run_optimization, session.id, db)
    return session


@router.get("/status", response_model=QueueStatusResponse)
async def get_queue_status(
    session_id: str = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取队列状态"""
    status = await concurrency_manager.get_status(session_id)
    return QueueStatusResponse(**status)


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    limit: int = 20,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """列出用户的所有会话（支持分页）"""
    limit = min(limit, 100)

    results = db.query(
        OptimizationSession,
        func.length(OptimizationSession.original_text).label('original_char_count'),
        func.substring(OptimizationSession.original_text, 1, 50).label('preview_text')
    ).options(
        defer(OptimizationSession.original_text),
        defer(OptimizationSession.error_message)
    ).filter(
        OptimizationSession.user_id == user.id
    ).order_by(OptimizationSession.created_at.desc()).limit(limit).offset(offset).all()

    sessions = []
    for session, char_count, preview_text in results:
        session.original_char_count = char_count or 0
        session.preview_text = preview_text or ""
        sessions.append(session)

    return sessions


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session_detail(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取会话详情"""
    session = db.query(OptimizationSession).filter(
        OptimizationSession.session_id == session_id,
        OptimizationSession.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    segments = db.query(OptimizationSegment).filter(
        OptimizationSegment.session_id == session.id
    ).order_by(OptimizationSegment.segment_index).all()

    return SessionDetailResponse(
        **session.__dict__,
        segments=[seg.__dict__ for seg in segments]
    )


@router.get("/sessions/{session_id}/progress", response_model=ProgressUpdate)
async def get_session_progress(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取会话进度"""
    session = db.query(OptimizationSession).filter(
        OptimizationSession.session_id == session_id,
        OptimizationSession.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    return ProgressUpdate(
        session_id=session.session_id,
        status=session.status,
        progress=session.progress,
        current_position=session.current_position,
        total_segments=session.total_segments,
        current_stage=session.current_stage,
        error_message=session.error_message,
    )


@router.get("/sessions/{session_id}/stream")
async def stream_session_progress(
    session_id: str,
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    token: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """流式获取会话进度和内容（支持 Bearer Header 或 ?token= 查询参数）"""
    # SSE 连接无法自定义 Header，允许 query param 方式
    raw_token = token
    if not raw_token and authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ", 1)[1]
    if not raw_token:
        raise HTTPException(status_code=401, detail="请先登录")

    user = get_current_user_from_token(raw_token, db)
    session = db.query(OptimizationSession).filter(
        OptimizationSession.session_id == session_id,
        OptimizationSession.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    async def event_generator():
        queue = await stream_manager.connect(session_id)
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield message
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            await stream_manager.disconnect(session_id, queue)

    return EventSourceResponse(event_generator())


@router.get("/sessions/{session_id}/changes", response_model=List[ChangeLogResponse])
async def get_session_changes(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取会话的变更对照"""
    session = db.query(OptimizationSession).filter(
        OptimizationSession.session_id == session_id,
        OptimizationSession.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    latest_log_subquery = db.query(
        ChangeLog.segment_index,
        ChangeLog.stage,
        func.max(ChangeLog.id).label("latest_id")
    ).filter(
        ChangeLog.session_id == session.id
    ).group_by(
        ChangeLog.segment_index,
        ChangeLog.stage
    ).subquery()

    change_logs = db.query(ChangeLog).join(
        latest_log_subquery,
        and_(
            ChangeLog.segment_index == latest_log_subquery.c.segment_index,
            ChangeLog.stage == latest_log_subquery.c.stage,
            ChangeLog.id == latest_log_subquery.c.latest_id,
        )
    ).filter(
        ChangeLog.session_id == session.id
    ).order_by(
        ChangeLog.segment_index,
        case((ChangeLog.stage == "polish", 0), else_=1)
    ).all()

    parsed_changes = []
    for change in change_logs:
        detail = None
        if change.changes_detail:
            try:
                detail = json.loads(change.changes_detail)
            except json.JSONDecodeError:
                detail = {"raw": change.changes_detail}

        parsed_changes.append(
            ChangeLogResponse(
                id=change.id,
                segment_index=change.segment_index,
                stage=change.stage,
                before_text=change.before_text,
                after_text=change.after_text,
                changes_detail=detail,
                created_at=change.created_at,
            )
        )

    return parsed_changes


@router.post("/sessions/{session_id}/export")
async def export_session(
    session_id: str,
    confirmation: ExportConfirmation,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """导出优化结果"""
    if not confirmation.acknowledge_academic_integrity:
        raise HTTPException(status_code=400, detail="必须确认学术诚信承诺")

    session = db.query(OptimizationSession).filter(
        OptimizationSession.session_id == session_id,
        OptimizationSession.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    if session.status != "completed":
        raise HTTPException(status_code=400, detail="会话未完成")

    segments = db.query(OptimizationSegment).filter(
        OptimizationSegment.session_id == session.id
    ).order_by(OptimizationSegment.segment_index).all()

    final_text = "\n\n".join([
        seg.enhanced_text or seg.polished_text or seg.original_text
        for seg in segments
    ])

    if confirmation.export_format == "txt":
        return {
            "format": "txt",
            "content": final_text,
            "filename": f"optimized_{session_id}.txt",
        }
    else:
        raise HTTPException(status_code=501, detail="暂不支持此格式")


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除会话"""
    session = db.query(OptimizationSession).filter(
        OptimizationSession.session_id == session_id,
        OptimizationSession.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    db.delete(session)
    db.commit()
    return {"message": "会话已删除"}


@router.post("/sessions/{session_id}/retry")
async def retry_session(
    session_id: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """重新尝试处理失败的会话"""
    session = db.query(OptimizationSession).filter(
        OptimizationSession.session_id == session_id,
        OptimizationSession.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    if session.status not in ["failed", "stopped"]:
        raise HTTPException(status_code=400, detail="仅可对失败或已停止的会话执行重试")

    old_error = session.error_message or "未知错误"
    session.status = "queued"
    session.error_message = f"[重试中] 上次失败原因: {old_error}"
    db.commit()

    background_tasks.add_task(run_optimization, session.id, db)
    return {"message": "已重新排队处理未完成段落"}


@router.post("/sessions/{session_id}/stop")
async def stop_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """停止正在进行中的会话"""
    session = db.query(OptimizationSession).filter(
        OptimizationSession.session_id == session_id,
        OptimizationSession.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    if session.status not in ["queued", "processing"]:
        raise HTTPException(status_code=400, detail="只能停止排队中或处理中的会话")

    session.status = "stopped"
    session.error_message = "用户手动停止"
    db.commit()
    return {"message": "会话已停止"}


@router.post("/extract-file")
async def extract_file(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    """从 .txt 或 .docx 文件中提取纯文本"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="未收到文件")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in {"txt", "docx"}:
        raise HTTPException(status_code=400, detail="仅支持 .txt 和 .docx 文件")

    content = await file.read()

    # 文件大小限制（与系统设置一致）
    max_mb = getattr(settings, "MAX_UPLOAD_FILE_SIZE_MB", 10) or 10
    if len(content) / 1024 / 1024 > max_mb:
        raise HTTPException(status_code=400, detail=f"文件超过 {max_mb} MB 限制")

    if ext == "txt":
        for encoding in ("utf-8", "gbk", "utf-16", "latin-1"):
            try:
                text = content.decode(encoding)
                break
            except (UnicodeDecodeError, ValueError):
                continue
        else:
            raise HTTPException(status_code=400, detail="无法识别文件编码，请另存为 UTF-8 后上传")
    else:
        from app.word_formatter.utils.docx_text import extract_text_from_docx
        try:
            text = extract_text_from_docx(content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"解析 DOCX 失败：{str(e)}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="文件内容为空")

    return {"text": text, "filename": file.filename, "char_count": len(text)}
