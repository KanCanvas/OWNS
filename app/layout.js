import "./globals.css";
import Header from "../components/Header";

export const metadata = {
  title: "OWNpizza",
  description: "Веб приложение пиццерии OWNpizza"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <div className="container app-shell">
          <Header />
          <main className="page">{children}</main>
        </div>
      </body>
    </html>
  );
}
