function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">E-Plant Shop</h1>
        <p className="text-lg text-gray-600">Premium plants for your home.</p>
      </header>

      <main className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Welcome</h2>
          <p className="text-gray-500">Your minimal modern shop is ready building.</p>
          <div className="mt-8">
            <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              Browse Products
            </button>
          </div>
        </div>
      </main>

      <footer className="mt-12 text-gray-400 text-sm">
        © 2026 E-Plant. All rights reserved.
      </footer>
    </div>
  )
}

export default App
