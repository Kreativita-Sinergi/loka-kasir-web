// SVG icons adapted from loka-kasir mobile app
// Stroke color is controlled via `className` (currentColor)

interface IconProps {
  size?: number
  className?: string
}

export function IconProduct({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M1.81128 6.43909L10.9948 11.5486L20.116 6.46905" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.9948 20.6077V11.5386" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.8419 1.47959L3.28808 4.44935C2.02963 5.11929 1 6.79911 1 8.17899V13.8285C1 15.2083 2.02963 16.8882 3.28808 17.5581L8.8419 20.5279C10.0276 21.1578 11.9724 21.1578 13.1581 20.5279L18.7119 17.5581C19.9704 16.8882 21 15.2083 21 13.8285V8.17899C21 6.79911 19.9704 5.11929 18.7119 4.44935L13.1581 1.47959C11.962 0.839648 10.0276 0.839648 8.8419 1.47959Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.195 12.2386V8.5789L6.32501 3.09937" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconLogout({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M10 1.66675V10.0001M15.3333 5.50008C16.3805 6.54767 17.0941 7.88189 17.384 9.33448C17.6739 10.7871 17.5272 12.293 16.9624 13.6623C16.3975 15.0316 15.4399 16.203 14.2102 17.0288C12.9805 17.8546 11.5338 18.2977 10.0525 18.3024C8.57131 18.307 7.12187 17.8729 5.88702 17.0549C4.65216 16.2368 3.68718 15.0715 3.11379 13.7057C2.54039 12.3399 2.38425 10.835 2.66506 9.38059C2.94587 7.92621 3.65105 6.58754 4.69167 5.53341" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
