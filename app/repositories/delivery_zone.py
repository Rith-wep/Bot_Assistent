from app.models.delivery_zone import DeliveryZone
from app.repositories.base import TenantRepository


class DeliveryZoneRepository(TenantRepository[DeliveryZone]):
    model = DeliveryZone

    def list_ordered(self) -> list[DeliveryZone]:
        return self._scoped_query().order_by(DeliveryZone.sort_order, DeliveryZone.id).all()
