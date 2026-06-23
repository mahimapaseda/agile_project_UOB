'use client';

import { buildTelHref, buildWhatsAppHref, buildMailtoHref } from '@/lib/contact-links';
import { cn } from '@/lib/utils';

export type ContactLinkKind = 'tel' | 'whatsapp' | 'mailto';

interface ContactActionLinkProps {
  kind: ContactLinkKind;
  value: string;
  className?: string;
  /** @deprecated Contact links must not sit inside another anchor; layout handles click isolation. */
  stopPropagation?: boolean;
}

export function ContactActionLink({
  kind,
  value,
  className,
  stopPropagation = false,
}: ContactActionLinkProps) {
  const trimmed = value.trim();
  const href =
    kind === 'tel'
      ? buildTelHref(trimmed)
      : kind === 'whatsapp'
        ? buildWhatsAppHref(trimmed)
        : buildMailtoHref(trimmed);

  if (!href) {
    return <span className={className}>{trimmed}</span>;
  }

  return (
    <a
      href={href}
      className={cn(
        'inline-flex min-h-[44px] min-w-0 items-center underline-offset-2 transition-colors hover:underline sm:min-h-0',
        kind === 'tel' && 'text-blue-700 active:text-blue-900',
        kind === 'whatsapp' && 'text-green-700 active:text-green-900',
        kind === 'mailto' && 'text-blue-700 active:text-blue-900',
        className,
      )}
      {...(kind === 'whatsapp'
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      {trimmed}
    </a>
  );
}
