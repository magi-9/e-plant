from rest_framework import serializers
from .models import Order, OrderItem
from products.models import Product
from decimal import Decimal
import uuid


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, source='get_subtotal')

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_name', 'quantity', 'price_snapshot', 'subtotal')
        read_only_fields = ('id', 'product', 'price_snapshot')


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemInputSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = (
            'customer_name',
            'email',
            'phone',
            'shipping_address',
            'payment_method',
            'notes',
            'items'
        )

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must contain at least one item.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Generate unique order number
        order_number = str(uuid.uuid4())[:8].upper()
        
        # Calculate total and validate products
        total_price = Decimal('0.00')
        items_to_create = []
        
        for item_data in items_data:
            try:
                product = Product.objects.get(id=item_data['product_id'])
            except Product.DoesNotExist:
                raise serializers.ValidationError(f"Product with id {item_data['product_id']} does not exist.")
            
            quantity = item_data['quantity']
            
            # Validate stock (will be implemented in next commit)
            if product.stock_quantity < quantity:
                raise serializers.ValidationError(
                    f"Not enough stock for product '{product.name}'. Available: {product.stock_quantity}, Requested: {quantity}"
                )
            
            # Use product's current price as snapshot
            price_snapshot = product.price
            subtotal = price_snapshot * quantity
            total_price += subtotal
            
            items_to_create.append({
                'product': product,
                'quantity': quantity,
                'price_snapshot': price_snapshot
            })
        
        # Get user if authenticated
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        
        # Create order
        order = Order.objects.create(
            user=user,
            order_number=order_number,
            total_price=total_price,
            **validated_data
        )
        
        # Create order items
        for item_data in items_to_create:
            OrderItem.objects.create(
                order=order,
                **item_data
            )
        
        return order


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id',
            'order_number',
            'customer_name',
            'email',
            'phone',
            'shipping_address',
            'payment_method',
            'status',
            'total_price',
            'notes',
            'items',
            'created_at',
            'updated_at'
        )
        read_only_fields = ('id', 'order_number', 'status', 'total_price', 'created_at', 'updated_at')
