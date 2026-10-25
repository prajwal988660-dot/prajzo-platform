import { describe, expect, it } from 'vitest';
import { paginationQuerySchema } from '../api/pagination';
import { todayInIndia } from '../dates';
import {
  projectActionRequestSchema,
  projectDetailSchema,
  projectListSchema,
  projectReferencePattern,
  projectRequestSchema,
} from './project-request';

const valid = {
  title: 'Website for my studio',
  categoryKey: 'business-websites',
  description:
    'A simple five-page website for my photography studio, with a gallery and contact form.',
};

/** The first message the schema gives for a field (or undefined when the field is fine). */
function problemWith(input: unknown, field: string): string | undefined {
  const result = projectRequestSchema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === field)?.message;
}

describe('projectRequestSchema', () => {
  it('accepts the smallest valid request and fills in the defaults', () => {
    const request = projectRequestSchema.parse(valid);
    expect(request).toEqual({
      ...valid,
      packageKey: undefined,
      features: [],
      integrations: [],
      preferredDate: undefined,
      contactPreference: 'email',
      phone: undefined,
      notes: undefined,
    });
  });

  it('accepts a complete request', () => {
    const request = projectRequestSchema.parse({
      ...valid,
      packageKey: 'professional-website',
      features: ['gallery', 'contact-form'],
      integrations: ['google-maps'],
      preferredDate: '2099-01-31',
      contactPreference: 'whatsapp',
      phone: '+91 98866 07720',
      notes: 'Please call after 5 pm.',
    });
    expect(request.features).toEqual(['gallery', 'contact-form']);
    expect(request.phone).toBe('+91 98866 07720');
  });

  it('trims text and treats blank optional fields as not given', () => {
    const request = projectRequestSchema.parse({
      ...valid,
      title: '   Website for my studio  ',
      packageKey: '',
      preferredDate: '',
      phone: '  ',
      notes: '   ',
    });
    expect(request.title).toBe('Website for my studio');
    expect(request.packageKey).toBeUndefined();
    expect(request.preferredDate).toBeUndefined();
    expect(request.phone).toBeUndefined();
    expect(request.notes).toBeUndefined();
  });

  it('drops anything a customer must not set: status, price, delivery date, owner, reference', () => {
    const request = projectRequestSchema.parse({
      ...valid,
      status: 'completed',
      quote: { amount: 1 },
      price: 1,
      confirmedDeliveryDate: '2026-12-01',
      customerId: 'someone-else',
      reference: 'PRZ-2026-0001',
      statusHistory: [{ to: 'completed' }],
      adminNotes: ['hello'],
    });
    // Only what the form asks for is kept (optional fields that weren't given have no key).
    expect(Object.keys(request).sort()).toEqual(
      [
        'categoryKey',
        'contactPreference',
        'description',
        'features',
        'integrations',
        'title',
      ].sort(),
    );
  });

  describe('says what is wrong, field by field', () => {
    it('for the name', () => {
      expect(problemWith({ ...valid, title: 'ab' }, 'title')).toMatch(/at least 3/);
      expect(problemWith({ ...valid, title: '' }, 'title')).toMatch(/short name/);
      expect(problemWith({ ...valid, title: 'x'.repeat(101) }, 'title')).toMatch(/under 100/);
    });

    it('for the type of website', () => {
      expect(problemWith({ ...valid, categoryKey: '' }, 'categoryKey')).toBe(
        'Choose the type of website you need',
      );
      const { categoryKey: _unused, ...withoutType } = valid;
      expect(problemWith(withoutType, 'categoryKey')).toBeDefined();
    });

    it('for the description', () => {
      expect(problemWith({ ...valid, description: 'too short' }, 'description')).toMatch(
        /at least 30/,
      );
      expect(problemWith({ ...valid, description: 'x'.repeat(3001) }, 'description')).toMatch(
        /under 3,000/,
      );
    });

    it('for features and integrations that are not on the list', () => {
      expect(problemWith({ ...valid, features: ['teleportation'] }, 'features.0')).toBeDefined();
      expect(problemWith({ ...valid, integrations: ['nope'] }, 'integrations.0')).toBeDefined();
    });

    it('for the preferred date', () => {
      expect(problemWith({ ...valid, preferredDate: '31/01/2099' }, 'preferredDate')).toBe(
        'Choose a date from the calendar',
      );
      expect(problemWith({ ...valid, preferredDate: '2099-02-31' }, 'preferredDate')).toBe(
        'Choose a date from the calendar',
      );
      expect(problemWith({ ...valid, preferredDate: '2020-01-01' }, 'preferredDate')).toBe(
        "Choose a date that hasn't passed",
      );
    });

    it('accepts today as a preferred date', () => {
      expect(problemWith({ ...valid, preferredDate: todayInIndia() }, 'preferredDate')).toBe(
        undefined,
      );
    });

    it('for the phone number, which is needed when they want a call or WhatsApp', () => {
      for (const contactPreference of ['phone', 'whatsapp']) {
        expect(problemWith({ ...valid, contactPreference }, 'phone'), contactPreference).toMatch(
          /Add a phone number/,
        );
      }
      expect(problemWith({ ...valid, contactPreference: 'email' }, 'phone')).toBeUndefined();
      expect(
        problemWith({ ...valid, contactPreference: 'phone', phone: '98866' }, 'phone'),
      ).toMatch(/digits, spaces or \+/);
      expect(
        problemWith({ ...valid, contactPreference: 'phone', phone: '+91 98866 07720' }, 'phone'),
      ).toBeUndefined();
    });

    it('all at once: the phone number is reported together with every other problem', () => {
      const result = projectRequestSchema.safeParse({
        title: 'ab',
        categoryKey: '',
        description: 'short',
        contactPreference: 'whatsapp',
      });
      expect(result.success).toBe(false);
      const fields = result.error?.issues.map((issue) => issue.path.join('.')).sort();
      expect(fields).toEqual(['categoryKey', 'description', 'phone', 'title']);
    });

    it('for a contact preference that is not on the list', () => {
      expect(
        projectRequestSchema.safeParse({ ...valid, contactPreference: 'pigeon' }).success,
      ).toBe(false);
    });

    it('for notes that are too long', () => {
      expect(projectRequestSchema.safeParse({ ...valid, notes: 'x'.repeat(1001) }).success).toBe(
        false,
      );
    });
  });
});

