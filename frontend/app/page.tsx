/**
 * Home page
 * Purpose: initial landing page that redirects to login. This is the default route and serves as a simple entry point to the application.
 */

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="text-center">
                <p className="text-gray-600">Redirecting to login page...</p>
                <script dangerouslySetInnerHTML={{ __html: 'window.location.href = "/login";' }} />
            </div>
        </div>
    );
}
