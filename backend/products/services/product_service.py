class ProductService:
    @staticmethod
    def should_show_price(user):
        return bool(user and user.is_authenticated)

    @classmethod
    def apply_price_visibility(cls, data, user):
        if cls.should_show_price(user):
            return data

        # Handle paginated response (dict with "results" key)
        if isinstance(data, dict) and "results" in data:
            for item in data.get("results", []):
                item["price"] = None
            return data

        # Handle list response
        if isinstance(data, list):
            for item in data:
                item["price"] = None
            return data

        # Handle single item response
        if isinstance(data, dict):
            data["price"] = None
            return data

        return data
