import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BundledScrew {
    productId: number;
    name: string;
    reference: string;
}

export interface CartItem {
    productId: number;
    name: string;
    price: string;
    quantity: number;
    stockQuantity?: number;
    image?: string | null;
    variantReference?: string;
    variantLabel?: string;
    bundledScrew?: BundledScrew;
    // Set on the screw line item itself
    isBundledScrew?: boolean;
    bundledForProductId?: number;
    bundledForVariantRef?: string;
}

export interface CartState {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (productId: number, variantReference?: string) => void;
    updateQuantity: (productId: number, quantity: number, variantReference?: string) => void;
    clearCart: () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
}

function bundledScrewVariantRef(tibaseProductId: number, tibaseVariantRef: string): string {
    return `__bundled__${tibaseProductId}__${tibaseVariantRef}`;
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

                    let newItems: CartItem[];
                    if (existingItem) {
                        newItems = state.items.map((i) =>
                            i.productId === item.productId &&
                            (i.variantReference || '') === (item.variantReference || '')
                                ? {
                                    ...i,
                                    quantity: i.quantity + 1,
                                    stockQuantity: item.stockQuantity ?? i.stockQuantity,
                                    bundledScrew: item.bundledScrew ?? i.bundledScrew,
                                }
                                : i
                        );
                        // Sync bundled screw quantity
                        const newQty = existingItem.quantity + 1;
                        const screwRef = bundledScrewVariantRef(item.productId, item.variantReference || '');
                        newItems = newItems.map((i) =>
                            i.isBundledScrew &&
                            i.bundledForProductId === item.productId &&
                            i.bundledForVariantRef === (item.variantReference || '')
                                ? { ...i, quantity: newQty }
                                : i
                        );
                        void screwRef;
                    } else {
                        newItems = [...state.items, { ...item, quantity: 1 }];
                        // Add bundled screw as a separate line item
                        if (item.bundledScrew) {
                            const screwItem: CartItem = {
                                productId: item.bundledScrew.productId,
                                name: item.bundledScrew.name,
                                price: '0.00',
                                quantity: 1,
                                variantReference: bundledScrewVariantRef(item.productId, item.variantReference || ''),
                                isBundledScrew: true,
                                bundledForProductId: item.productId,
                                bundledForVariantRef: item.variantReference || '',
                            };
                            newItems = [...newItems, screwItem];
                        }
                    }
                    return { items: newItems };
                });

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent('cart:item-added', {
                            detail: {
                                productId: item.productId,
                                name: item.name,
                            },
                        })
                    );
                }
            },

            removeItem: (productId, variantReference) => {
                set((state) => ({
                    items: state.items.filter(
                        (i) =>
                            !(
                                i.productId === productId &&
                                (i.variantReference || '') === (variantReference || '')
                            ) &&
                            // Also remove any bundled screw tied to this TiBase item
                            !(
                                i.isBundledScrew &&
                                i.bundledForProductId === productId &&
                                i.bundledForVariantRef === (variantReference || '')
                            )
                    ),
                }));
            },

            updateQuantity: (productId, quantity, variantReference) => {
                if (quantity <= 0) {
                    get().removeItem(productId, variantReference);
                    return;
                }

                const currentItem = get().items.find(
                    (i) =>
                        i.productId === productId &&
                        (i.variantReference || '') === (variantReference || '')
                );
                const isIncrease = !!currentItem && quantity > currentItem.quantity;

                set((state) => ({
                    items: state.items.map((i) => {
                        if (
                            i.productId === productId &&
                            (i.variantReference || '') === (variantReference || '')
                        ) {
                            return { ...i, quantity };
                        }
                        // Sync bundled screw quantity with TiBase
                        if (
                            i.isBundledScrew &&
                            i.bundledForProductId === productId &&
                            i.bundledForVariantRef === (variantReference || '')
                        ) {
                            return { ...i, quantity };
                        }
                        return i;
                    }),
                }));

                if (isIncrease && typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent('cart:item-added', {
                            detail: {
                                productId,
                            },
                        })
                    );
                }
            },

            clearCart: () => {
                set({ items: [] });
            },

            getTotalItems: () => {
                return get().items
                    .filter((item) => !item.isBundledScrew)
                    .reduce((total, item) => total + item.quantity, 0);
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
