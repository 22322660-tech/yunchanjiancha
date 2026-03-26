import re
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from openpyxl import load_workbook
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product, ScheduleRecord

router = APIRouter(prefix="/api/import", tags=["import"])

# In-memory store for parsed preview data (keyed by a simple session token).
# In production this should use Redis or a database table.
_parsed_cache: dict[str, list[dict[str, Any]]] = {}


def _detect_operator(filename: str) -> str:
    """Try to extract operator name from the filename."""
    # Remove extension
    name = filename.rsplit(".", 1)[0] if "." in filename else filename
    # Common patterns: "排品表_小美", "小美_排品", etc.
    parts = re.split(r"[_\-\s]", name)
    # Return last meaningful part as operator, or the whole name
    for part in reversed(parts):
        if part and not re.search(r"排品|表|数据|导入|模板", part):
            return part
    return name


def _detect_product_type(sheet_name: str) -> str:
    """Detect product type from sheet name."""
    if "预告" in sheet_name:
        return "预告品"
    if "备选" in sheet_name:
        return "备选品"
    return "非预告品"


def _parse_cell_value(cell_value: Any) -> tuple[list[date], str]:
    """Parse a cell value to extract dates and feedback text.

    Cells may contain:
    - Dates (datetime objects from Excel)
    - Strings with dates like "3/15" or "2025-03-15"
    - Feedback text mixed in
    """
    dates: list[date] = []
    feedback = ""

    if cell_value is None:
        return dates, feedback

    if isinstance(cell_value, datetime):
        dates.append(cell_value.date())
        return dates, feedback

    if isinstance(cell_value, date):
        dates.append(cell_value)
        return dates, feedback

    text = str(cell_value).strip()
    if not text:
        return dates, feedback

    # Try to find date patterns in the text
    # Pattern: M/D or MM/DD
    date_pattern = re.compile(r"(\d{1,2})[/.](\d{1,2})")
    matches = date_pattern.findall(text)
    current_year = datetime.now().year

    for month_str, day_str in matches:
        try:
            month = int(month_str)
            day = int(day_str)
            if 1 <= month <= 12 and 1 <= day <= 31:
                dates.append(date(current_year, month, day))
        except ValueError:
            pass

    # Everything that is not a date pattern is feedback
    remaining = date_pattern.sub("", text).strip(" ,;，；、\n\r\t")
    if remaining:
        feedback = remaining

    return dates, feedback


@router.post("/excel")
async def import_excel(file: UploadFile = File(...)):
    """Upload and parse an Excel file. Returns a preview of parsed data."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")

    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx / .xls 文件")

    operator = _detect_operator(file.filename)

    try:
        contents = await file.read()
        from io import BytesIO

        wb = load_workbook(filename=BytesIO(contents), data_only=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"无法读取 Excel 文件: {exc}")

    parsed_rows: list[dict[str, Any]] = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        product_type = _detect_product_type(sheet_name)

        # Read header row to get month/column mapping
        header_row = list(ws.iter_rows(min_row=1, max_row=1, values_only=True))
        if not header_row:
            continue
        headers = header_row[0]

        # Each subsequent row: first column = product name, remaining = date cells
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not row[0]:
                continue
            product_name = str(row[0]).strip()
            if not product_name:
                continue

            for col_idx, cell_value in enumerate(row[1:], start=1):
                if cell_value is None:
                    continue
                col_header = headers[col_idx] if col_idx < len(headers) else None
                dates, feedback = _parse_cell_value(cell_value)

                for d in dates:
                    parsed_rows.append(
                        {
                            "product_name": product_name,
                            "product_type": product_type,
                            "schedule_date": d.isoformat(),
                            "operator": operator,
                            "feedback_text": feedback,
                            "sheet_name": sheet_name,
                            "column_header": str(col_header) if col_header else None,
                        }
                    )

                # If no dates found but there is feedback, still record it
                if not dates and feedback:
                    parsed_rows.append(
                        {
                            "product_name": product_name,
                            "product_type": product_type,
                            "schedule_date": None,
                            "operator": operator,
                            "feedback_text": feedback,
                            "sheet_name": sheet_name,
                            "column_header": str(col_header) if col_header else None,
                        }
                    )

    # Store parsed data for confirmation
    import uuid

    token = uuid.uuid4().hex[:16]
    _parsed_cache[token] = parsed_rows

    return {
        "token": token,
        "operator": operator,
        "total_rows": len(parsed_rows),
        "preview": parsed_rows[:50],  # Return first 50 rows as preview
    }


@router.post("/confirm")
def confirm_import(
    token: str,
    db: Session = Depends(get_db),
):
    """Confirm and save previously parsed Excel data."""
    if token not in _parsed_cache:
        raise HTTPException(status_code=404, detail="预览数据已过期或不存在，请重新上传")

    rows = _parsed_cache.pop(token)
    created_products = 0
    created_records = 0

    for row in rows:
        # Find or create product
        product = (
            db.query(Product).filter(Product.name == row["product_name"]).first()
        )
        if not product:
            product = Product(
                name=row["product_name"],
                product_type=row["product_type"],
            )
            db.add(product)
            db.flush()
            created_products += 1

        # Create schedule record if we have a date
        if row.get("schedule_date"):
            record = ScheduleRecord(
                product_id=product.id,
                schedule_date=date.fromisoformat(row["schedule_date"]),
                operator=row.get("operator"),
                feedback_text=row.get("feedback_text") or None,
            )
            db.add(record)
            created_records += 1

    db.commit()

    return {
        "created_products": created_products,
        "created_records": created_records,
        "total_processed": len(rows),
    }
