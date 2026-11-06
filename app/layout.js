import "./globals.css";

export const metadata = {
  title: "Bingo 5x5",
  description: "เกมบิงโก กระดาน 5x5",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
