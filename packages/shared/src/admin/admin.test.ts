import { describe, expect, it } from 'vitest';
import { projectStatuses } from '../projects/status';
import { auditListQuerySchema } from './audit';
import {
  categoryCreateSchema,
  categoryIcons,
  categoryInputSchema,
  packageCreateSchema,
  packageInputSchema,
} from './catalogue';
import { adminCustomerListQuerySchema } from './customers';
import { adminMessageListQuerySchema, adminMessageUpdateSchema } from './messages';
import { adminOverviewSchema } from './overview';

function problem(
  schema: {
    safeParse: (input: unknown) => {
      success: boolean;
      error?: { issues: { path: PropertyKey[]; message: string }[] };
    };
  },
  input: unknown,
  field: string,
) {
  const result = schema.safeParse(input);
  if (result.success) return undefined;
  return result.error?.issues.find((issue) => issue.path.join('.') === field)?.message;
}

const category = {
  title: 'Business Websites',
  description: 'Clear, fast websites that explain what you do.',
  icon: 'Building2',
  useCases: ['Shops and local services'],
  deliveryTier: 'professional',
  sortOrder: 10,
  active: true,
};

const servicePackage = {
  name: 'Professional Website',
  summary: 'A complete multi-page website.',
  deliveryTier: 'professional',
  scope: ['Small business websites'],
  priceMode: 'from',
  priceAmountPaise: 799_900,
  sortOrder: 20,
  active: true,
};

describe('categories', () => {
  it('offers 15 distinct icons', () => {
    expect(new Set(categoryIcons).size).toBe(15);
  });

  it('accepts a complete category and trims its text', () => {
    const parsed = categoryInputSchema.parse({ ...category, title: '  Business Websites  ' });
    expect(parsed.title).toBe('Business Websites');
    expect(parsed.useCases).toEqual(['Shops and local services']);
  });

  it('says what is wrong, field by field', () => {
    const bad = {
      title: 'x',
      description: 'short',
      icon: 'Rocket',
      useCases: ['ok example', ''],
      deliveryTier: 'instant',
      sortOrder: -1,
      active: 'yes',
    };
    expect(problem(categoryInputSchema, bad, 'title')).toMatch(/at least 2/);
    expect(problem(categoryInputSchema, bad, 'description')).toMatch(/at least 10/);
    expect(problem(categoryInputSchema, bad, 'icon')).toBe('Choose an icon from the list');
    expect(problem(categoryInputSchema, bad, 'useCases.1')).toMatch(/at least 2/);
    expect(problem(categoryInputSchema, bad, 'deliveryTier')).toMatch(/Choose how quickly/);
    expect(problem(categoryInputSchema, bad, 'sortOrder')).toBe('Enter 0 or more');
    expect(problem(categoryInputSchema, bad, 'active')).toBeDefined();
  });

  it('allows at most 8 examples', () => {
    const many = Array.from({ length: 9 }, (_, index) => `Example number ${index}`);
    expect(problem(categoryInputSchema, { ...category, useCases: many }, 'useCases')).toBe(
      'Keep it to 8 examples',
    );
  });

  it('needs a tidy key when creating, and drops a key sent when editing', () => {
    expect(categoryCreateSchema.parse({ ...category, key: 'online-shop' }).key).toBe('online-shop');
    for (const key of [
      '',
      'ab',
      'Online-Shop',
      'online shop',
      '-shop',
      'shop-',
      'on--line',
      'x'.repeat(61),
      'shöp',
    ]) {
      expect(categoryCreateSchema.safeParse({ ...category, key }).success, key).toBe(false);
    }
    expect('key' in categoryInputSchema.parse({ ...category, key: 'sneaky' })).toBe(false);
  });
});

