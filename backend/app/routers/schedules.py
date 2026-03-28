from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import SchedulePlan, ScheduleRecord
from ..schemas import (
    SchedulePlanCreate,
    SchedulePlanResponse,
    SchedulePlanUpdate,
    ScheduleRecordCreate,
    ScheduleRecordResponse,
)
from ..services.conflict import detect_conflicts

router = APIRouter(prefix="/api", tags=["schedules"])


# ---------------------------------------------------------------------------
# Schedule Records
# ---------------------------------------------------------------------------


@router.get("/schedule-records", response_model=list[ScheduleRecordResponse])
def list_schedule_records(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    group_type: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    performance_tag: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(ScheduleRecord)
    if date_from:
        q = q.filter(ScheduleRecord.schedule_date >= date_from)
    if date_to:
        q = q.filter(ScheduleRecord.schedule_date <= date_to)
    if group_type:
        q = q.filter(ScheduleRecord.group_type == group_type)
    if operator:
        q = q.filter(ScheduleRecord.operator == operator)
    if performance_tag:
        q = q.filter(ScheduleRecord.performance_tag == performance_tag)
    if product_id is not None:
        q = q.filter(ScheduleRecord.product_id == product_id)
    q = q.order_by(ScheduleRecord.schedule_date.desc())
    return q.offset(skip).limit(limit).all()


@router.post("/schedule-records", response_model=ScheduleRecordResponse, status_code=201)
def create_schedule_record(payload: ScheduleRecordCreate, db: Session = Depends(get_db)):
    record = ScheduleRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/schedule-records/{record_id}", response_model=ScheduleRecordResponse)
def update_schedule_record(
    record_id: int, payload: ScheduleRecordCreate, db: Session = Depends(get_db)
):
    record = db.query(ScheduleRecord).filter(ScheduleRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="排期记录不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


# ---------------------------------------------------------------------------
# Schedule Plans
# ---------------------------------------------------------------------------


@router.get("/schedule-plans", response_model=list[SchedulePlanResponse])
def list_schedule_plans(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    group_type: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(SchedulePlan)
    if date_from:
        q = q.filter(SchedulePlan.plan_date >= date_from)
    if date_to:
        q = q.filter(SchedulePlan.plan_date <= date_to)
    if group_type:
        q = q.filter(SchedulePlan.group_type == group_type)
    if operator:
        q = q.filter(SchedulePlan.operator == operator)
    if status:
        q = q.filter(SchedulePlan.status == status)
    if product_id is not None:
        q = q.filter(SchedulePlan.product_id == product_id)
    q = q.order_by(SchedulePlan.plan_date.desc())
    return q.offset(skip).limit(limit).all()


@router.post("/schedule-plans", response_model=SchedulePlanResponse, status_code=201)
def create_schedule_plan(payload: SchedulePlanCreate, db: Session = Depends(get_db)):
    # Check conflicts
    conflicts = detect_conflicts(db, payload.product_id, payload.plan_date, payload.group_type or '', payload.time_slot)

    plan = SchedulePlan(**payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)

    # Return plan with warnings header
    return plan


@router.put("/schedule-plans/{plan_id}", response_model=SchedulePlanResponse)
def update_schedule_plan(
    plan_id: int, payload: SchedulePlanUpdate, db: Session = Depends(get_db)
):
    plan = db.query(SchedulePlan).filter(SchedulePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="排期计划不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/schedule-plans/{plan_id}", status_code=204)
def delete_schedule_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(SchedulePlan).filter(SchedulePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="排期计划不存在")
    db.delete(plan)
    db.commit()
