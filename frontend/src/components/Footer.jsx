import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  const whatsapp = import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || '+2348055488895';
  const email = import.meta.env.VITE_CONTACT_EMAIL || 'techgrindng@gmail.com';

  return (
    <footer className="border-t border-surfaceborder bg-ink mt-24">
      <div className="max-w-6xl mx-auto px-5 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <Logo />
          <p className="text-muted text-sm mt-4 leading-relaxed">
            Learn the skill. Join a startup. Become the employer.
          </p>
        </div>

        <div>
          <h4 className="text-offwhite font-semibold mb-3 text-sm">Platform</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link to="/" className="hover:text-tggreen">Home</Link></li>
            <li><Link to="/register" className="hover:text-tggreen">Register</Link></li>
            <li><Link to="/affiliate" className="hover:text-tggreen">Affiliate Program</Link></li>
            <li><Link to="/login" className="hover:text-tggreen">Log in</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-offwhite font-semibold mb-3 text-sm">Support</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link to="/contact" className="hover:text-tggreen">Contact Us</Link></li>
            <li><a href={`mailto:${email}`} className="hover:text-tggreen">{email}</a></li>
            <li><a href={`https://wa.me/${whatsapp.replace('+', '')}`} className="hover:text-tggreen">WhatsApp: {whatsapp}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-offwhite font-semibold mb-3 text-sm">Legal</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link to="/privacy-policy" className="hover:text-tggreen">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="hover:text-tggreen">Terms of Service</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-surfaceborder">
        <div className="max-w-6xl mx-auto px-5 py-6 text-xs text-muted flex flex-col md:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} TechGrind — Powered by Oluwafemi Sunmola Technologies LTD (RC: 8815307)</span>
        </div>
      </div>
    </footer>
  );
}
