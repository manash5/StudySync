import type { Metadata } from 'next'
import '../index.css'

export const metadata: Metadata = {
  title: 'StudySync',
  description: 'Your semester, made easy.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
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
