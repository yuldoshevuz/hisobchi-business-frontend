import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Rendered after children, separated by a top margin. */
  footer?: React.ReactNode;
  /** When false, the modal cannot be dismissed by overlay click / esc / drag. */
  dismissible?: boolean;
  /** Extra classes for the inner content surface. */
  contentClassName?: string;
  children: React.ReactNode;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  footer,
  dismissible = true,
  contentClassName,
  children,
}: ModalProps): React.ReactElement {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out"
        />
        <DialogPrimitive.Content
          onPointerDownOutside={
            dismissible ? undefined : (e) => e.preventDefault()
          }
          onEscapeKeyDown={
            dismissible ? undefined : (e) => e.preventDefault()
          }
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-2xl bg-card pb-[max(env(safe-area-inset-bottom),16px)] shadow-2xl outline-none data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out',
            contentClassName,
          )}
        >
          <div className="sticky top-0 z-10 flex justify-center bg-card pb-2 pt-3">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="px-4 pb-4">
            <ModalHeader title={title} description={description} />
            {children}
            {footer ? <div className="mt-4">{footer}</div> : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface ModalHeaderProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

function ModalHeader({
  title,
  description,
}: ModalHeaderProps): React.ReactElement {
  // Radix requires Dialog.Title for a11y. Render a visually-hidden fallback
  // when the caller did not supply one so screen readers still announce the
  // dialog correctly.
  if (!title && !description) {
    return (
      <DialogPrimitive.Title className="sr-only">Modal</DialogPrimitive.Title>
    );
  }
  return (
    <div className="mb-4 space-y-1 text-center">
      {title ? (
        <DialogPrimitive.Title className="text-lg font-semibold leading-tight">
          {title}
        </DialogPrimitive.Title>
      ) : (
        <DialogPrimitive.Title className="sr-only">Modal</DialogPrimitive.Title>
      )}
      {description ? (
        <DialogPrimitive.Description className="text-sm text-muted-foreground">
          {description}
        </DialogPrimitive.Description>
      ) : null}
    </div>
  );
}
