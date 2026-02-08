/**
 * Root layout
 * Purpose: global app layout and providers for the Next.js application (applies to all pages).
 */

export const metadata = {
    title: 'SAC Skill Tracker',
    description: 'Swimming skill tracking app',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}

