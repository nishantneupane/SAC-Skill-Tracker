/**
 * Instructor Login page
 */

'use client';

import { useRouter } from 'next/navigation';

export default function LoginInstructor() {
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.push('/instructor/dashboard');
    };

    return (
        <div>
            <h1>Instructor Login</h1>
            <form onSubmit={handleSubmit}>
                <label>
                    Email: <input type="email" required />
                </label>
                <br />
                <label>
                    Password: <input type="password" required />
                </label>
                <br />
                <button type="submit">Login</button>
            </form>
            <a href="/">Back</a>
        </div>
    );
}
