import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scrolls the window to the top on every route change.
// Mounted once in App.jsx inside <BrowserRouter> so it fires
// automatically on every navigation — header, navbar, footer,
// any link anywhere in the app.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
