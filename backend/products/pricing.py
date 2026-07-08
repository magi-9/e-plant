from decimal import Decimal

DEALER_PRICE_DIVISOR = Decimal("0.60")


def calculate_net_price_from_dealer(dealer_price):
    return (Decimal(str(dealer_price)) / DEALER_PRICE_DIVISOR).quantize(Decimal("0.01"))
