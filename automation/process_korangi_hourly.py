#!/usr/bin/env python3
"""Merge Korangi hourly report workbooks into a public JSON dataset.

The raw workbook is downloaded from a PRIVATE intake repository by the workflow.
Only normalized readings are written to this public dashboard repository.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import date, datetime, time
from pathlib import Path
from typing import Any

from openpyxl import load_workbook

SHEET_HEADER_ROWS = {
    "Temprature": 1,
    "Power": 1,
    "Cooling": 2,
    "NDC Power": 1,
    "NDC Cooling": 2,
}
KEY_COLUMNS = {"date", "month", "year", "time"}


def clean(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).replace("\u00a0", " ").strip())


def unique_headers(ws, header_row: int) -> list[str]:
    headers: list[str] = []
    seen: dict[str, int] = {}
    parent_row = header_row - 1 if header_row > 1 else None
    active_parent = ""

    for col in range(1, ws.max_column + 1):
        child = clean(ws.cell(header_row, col).value)
        raw_parent = clean(ws.cell(parent_row, col).value) if parent_row else ""
        if raw_parent:
            active_parent = raw_parent
        parent = active_parent
        # Use the group label to disambiguate duplicate leaf headings.
        name = child
        if parent and child and parent.lower() not in {"date", "month", "year", "time"}:
            if child.lower() in {"hvac-1", "hvac-2", "hvac-3", "hvac-4", "hvac-5",
                                 "hvac-6", "hvac-7", "hvac-8", "hvac-9", "hvac-10",
                                 "hvac-11", "inrow"}:
                name = f"{parent} - {child}"
        if not name:
            name = f"Unnamed_{col}"
        base = name
        seen[base] = seen.get(base, 0) + 1
        if seen[base] > 1:
            name = f"{base}__{seen[base]}"
        headers.append(name)
    return headers


def json_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, time):
        return value.strftime("%H:%M:%S")
    if isinstance(value, str):
        return value.strip()
    return value


def month_number(value: Any) -> int | None:
    if value is None:
        return None
    text = clean(value)
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        pass
    months = ["january", "february", "march", "april", "may", "june",
              "july", "august", "september", "october", "november", "december"]
    low = text.lower()
    for i, month in enumerate(months, 1):
        if low == month or low == month[:3]:
            return i
    return None


def timestamp_key(row: dict[str, Any]) -> str | None:
    lowered = {clean(k).lower(): v for k, v in row.items()}
    d = lowered.get("date")
    m = month_number(lowered.get("month"))
    y = lowered.get("year")
    t = lowered.get("time")
    if d in (None, "") or m is None or y in (None, "") or t in (None, ""):
        return None
    try:
        if isinstance(d, (datetime, date)):
            day = d.day
            if m is None:
                m = d.month
            if y in (None, ""):
                y = d.year
        else:
            raw_date = clean(d)
            try:
                day = int(float(raw_date))
            except ValueError:
                parsed_date = None
                for fmt_date in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d-%b-%Y", "%d %b %Y"):
                    try:
                        parsed_date = datetime.strptime(raw_date, fmt_date)
                        break
                    except ValueError:
                        pass
                if parsed_date is None:
                    return None
                day = parsed_date.day
                if m is None:
                    m = parsed_date.month
                if y in (None, ""):
                    y = parsed_date.year
        year = int(float(str(y).strip()))
        if isinstance(t, time):
            clock = t.strftime("%H:%M:%S")
        elif isinstance(t, datetime):
            clock = t.strftime("%H:%M:%S")
        elif isinstance(t, (int, float)) and 0 <= float(t) < 1:
            seconds = round(float(t) * 86400) % 86400
            clock = f"{seconds // 3600:02d}:{(seconds % 3600) // 60:02d}:{seconds % 60:02d}"
        else:
            raw = clean(t)
            # Excel time may be supplied as "1:00", "01:00 AM", or "13:00".
            for fmt in ("%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p"):
                try:
                    clock = datetime.strptime(raw, fmt).strftime("%H:%M:%S")
                    break
                except ValueError:
                    clock = ""
            if not clock:
                return None
        return datetime(year, m, day).strftime("%Y-%m-%d") + "T" + clock
    except (ValueError, TypeError, OverflowError):
        return None


def read_sheet(ws, header_row: int) -> tuple[list[str], list[dict[str, Any]]]:
    headers = unique_headers(ws, header_row)
    records: list[dict[str, Any]] = []
    for row_num in range(header_row + 1, ws.max_row + 1):
        values = [json_value(ws.cell(row_num, col).value) for col in range(1, len(headers) + 1)]
        if not any(v not in (None, "") for v in values):
            continue
        record = {headers[i]: values[i] for i in range(len(headers))}
        key = timestamp_key(record)
        if not key:
            # Keep the row out of the production dataset if its primary key is incomplete.
            continue
        record["_timestamp"] = key
        records.append(record)
    return headers, records


def merge_sheet(existing: dict[str, Any], incoming_headers: list[str],
                incoming_rows: list[dict[str, Any]]) -> dict[str, Any]:
    old_headers = list(existing.get("headers") or [])
    headers = old_headers[:]
    for h in incoming_headers:
        if h not in headers:
            headers.append(h)
    # Existing records win on duplicates; a later email cannot silently rewrite history.
    by_time: dict[str, dict[str, Any]] = {}
    for row in existing.get("rows") or []:
        key = row.get("_timestamp") or timestamp_key(row)
        if key:
            by_time[key] = {h: row.get(h) for h in headers}
            by_time[key]["_timestamp"] = key
    for row in incoming_rows:
        key = row["_timestamp"]
        if key not in by_time:
            by_time[key] = {h: row.get(h) for h in headers}
            by_time[key]["_timestamp"] = key
        else:
            # Fill previously blank cells only; preserve any existing nonblank value.
            for h in headers:
                if by_time[key].get(h) in (None, "") and row.get(h) not in (None, ""):
                    by_time[key][h] = row[h]
    ordered = [by_time[k] for k in sorted(by_time)]
    return {"headers": headers, "rows": ordered, "row_count": len(ordered)}


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: process_korangi_hourly.py INPUT.xlsx OUTPUT.json")
    input_path, output_path = map(Path, sys.argv[1:])
    wb = load_workbook(input_path, read_only=True, data_only=True)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        dataset = json.loads(output_path.read_text(encoding="utf-8"))
    else:
        dataset = {"schema_version": 1, "location": "Korangi", "sheets": {}}
    dataset.setdefault("sheets", {})

    processed = []
    for sheet_name, header_row in SHEET_HEADER_ROWS.items():
        if sheet_name not in wb.sheetnames:
            print(f"WARNING: worksheet not found: {sheet_name}")
            continue
        headers, rows = read_sheet(wb[sheet_name], header_row)
        current = dataset["sheets"].get(sheet_name, {})
        dataset["sheets"][sheet_name] = merge_sheet(current, headers, rows)
        processed.append({"sheet": sheet_name, "incoming_rows": len(rows),
                          "total_rows": dataset["sheets"][sheet_name]["row_count"]})

    if not processed:
        raise SystemExit("None of the five expected Korangi worksheets were found.")
    dataset["last_processed_utc"] = datetime.now().astimezone().astimezone(__import__("datetime").timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    output_path.write_text(json.dumps(dataset, ensure_ascii=False, separators=(",", ":")),
                           encoding="utf-8")
    print(json.dumps({"processed": processed}, ensure_ascii=False))


if __name__ == "__main__":
    main()
