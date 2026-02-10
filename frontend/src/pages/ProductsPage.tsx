import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/products';
import { Link } from 'react-router-dom';

export default function ProductsPage() {
    const { data: products, isLoading, error } = useQuery({
        queryKey: ['products'],
        queryFn: getProducts,
    });

    const isLoggedIn = !!localStorage.getItem('access_token');

    if (isLoading) return <div className="text-center p-10">Loading products...</div>;
    if (error) return <div className="text-center p-10 text-red-500">Error loading products</div>;

    return (
        <div className="bg-white">
            <div className="max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:max-w-7xl lg:px-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Our Products</h2>
                    {!isLoggedIn && (
                        <Link to="/login" className="text-green-600 hover:text-green-500">
                            Login to see prices
                        </Link>
                    )}
                    {isLoggedIn && (
                        <button onClick={() => {
                            localStorage.removeItem('access_token');
                            localStorage.removeItem('refresh_token');
                            window.location.reload();
                        }} className="text-red-600 hover:text-red-500">
                            Logout
                        </button>
                    )}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                    {products?.map((product) => (
                        <div key={product.id} className="group relative">
                            <div className="w-full min-h-80 bg-gray-200 aspect-w-1 aspect-h-1 rounded-md overflow-hidden group-hover:opacity-75 lg:aspect-none lg:h-80">
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-center object-cover lg:w-full lg:h-full"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        No Image
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 flex justify-between">
                                <div>
                                    <h3 className="text-sm text-gray-700">
                                        <a href="#">
                                            <span aria-hidden="true" className="absolute inset-0" />
                                            {product.name}
                                        </a>
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">{product.category}</p>
                                </div>
                                <p className="text-sm font-medium text-gray-900">
                                    {product.price ? `$${product.price}` : '---'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
