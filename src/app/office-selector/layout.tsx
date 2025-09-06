export const metadata = {
  title: 'Office Selector',
  description: 'Office selector modal',
}

export default function OfficeSelectorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ background: 'transparent', margin: 0, padding: 0 }}>
      <body style={{ 
        background: 'transparent', 
        margin: 0, 
        padding: 0,
        fontFamily: 'Geologica, system-ui, -apple-system, sans-serif'
      }}>
        {children}
      </body>
    </html>
  )
}
