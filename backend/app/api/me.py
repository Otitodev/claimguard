from fastapi import APIRouter, Depends

from ..auth import get_current_practice
from ..models import Practice

router = APIRouter(tags=["me"])


@router.get("/me/practice")
def my_practice(practice: Practice = Depends(get_current_practice)) -> dict:
    """The authenticated user's practice (created on first call)."""
    return {"id": str(practice.id), "name": practice.name}
