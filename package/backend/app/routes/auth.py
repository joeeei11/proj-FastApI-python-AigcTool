from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import Coupon, CouponRedemption, User
from app.schemas import (
    ChangePasswordRequest,
    RedeemCoupon,
    TokenResponse,
    UserLogin,
    UserMeResponse,
    UserRegister,
)
from app.utils.auth import (
    create_access_token,
    get_current_user_from_token,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    token = authorization.split(" ", 1)[1]
    return get_current_user_from_token(token, db)


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: Session = Depends(get_db)) -> TokenResponse:
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="用户名已被使用")
    if data.email and db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="邮箱已被注册")

    user = User(
        username=data.username,
        password_hash=get_password_hash(data.password),
        email=data.email or None,
        is_active=True,
        usage_limit=0,
        usage_count=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(data={"sub": str(user.id), "role": "user"}, expires_delta=expires)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        remaining_uses=user.remaining_uses,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.username == data.username, User.is_active.is_(True)).first()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    user.last_login = datetime.utcnow()
    db.commit()

    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(data={"sub": str(user.id), "role": "user"}, expires_delta=expires)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        remaining_uses=user.remaining_uses,
    )


@router.get("/me", response_model=UserMeResponse)
async def get_me(current_user: User = Depends(_get_current_user)) -> User:
    return current_user


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.password_hash or not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="旧密码错误")
    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": "密码修改成功"}


@router.post("/redeem")
async def redeem_coupon(
    data: RedeemCoupon,
    current_user: User = Depends(_get_current_user),
    db: Session = Depends(get_db),
):
    coupon = db.query(Coupon).filter(Coupon.code == data.code).first()
    if not coupon:
        raise HTTPException(status_code=400, detail="卡券不存在")
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="该卡券已被禁用")
    if coupon.expires_at and coupon.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="该卡券已过期")
    if coupon.max_redemptions > 0 and (coupon.used_count or 0) >= coupon.max_redemptions:
        raise HTTPException(status_code=400, detail="该卡券兑换名额已用完")

    already_redeemed = db.query(CouponRedemption).filter(
        CouponRedemption.coupon_id == coupon.id,
        CouponRedemption.user_id == current_user.id,
    ).first()
    if already_redeemed:
        raise HTTPException(status_code=400, detail="您已兑换过此卡券")

    credits = coupon.credits or coupon.total_uses or 0
    redemption = CouponRedemption(coupon_id=coupon.id, user_id=current_user.id)
    db.add(redemption)
    coupon.used_count = (coupon.used_count or 0) + 1
    current_user.usage_limit += credits
    db.commit()

    return {
        "message": f"兑换成功，获得 {credits} 次使用机会",
        "added_uses": credits,
        "remaining_uses": current_user.remaining_uses,
    }
