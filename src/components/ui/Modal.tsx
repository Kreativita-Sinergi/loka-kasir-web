import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  /**
   * Diteruskan ke Radix DialogContent. Berguna saat ada modal/overlay lain
   * yang dirender di luar konten dialog (mis. crop gambar) — panggil
   * e.preventDefault() agar klik di overlay tsb tidak menutup modal ini.
   */
  onInteractOutside?: React.ComponentProps<typeof DialogContent>['onInteractOutside']
}

export default function Modal({ open, onClose, title, children, size = 'md', onInteractOutside }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent size={size} onInteractOutside={onInteractOutside}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  )
}
