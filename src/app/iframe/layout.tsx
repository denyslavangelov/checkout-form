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
      <body style={{ background: 'transparent', margin: 0, padding: 0, fontFamily: 'Geologica, system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  )
} 