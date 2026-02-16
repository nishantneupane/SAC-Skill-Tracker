/**
 * Login page
 * Purpose: unified login page using SportsEngine/TeamUnify SSO for all user types
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSSOLogin = () => {
        setIsLoading(true);
        // Redirect to SportsEngine/TeamUnify OAuth endpoint
        // TODO: Replace with actual SportsEngine/TeamUnify SSO URL
        const ssoUrl = process.env.NEXT_PUBLIC_SSO_LOGIN_URL || 'https://sso.sportssengine.com/oauth/authorize';
        window.location.href = ssoUrl;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                </div>

                {/* Title and Subtitle */}

                {/* TODO: Replace with actual app name and tagline (SAC Swim Tracker? ) */}
                <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">AquaTrack</h1>
                <p className="text-center text-sm text-gray-600 mb-6">Swimming Analytical Dashboard</p>

                {/* SportsEngine/TeamUnify Button */}
                <button
                    onClick={handleSSOLogin}
                    disabled={isLoading}
                    className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-md mb-3 transition duration-200"
                >
                    {isLoading ? 'Signing in...' : 'Sign in with SportsEngine'}
                </button>

                {/* Help Button */}
                {/* TODO: Replace alert with actual help functionality (e.g. contact form, FAQ page, etc.)  */}
                <button
                    onClick={() => alert('Please contact your instructor or admin for assistance.')}
                    className="w-full text-blue-600 hover:text-blue-800 font-semibold py-2 px-1 rounded-md mb-2 transition duration-200"
                >
                    {'Need Help?'}
                </button>

                {/* DEV: Test Skip Login */}
                <button onClick={() => router.push('/instructor/dashboard')}>DEV: Login Instructor</button>

                <p className="mt-2"> </p>

                <button onClick={() => router.push('/parent/dashboard')}>DEV: Login Parent</button>

            </div>
        </div>
    );
}

