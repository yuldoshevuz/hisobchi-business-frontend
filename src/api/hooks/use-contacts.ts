import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '@/api/contacts.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  Contact,
  ContactBalance,
  CreateContactRequest,
  ListContactsQuery,
  PaginatedContacts,
  UpdateContactRequest,
} from '@/types/contact.types';

export function useContacts(
  query: ListContactsQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PaginatedContacts, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PaginatedContacts, Error>({
    queryKey: queryKeys.clients.list(query),
    queryFn: () => contactsApi.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useContactBalance(
  id: number | null,
): ReturnType<typeof useQuery<ContactBalance, Error>> {
  return useQuery<ContactBalance, Error>({
    queryKey: queryKeys.clients.balance(id ?? 0),
    queryFn: () => contactsApi.getBalance(id as number),
    enabled: Boolean(tokenStore.getActiveOrgId()) && id !== null,
  });
}

export function useContact(
  id: number | null,
): ReturnType<typeof useQuery<Contact, Error>> {
  return useQuery<Contact, Error>({
    queryKey: queryKeys.clients.detail(id ?? 0),
    queryFn: () => contactsApi.getById(id as number),
    enabled: Boolean(tokenStore.getActiveOrgId()) && id !== null,
  });
}

export function useCreateContact(): ReturnType<
  typeof useMutation<Contact, Error, CreateContactRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<Contact, Error, CreateContactRequest>({
    mutationFn: (body) => contactsApi.create(body),
    onSuccess: () => {
      void queryContact.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

interface UpdateContactVars {
  id: number;
  body: UpdateContactRequest;
}

export function useUpdateContact(): ReturnType<
  typeof useMutation<Contact, Error, UpdateContactVars>
> {
  const queryContact = useQueryClient();
  return useMutation<Contact, Error, UpdateContactVars>({
    mutationFn: ({ id, body }) => contactsApi.update(id, body),
    onSuccess: () => {
      void queryContact.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useArchiveContact(): ReturnType<
  typeof useMutation<Contact, Error, number>
> {
  const queryContact = useQueryClient();
  return useMutation<Contact, Error, number>({
    mutationFn: (id) => contactsApi.archive(id),
    onSuccess: () => {
      void queryContact.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useDeleteContact(): ReturnType<
  typeof useMutation<void, Error, number>
> {
  const queryContact = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => contactsApi.remove(id),
    onSuccess: () => {
      void queryContact.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}
