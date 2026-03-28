"""排品冲突检测"""
from datetime import date
from sqlalchemy.orm import Session
from ..models import Product, SchedulePlan, ScheduleRecord

def detect_conflicts(db: Session, product_id: int, plan_date: date, group_type: str, time_slot: str = None) -> list[dict]:
    """Detect scheduling conflicts for a proposed plan."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return []

    conflicts = []

    # 1. Category duplication - same day, same group, same category > 2
    same_day_plans = db.query(SchedulePlan).join(Product).filter(
        SchedulePlan.plan_date == plan_date,
        SchedulePlan.group_type == group_type,
        SchedulePlan.status.in_(['待审核', '已确认']),
        Product.category == product.category,
    ).all()

    if len(same_day_plans) >= 2:
        conflicts.append({
            'level': 'warning',
            'type': '品类重复',
            'message': f'当天已有{len(same_day_plans)}个{product.category}类商品',
            'existing': [p.product_id for p in same_day_plans],
        })

    # 2. Cycle too short
    last_record = db.query(ScheduleRecord).filter(
        ScheduleRecord.product_id == product_id,
        ScheduleRecord.group_type == group_type,
    ).order_by(ScheduleRecord.schedule_date.desc()).first()

    if last_record:
        cycle = product.repurchase_cycle or 30
        gap = (plan_date - last_record.schedule_date).days
        if gap < cycle * 0.7:
            conflicts.append({
                'level': 'warning',
                'type': '周期过短',
                'message': f'距上次推品仅{gap}天，建议周期{cycle}天',
                'last_date': last_record.schedule_date.isoformat(),
            })

    # 3. Type imbalance - too many 预告品 or too few
    same_day_all = db.query(SchedulePlan).join(Product).filter(
        SchedulePlan.plan_date == plan_date,
        SchedulePlan.group_type == group_type,
        SchedulePlan.status.in_(['待审核', '已确认']),
    ).all()

    preview_count = sum(1 for p in same_day_all if db.query(Product).get(p.product_id) and db.query(Product).get(p.product_id).product_type == '预告品')
    if product.product_type == '预告品':
        preview_count += 1

    if preview_count > 2:
        conflicts.append({
            'level': 'warning',
            'type': '类型失衡',
            'message': f'当天预告品已有{preview_count}个，建议最多1-2个',
        })

    # 4. Low health score
    if product.health_score and product.health_score < 40:
        conflicts.append({
            'level': 'warning',
            'type': '衰减商品',
            'message': f'商品健康度仅{product.health_score}分，建议选择更健康的商品',
        })

    # 5. Season mismatch
    month = plan_date.month
    season_map = {(3,4,5): '春', (6,7,8): '夏', (9,10,11): '秋', (12,1,2): '冬'}
    current_season = next((s for months, s in season_map.items() if month in months), '春')
    if product.season_tag and product.season_tag not in (current_season, '全年', ''):
        conflicts.append({
            'level': 'warning',
            'type': '季节不匹配',
            'message': f'商品标记为{product.season_tag}季，当前为{current_season}季',
        })

    return conflicts
