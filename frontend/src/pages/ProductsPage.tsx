
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/products';
import type { Product } from '../api/products';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon } from '@heroicons/react/24/solid';
import { useCartStore } from '../store/cartStore';
import ProductDetailModal from '../components/ProductDetailModal';

export default function ProductsPage() {
    const { data: products, isLoading, error } = useQuery({
        queryKey: ['products'],
        queryFn: getProducts,
    });

    const { addItem, items, updateQuantity, removeItem } = useCartStore();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [openModal, setOpenModal] = useState(false);
    const [addingId, setAddingId] = useState<number | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [minPrice, setMinPrice] = useState<number | ''>('');
    const [maxPrice, setMaxPrice] = useState<number | ''>('');

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
        setOpenModal(true);
    };

    const handleAddToCart = (e: React.MouseEvent, product: Product) => {
        e.stopPropagation(); // Prevent opening modal
        setAddingId(product.id);

        addItem({
            productId: product.id,
            name: product.name,
            price: product.price!,
            image: product.image
        });

        setTimeout(() => {
            setAddingId(null);
        }, 600);
    };

    if (isLoading) return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error) return (
        <div className="text-center py-10">
            <p className="text-red-500 text-lg">Chyba pri načítavaní produktov. Skúste to prosím neskôr.</p>
        </div>
    );

    const categories = Array.from(new Set((products || []).map((p: Product) => p.category)));

    const filteredProducts = (products || []).filter((product: Product) => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const nameMatch = product.name?.toLowerCase().includes(query);
            const descMatch = product.description?.toLowerCase().includes(query);
            if (!nameMatch && !descMatch) return false;
        }

        if (selectedCategory && product.category !== selectedCategory) {
            return false;
        }

        if (product.price) {
            const price = parseFloat(product.price);
            if (minPrice !== '' && price < minPrice) return false;
            if (maxPrice !== '' && price > maxPrice) return false;
        }

        return true;
    });

    return (
        <div className="bg-gray-50 flex flex-col min-h-screen">
            {/* Sticky Navbar padding is handled in App.tsx or by main margin */}

            {/* Hero Section */}
            <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900">
                <div className="absolute inset-0">
                    <img
                        className="w-full h-full object-cover opacity-20"
                        src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80"
                        alt="Dental background"
                    />
                    <div className="absolute inset-0 bg-blue-950 mix-blend-multiply" aria-hidden="true" />
                </div>
                <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Dentálne Implantáty Najvyššej Kvality
                    </h1>
                    <p className="mt-6 text-xl text-blue-100 max-w-3xl">
                        Objavte našu prémiovú kolekciu dentálnych implantátov a chirurgických nástrojov.
                        Od presných abutmentov až po vysokokvalitné nástroje pre implantológiu - všetko pre vašu zubnú prax.
                    </p>
                </div>
            </div>

            {/* Product Grid */}
            <div className="max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:max-w-7xl lg:px-8">

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hľadať produkt</label>
                        <input
                            type="text"
                            placeholder="Názov alebo popis..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategória</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                        >
                            <option value="">Všetky</option>
                            {categories.map((cat: string) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-64 flex gap-2">
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cena od (€)</label>
                            <input
                                type="number"
                                min="0"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cena do (€)</label>
                            <input
                                type="number"
                                min="0"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Naše Produkty</h2>
                    <span className="text-sm text-gray-500">{filteredProducts.length} produktov</span>
                </div>

                {filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-gray-100">
                        <p className="text-gray-500 text-lg">Nenašli sa žiadne produkty vyhovujúce filtrom.</p>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('');
                                setMinPrice('');
                                setMaxPrice('');
                            }}
                            className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Zrušiť filtre
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                        {filteredProducts.map((product: Product) => (
                            <div
                                key={product.id}
                                onClick={() => handleProductClick(product)}
                                className="group relative bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 cursor-pointer flex flex-col"
                            >
                                <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 xl:aspect-w-7 xl:aspect-h-8">
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-in-out"
                                        />
                                    ) : (
                                        <div className="h-64 w-full bg-blue-50 flex items-center justify-center text-blue-200 group-hover:bg-blue-100 transition-colors">
                                            <span className="sr-only">Bez obrázka</span>
                                            <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                                {product.name}
                                            </h3>
                                            <p className="mt-1 text-sm text-blue-600 font-medium">{product.category}</p>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-600 line-clamp-2 mb-4 flex-grow">{product.description || 'Kvalitný dentálny produkt pre vašu prax.'}</p>

                                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                        {product.price ? (
                                            <p className="text-xl font-bold text-blue-700">{product.price} €</p>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Členská cena
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-4">
                                        {product.price ? (() => {
                                            const cartItem = items.find(item => item.productId === product.id);

                                            if (cartItem) {
                                                return (
                                                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md p-1 h-10 w-full shadow-sm">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (cartItem.quantity > 1) {
                                                                    updateQuantity(product.id, cartItem.quantity - 1);
                                                                } else {
                                                                    removeItem(product.id);
                                                                }
                                                            }}
                                                            className="w-10 h-full flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-md transition font-bold"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="font-bold text-blue-900 border-x border-blue-200 px-4 flex-1 text-center h-full flex items-center justify-center bg-white">
                                                            {cartItem.quantity} <span className="text-xs font-normal text-blue-500 ml-1">v košíku</span>
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateQuantity(product.id, cartItem.quantity + 1);
                                                            }}
                                                            className="w-10 h-full flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-md transition font-bold"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <button
                                                    onClick={(e) => handleAddToCart(e, product)}
                                                    className={`w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none transition-all duration-300 transform h-10 ${addingId === product.id
                                                        ? 'bg-green-500 scale-105'
                                                        : 'bg-blue-600 hover:bg-blue-700'
                                                        }`}
                                                >
                                                    {addingId === product.id ? (
                                                        <>
                                                            <svg className="h-5 w-5 mr-2 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Pridané!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShoppingCartIcon className="h-4 w-4 mr-2" />
                                                            Pridať do košíka
                                                        </>
                                                    )}
                                                </button>
                                            );
                                        })() : (
                                            <Link
                                                to="/login"
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full flex justify-center items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none transition-colors h-10"
                                            >
                                                Prihláste sa
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ProductDetailModal
                open={openModal}
                setOpen={setOpenModal}
                product={selectedProduct}
            />
        </div>
    );
}
