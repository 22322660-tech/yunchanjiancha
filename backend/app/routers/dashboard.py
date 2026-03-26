from datetime import date, timedelta

from fastapi import APIRouter, Depends
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


@router.get("/repush-suggestions", response_model=list[RepushSuggestion])
def get_repush_suggestions(db: Session = Depends(get_db)):
    """Return top 5 products that are good candidates for re-scheduling.

    Criteria: products with past records tagged 爆款 or 正常, sorted by average
    order count descending, that have not been scheduled in the last
    `repurchase_cycle` days.
    """
    today = date.today()

    # Sub-query: latest schedule date per product
    latest_date_sq = (
        db.query(
            ScheduleRecord.product_id,
            func.max(ScheduleRecord.schedule_date).label("last_date"),
            func.avg(ScheduleRecord.order_count).label("avg_orders"),
        )
        .filter(
            ScheduleRecord.performance_tag.in_(["爆款", "正常"]),
        )
        .group_by(ScheduleRecord.product_id)
        .subquery()
    )

    rows = (
        db.query(
            Product.id,
            Product.name,
            Product.repurchase_cycle,
            latest_date_sq.c.last_date,
            latest_date_sq.c.avg_orders,
        )
        .join(latest_date_sq, Product.id == latest_date_sq.c.product_id)
        .order_by(latest_date_sq.c.avg_orders.desc())
        .limit(10)
        .all()
    )

    suggestions: list[RepushSuggestion] = []
    for pid, pname, cycle, last_dt, avg_ord in rows:
        cycle = cycle or 30
        if last_dt and (today - last_dt).days >= cycle:
            reason = f"上次排期 {last_dt.isoformat()}，已超过复购周期 {cycle} 天"
        elif last_dt:
            reason = f"历史平均单量 {round(avg_ord or 0, 1)}，表现优秀"
        else:
            reason = "历史表现优秀"
        suggestions.append(
            RepushSuggestion(
                product_id=pid,
                product_name=pname,
                last_schedule_date=last_dt,
                avg_orders=round(float(avg_ord or 0), 1),
                reason=reason,
            )
        )
        if len(suggestions) >= 5:
            break

    return suggestions
