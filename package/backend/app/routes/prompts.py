from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.models import User, CustomPrompt
from app.schemas import PromptCreate, PromptUpdate, PromptResponse
from app.utils.auth import get_current_user_from_token
from datetime import datetime

router = APIRouter(prefix="/prompts", tags=["prompts"])


def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    token = authorization.split(" ", 1)[1]
    user = get_current_user_from_token(token, db)
    user.last_used = datetime.utcnow()
    db.commit()
    return user


@router.get("/system", response_model=List[PromptResponse])
async def get_system_prompts(db: Session = Depends(get_db)):
    return db.query(CustomPrompt).filter(CustomPrompt.is_system == True).all()


@router.get("/", response_model=List[PromptResponse])
async def get_user_prompts(
    stage: str = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(CustomPrompt).filter(CustomPrompt.user_id == user.id)
    if stage:
        query = query.filter(CustomPrompt.stage == stage)
    return query.all()


@router.post("/", response_model=PromptResponse)
async def create_prompt(
    prompt_data: PromptCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if prompt_data.is_default:
        db.query(CustomPrompt).filter(
            CustomPrompt.user_id == user.id,
            CustomPrompt.stage == prompt_data.stage,
            CustomPrompt.is_default == True,
        ).update({"is_default": False})

    prompt = CustomPrompt(
        user_id=user.id,
        name=prompt_data.name,
        stage=prompt_data.stage,
        content=prompt_data.content,
        is_default=prompt_data.is_default,
        is_system=False,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.put("/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: int,
    prompt_data: PromptUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prompt = db.query(CustomPrompt).filter(
        CustomPrompt.id == prompt_id,
        CustomPrompt.user_id == user.id,
    ).first()

    if not prompt:
        raise HTTPException(status_code=404, detail="提示词不存在")

    if prompt_data.is_default:
        db.query(CustomPrompt).filter(
            CustomPrompt.user_id == user.id,
            CustomPrompt.stage == prompt.stage,
            CustomPrompt.is_default == True,
            CustomPrompt.id != prompt_id,
        ).update({"is_default": False})

    if prompt_data.name is not None:
        prompt.name = prompt_data.name
    if prompt_data.content is not None:
        prompt.content = prompt_data.content
    if prompt_data.is_default is not None:
        prompt.is_default = prompt_data.is_default

    db.commit()
    db.refresh(prompt)
    return prompt


@router.delete("/{prompt_id}")
async def delete_prompt(
    prompt_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prompt = db.query(CustomPrompt).filter(
        CustomPrompt.id == prompt_id,
        CustomPrompt.user_id == user.id,
    ).first()

    if not prompt:
        raise HTTPException(status_code=404, detail="提示词不存在")

    db.delete(prompt)
    db.commit()
    return {"message": "提示词已删除"}


@router.post("/{prompt_id}/set-default")
async def set_default_prompt(
    prompt_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prompt = db.query(CustomPrompt).filter(
        CustomPrompt.id == prompt_id,
        CustomPrompt.user_id == user.id,
    ).first()

    if not prompt:
        raise HTTPException(status_code=404, detail="提示词不存在")

    db.query(CustomPrompt).filter(
        CustomPrompt.user_id == user.id,
        CustomPrompt.stage == prompt.stage,
        CustomPrompt.is_default == True,
    ).update({"is_default": False})

    prompt.is_default = True
    db.commit()
    return {"message": "已设置为默认提示词"}
