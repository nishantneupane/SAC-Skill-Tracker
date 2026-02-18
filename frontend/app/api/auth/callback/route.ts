/**
 * OAuth Callback Handler
 * Purpose: Exchange SportsEngine authorization code for access and refresh tokens
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        // Handle OAuth errors from SportsEngine
        if (error) {
            console.error('SportsEngine OAuth error:', error);
            return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
        }

        // Validate authorization code
        if (!code) {
            console.error('No authorization code received');
            return NextResponse.redirect(new URL('/login?error=no_code', request.url));
        }

        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://user.sportsengine.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.SPORTSENGINE_CLIENT_ID,
                client_secret: process.env.SPORTSENGINE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Token exchange failed:', errorData);
            return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url));
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;

        // Fetch user info from SportsEngine to determine user type
        const userInfoResponse = await fetch('https://user.sportsengine.com/oauth/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!userInfoResponse.ok) {
            console.error('Failed to fetch user info');
            return NextResponse.redirect(new URL('/login?error=user_info_failed', request.url));
        }

        const userData = await userInfoResponse.json();

        // TODO: Determine user type from userData and fetch user details from your database
        // For now, redirect to a default dashboard
        // You may want to store tokens in a secure session or database here

        // Create response and set secure HTTP-only cookies
        const response = NextResponse.redirect(new URL('/instructor/dashboard', request.url));

        // Set secure HTTP-only cookies for tokens
        response.cookies.set({
            name: 'accessToken',
            value: accessToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: tokenData.expires_in || 1800, // 30 minutes default
        });

        response.cookies.set({
            name: 'refreshToken',
            value: refreshToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return response;
    } catch (error) {
        console.error('Callback error:', error);
        return NextResponse.redirect(new URL('/login?error=server_error', request.url));
    }
}
