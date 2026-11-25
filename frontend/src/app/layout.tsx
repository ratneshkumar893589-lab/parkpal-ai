import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ParkPal AI | Smart Parking",
  description: "Find your perfect parking spot before you arrive."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
