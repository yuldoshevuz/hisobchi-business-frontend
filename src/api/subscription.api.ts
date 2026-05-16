import { api } from './client';
import type {
  CurrentSubscription,
  Plan,
} from '@/types/subscription.types';

const BASE = '/web';

export const subscriptionApi = {
  /** Active plans the tenant can browse / upgrade to. */
  async listPlans(): Promise<Plan[]> {
    const { data } = await api.get<Plan[]>(`${BASE}/plans`);
    return data;
  },
  /**
   * Current subscription + flat feature map for the calling user. Members of
   * other people's orgs still call this against THEIR own plan; the org
   * actually applies the OWNER's plan, but this endpoint lets each user see
   * their own purchased state.
   */
  async getCurrent(): Promise<CurrentSubscription> {
    const { data } = await api.get<CurrentSubscription>(
      `${BASE}/subscription/current`,
    );
    return data;
  },
  /**
   * Cancel the caller's own paid subscription. The server marks it
   * cancelled and falls back to the default plan; user keeps free-tier
   * access. Returns 204 with no body.
   */
  async cancel(): Promise<void> {
    await api.post<void>(`${BASE}/subscription/cancel`);
  },
};
