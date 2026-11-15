import secrets

from fastapi import Header, HTTPException, status

from .config import get_settings


def require_operator(x_operator_token: str | None = Header(default=None)) -> None:
    expected = get_settings().operator_token
    if not x_operator_token or not secrets.compare_digest(x_operator_token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Operator token required",
        )

