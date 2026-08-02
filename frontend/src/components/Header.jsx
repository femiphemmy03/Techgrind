import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const dashboardPath = {
    admin: '/admin',
    lecturer: '/lecturer/dashboard',
    student: '/dashboard',
    affiliate: '/affiliate/dashboard',
  }[user?.role];

  return (
    <header className="sticky top-0 z-50 bg-ink/95 backdrop-blur border-b border-surfaceborder">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link to="/" aria-label="TechGrind home">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          {!user && (
            <>
              <Link to="/" className="text-muted hover:text-offwhite transition-colors">Home</Link>
              <Link to="/affiliate" className="text-muted hover:text-offwhite transition-colors">Become an Affiliate</Link>
              <Link to="/contact" className="text-muted hover:text-offwhite transition-colors">Contact</Link>
              <Link to="/login" className="text-offwhite hover:text-tggreen transition-colors">Log in</Link>
              <Link to="/register" className="btn-primary !px-5 !py-2">Register</Link>
            </>
          )}
          {user && (
            <>
              <Link to={dashboardPath} className="text-offwhite hover:text-tggreen transition-colors">Dashboard</Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-muted hover:text-offwhite transition-colors"
              >
                <LogOut size={16} /> Log out
              </button>
            </>
          )}
          <ThemeToggle />
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button className="text-offwhite" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-surfaceborder px-5 py-4 flex flex-col gap-4 text-sm">
          {!user && (
            <>
              <Link to="/" onClick={() => setOpen(false)}>Home</Link>
              <Link to="/affiliate" onClick={() => setOpen(false)}>Become an Affiliate</Link>
              <Link to="/contact" onClick={() => setOpen(false)}>Contact</Link>
              <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
              <button className="btn-primary w-full" onClick={() => { setOpen(false); navigate('/register'); }}>Register</button>
            </>
          )}
          {user && (
            <>
              <Link to={dashboardPath} onClick={() => setOpen(false)}>Dashboard</Link>
              <button onClick={logout} className="text-left text-muted">Log out</button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