describe('projectActionRequestSchema', () => {
  it('accepts cancelling, with or without a reason', () => {
    expect(projectActionRequestSchema.parse({ action: 'cancel' })).toEqual({
      action: 'cancel',
      note: undefined,
    });
    expect(
      projectActionRequestSchema.parse({ action: 'cancel', note: ' Changed my mind ' }),
    ).toEqual({ action: 'cancel', note: 'Changed my mind' });
  });

  it('accepts accepting a quote, which names the version the customer was looking at', () => {
    expect(projectActionRequestSchema.parse({ action: 'accept-quote', quoteVersion: 2 })).toEqual({
      action: 'accept-quote',
      quoteVersion: 2,
    });
    for (const quoteVersion of [0, -1, 1.5, '2', undefined]) {
      expect(
        projectActionRequestSchema.safeParse({ action: 'accept-quote', quoteVersion }).success,
        String(quoteVersion),
      ).toBe(false);
    }
  });

  it('accepts declining a quote, with an optional reason', () => {
    expect(
      projectActionRequestSchema.parse({
        action: 'decline-quote',
        quoteVersion: 1,
        note: ' Too much ',
      }),
    ).toEqual({ action: 'decline-quote', quoteVersion: 1, note: 'Too much' });
    expect(projectActionRequestSchema.safeParse({ action: 'decline-quote' }).success).toBe(false);
  });

  it('needs a real answer when replying to a question', () => {
    expect(
      projectActionRequestSchema.parse({
        action: 'reply',
        message: '  Here are the logo files.  ',
      }),
    ).toEqual({ action: 'reply', message: 'Here are the logo files.' });
    for (const message of ['', ' ', 'x', undefined, 'x'.repeat(2001)]) {
      expect(
        projectActionRequestSchema.safeParse({ action: 'reply', message }).success,
        String(message).slice(0, 10),
      ).toBe(false);
    }
  });

  it('needs to know what to change when asking for a revision', () => {
    expect(
      projectActionRequestSchema.parse({
        action: 'request-revision',
        message: 'Please make the logo bigger.',
      }),
    ).toEqual({ action: 'request-revision', message: 'Please make the logo bigger.' });
    for (const message of ['', 'no', undefined, 'x'.repeat(1501)]) {
      expect(
        projectActionRequestSchema.safeParse({ action: 'request-revision', message }).success,
        String(message).slice(0, 10),
      ).toBe(false);
    }
  });

  it('accepts saying it looks good, with nothing else', () => {
    expect(projectActionRequestSchema.parse({ action: 'sign-off' })).toEqual({
      action: 'sign-off',
    });
  });

  it('refuses any other action, and a reason that is too long', () => {
    for (const action of ['approve', 'complete', 'refund', 'under-review', '', undefined]) {
      expect(projectActionRequestSchema.safeParse({ action }).success, String(action)).toBe(false);
    }
    expect(
      projectActionRequestSchema.safeParse({ action: 'cancel', note: 'x'.repeat(501) }).success,
    ).toBe(false);
  });

  it("drops anything that isn't part of the action", () => {
    const parsed = projectActionRequestSchema.parse({
      action: 'accept-quote',
      quoteVersion: 1,
      status: 'completed',
      amountPaise: 1,
    });
    expect(Object.keys(parsed).sort()).toEqual(['action', 'quoteVersion']);
  });
});

