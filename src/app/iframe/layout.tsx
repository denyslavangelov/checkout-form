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
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
} 