describe('packages and prices', () => {
  it('accepts "starting from" and fixed prices', () => {
    expect(packageInputSchema.safeParse(servicePackage).success).toBe(true);
    expect(packageInputSchema.safeParse({ ...servicePackage, priceMode: 'fixed' }).success).toBe(
      true,
    );
  });

  it('accepts "Request a quote" with no price, however the price is left out', () => {
    for (const priceAmountPaise of [null, undefined]) {
      const parsed = packageInputSchema.parse({
        ...servicePackage,
        priceMode: 'quote',
        priceAmountPaise,
      });
      expect(parsed.priceAmountPaise).toBeNull();
    }
  });

  it('refuses a price on a "Request a quote" package, and no price on the others', () => {
    expect(
      problem(packageInputSchema, { ...servicePackage, priceMode: 'quote' }, 'priceAmountPaise'),
    ).toBe('Leave the price empty when it is shown as "Request a quote"');
    for (const priceMode of ['from', 'fixed']) {
      expect(
        problem(
          packageInputSchema,
          { ...servicePackage, priceMode, priceAmountPaise: null },
          'priceAmountPaise',
        ),
        priceMode,
      ).toBe('Enter the price');
    }
  });

  it('refuses prices that are too small, too large or not whole rupees', () => {
    for (const priceAmountPaise of [0, 99, -1, 1_000_000_001, 1999.5, '799900']) {
      expect(
        packageInputSchema.safeParse({ ...servicePackage, priceAmountPaise }).success,
        String(priceAmountPaise),
      ).toBe(false);
    }
  });

  it('checks the list of what is included', () => {
    const many = Array.from({ length: 13 }, (_, index) => `Thing number ${index}`);
    expect(problem(packageInputSchema, { ...servicePackage, scope: many }, 'scope')).toBe(
      'Keep it to 12 items',
    );
    expect(problem(packageInputSchema, { ...servicePackage, scope: [''] }, 'scope.0')).toMatch(
      /at least 2/,
    );
  });

  it('needs a tidy key when creating, and applies the same price rules', () => {
    expect(packageCreateSchema.parse({ ...servicePackage, key: 'growth-plan' }).key).toBe(
      'growth-plan',
    );
    expect(packageCreateSchema.safeParse({ ...servicePackage, key: 'Growth Plan' }).success).toBe(
      false,
    );
    expect(
      problem(
        packageCreateSchema,
        { ...servicePackage, key: 'growth-plan', priceMode: 'quote' },
        'priceAmountPaise',
      ),
    ).toBeDefined();
  });
});

describe('messages', () => {
  it('start in the inbox: everything that is not archived', () => {
    expect(adminMessageListQuerySchema.parse({})).toMatchObject({
      status: 'inbox',
      page: 1,
      limit: 20,
    });
  });

  it('can be filtered by each status, and updated to any of them', () => {
    for (const status of ['inbox', 'new', 'read', 'archived', 'all']) {
      expect(adminMessageListQuerySchema.safeParse({ status }).success, status).toBe(true);
    }
    for (const status of ['new', 'read', 'archived']) {
      expect(adminMessageUpdateSchema.safeParse({ status }).success, status).toBe(true);
    }
    expect(adminMessageUpdateSchema.safeParse({ status: 'inbox' }).success).toBe(false);
    expect(adminMessageUpdateSchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });
});

describe('customers and activity', () => {
  it('list with an optional search', () => {
    expect(adminCustomerListQuerySchema.parse({ q: ' asha ' }).q).toBe('asha');
    expect(adminCustomerListQuerySchema.parse({}).q).toBeUndefined();
  });

  it('activity can be filtered by what it is about', () => {
    expect(auditListQuerySchema.parse({}).targetType).toBe('all');
    for (const targetType of ['project', 'category', 'package', 'contact-message']) {
      expect(auditListQuerySchema.safeParse({ targetType }).success, targetType).toBe(true);
    }
    expect(auditListQuerySchema.safeParse({ targetType: 'customer' }).success).toBe(false);
  });
});

describe('the overview', () => {
  const counts = Object.fromEntries(projectStatuses.map((status) => [status, 0]));
  const overview = {
    customers: 3,
    contactMessages: { total: 5, unread: 2 },
    projectRequests: {
      total: 4,
      received: 1,
      byStatus: { ...counts, received: 1, 'quote-sent': 3 },
      toDo: { newRequests: 1, replies: 0, accepted: 0, revisions: 0, signedOff: 0 },
    },
    recentActivity: [],
  };

  it('has a count for every status', () => {
    expect(adminOverviewSchema.safeParse(overview).success).toBe(true);
  });

  it('is refused when a status is missing or a count is negative', () => {
    const { received: _removed, ...incomplete } = overview.projectRequests.byStatus;
    expect(
      adminOverviewSchema.safeParse({
        ...overview,
        projectRequests: { ...overview.projectRequests, byStatus: incomplete },
      }).success,
    ).toBe(false);
    expect(adminOverviewSchema.safeParse({ ...overview, customers: -1 }).success).toBe(false);
  });
});
