import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Happen — Le prochain niveau, ensemble",
  description:
    "Ta room, tes objectifs, tes potes. Transformez vos formations tech en progrès concrets avec Happen.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
