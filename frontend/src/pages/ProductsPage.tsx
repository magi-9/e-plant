
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/products';
import type { Product } from '../api/products';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon } from '@heroicons/react/24/solid';
import { useCartStore } from '../store/cartStore';

export default function ProductsPage() {
    const { data: products, isLoading, error } = useQuery({
        queryKey: ['products'],
        queryFn: getProducts,
    });
    
    const addItem = useCartStore((state) => state.addItem);

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

    return (
        <div className="bg-gray-50">
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
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Naše Produkty</h2>

                <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                    {products?.map((product: Product) => (
                        <div key={product.id} className="group relative bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 xl:aspect-w-7 xl:aspect-h-8">
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="h-full w-full object-cover object-center group-hover:opacity-75 transition-opacity"
                                    />
                                ) : (
                                    <div className="h-64 w-full bg-blue-50 flex items-center justify-center text-blue-200">
                                        <span className="sr-only">Bez obrázka</span>
                                        <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {product.name}
                                        </h3>
                                        <p className="mt-1 text-sm text-blue-600 font-medium">{product.category}</p>
                                    </div>
                                    {product.price ? (
                                        <p className="text-lg font-bold text-blue-700">{product.price} €</p>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Členská cena
                                        </span>
                                    )}
                                </div>
                                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{product.description || 'Kvalitný dentálny produkt pre vašu prax.'}</p>

                                <div className="mt-4">
                                    {product.price ? (
                                        <button 
                                            onClick={() => {
                                                addItem({
                                                    productId: product.id,
                                                    name: product.name,
                                                    price: product.price!,
                                                    image: product.image
                                                });
                                            }}
                                            className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                        >
                                            <ShoppingCartIcon className="h-4 w-4 mr-2" />
                                            Pridať do košíka
                                        </button>
                                    ) : (
                                        <Link to="/login" className="w-full flex justify-center items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                                            Prihláste sa pre cenu
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
