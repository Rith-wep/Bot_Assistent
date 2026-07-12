import csv
import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.repositories.lead import LeadRepository
from app.schemas.lead import LeadOut, LeadPage

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("", response_model=LeadPage)
def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LeadPage:
    items, total = LeadRepository(db, current_user.business_id).list_paginated(page, page_size)
    return LeadPage(
        items=[LeadOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/export")
def export_leads_csv(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> StreamingResponse:
    leads = LeadRepository(db, current_user.business_id).list_all_ordered()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Name", "Phone", "Interest", "Date", "Conversation ID"])
    for lead in leads:
        writer.writerow(
            [
                lead.customer_name or "",
                lead.phone or "",
                lead.interest or "",
                lead.created_at.isoformat(),
                lead.conversation_id,
            ]
        )
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads.csv"},
    )
