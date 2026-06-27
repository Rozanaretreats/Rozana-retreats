import { useResolvedHkPhoto } from '../hooks/useResolvedHkPhoto'

type ResolvedHkImageProps = {
  src?: string
  alt: string
  className?: string
}

export function ResolvedHkImage({ src, alt, className }: ResolvedHkImageProps) {
  const resolved = useResolvedHkPhoto(src)
  if (!resolved) return null
  return <img src={resolved} alt={alt} className={className} />
}
