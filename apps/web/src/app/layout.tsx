import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Agent Arena",
  description: "Competitive AI agent platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
