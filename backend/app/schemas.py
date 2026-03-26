from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

class ProductCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    product_type: Optional[str] = None
    target_age_range: Optional[str] = None
    season_tag: Optional[str] = None
    repurchase_cycle: int = 30
    commission_rate: Optional[float] = None
    status: str = "在售"
    health_score: int = 50


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    product_type: Optional[str] = None
    target_age_range: Optional[str] = None
    season_tag: Optional[str] = None
    repurchase_cycle: Optional[int] = None
    commission_rate: Optional[float] = None
    status: Optional[str] = None
    health_score: Optional[int] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    product_type: Optional[str] = None
    target_age_range: Optional[str] = None
    season_tag: Optional[str] = None
    repurchase_cycle: int
    commission_rate: Optional[float] = None
    status: str
    health_score: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# ScheduleRecord
# ---------------------------------------------------------------------------

class ScheduleRecordCreate(BaseModel):
    product_id: int
    schedule_date: date
    time_slot: Optional[str] = None
    group_type: Optional[str] = None
    operator: Optional[str] = None
    order_count: Optional[int] = None
    gmv: Optional[float] = None
    performance_tag: Optional[str] = None
    feedback_text: Optional[str] = None
    ai_predicted_orders: Optional[int] = None
    notes: Optional[str] = None


class ScheduleRecordResponse(BaseModel):
    id: int
    product_id: int
    schedule_date: date
    time_slot: Optional[str] = None
    group_type: Optional[str] = None
    operator: Optional[str] = None
    order_count: Optional[int] = None
    gmv: Optional[float] = None
    performance_tag: Optional[str] = None
    feedback_text: Optional[str] = None
    ai_predicted_orders: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# SchedulePlan
# ---------------------------------------------------------------------------

class SchedulePlanCreate(BaseModel):
    product_id: int
    plan_date: date
    time_slot: Optional[str] = None
    group_type: Optional[str] = None
    operator: Optional[str] = None
    source: Optional[str] = None
    status: str = "待审核"
    ai_copy: Optional[str] = None


class SchedulePlanUpdate(BaseModel):
    product_id: Optional[int] = None
    plan_date: Optional[date] = None
    time_slot: Optional[str] = None
    group_type: Optional[str] = None
    operator: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    ai_copy: Optional[str] = None


class SchedulePlanResponse(BaseModel):
    id: int
    product_id: int
    plan_date: date
    time_slot: Optional[str] = None
    group_type: Optional[str] = None
    operator: Optional[str] = None
    source: Optional[str] = None
    status: str
    ai_copy: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# ProductSubmission
# ---------------------------------------------------------------------------

class ProductSubmissionCreate(BaseModel):
    product_id: Optional[int] = None
    submitted_by: Optional[str] = None
    submit_time: Optional[datetime] = None
    target_group: Optional[str] = None
    suggested_date: Optional[date] = None
    reason: Optional[str] = None
    review_status: str = "待审核"


class ProductSubmissionResponse(BaseModel):
    id: int
    product_id: Optional[int] = None
    submitted_by: Optional[str] = None
    submit_time: Optional[datetime] = None
    target_group: Optional[str] = None
    suggested_date: Optional[date] = None
    reason: Optional[str] = None
    review_status: str
    reviewer: Optional[str] = None
    review_comment: Optional[str] = None
    review_time: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    total_products: int = 0
    scheduled_this_week: int = 0
    pending_days: int = 0  # 待排品天数
    hot_rate: float = 0.0  # 爆品率
    total_gmv_this_week: float = 0.0
    avg_orders_this_week: float = 0.0


class RepushSuggestion(BaseModel):
    product_id: int
    product_name: str
    last_schedule_date: Optional[date] = None
    avg_orders: float = 0.0
    reason: str = ""

    model_config = {"from_attributes": True}


class WeeklyCalendarItem(BaseModel):
    date: date
    plans: list[SchedulePlanResponse] = []
    records: list[ScheduleRecordResponse] = []
