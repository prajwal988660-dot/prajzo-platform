import { describe, expect, it } from 'vitest';
import { addDays, todayInIndia } from '../dates';
import {
  adminDeliveryDateRequestSchema,
  adminNoteRequestSchema,
  adminProjectDetailSchema,
  adminProjectListQuerySchema,
  adminStatusChangeSchema,
  deliveryDateSchema,
  maxQuotePaise,
  quoteInputSchema,
} from './admin-projects';
import { projectStatuses } from './status';

const scope = 'A five-page website with a photo gallery and a contact form, ready to publish.';
const goodQuote = { amountPaise: 1_500_000, scope, revisionsIncluded: 2 };

/** The first message the schema gives for a field of the input. */
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

describe('adminProjectListQuerySchema', () => {
  it('shows open projects, the first page, 20 at a time, unless told otherwise', () => {
    expect(adminProjectListQuerySchema.parse({})).toEqual({
      status: 'open',
      page: 1,
      limit: 20,
      q: undefined,
    });
  });

  it('accepts "open", "all" and every real status', () => {
    for (const status of ['open', 'all', ...projectStatuses]) {
      expect(adminProjectListQuerySchema.safeParse({ status }).success, status).toBe(true);
    }
  });

  it('refuses a status that does not exist', () => {
    for (const status of ['finished', 'OPEN', '', 'received,testing']) {
      expect(adminProjectListQuerySchema.safeParse({ status }).success, status).toBe(false);
    }
  });

  it('trims the search, treats an empty one as none, and caps its length', () => {
    expect(adminProjectListQuerySchema.parse({ q: '  PRZ-2026  ' }).q).toBe('PRZ-2026');
    expect(adminProjectListQuerySchema.parse({ q: '   ' }).q).toBeUndefined();
    expect(adminProjectListQuerySchema.safeParse({ q: 'x'.repeat(101) }).success).toBe(false);
  });

  it('reads page numbers from the address bar like every other list', () => {
    expect(adminProjectListQuerySchema.parse({ page: '3', limit: '50' })).toMatchObject({
      page: 3,
      limit: 50,
    });
    expect(adminProjectListQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
  });
});

describe('quoteInputSchema', () => {
  it('accepts a price, what it includes, and the revisions included', () => {
    expect(quoteInputSchema.parse(goodQuote)).toEqual(goodQuote);
  });

  it('trims the scope', () => {
    expect(quoteInputSchema.parse({ ...goodQuote, scope: `  ${scope}  ` }).scope).toBe(scope);
  });

  it('refuses a price that is missing, not a whole number, too small or far too large', () => {
    expect(problem(quoteInputSchema, { ...goodQuote, amountPaise: undefined }, 'amountPaise')).toBe(
      'Enter the price in rupees',
    );
    expect(problem(quoteInputSchema, { ...goodQuote, amountPaise: 1500.5 }, 'amountPaise')).toBe(
      'Enter a whole number of rupees',
    );
    expect(problem(quoteInputSchema, { ...goodQuote, amountPaise: 99 }, 'amountPaise')).toBe(
      'Enter the price, at least ₹1',
    );
    expect(problem(quoteInputSchema, { ...goodQuote, amountPaise: 0 }, 'amountPaise')).toBe(
      'Enter the price, at least ₹1',
    );
    expect(problem(quoteInputSchema, { ...goodQuote, amountPaise: -500 }, 'amountPaise')).toBe(
      'Enter the price, at least ₹1',
    );
    expect(
      problem(quoteInputSchema, { ...goodQuote, amountPaise: maxQuotePaise + 1 }, 'amountPaise'),
    ).toMatch(/more than ₹1 crore/);
    expect(quoteInputSchema.safeParse({ ...goodQuote, amountPaise: maxQuotePaise }).success).toBe(
      true,
    );
    expect(quoteInputSchema.safeParse({ ...goodQuote, amountPaise: '1500000' }).success).toBe(
      false,
    );
  });

  it('refuses a scope that says too little or too much', () => {
    expect(problem(quoteInputSchema, { ...goodQuote, scope: 'A website' }, 'scope')).toMatch(
      /at least 20 characters/,
    );
    expect(problem(quoteInputSchema, { ...goodQuote, scope: 'x'.repeat(3001) }, 'scope')).toMatch(
      /under 3,000/,
    );
  });

  it('refuses a number of included revisions that is not between 0 and 20', () => {
    for (const revisionsIncluded of [-1, 21, 1.5]) {
      expect(
        quoteInputSchema.safeParse({ ...goodQuote, revisionsIncluded }).success,
        String(revisionsIncluded),
      ).toBe(false);
    }
    for (const revisionsIncluded of [0, 20]) {
      expect(
        quoteInputSchema.safeParse({ ...goodQuote, revisionsIncluded }).success,
        String(revisionsIncluded),
      ).toBe(true);
    }
  });
});

describe('deliveryDateSchema', () => {
  const today = todayInIndia();

  it('accepts today, a later day, and up to three years ahead', () => {
    for (const date of [today, addDays(today, 1), addDays(today, 30), addDays(today, 1095)]) {
      expect(deliveryDateSchema.safeParse(date).success, date).toBe(true);
    }
  });

  it('refuses a day that has passed, and one more than three years away', () => {
    expect(problem(adminDeliveryDateRequestSchema, { date: addDays(today, -1) }, 'date')).toBe(
      "Choose a date that hasn't passed",
    );
    expect(problem(adminDeliveryDateRequestSchema, { date: addDays(today, 1096) }, 'date')).toBe(
      'Choose a date within the next three years',
    );
  });

  it('refuses anything that is not a real calendar date', () => {
    for (const date of ['', '31/12/2030', '2030-02-31', 'tomorrow', '2030-1-1']) {
      expect(problem(adminDeliveryDateRequestSchema, { date }, 'date'), date).toBe(
        'Choose a date from the calendar',
      );
    }
  });
});

describe('adminStatusChangeSchema', () => {
  it('needs only the status to move to', () => {
    expect(adminStatusChangeSchema.parse({ to: 'under-review' })).toEqual({
      to: 'under-review',
      note: undefined,
      quote: undefined,
      confirmedDeliveryDate: undefined,
    });
  });

  it('accepts a note, a quote and a delivery date alongside it', () => {
    const date = addDays(todayInIndia(), 10);
    const change = adminStatusChangeSchema.parse({
      to: 'quote-sent',
      note: '  Happy to adjust the scope.  ',
      quote: goodQuote,
      confirmedDeliveryDate: date,
    });
    expect(change.note).toBe('Happy to adjust the scope.');
    expect(change.quote).toEqual(goodQuote);
    expect(change.confirmedDeliveryDate).toBe(date);
  });

  it('treats an empty note or date as not given', () => {
    const change = adminStatusChangeSchema.parse({
      to: 'received',
      note: '  ',
      confirmedDeliveryDate: '',
    });
    expect(change.note).toBeUndefined();
    expect(change.confirmedDeliveryDate).toBeUndefined();
  });

  it('refuses a status that does not exist, an invalid quote and a delivery date in the past', () => {
    expect(adminStatusChangeSchema.safeParse({ to: 'finished' }).success).toBe(false);
    expect(
      adminStatusChangeSchema.safeParse({ to: 'quote-sent', quote: { ...goodQuote, scope: '' } })
        .success,
    ).toBe(false);
    expect(
      problem(
        adminStatusChangeSchema,
        { to: 'in-development', confirmedDeliveryDate: '2020-01-01' },
        'confirmedDeliveryDate',
      ),
    ).toBe("Choose a date that hasn't passed");
  });

  it('refuses a note that is too long', () => {
    expect(
      adminStatusChangeSchema.safeParse({ to: 'received', note: 'x'.repeat(1001) }).success,
    ).toBe(false);
  });
});

describe('adminNoteRequestSchema', () => {
  it('accepts a note, trimmed, and refuses an empty or huge one', () => {
    expect(adminNoteRequestSchema.parse({ text: '  Called, no answer.  ' })).toEqual({
      text: 'Called, no answer.',
    });
    expect(adminNoteRequestSchema.safeParse({ text: ' ' }).success).toBe(false);
    expect(adminNoteRequestSchema.safeParse({ text: 'x'.repeat(2001) }).success).toBe(false);
  });
});

describe('adminProjectDetailSchema', () => {
  const at = '2026-10-24T04:30:00.000Z';
  const detail = {
    reference: 'PRZ-2026-0001',
    title: 'Website for my studio',
    status: 'quote-sent',
    categoryTitle: 'Business Websites',
    createdAt: at,
    updatedAt: at,
    categoryKey: 'business-websites',
    packageKey: null,
    packageName: null,
    description: 'A simple five-page website for my photography studio.',
    features: ['gallery'],
    integrations: [],
    preferredDate: null,
    contactPreference: 'email',
    phone: null,
    notes: null,
    confirmedDeliveryDate: null,
    revisions: null,
    source: 'start-form',
    customer: { id: 'abc', name: 'Asha Rao', email: 'asha@example.com', phone: null },
    timeline: [
      {
        kind: 'status',
        from: null,
        to: 'received',
        by: 'customer',
        note: null,
        at,
        actorName: 'Asha Rao',
      },
    ],
    quotes: [
      {
        version: 1,
        amountPaise: 1_500_000,
        scope,
        revisionsIncluded: 2,
        sentAt: at,
        accepted: false,
        sentByName: 'Prajzo Admin',
      },
    ],
    adminNotes: [{ id: 'n1', text: 'Called, no answer.', byName: 'Prajzo Admin', at }],
    allowedChanges: [
      { to: 'approved', needs: 'note' },
      { to: 'under-review', needs: null },
      { to: 'cancelled', needs: null },
    ],
    waitingOn: 'customer',
    customerReplied: false,
    revisionsOverIncluded: false,
  };

  it('describes everything an admin sees about a project', () => {
    expect(adminProjectDetailSchema.safeParse(detail).success).toBe(true);
  });

  it('says who did each thing, and refuses an entry that does not', () => {
    const { actorName: _name, ...withoutName } = detail.timeline[0]!;
    expect(adminProjectDetailSchema.safeParse({ ...detail, timeline: [withoutName] }).success).toBe(
      false,
    );
  });

  it('refuses nonsense in the fields that drive the screen', () => {
    for (const bad of [
      { waitingOn: 'nobody' },
      { allowedChanges: [{ to: 'finished', needs: null }] },
      { allowedChanges: [{ to: 'approved', needs: 'a-wish' }] },
      { source: 'telepathy' },
    ]) {
      expect(adminProjectDetailSchema.safeParse({ ...detail, ...bad }).success).toBe(false);
    }
  });
});
