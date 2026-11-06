import "./globals.css";

export const metadata = {
  title: "Bingo 4x4",
  description: "เกมบิงโก กระดาน 4x4",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
