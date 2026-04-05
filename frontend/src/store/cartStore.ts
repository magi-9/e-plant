import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    productId: number;
    name: string;
    price: string;
    quantity: number;
    image?: string | null;
    variantReference?: string;
    variantLabel?: string;
}

interface CartState {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (productId: number, variantReference?: string) => void;
    updateQuantity: (productId: number, quantity: number, variantReference?: string) => void;
    clearCart: () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (item) => {
                set((state) => {
                    const existingItem = state.items.find(
                        (i) =>
                            i.productId === item.productId &&
                            (i.variantReference || '') === (item.variantReference || '')
                    );

                    if (existingItem) {
                        // Increase quantity if item already exists
                        return {
                            items: state.items.map((i) =>
                                i.productId === item.productId &&
                                (i.variantReference || '') === (item.variantReference || '')
                                    ? { ...i, quantity: i.quantity + 1 }
                                    : i
                            ),
                        };
                    } else {
                        // Add new item with quantity 1
                        return {
                            items: [...state.items, { ...item, quantity: 1 }],
                        };
                    }
                });
            },

            removeItem: (productId, variantReference) => {
                set((state) => ({
                    items: state.items.filter(
                        (i) =>
                            !(
                                i.productId === productId &&
                                (i.variantReference || '') === (variantReference || '')
                            )
                    ),
                }));
            },

            updateQuantity: (productId, quantity, variantReference) => {
                if (quantity <= 0) {
                    get().removeItem(productId, variantReference);
                    return;
                }

                set((state) => ({
                    items: state.items.map((i) =>
                        i.productId === productId &&
                        (i.variantReference || '') === (variantReference || '')
                            ? { ...i, quantity }
                            : i
                    ),
                }));
            },

            clearCart: () => {
                set({ items: [] });
            },

            getTotalItems: () => {
                return get().items.reduce((total, item) => total + item.quantity, 0);
            },

            getTotalPrice: () => {
                return get().items.reduce(
                    (total, item) => total + Number.parseFloat(item.price) * item.quantity,
                    0
                );
            },
        }),
        {
            name: 'cart-storage',
        }
    )
);
