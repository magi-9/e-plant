class ProductService:
    @staticmethod
    def should_show_price(user):
        return bool(user and user.is_authenticated)

    @classmethod
    def apply_price_visibility(cls, data, user):
        if cls.should_show_price(user):
            return data

        def _scrub_prices(value):
            if isinstance(value, dict):
                for key, nested in value.items():
                    if key == "price":
                        value[key] = None
                    else:
                        _scrub_prices(nested)
            elif isinstance(value, list):
                for nested in value:
                    _scrub_prices(nested)

        _scrub_prices(data)
        if isinstance(data, (dict, list)):
            return data

        return data
