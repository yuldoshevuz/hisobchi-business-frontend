import { useCallback } from 'react';
import {
  useCategories,
  useSystemCategories,
} from '@/api/hooks/use-categories';
import { useCreateContact } from '@/api/hooks/use-contacts';
import { useInviteMember } from '@/api/hooks/use-members';
import { useCreateProduct } from '@/api/hooks/use-products';
import { tgHapticNotify } from '@/lib/telegram';
import type { ContactType } from '@/types/contact.types';

interface InlineCreateResult {
  creating: boolean;
  onCreate: (name: string) => Promise<number | null>;
}

/**
 * Shared "search-or-create" plumbing for the `ContactPickerField`. Wraps
 * the standard `useCreateContact` mutation so every form that picks a
 * contact can offer the same inline-create UX without each one
 * re-implementing the haptics / null-return / type-defaulting bits.
 *
 * `defaultType` controls the role assigned to the new contact (customer
 * for sale forms, supplier for purchase forms, partner for neutral
 * flows). The backend allows `null` but a sensible default keeps the
 * contact list searchable later.
 */
export function useInlineCreateContact(
  defaultType?: ContactType | null,
): InlineCreateResult {
  const mutation = useCreateContact();
  const onCreate = useCallback(
    async (name: string): Promise<number | null> => {
      try {
        const created = await mutation.mutateAsync({
          name,
          ...(defaultType ? { type: defaultType } : {}),
        });
        tgHapticNotify('success');
        return created.id;
      } catch {
        tgHapticNotify('error');
        return null;
      }
    },
    [mutation, defaultType],
  );
  return { creating: mutation.isPending, onCreate };
}

/**
 * Shared "search-or-create" plumbing for the `MemberPickerField`.
 * Creates a staff-only member (`phone=null, userId=null`) so the picker
 * can immediately select the row. The auto-link listener attaches a
 * User account later if/when the named person registers with a phone.
 */
export function useInlineCreateMember(): InlineCreateResult {
  const mutation = useInviteMember();
  const onCreate = useCallback(
    async (name: string): Promise<number | null> => {
      try {
        const created = await mutation.mutateAsync({ fullName: name });
        tgHapticNotify('success');
        return created.id;
      } catch {
        tgHapticNotify('error');
        return null;
      }
    },
    [mutation],
  );
  return { creating: mutation.isPending, onCreate };
}

/**
 * Shared "search-or-create" plumbing for the product picker. Unlike
 * contacts / members, products require both a `categoryId` (or
 * `systemCategoryId`) and a `currency`. The hook picks the first
 * available product category and falls back to the first product
 * system category if the org has no instantiated row yet — mirroring
 * `HintResolver.resolveProductCategory`'s "default bucket" semantics.
 *
 * `currency` defaults to UZS to match the org base; pass a different
 * currency if the parent form already settled on one (e.g. the sale's
 * account currency).
 */
export function useInlineCreateProduct(
  currency: string = 'UZS',
): InlineCreateResult {
  const mutation = useCreateProduct();
  const orgCategories = useCategories({ type: 'product', all: true });
  const systemCategories = useSystemCategories({ type: 'product' });

  const onCreate = useCallback(
    async (name: string): Promise<number | null> => {
      // Prefer an org-instantiated product category — the user already
      // has it in their /katalog and the new product will sit in the
      // same bucket the rest of their inventory uses.
      const orgRow = orgCategories.data?.data?.find(
        (c) => !c.isArchived && c.id !== null,
      );
      // Fall back to a system category — the backend lazily
      // instantiates an org row on first use of `systemCategoryId`.
      const sysRow = systemCategories.data?.data?.[0];

      const categoryArgs = orgRow
        ? { categoryId: orgRow.id as number }
        : sysRow
          ? { systemCategoryId: sysRow.id }
          : null;

      if (!categoryArgs) {
        // No product categories at all — surface a haptic + bail. The
        // user would have to add a category from /katalog first.
        tgHapticNotify('error');
        return null;
      }

      try {
        const created = await mutation.mutateAsync({
          name,
          currency,
          // Default to stock-tracked (0 starting inventory) so the sale /
          // purchase form's quantity field appears and the user can
          // record how many they actually sold. Service-style products
          // (no stock) are a niche; users can flip the toggle from the
          // /katalog edit screen later.
          currentStock: '0',
          ...categoryArgs,
        });
        tgHapticNotify('success');
        return created.id;
      } catch {
        tgHapticNotify('error');
        return null;
      }
    },
    [mutation, orgCategories.data, systemCategories.data, currency],
  );
  return { creating: mutation.isPending, onCreate };
}
