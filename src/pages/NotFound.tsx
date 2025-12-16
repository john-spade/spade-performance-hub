export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900 text-white">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="mb-4">Page not found</p>
                <a href="/" className="text-gold-500 hover:text-gold-400">Go Home</a>
            </div>
        </div>
    );
}
