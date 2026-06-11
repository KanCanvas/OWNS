import "./globals.css";
import Header from "../components/Header";
import CartProvider from "./context/CartProvider";

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

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <div className="container app-shell">
          <CartProvider>
            <Header />
            <main className="page">{children}</main>
          </CartProvider>
        </div>
      </body>
    </html>
  );
}