describe('projectReferencePattern', () => {
  it('matches reference numbers and nothing that merely contains one', () => {
    for (const reference of ['PRZ-2026-0001', 'PRZ-2026-0042', 'PRZ-2027-12345']) {
      expect(projectReferencePattern.test(reference), reference).toBe(true);
    }
    for (const reference of [
      'prz-2026-0001',
      'PRZ-26-0001',
      'PRZ-2026-1',
      'PRZ-2026-0001 ',
      'x PRZ-2026-0001',
      'PRZ-2026-0001; drop',
      '',
    ]) {
      expect(projectReferencePattern.test(reference), JSON.stringify(reference)).toBe(false);
    }
  });
});

describe('what the API sends back', () => {
  const detail = {
    reference: 'PRZ-2026-0001',
    title: 'Website for my studio',
    status: 'received',
    categoryTitle: 'Business Websites',
    createdAt: '2026-10-23T13:30:00.000Z',
    updatedAt: '2026-10-23T13:30:00.000Z',
    categoryKey: 'business-websites',
    packageKey: null,
    packageName: null,
    description: valid.description,
    features: ['gallery'],
    integrations: [],
    preferredDate: null,
    contactPreference: 'email',
    phone: null,
    notes: null,
    timeline: [
      {
        kind: 'status',
        from: null,
        to: 'received',
        by: 'customer',
        note: null,
        at: '2026-10-23T13:30:00.000Z',
      },
    ],
    quote: null,
    confirmedDeliveryDate: null,
    revisions: null,
    allowedActions: ['cancel'],
  };

  it('is checked before the app uses it', () => {
    expect(projectDetailSchema.safeParse(detail).success).toBe(true);
    expect(projectDetailSchema.safeParse({ ...detail, status: 'finished' }).success).toBe(false);
    expect(projectDetailSchema.safeParse({ ...detail, allowedActions: ['refund'] }).success).toBe(
      false,
    );
  });

  it('describes every kind of timeline entry', () => {
    const at = '2026-10-24T04:30:00.000Z';
    const entries = [
      { kind: 'status', from: 'received', to: 'under-review', by: 'admin', note: null, at },
      { kind: 'reply', by: 'customer', text: 'Here are the files.', at },
      {
        kind: 'delivery-date',
        by: 'admin',
        from: null,
        to: '2026-11-05',
        note: 'Festival week',
        at,
      },
      { kind: 'sign-off', by: 'customer', at },
    ];
    expect(projectDetailSchema.safeParse({ ...detail, timeline: entries }).success).toBe(true);
    for (const bad of [
      { kind: 'reply', by: 'admin', text: 'x', at },
      { kind: 'sign-off', by: 'admin', at },
      { kind: 'delivery-date', by: 'customer', from: null, to: '2026-11-05', note: null, at },
      { kind: 'shrug', at },
    ]) {
      expect(projectDetailSchema.safeParse({ ...detail, timeline: [bad] }).success).toBe(false);
    }
  });

  it('shows a quote with the revisions it includes, and the revisions used', () => {
    const withQuote = {
      ...detail,
      status: 'quote-sent',
      quote: {
        version: 1,
        amountPaise: 1_500_000,
        scope: 'A five-page website with a gallery and a contact form.',
        revisionsIncluded: 2,
        sentAt: '2026-10-24T04:30:00.000Z',
        accepted: false,
      },
      confirmedDeliveryDate: '2026-11-05',
      revisions: { included: 2, used: 1 },
    };
    expect(projectDetailSchema.safeParse(withQuote).success).toBe(true);
    expect(
      projectDetailSchema.safeParse({ ...withQuote, quote: { ...withQuote.quote, version: 0 } })
        .success,
    ).toBe(false);
    expect(
      projectDetailSchema.safeParse({ ...withQuote, revisions: { included: 2, used: -1 } }).success,
    ).toBe(false);
  });

  it('describes a page of projects', () => {
    const { timeline: _timeline, ...rest } = detail;
    const summary = {
      reference: rest.reference,
      title: rest.title,
      status: rest.status,
      categoryTitle: rest.categoryTitle,
      createdAt: rest.createdAt,
      updatedAt: rest.updatedAt,
    };
    expect(
      projectListSchema.safeParse({ items: [summary], page: 1, limit: 20, total: 1 }).success,
    ).toBe(true);
    expect(
      projectListSchema.safeParse({ items: [summary], page: 0, limit: 20, total: 1 }).success,
    ).toBe(false);
  });
});

describe('paginationQuerySchema', () => {
  it('starts at page 1 with 20 items', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('reads numbers from the address bar', () => {
    expect(paginationQuerySchema.parse({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
  });

  it('refuses nonsense and anything above 50 per page', () => {
    for (const query of [
      { page: '0' },
      { page: '-1' },
      { page: 'x' },
      { limit: '51' },
      { limit: '0' },
      { page: '1.5' },
    ]) {
      expect(paginationQuerySchema.safeParse(query).success, JSON.stringify(query)).toBe(false);
    }
  });
});
