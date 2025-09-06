export const metadata = {
  title: 'Checkout Form',
  description: 'Complete your purchase with our secure checkout form',
}

export default function IframeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ background: 'transparent', margin: 0, padding: 0 }}>
      <body style={{ background: 'transparent', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
} 