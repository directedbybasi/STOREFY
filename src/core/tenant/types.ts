export interface TenantContext {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    isPlatformAdmin: boolean;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    billingEmail: string;
  };
  store: {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    subdomain: string;
    customDomain: string | null;
    currency: string;
    timezone: string;
    isActive: boolean;
  };
  staff: {
    id: string;
    roleId: string;
    isActive: boolean;
  };
  role: {
    id: string;
    name: string;
  };
  permissions: Set<string>;
  isOwner: boolean;
}
