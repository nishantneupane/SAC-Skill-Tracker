/**
 * Home page
 * Purpose: landing/root page for the SAC Skill Tracker app.
 */

export default function Home() {
    return (
        <div>
            <h1>SAC Skill Tracker</h1>
            <ul>
                <li><a href="/login-instructor">Instructor Login</a></li>
                <li><a href="/login-parent">Parent Login</a></li>
            </ul>
        </div>
    );
}
