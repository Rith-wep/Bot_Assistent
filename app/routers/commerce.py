from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.models.business import Business, BusinessType
from app.models.order import OrderStatus
from app.models.product import ProductVariant
from app.repositories.delivery_zone import DeliveryZoneRepository
from app.repositories.order import OrderRepository
from app.repositories.product import ProductRepository
from app.schemas.commerce import (
    DeliveryZoneCreate,
    DeliveryZoneOut,
    DeliveryZoneUpdate,
    OrderCreate,
    OrderOut,
    OrderPage,
    OrderStatusUpdate,
    ProductCreate,
    ProductExtractRequest,
    ProductExtractResponse,
    ProductOut,
    ProductUpdate,
)
from app.services.ai import clear_prompt_context_cache, extract_products
from app.services.commerce import create_validated_order, order_to_dict
from app.services.exceptions import BusinessRuleError

router = APIRouter(prefix="/api", tags=["commerce"])


def _retail_only(db: Session, current_user: CurrentUser) -> None:
    business = db.get(Business, current_user.business_id)
    if business is None or business.business_type != BusinessType.product_retail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commerce is only enabled for retail businesses")


def _product_out(db: Session, product) -> ProductOut:
    variants = (
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product.id)
        .order_by(ProductVariant.id)
        .all()
    )
    out = ProductOut.model_validate(product)
    out.variants = variants
    return out


@router.get("/products", response_model=list[ProductOut])
def list_products(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    products = ProductRepository(db, current_user.business_id).list_ordered()
    return [_product_out(db, product) for product in products]


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    data = payload.model_dump()
    variants = data.pop("variants")
    repo = ProductRepository(db, current_user.business_id)
    product = repo.create(**data)
    repo.replace_variants(product, variants)
    db.commit()
    clear_prompt_context_cache(current_user.business_id)
    db.refresh(product)
    return _product_out(db, product)


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    repo = ProductRepository(db, current_user.business_id)
    product = repo.get(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    data = payload.model_dump()
    variants = data.pop("variants")
    for field, value in data.items():
        setattr(product, field, value)
    repo.replace_variants(product, variants)
    db.commit()
    clear_prompt_context_cache(current_user.business_id)
    db.refresh(product)
    return _product_out(db, product)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    if not ProductRepository(db, current_user.business_id).delete(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    db.commit()
    clear_prompt_context_cache(current_user.business_id)


@router.post("/products/ai-extract", response_model=ProductExtractResponse)
async def ai_extract_products(payload: ProductExtractRequest, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    products = await extract_products(payload.text)
    if products is None:
        raise HTTPException(status_code=503, detail="Could not analyze this product list right now.")
    return ProductExtractResponse(products=products)


@router.get("/delivery-zones", response_model=list[DeliveryZoneOut])
def list_delivery_zones(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    return DeliveryZoneRepository(db, current_user.business_id).list_ordered()


@router.post("/delivery-zones", response_model=DeliveryZoneOut, status_code=status.HTTP_201_CREATED)
def create_delivery_zone(payload: DeliveryZoneCreate, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    zone = DeliveryZoneRepository(db, current_user.business_id).create(**payload.model_dump())
    db.commit()
    clear_prompt_context_cache(current_user.business_id)
    db.refresh(zone)
    return zone


@router.put("/delivery-zones/{zone_id}", response_model=DeliveryZoneOut)
def update_delivery_zone(zone_id: int, payload: DeliveryZoneUpdate, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    repo = DeliveryZoneRepository(db, current_user.business_id)
    zone = repo.get(zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail="Delivery zone not found")
    for field, value in payload.model_dump().items():
        setattr(zone, field, value)
    db.commit()
    clear_prompt_context_cache(current_user.business_id)
    db.refresh(zone)
    return zone


@router.delete("/delivery-zones/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_delivery_zone(zone_id: int, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    if not DeliveryZoneRepository(db, current_user.business_id).delete(zone_id):
        raise HTTPException(status_code=404, detail="Delivery zone not found")
    db.commit()
    clear_prompt_context_cache(current_user.business_id)


@router.get("/orders", response_model=OrderPage)
def list_orders(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    items, total = OrderRepository(db, current_user.business_id).list_paginated(page, page_size)
    return OrderPage(items=[OrderOut.model_validate(order_to_dict(db, current_user.business_id, item)) for item in items], total=total, page=page, page_size=page_size)


@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    try:
        order = create_validated_order(db, current_user.business_id, **payload.model_dump())
    except BusinessRuleError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    db.commit()
    db.refresh(order)
    return OrderOut.model_validate(order_to_dict(db, current_user.business_id, order))


@router.put("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(order_id: int, payload: OrderStatusUpdate, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _retail_only(db, current_user)
    allowed = {
        OrderStatus.pending: {OrderStatus.confirmed, OrderStatus.cancelled},
        OrderStatus.confirmed: {OrderStatus.shipped, OrderStatus.cancelled},
        OrderStatus.shipped: set(),
        OrderStatus.cancelled: set(),
    }
    order = OrderRepository(db, current_user.business_id).get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if payload.status != order.status and payload.status not in allowed[order.status]:
        raise HTTPException(status_code=400, detail="Invalid order status transition")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return OrderOut.model_validate(order_to_dict(db, current_user.business_id, order))
