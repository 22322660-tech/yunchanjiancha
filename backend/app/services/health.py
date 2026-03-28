"""商品健康度评分算法"""
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import Product, ScheduleRecord

def calculate_health_score(product: Product, records: list[ScheduleRecord]) -> dict:
    """Calculate health score (0-100) for a product.

    Returns dict with score and details.
    """
    prod_records = [r for r in records if r.product_id == product.id]
    prod_records.sort(key=lambda r: r.schedule_date, reverse=True)

    if not prod_records:
        return {'score': 50, 'trend': '无数据', 'status': '正常', 'details': '暂无推品记录'}

    # 1. Performance trend score (40%)
    recent3 = prod_records[:3]
    orders = [r.order_count or 0 for r in recent3]

    if len(orders) >= 2:
        # Check trend
        declining = all(orders[i] > orders[i+1] for i in range(len(orders)-1) if orders[i+1] > 0)
        rising = all(orders[i] < orders[i+1] for i in range(len(orders)-1) if orders[i] > 0)

        if declining and len(orders) >= 2:
            # Calculate decline rate
            if orders[-1] > 0:
                decline_rate = (orders[0] - orders[-1]) / orders[-1]
            else:
                decline_rate = 1.0
            trend_score = max(0, 100 - decline_rate * 100)
            trend = '下降'
        elif rising:
            trend_score = 100
            trend = '上升'
        else:
            trend_score = 70
            trend = '平稳'
    else:
        perf = recent3[0].performance_tag or '一般'
        perf_map = {'爆款': 100, '正常': 70, '一般': 50, '销量下降': 30, '很差': 10}
        trend_score = perf_map.get(perf, 50)
        trend = '数据不足'

    # 2. Frequency score (30%)
    cycle = product.repurchase_cycle or 30
    total_days = (date.today() - prod_records[-1].schedule_date).days if prod_records else 0
    expected_count = max(1, total_days / cycle) if total_days > 0 else 1
    actual_count = len(prod_records)
    freq_ratio = actual_count / expected_count

    if 0.7 <= freq_ratio <= 1.5:
        freq_score = 100  # healthy frequency
    elif freq_ratio > 1.5:
        freq_score = max(30, 100 - (freq_ratio - 1.5) * 50)  # over-pushed
    else:
        freq_score = max(30, freq_ratio / 0.7 * 100)  # under-pushed

    # 3. Recent performance score (30%)
    perf_scores_map = {'爆款': 100, '正常': 70, '一般': 40, '销量下降': 20, '很差': 0}
    recent_perf = [perf_scores_map.get(r.performance_tag or '一般', 40) for r in recent3]
    perf_avg = sum(recent_perf) / len(recent_perf)

    # Total
    total = trend_score * 0.4 + freq_score * 0.3 + perf_avg * 0.3
    score = round(min(max(total, 0), 100))

    # Determine status
    if score >= 80:
        status = '明星商品'
    elif score >= 60:
        status = '正常'
    elif score >= 40:
        status = '效果递减'
    elif score >= 20:
        status = '建议淘汰'
    else:
        status = '建议淘汰'

    # Check for "forgotten" products
    last_date = prod_records[0].schedule_date
    gap = (date.today() - last_date).days
    if gap > cycle * 2 and score >= 50:
        status = '被遗漏'

    return {
        'score': score,
        'trend': trend,
        'status': status,
        'avg_orders': round(sum(orders) / len(orders), 1) if orders else 0,
        'schedule_count': len(prod_records),
        'last_date': last_date.isoformat() if prod_records else None,
        'gap_days': gap if prod_records else None,
    }

def update_all_health_scores(db: Session):
    """Recalculate health scores for all products."""
    products = db.query(Product).filter(Product.status == '在售').all()
    records = db.query(ScheduleRecord).all()

    results = []
    for product in products:
        health = calculate_health_score(product, records)
        product.health_score = health['score']
        results.append({
            'product_id': product.id,
            'product_name': product.name,
            **health,
        })

    db.commit()
    return results

def get_health_board(db: Session, group_type: str = None) -> dict:
    """Get health board data grouped by status."""
    products = db.query(Product).filter(Product.status == '在售').all()
    q = db.query(ScheduleRecord)
    if group_type:
        q = q.filter(ScheduleRecord.group_type == group_type)
    records = q.all()

    categories = {
        '效果递减': [],
        '建议淘汰': [],
        '被遗漏': [],
        '明星商品': [],
    }

    for product in products:
        health = calculate_health_score(product, records)
        item = {'product_id': product.id, 'product_name': product.name, **health}

        if health['status'] in categories:
            categories[health['status']].append(item)

    return categories
