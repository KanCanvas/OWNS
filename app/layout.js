import "./globals.css";
import Header from "../components/Header";
import MetaPixel from "../components/MetaPixel";
import CartProvider from "./context/CartProvider";
import { SearchProvider } from "./context/SearchProvider";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ownpizza.kz"),
  title: "OWNpizza",
  description: "Доставка пиццы в Петропавловске — OWNpizza",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/img/logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "OWNpizza",
    description: "Доставка пиццы в Петропавловске",
    url: "https://ownpizza.kz",
    siteName: "OWNpizza",
    images: [
      {
        url: "/img/logo.png",
        width: 512,
        height: 512,
        alt: "OWNpizza",
      },
    ],
    locale: "ru_KZ",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ff8a4d"
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <MetaPixel />
        <div className="container app-shell">
          <CartProvider>
            <SearchProvider>
              <Header />
              <main className="page">{children}</main>
            </SearchProvider>
          </CartProvider>
        </div>
      </body>
    </html>
  );
}
