from datetime import datetime
from typing import Annotated

from pydantic import PlainSerializer

# Our DB columns store naive UTC datetimes (see app.core.time.utcnow).
# Serialized as-is, a JS `new Date(...)` on the receiving end would parse
# a timezone-less ISO string as LOCAL time, silently shifting every
# timestamp shown in the UI. Appending "Z" makes the UTC-ness explicit.
UtcDatetime = Annotated[
    datetime,
    PlainSerializer(lambda dt: dt.isoformat() + "Z", return_type=str),
]
