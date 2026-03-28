"""复推评分算法 - 基于PRD的四维度评分体系"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import Product, ScheduleRecord, SchedulePlan

# Default repurchase cycles by category (from PRD data analysis)
DEFAULT_CYCLES = {
    '纸尿裤': 25, '拉拉裤': 25,
    '营养品': 30, 'D3': 30, 'AD': 30, 'DHA': 30, '钙': 30,
    '清洗剂': 37, '日用消耗': 37, '退热贴': 35,
    '护肤': 52, '面霜': 52, '防晒': 52,
    '大件': 75, '床围': 75, '推车': 75, '浴盆': 75,
    '防溢乳垫': 25, '隔尿垫': 18,
}

# Performance tag to score mapping
PERF_SCORES = {'爆款': 100, '正常': 70, '一般': 40, '销量下降': 20, '很差': 0}

# Current season helper
def get_current_season() -> str:
    month = date.today().month
    if month in (3, 4, 5): return '春'
    if month in (6, 7, 8): return '夏'
    if month in (9, 10, 11): return '秋'
    return '冬'

def calculate_repush_score(product: Product, records: list[ScheduleRecord], group_type: str = None, operator: str = None) -> dict:
    """Calculate repush score for a product.

    Returns dict with:
    - total_score: float (0-100)
    - performance_score: float - 历史表现分 (40% weight)
    - cycle_score: float - 复推周期分 (25% weight)
    - type_score: float - 品类需求分 (20% weight)
    - season_score: float - 季节匹配分 (15% weight)
    - last_date: date or None
    - gap_days: int
    - avg_orders: float
    - suggested_date: date
    """

    # Filter records for this product, optionally by group_type and operator
    prod_records = [r for r in records if r.product_id == product.id]
    if group_type:
        prod_records = [r for r in prod_records if r.group_type == group_type]
    if operator:
        prod_records = [r for r in prod_records if r.operator == operator]

    # Sort by date desc, take recent 3
    prod_records.sort(key=lambda r: r.schedule_date, reverse=True)
    recent = prod_records[:3]

    # 1. Performance score (40%) - weighted average of recent 3
    if recent:
        weights = [0.5, 0.3, 0.2][:len(recent)]
        total_weight = sum(weights)
        perf_score = sum(PERF_SCORES.get(r.performance_tag or '一般', 40) * w for r, w in zip(recent, weights)) / total_weight
    else:
        perf_score = 50  # default for products with no records

    # 2. Cycle score (25%)
    cycle = product.repurchase_cycle or DEFAULT_CYCLES.get(product.category, 30)
    last_date = recent[0].schedule_date if recent else None
    today = date.today()

    if last_date:
        gap_days = (today - last_date).days
        cycle_ratio = gap_days / cycle if cycle > 0 else 1
        if cycle_ratio >= 2:
            cycle_score = 100 + 10  # bonus for long overdue
        elif cycle_ratio >= 1:
            cycle_score = 100
        elif cycle_ratio >= 0.7:
            cycle_score = 70
        else:
            cycle_score = max(0, cycle_ratio * 100)
    else:
        gap_days = 999
        cycle_score = 100  # never scheduled = should schedule

    # 3. Type score (20%)
    type_map = {'预告品': 100, '非预告品': 70, '备选品': 50}
    type_score = type_map.get(product.product_type, 60)

    # 4. Season score (15%)
    current_season = get_current_season()
    if product.season_tag == current_season:
        season_score = 100
    elif product.season_tag in ('全年', None, ''):
        season_score = 80
    else:
        season_score = 0

    # Calculate total
    total = perf_score * 0.4 + cycle_score * 0.25 + type_score * 0.2 + season_score * 0.15

    # Average orders
    all_orders = [r.order_count for r in prod_records if r.order_count]
    avg_orders = sum(all_orders) / len(all_orders) if all_orders else 0

    # Suggested date
    if last_date:
        suggested = last_date + timedelta(days=cycle)
        if suggested < today:
            suggested = today + timedelta(days=1)
    else:
        suggested = today + timedelta(days=1)

    return {
        'product_id': product.id,
        'product_name': product.name,
        'product_type': product.product_type or '',
        'category': product.category or '',
        'total_score': round(min(total, 100), 1),
        'performance_score': round(perf_score, 1),
        'cycle_score': round(min(cycle_score, 100), 1),
        'type_score': round(type_score, 1),
        'season_score': round(season_score, 1),
        'last_date': last_date,
        'gap_days': gap_days,
        'avg_orders': round(avg_orders, 1),
        'suggested_date': suggested,
        'repurchase_cycle': cycle,
        'schedule_count': len(prod_records),
    }

def get_repush_list(db: Session, group_type: str = None, operator: str = None, days: int = 7) -> list[dict]:
    """Generate the full repush list sorted by score."""
    # Get all active products
    products = db.query(Product).filter(Product.status == '在售').all()

    # Get all records
    q = db.query(ScheduleRecord)
    if group_type:
        q = q.filter(ScheduleRecord.group_type == group_type)
    records = q.all()

    # Get already planned product_ids
    planned_q = db.query(SchedulePlan.product_id).filter(
        SchedulePlan.status.in_(['待审核', '已确认']),
        SchedulePlan.plan_date >= date.today(),
    )
    if group_type:
        planned_q = planned_q.filter(SchedulePlan.group_type == group_type)
    if operator:
        planned_q = planned_q.filter(SchedulePlan.operator == operator)
    planned_ids = {row[0] for row in planned_q.all()}

    results = []
    for product in products:
        score_data = calculate_repush_score(product, records, group_type, operator)
        score_data['already_planned'] = product.id in planned_ids

        # Only include if cycle score indicates it's time (>= 70% of cycle)
        if score_data['cycle_score'] >= 50 or score_data['gap_days'] >= 999:
            results.append(score_data)

    # Sort by total score desc
    results.sort(key=lambda x: x['total_score'], reverse=True)
    return results
