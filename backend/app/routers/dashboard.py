from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product, SchedulePlan, ScheduleRecord
from ..schemas import (
    DashboardStats,
    RepushSuggestion,
    SchedulePlanResponse,
    ScheduleRecordResponse,
    WeeklyCalendarItem,
)
from ..services.repush import get_repush_list
from ..services.health import get_health_board, update_all_health_scores
from ..services.conflict import detect_conflicts

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _current_week_range() -> tuple[date, date]:
    """Return (monday, sunday) of the current week."""
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    monday, sunday = _current_week_range()

    total_products = db.query(func.count(Product.id)).scalar() or 0

    # Records scheduled this week
    scheduled_this_week = (
        db.query(func.count(ScheduleRecord.id))
        .filter(
            ScheduleRecord.schedule_date >= monday,
            ScheduleRecord.schedule_date <= sunday,
        )
        .scalar()
        or 0
    )

    # Days this week that still have no plans
    planned_dates = (
        db.query(SchedulePlan.plan_date)
        .filter(SchedulePlan.plan_date >= monday, SchedulePlan.plan_date <= sunday)
        .distinct()
        .all()
    )
    planned_date_set = {row[0] for row in planned_dates}
    week_dates = [monday + timedelta(days=i) for i in range(7)]
    pending_days = sum(1 for d in week_dates if d not in planned_date_set)

    # Hot rate (爆品率): percentage of records tagged as 爆款 this week
    total_records_week = (
        db.query(func.count(ScheduleRecord.id))
        .filter(
            ScheduleRecord.schedule_date >= monday,
            ScheduleRecord.schedule_date <= sunday,
        )
        .scalar()
        or 0
    )
    hot_count = (
        db.query(func.count(ScheduleRecord.id))
        .filter(
            ScheduleRecord.schedule_date >= monday,
            ScheduleRecord.schedule_date <= sunday,
            ScheduleRecord.performance_tag == "爆款",
        )
        .scalar()
        or 0
    )
    hot_rate = (hot_count / total_records_week * 100) if total_records_week > 0 else 0.0

    # GMV & avg orders
    total_gmv = (
        db.query(func.sum(ScheduleRecord.gmv))
        .filter(
            ScheduleRecord.schedule_date >= monday,
            ScheduleRecord.schedule_date <= sunday,
        )
        .scalar()
        or 0.0
    )
    avg_orders = (
        db.query(func.avg(ScheduleRecord.order_count))
        .filter(
            ScheduleRecord.schedule_date >= monday,
            ScheduleRecord.schedule_date <= sunday,
        )
        .scalar()
        or 0.0
    )

    return DashboardStats(
        total_products=total_products,
        scheduled_this_week=scheduled_this_week,
        pending_days=pending_days,
        hot_rate=round(hot_rate, 1),
        total_gmv_this_week=round(float(total_gmv), 2),
        avg_orders_this_week=round(float(avg_orders), 1),
    )


@router.get("/weekly-calendar", response_model=list[WeeklyCalendarItem])
def get_weekly_calendar(db: Session = Depends(get_db)):
    monday, sunday = _current_week_range()
    week_dates = [monday + timedelta(days=i) for i in range(7)]

    result: list[WeeklyCalendarItem] = []
    for d in week_dates:
        plans = db.query(SchedulePlan).filter(SchedulePlan.plan_date == d).all()
        records = db.query(ScheduleRecord).filter(ScheduleRecord.schedule_date == d).all()
        result.append(
            WeeklyCalendarItem(
                date=d,
                plans=[SchedulePlanResponse.model_validate(p) for p in plans],
                records=[ScheduleRecordResponse.model_validate(r) for r in records],
            )
        )
    return result


@router.get("/repush-suggestions")
def get_repush_suggestions(
    group_type: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    days: int = Query(7),
    db: Session = Depends(get_db),
):
    return get_repush_list(db, group_type, operator, days)


@router.get("/health-board")
def get_health_board_data(
    group_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return get_health_board(db, group_type)


@router.post("/health-update")
def trigger_health_update(db: Session = Depends(get_db)):
    return update_all_health_scores(db)


@router.post("/conflict-check")
def check_conflicts(
    product_id: int,
    plan_date: date,
    group_type: str,
    time_slot: str = None,
    db: Session = Depends(get_db),
):
    return detect_conflicts(db, product_id, plan_date, group_type, time_slot)
