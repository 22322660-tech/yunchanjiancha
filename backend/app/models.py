from datetime import date, datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    brand = Column(String(100))
    category = Column(String(50))  # 商品分类（奶粉/纸尿裤/辅食/护肤/玩具/服装等）
    product_type = Column(String(20))  # 预告品/非预告品/备选品
    target_age_range = Column(String(50))
    season_tag = Column(String(20))
    repurchase_cycle = Column(Integer, default=30)
    commission_rate = Column(Float)
    status = Column(String(20), default="在售")
    health_score = Column(Integer, default=50)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    schedule_records = relationship("ScheduleRecord", back_populates="product")
    schedule_plans = relationship("SchedulePlan", back_populates="product")
    submissions = relationship("ProductSubmission", back_populates="product")


class ScheduleRecord(Base):
    __tablename__ = "schedule_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    schedule_date = Column(Date, nullable=False)
    time_slot = Column(String(10))  # 上午/下午
    group_type = Column(String(10))  # 新群/老群
    operator = Column(String(20))  # 运营人员
    order_count = Column(Integer)
    gmv = Column(Float)
    performance_tag = Column(String(20))  # 爆款/正常/一般/销量下降/很差
    feedback_text = Column(Text)
    ai_predicted_orders = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    product = relationship("Product", back_populates="schedule_records")


class SchedulePlan(Base):
    __tablename__ = "schedule_plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    plan_date = Column(Date, nullable=False)
    time_slot = Column(String(10))  # 上午/下午
    group_type = Column(String(10))  # 新群/老群
    operator = Column(String(20))
    source = Column(String(20))  # 手动排期/复推采纳/AI自动生成
    status = Column(String(20), default="待审核")  # 待审核/已确认/已执行/已取消
    ai_copy = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    product = relationship("Product", back_populates="schedule_plans")


class ProductSubmission(Base):
    __tablename__ = "product_submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    submitted_by = Column(String(20))
    submit_time = Column(DateTime)
    target_group = Column(String(20))
    suggested_date = Column(Date)
    reason = Column(Text)
    review_status = Column(String(20), default="待审核")
    reviewer = Column(String(20))
    review_comment = Column(Text)
    review_time = Column(DateTime)

    product = relationship("Product", back_populates="submissions")
