import type { LinkType } from "@/lib/types";
import { Globe, Mail, Phone, MapPin, Star, Link2, UtensilsCrossed, Wifi, UserPlus } from "lucide-react";

type P = { className?: string };

const Svg = ({ className, children }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    {children}
  </svg>
);

const Instagram = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const Facebook = ({ className }: P) => (
  <Svg className={className}>
    <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3z" />
  </Svg>
);
const TikTok = ({ className }: P) => (
  <Svg className={className}>
    <path d="M16.6 3h-3.1v12.2a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V9.4a5.9 5.9 0 1 0 5 5.8V9.1a7.6 7.6 0 0 0 4.4 1.4V7.4A4.4 4.4 0 0 1 16.6 3z" />
  </Svg>
);
const WhatsApp = ({ className }: P) => (
  <Svg className={className}>
    <path d="M12 2.5a9.4 9.4 0 0 0-8.1 14.2L2.6 21.5l4.9-1.3A9.4 9.4 0 1 0 12 2.5zm0 17.1c-1.4 0-2.8-.4-4-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A7.7 7.7 0 1 1 12 19.6zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-3.1-2.7c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1c0 1.2.9 2.4 1 2.6.1.2 1.8 2.7 4.3 3.8 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2l-.5-.3z" />
  </Svg>
);
const YouTube = ({ className }: P) => (
  <Svg className={className}>
    <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z" />
  </Svg>
);
const XIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
  </Svg>
);
const LinkedIn = ({ className }: P) => (
  <Svg className={className}>
    <path d="M4.9 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3.2 9h3.4v11H3.2V9zm5.5 0H12v1.5c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.2 2.3 4.2 5.4V20h-3.4v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V20H8.7V9z" />
  </Svg>
);

export function LinkIcon({ type, className = "size-5" }: { type: LinkType; className?: string }) {
  switch (type) {
    case "instagram": return <Instagram className={className} />;
    case "facebook": return <Facebook className={className} />;
    case "tiktok": return <TikTok className={className} />;
    case "whatsapp": return <WhatsApp className={className} />;
    case "youtube": return <YouTube className={className} />;
    case "x": return <XIcon className={className} />;
    case "linkedin": return <LinkedIn className={className} />;
    case "maps": return <MapPin className={className} />;
    case "google_review": return <Star className={className} />;
    case "website": return <Globe className={className} />;
    case "email": return <Mail className={className} />;
    case "phone": return <Phone className={className} />;
    case "menu": return <UtensilsCrossed className={className} />;
    case "wifi": return <Wifi className={className} />;
    case "vcard": return <UserPlus className={className} />;
    default: return <Link2 className={className} />;
  }
}
