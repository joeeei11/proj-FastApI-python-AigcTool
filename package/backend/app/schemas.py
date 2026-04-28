from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class UserCreate(BaseModel):
    """创建用户（历史兼容）"""
    card_key: str
    access_link: str


class UserResponse(BaseModel):
    """用户响应"""
    id: int
    username: Optional[str] = None
    email: Optional[str] = None
    card_key: Optional[str] = None
    access_link: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_used: Optional[datetime] = None
    last_login: Optional[datetime] = None
    usage_limit: int
    usage_count: int

    class Config:
        from_attributes = True


class UserRegister(BaseModel):
    """用户注册"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    email: Optional[str] = None


class UserLogin(BaseModel):
    """用户登录"""
    username: str
    password: str


class TokenResponse(BaseModel):
    """JWT 令牌响应"""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    remaining_uses: int


class UserMeResponse(BaseModel):
    """当前用户信息"""
    id: int
    username: str
    email: Optional[str] = None
    remaining_uses: int
    usage_count: int
    usage_limit: int
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class RedeemCoupon(BaseModel):
    """兑换卡券"""
    code: str


class AnnouncementCreate(BaseModel):
    """创建/更新公告"""
    title: str = Field(..., max_length=100)
    content: str
    type: str = Field('info', pattern='^(info|warning|event)$')
    is_active: bool = True
    expires_at: Optional[datetime] = None


class AnnouncementResponse(BaseModel):
    """公告响应"""
    id: int
    title: str
    content: str
    type: str
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    """修改密码"""
    old_password: str
    new_password: str = Field(..., min_length=6, description="新密码至少 6 位")


class CouponCreate(BaseModel):
    """创建卡券"""
    credits: int = Field(10, ge=1, description="每人兑换获得的使用次数")
    max_redemptions: int = Field(0, ge=0, description="最多兑换人数，0 表示不限")
    expires_at: Optional[datetime] = Field(None, description="过期时间，null 表示永不过期")
    count: int = Field(1, ge=1, le=100, description="批量生成张数")
    prefix: Optional[str] = None


class CouponResponse(BaseModel):
    """卡券响应"""
    id: int
    code: str
    credits: int                          # 每人兑换获得次数
    max_redemptions: int = 0             # 最多兑换人数，0=不限
    used_count: int = 0                  # 已兑换人数
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    status: str = "available"            # available / exhausted / expired / disabled

    class Config:
        from_attributes = True


class ModelConfig(BaseModel):
    """模型配置"""
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class OptimizationCreate(BaseModel):
    """创建优化任务"""
    original_text: str
    processing_mode: str = Field(default='paper_polish_enhance',
                                  description='处理模式: paper_polish, paper_enhance, paper_polish_enhance, emotion_polish')
    polish_config: Optional[ModelConfig] = None
    enhance_config: Optional[ModelConfig] = None
    emotion_config: Optional[ModelConfig] = None


class SegmentResponse(BaseModel):
    """段落响应"""
    id: int
    segment_index: int
    stage: str
    original_text: str
    polished_text: Optional[str] = None
    enhanced_text: Optional[str] = None
    status: str
    is_title: bool
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    """会话响应"""
    id: int
    session_id: str
    current_stage: str
    status: str
    progress: float
    current_position: int
    total_segments: int
    original_char_count: int = 0
    preview_text: Optional[str] = None
    error_message: Optional[str] = None
    processing_mode: str = 'paper_polish_enhance'
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SessionDetailResponse(SessionResponse):
    """会话详细响应"""
    segments: List[SegmentResponse] = []


class QueueStatusResponse(BaseModel):
    """队列状态响应"""
    current_users: int
    max_users: int
    queue_length: int
    your_position: Optional[int] = None
    estimated_wait_time: Optional[int] = None  # 秒


class ProgressUpdate(BaseModel):
    """进度更新"""
    session_id: str
    status: str
    progress: float
    current_position: int
    total_segments: int
    current_stage: str
    error_message: Optional[str] = None


class ChangeLogResponse(BaseModel):
    """变更对照响应"""
    id: int
    segment_index: int
    stage: str
    before_text: str
    after_text: str
    changes_detail: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ExportConfirmation(BaseModel):
    """导出确认"""
    session_id: str
    acknowledge_academic_integrity: bool
    export_format: str = Field(..., pattern="^(txt|docx|pdf)$")


class CardKeyGenerate(BaseModel):
    """生成卡密"""
    count: int = Field(1, ge=1, le=100)
    prefix: Optional[str] = None


class CardKeyResponse(BaseModel):
    """卡密响应"""
    card_key: str
    access_link: str
    created_at: datetime


class UserUsageUpdate(BaseModel):
    """更新用户使用限制"""
    usage_limit: int = Field(..., ge=0)  # 0 表示无限制
    reset_usage_count: bool = False


class DatabaseUpdateRequest(BaseModel):
    """数据库记录更新请求"""
    data: Dict[str, Any]


class PromptCreate(BaseModel):
    """创建提示词"""
    name: str
    stage: str = Field(..., pattern="^(polish|enhance)$")
    content: str
    is_default: bool = False


class PromptUpdate(BaseModel):
    """更新提示词"""
    name: Optional[str] = None
    content: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class PromptResponse(BaseModel):
    """提示词响应"""
    id: int
    user_id: Optional[int] = None
    name: str
    stage: str
    content: str
    is_default: bool
    is_system: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
