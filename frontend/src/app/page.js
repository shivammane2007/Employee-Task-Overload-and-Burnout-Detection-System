'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

/**
 * Home page - redirects to appropriate dashboard based on auth status
 */
export default function HomePage() {
    const router = useRouter();
    const { user, loading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (isAuthenticated() && user) {
                // Redirect based on user role
                switch (user.role) {
                    case 'admin':
                        router.push('/admin');
                        break;
                    case 'manager':
                        router.push('/manager');
                        break;
                    default:
                        router.push('/employee');
                }
            }
        }
    }, [loading, user, isAuthenticated, router]);

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="auth-page">
                <div className="spinner"></div>
            </div>
        );
    }

    // If not authenticated, show landing page
    if (!isAuthenticated()) {
        return (
            <div className="landing-page">
                <style jsx>{`
                    .landing-page {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
                        color: white;
                    }
                    
                    .landing-nav {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1.5rem 3rem;
                        max-width: 1400px;
                        margin: 0 auto;
                    }
                    
                    .landing-logo {
                        font-size: 1.5rem;
                        font-weight: 800;
                    }
                    
                    .landing-nav-links {
                        display: flex;
                        gap: 1rem;
                    }
                    
                    .landing-nav-links a {
                        color: white;
                        padding: 0.5rem 1.25rem;
                        border-radius: 0.5rem;
                        font-weight: 500;
                        transition: all 0.2s;
                    }
                    
                    .landing-nav-links a:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                    
                    .landing-nav-links a.btn-white {
                        background: white;
                        color: #1e3a8a;
                    }
                    
                    .landing-hero {
                        max-width: 1400px;
                        margin: 0 auto;
                        padding: 6rem 3rem;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 4rem;
                        align-items: center;
                    }
                    
                    .landing-hero-content h1 {
                        font-size: 3.5rem;
                        font-weight: 800;
                        line-height: 1.1;
                        margin-bottom: 1.5rem;
                        color: white;
                    }
                    
                    .landing-hero-content p {
                        font-size: 1.25rem;
                        opacity: 0.9;
                        margin-bottom: 2rem;
                        line-height: 1.6;
                    }
                    
                    .hero-buttons {
                        display: flex;
                        gap: 1rem;
                    }
                    
                    .hero-buttons a {
                        padding: 1rem 2rem;
                        border-radius: 0.75rem;
                        font-weight: 600;
                        font-size: 1rem;
                        transition: all 0.2s;
                    }
                    
                    .hero-buttons a.primary {
                        background: white;
                        color: #1e3a8a;
                    }
                    
                    .hero-buttons a.secondary {
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        border: 2px solid rgba(255, 255, 255, 0.3);
                    }
                    
                    .landing-features {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 1.5rem;
                    }
                    
                    .feature-card {
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                        padding: 1.5rem;
                        border-radius: 1rem;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .feature-icon {
                        font-size: 2rem;
                        margin-bottom: 0.75rem;
                    }
                    
                    .feature-card h3 {
                        font-size: 1.125rem;
                        margin-bottom: 0.5rem;
                        color: white;
                    }
                    
                    .feature-card p {
                        font-size: 0.875rem;
                        opacity: 0.8;
                    }
                    
                    .landing-stats {
                        background: rgba(255, 255, 255, 0.05);
                        padding: 4rem 3rem;
                    }
                    
                    .stats-container {
                        max-width: 1400px;
                        margin: 0 auto;
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 2rem;
                        text-align: center;
                    }
                    
                    .stat-item h4 {
                        font-size: 3rem;
                        font-weight: 800;
                        color: white;
                    }
                    
                    .stat-item p {
                        opacity: 0.8;
                        font-size: 0.875rem;
                        margin-top: 0.5rem;
                    }
                    
                    @media (max-width: 1024px) {
                        .landing-hero {
                            grid-template-columns: 1fr;
                            text-align: center;
                        }
                        
                        .hero-buttons {
                            justify-content: center;
                        }
                        
                        .landing-features {
                            max-width: 500px;
                            margin: 0 auto;
                        }
                        
                        .stats-container {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }
                    
                    @media (max-width: 768px) {
                        .landing-hero-content h1 {
                            font-size: 2.5rem;
                        }
                        
                        .landing-nav {
                            flex-direction: column;
                            gap: 1rem;
                        }
                        
                        .stats-container {
                            grid-template-columns: 1fr;
                        }
                    }
                `}</style>

                <nav className="landing-nav">
                    <div className="landing-logo">OverloadX</div>
                    <div className="landing-nav-links">
                        <Link href="/login">Login</Link>
                        <Link href="/register" className="btn-white">Get Started</Link>
                    </div>
                </nav>

                <section className="landing-hero">
                    <div className="landing-hero-content">
                        <h1>Prevent Employee Burnout Before It Happens</h1>
                        <p>
                            OverloadX monitors workload, analyzes task patterns, and alerts managers
                            when employees are at risk — helping teams stay healthy and productive.
                        </p>
                        <div className="hero-buttons">
                            <Link href="/register" className="primary">Start Free Trial</Link>
                            <Link href="/login" className="secondary">View Demo</Link>
                        </div>
                    </div>

                    <div className="landing-features">
                        <div className="feature-card">
                            <div className="feature-icon">📊</div>
                            <h3>Workload Analysis</h3>
                            <p>Real-time scoring based on tasks, priorities, and deadlines</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">⚡</div>
                            <h3>Burnout Detection</h3>
                            <p>AI-powered risk assessment with actionable insights</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🔔</div>
                            <h3>Smart Alerts</h3>
                            <p>Proactive notifications for managers and employees</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">📈</div>
                            <h3>Team Analytics</h3>
                            <p>Comprehensive reports and visualization dashboards</p>
                        </div>
                    </div>
                </section>

                <section className="landing-stats">
                    <div className="stats-container">
                        <div className="stat-item">
                            <h4>40%</h4>
                            <p>Reduction in burnout cases</p>
                        </div>
                        <div className="stat-item">
                            <h4>25%</h4>
                            <p>Increase in productivity</p>
                        </div>
                        <div className="stat-item">
                            <h4>90%</h4>
                            <p>Early warning accuracy</p>
                        </div>
                        <div className="stat-item">
                            <h4>100+</h4>
                            <p>Organizations trust us</p>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    // Redirecting...
    return (
        <div className="auth-page">
            <div className="spinner"></div>
        </div>
    );
}
