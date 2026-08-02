import { MessageCircle } from 'lucide-react';

export default function WhatsAppWidget() {
  const number = (import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || '+2348055488895').replace('+', '');
  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent('Hi TechGrind, I need help with...')}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white rounded-full p-4 shadow-lg hover:scale-105 transition-transform"
      aria-label="Chat with us on WhatsApp"
    >
      <MessageCircle size={24} />
    </a>
  );
}
