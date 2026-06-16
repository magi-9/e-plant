"""
Dev-only seed: put selected TiBase + screw products in stock and create
realistic sample orders so the full checkout/invoice flow can be tested.

Usage:
    python manage.py seed_dev_data
    python manage.py seed_dev_data --reset   (wipe existing orders first)
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from orders.models import Order, OrderItem
from products.models import Product
from products.compatibility import get_compatible_screws_for_tibase

User = get_user_model()

TIBASE_REFS = [
    "31.312.011.21-2",  # CAMLOG / DYNAMIC 3TIBASE – compat 0011
    "31.313.012.21-2",  # CAMLOG / DYNAMIC 3TIBASE
    "31.314.085.21-2",  # XIVE  / DYNAMIC 3TIBASE  – compat 0085
    "31.312.267.01-2",  # dynamic-only screws
    "31.312.047.21-2",  # BIOMET 3i
    "31.310.110.01-2",  # old-style TITANIUM BASE (screw included)
    "31.323.151.01-2",  # old-style
    "31.321.084.01-2",  # old-style
    "31.313.030.01-2",  # 0030 standard TiBase
    "31.313.030.21-2",  # 0030 Dynamic 3TiBase
    "31.323.030.01-2",  # 0030 standard TiBase
    "31.323.030.21-2",  # 0030 Dynamic 3TiBase
]

SCREW_STOCK = 50
TIBASE_STOCK = 10


class Command(BaseCommand):
    help = "Seed dev stock and sample orders for TiBase / free-screw testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete all existing orders before seeding.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            deleted, _ = Order.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} existing orders."))

        self._seed_stock()
        self._seed_orders()
        self.stdout.write(self.style.SUCCESS("Dev seed complete."))

    # ── stock ─────────────────────────────────────────────────────────────────

    def _seed_stock(self):
        screw_refs_all = set()

        for ref in TIBASE_REFS:
            try:
                p = Product.objects.get(reference=ref)
            except Product.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f"  TiBase {ref!r} not found, skipped.")
                )
                continue
            p.stock_quantity = TIBASE_STOCK
            p.save(update_fields=["stock_quantity"])
            self.stdout.write(f"  ✓ TiBase {ref} → stock {TIBASE_STOCK}")

            result = get_compatible_screws_for_tibase(ref)
            screw_refs_all.update(result["straight"])
            screw_refs_all.update(result["dynamic"])

        for ref in screw_refs_all:
            updated = Product.objects.filter(reference=ref).update(
                stock_quantity=SCREW_STOCK
            )
            if updated:
                self.stdout.write(f"  ✓ Screw  {ref} → stock {SCREW_STOCK}")
            else:
                self.stdout.write(self.style.WARNING(f"  Screw {ref!r} not in DB."))

        # Give a few misc products stock so orders look realistic
        misc_ids = list(
            Product.objects.exclude(stock_quantity__gt=0)
            .filter(price__isnull=False)
            .values_list("id", flat=True)[:20]
        )
        if misc_ids:
            Product.objects.filter(id__in=misc_ids).update(stock_quantity=25)
            self.stdout.write(f"  ✓ {len(misc_ids)} misc products → stock 25")

    # ── orders ────────────────────────────────────────────────────────────────

    def _seed_orders(self):
        client = self._get_or_create_client()

        specs = [
            ("awaiting_payment", 0, self._tibase_items(1) + self._misc_items(2)),
            ("awaiting_payment", 1, self._tibase_items(2) + self._misc_items(1)),
            ("paid", 3, self._tibase_items(1) + self._misc_items(3)),
            ("paid", 5, self._tibase_items(2)),
            ("shipped", 7, self._tibase_items(1) + self._misc_items(2)),
            ("shipped", 8, self._misc_items(4)),
            ("completed", 14, self._tibase_items(1) + self._misc_items(1)),
            ("completed", 20, self._misc_items(3)),
            ("completed", 30, self._tibase_items(2) + self._misc_items(2)),
            ("cancelled", 10, self._misc_items(2)),
        ]

        created = 0
        for status, days_ago, items in specs:
            order = self._create_order(client, status, days_ago, items)
            if order:
                created += 1

        self.stdout.write(f"  ✓ Created {created} sample orders for {client.email}")

    def _get_or_create_client(self):
        email = "testclient@example.com"
        user, was_created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": "Ján",
                "last_name": "Testovič",
                "phone": "+421900123456",
                "is_active": True,
                "is_company": True,
                "company_name": "Testovacia Klinika s.r.o.",
                "ico": "12345678",
                "dic": "2023456789",
                "street": "Hlavná 1",
                "city": "Bratislava",
                "postal_code": "81101",
                "country": "SK",
            },
        )
        if was_created:
            user.set_password("testpass123")
            user.save()
            self.stdout.write(f"  ✓ Created test user {email}  (password: testpass123)")
        return user

    def _tibase_items(self, count=1):
        items = []
        tbs = list(
            Product.objects.filter(
                reference__in=TIBASE_REFS, stock_quantity__gt=0
            ).order_by("?")[:count]
        )
        for tb in tbs:
            result = get_compatible_screws_for_tibase(tb.reference or "")
            all_refs = result["straight"] + result["dynamic"]
            screw = (
                Product.objects.filter(
                    reference__in=all_refs, stock_quantity__gt=0
                ).first()
                if all_refs
                else None
            )
            items.append(
                {
                    "product": tb,
                    "quantity": random.randint(1, 3),
                    "bundled_screw": screw,
                }
            )
        return items

    def _misc_items(self, count=2):
        products = list(
            Product.objects.filter(stock_quantity__gt=0, price__isnull=False)
            .exclude(reference__in=TIBASE_REFS)
            .order_by("?")[:count]
        )
        return [
            {"product": p, "quantity": random.randint(1, 5), "bundled_screw": None}
            for p in products
        ]

    def _create_order(self, user, status, days_ago, items):
        order_items_data = []
        total = Decimal("0.00")

        for item in items:
            p = item["product"]
            if p.price is None:
                continue
            qty = item["quantity"]
            total += p.price * qty
            order_items_data.append(
                {"product": p, "quantity": qty, "price": p.price, "is_free": False}
            )
            screw = item.get("bundled_screw")
            if screw and screw.price is not None:
                order_items_data.append(
                    {
                        "product": screw,
                        "quantity": qty,
                        "price": Decimal("0.00"),
                        "is_free": True,
                    }
                )

        if not order_items_data:
            return None

        shipping_cost = (
            Decimal("5.00") if total < Decimal("100.00") else Decimal("0.00")
        )
        total += shipping_cost

        # Generate a unique order number via the service helper
        year = timezone.now().year
        prefix = f"{year}X"
        last = (
            Order.objects.filter(order_number__startswith=prefix)
            .order_by("-order_number")
            .values_list("order_number", flat=True)
            .first()
        )
        seq = int(last[len(prefix) :]) + 1 if last else 1
        order_number = f"{prefix}{seq:04d}"

        order = Order.objects.create(
            order_number=order_number,
            user=user,
            customer_name=f"{user.first_name} {user.last_name}",
            email=user.email,
            phone=user.phone or "+421900000000",
            is_company=user.is_company,
            company_name=user.company_name or "",
            ico=user.ico or "",
            dic=user.dic or "",
            is_vat_payer=getattr(user, "is_vat_payer", False),
            street=user.street or "Hlavná 1",
            city=user.city or "Bratislava",
            postal_code=user.postal_code or "81101",
            country=user.country or "SK",
            status=status,
            payment_method="bank_transfer",
            shipping_method="courier",
            shipping_cost=shipping_cost,
            total_price=total,
            invoice_sent=(status in ("shipped", "completed")),
        )

        Order.objects.filter(pk=order.pk).update(
            created_at=timezone.now() - timedelta(days=days_ago)
        )

        for d in order_items_data:
            OrderItem.objects.create(
                order=order,
                product=d["product"],
                quantity=d["quantity"],
                price_snapshot=d["price"],
                vat_rate_snapshot=d["product"].vat_rate,
                is_free=d["is_free"],
            )

        self.stdout.write(
            f"  ✓ Order #{order.id} [{status:<20}]  "
            f"{len(order_items_data)} items  total={total:.2f}€  "
            f"(days ago: {days_ago})"
        )
        return order
