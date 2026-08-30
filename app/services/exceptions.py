class BusinessRuleError(Exception):
    """A clean, expected failure caused by invalid business input or state."""

    status_code = 400

    def __init__(self, detail: str, status_code: int | None = None):
        super().__init__(detail)
        self.detail = detail
        if status_code is not None:
            self.status_code = status_code


class NotFoundError(BusinessRuleError):
    status_code = 404


class ConflictError(BusinessRuleError):
    status_code = 409


class OutOfStockError(ConflictError):
    pass
