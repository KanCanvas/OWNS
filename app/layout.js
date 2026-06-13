import "./globals.css";
import Header from "../components/Header";
import CartProvider from "./context/CartProvider";
import { SearchProvider } from "./context/SearchProvider";

export const metadata = {
  title: "OWNpizza",
  description: "Веб приложение пиццерии OWNpizza"
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
