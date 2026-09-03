from sqlalchemy.orm import Session

from app.models.product import Product, ProductVariant
from app.repositories.base import TenantRepository


class ProductRepository(TenantRepository[Product]):
    model = Product

    def list_ordered(self, active_only: bool = False) -> list[Product]:
        query = self._scoped_query()
        if active_only:
            query = query.filter(Product.is_active.is_(True))
        return query.order_by(Product.sort_order, Product.id).all()

    def get_variant(self, variant_id: int) -> ProductVariant | None:
        return (
            self.db.query(ProductVariant)
            .filter(ProductVariant.business_id == self.business_id, ProductVariant.id == variant_id)
            .first()
        )

    def list_variants_for_products(
        self, product_ids: list[int], active_only: bool = False
    ) -> list[ProductVariant]:
        if not product_ids:
            return []
        query = self.db.query(ProductVariant).filter(
            ProductVariant.business_id == self.business_id,
            ProductVariant.product_id.in_(product_ids),
        )
        if active_only:
            query = query.filter(ProductVariant.is_active.is_(True))
        return query.order_by(ProductVariant.product_id, ProductVariant.id).all()

    def replace_variants(self, product: Product, variants: list[dict]) -> None:
        self.db.query(ProductVariant).filter(ProductVariant.product_id == product.id).delete()
        for variant in variants:
            fields = {k: v for k, v in variant.items() if k != "id"}
            self.db.add(
                ProductVariant(
                    business_id=self.business_id,
                    product_id=product.id,
                    **fields,
                )
            )
        self.db.flush()
