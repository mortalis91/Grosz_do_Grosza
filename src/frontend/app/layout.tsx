import "./globals.css";

export const metadata = {
  title: "Grosz do Grosza",
  description: "Personal Finance Manager",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
