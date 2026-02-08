/**
 * Instructor Login page
 * Purpose: simple login form for instructors.
 */

export default function LoginInstructor() {
    return (
        <div>
            <h1>Instructor Login</h1>
            <form action="/instructor/dashboard" method="GET">
                <label>Email: <input type="email" name="email" required /></label><br />
                <label>Password: <input type="password" name="password" required /></label><br />
                <button type="submit">Login</button>
            </form>
            <a href="/">Back</a>
        </div>
    );
}

