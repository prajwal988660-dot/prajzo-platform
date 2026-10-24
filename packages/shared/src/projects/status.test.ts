import { describe, expect, it } from 'vitest';
import {
  allowedNextStatuses,
  canChangeStatus,
  finalStatuses,
  isFinalStatus,
  projectStatusInfo,
  projectStatuses,
  statusTransitions,
  type StatusActor,
} from './status';

const actors: StatusActor[] = ['customer', 'admin'];

/**
 * The table from docs/ARCHITECTURE.md section 8, written out here separately from the code, so
 * that any change to the workflow has to be made twice, on purpose.
 */
const expectedChanges = [
  'received → under-review: admin',
  'under-review → awaiting-information: admin',
  'under-review → quote-sent: admin',
  'awaiting-information → under-review: admin',
  'quote-sent → approved: customer, admin',
  'quote-sent → under-review: admin',
  'approved → in-development: admin',
  'in-development → testing: admin',
  'in-development → awaiting-information: admin',
  'testing → in-development: admin',
  'testing → awaiting-review: admin',
  'awaiting-review → revision-requested: customer, admin',
  'awaiting-review → completed: admin',
  'revision-requested → in-development: admin',
  'received → cancelled: customer, admin',
  'awaiting-information → cancelled: customer, admin',
  'quote-sent → cancelled: customer, admin',
  'under-review → cancelled: admin',
  'approved → cancelled: admin',
  'in-development → cancelled: admin',
  'testing → cancelled: admin',
  'awaiting-review → cancelled: admin',
  'revision-requested → cancelled: admin',
];

/** What an admin must provide with each change (rows not listed need nothing). */
const expectedAdminNeeds: Record<string, string> = {
  'under-review → awaiting-information': 'note',
  'under-review → quote-sent': 'quote',
  'quote-sent → approved': 'note',
  'approved → in-development': 'deliveryDate',
  'in-development → awaiting-information': 'note',
  'awaiting-review → revision-requested': 'note',
  'under-review → cancelled': 'note',
  'approved → cancelled': 'note',
  'in-development → cancelled': 'note',
  'testing → cancelled': 'note',
  'awaiting-review → cancelled': 'note',
  'revision-requested → cancelled': 'note',
};

/** Asks canChangeStatus about every possible change by every actor, and lists what it allows. */
function whatTheCodeAllows(): string[] {
  const allowed: string[] = [];
  for (const from of projectStatuses) {
    for (const to of projectStatuses) {
      const who = actors.filter((actor) => canChangeStatus(from, to, actor).allowed);
      if (who.length > 0) allowed.push(`${from} → ${to}: ${who.join(', ')}`);
    }
  }
  return allowed;
}

describe('project statuses', () => {
  it('has the eleven statuses, each with a label, a meaning and a next step', () => {
    expect(projectStatuses).toHaveLength(11);
    expect(Object.keys(projectStatusInfo).sort()).toEqual([...projectStatuses].sort());
    const labels = Object.values(projectStatusInfo).map((info) => info.label);
    expect(new Set(labels).size).toBe(11);
    for (const info of Object.values(projectStatusInfo)) {
      expect(info.label.length).toBeGreaterThan(2);
      expect(info.meaning.length).toBeGreaterThan(10);
      expect(info.next.length).toBeGreaterThan(10);
    }
  });

  it('starts at "Request Received"', () => {
    expect(projectStatuses[0]).toBe('received');
    expect(projectStatusInfo.received.label).toBe('Request Received');
  });

  it("doesn't promise dates or timings in what it tells the customer", () => {
    const words = Object.values(projectStatusInfo)
      .flatMap((info) => [info.meaning, info.next])
      .join(' ');
    expect(words).not.toMatch(/\b(within|hours?|days?|guarantee)\b/i);
  });
});

describe('the status workflow', () => {
  it('allows exactly the changes in the table, and refuses everything else', () => {
    expect(whatTheCodeAllows()).toEqual([...expectedChanges].sort(byStatusOrder));
  });

  it('only lists real statuses, and never a change to the same status', () => {
    for (const { from, to } of statusTransitions) {
      expect(projectStatuses).toContain(from);
      expect(projectStatuses).toContain(to);
      expect(from).not.toBe(to);
    }
  });

  it('has no change listed twice', () => {
    const pairs = statusTransitions.map(({ from, to }) => `${from} → ${to}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('lets nothing change once a project is completed or cancelled', () => {
    expect(finalStatuses).toEqual(['completed', 'cancelled']);
    for (const status of finalStatuses) {
      expect(isFinalStatus(status)).toBe(true);
      for (const actor of actors) expect(allowedNextStatuses(status, actor)).toEqual([]);
    }
    expect(isFinalStatus('received')).toBe(false);
  });

  it('lets an admin cancel any project that is not already finished', () => {
    for (const status of projectStatuses.filter((candidate) => !isFinalStatus(candidate))) {
      expect(canChangeStatus(status, 'cancelled', 'admin').allowed, status).toBe(true);
    }
  });

  describe('what a customer may do', () => {
    it('is only to cancel early, accept a quote, or ask for a revision', () => {
      const customerChanges = statusTransitions
        .filter((transition) => transition.by.includes('customer'))
        .map(({ from, to }) => `${from} → ${to}`);
      expect(customerChanges.sort()).toEqual(
        [
          'received → cancelled',
          'awaiting-information → cancelled',
          'quote-sent → cancelled',
          'quote-sent → approved',
          'awaiting-review → revision-requested',
        ].sort(),
      );
    });

    it('includes cancelling only while the request is still early', () => {
      const early = projectStatuses.filter(
        (status) => canChangeStatus(status, 'cancelled', 'customer').allowed,
      );
      expect(early).toEqual(['received', 'awaiting-information', 'quote-sent']);
    });

    it('never includes starting, finishing or reviewing the work', () => {
      for (const from of projectStatuses) {
        for (const to of ['under-review', 'in-development', 'testing', 'completed'] as const) {
          expect(canChangeStatus(from, to, 'customer').allowed, `${from} → ${to}`).toBe(false);
        }
      }
    });

    it('can cancel a new request and then nothing more', () => {
      expect(allowedNextStatuses('received', 'customer')).toEqual(['cancelled']);
      expect(allowedNextStatuses('cancelled', 'customer')).toEqual([]);
    });
  });

  describe('what an admin must provide', () => {
    it('is a quote before sending one, and a delivery date before development starts', () => {
      expect(canChangeStatus('under-review', 'quote-sent', 'admin')).toEqual({
        allowed: true,
        needs: 'quote',
      });
      expect(canChangeStatus('approved', 'in-development', 'admin')).toEqual({
        allowed: true,
        needs: 'deliveryDate',
      });
    });

    it('is a reason when cancelling work that is under way', () => {
      for (const from of [
        'under-review',
        'approved',
        'in-development',
        'testing',
        'awaiting-review',
        'revision-requested',
      ] as const) {
        expect(canChangeStatus(from, 'cancelled', 'admin'), from).toEqual({
          allowed: true,
          needs: 'note',
        });
      }
    });

    it('is exactly this for every change an admin can make', () => {
      for (const from of projectStatuses) {
        for (const to of projectStatuses) {
          const change = canChangeStatus(from, to, 'admin');
          if (!change.allowed) continue;
          expect(change.needs ?? 'nothing', `${from} → ${to}`).toBe(
            expectedAdminNeeds[`${from} → ${to}`] ?? 'nothing',
          );
        }
      }
    });

    it('is a note when asking the customer for information, or recording something for them', () => {
      for (const [from, to] of [
        ['under-review', 'awaiting-information'],
        ['in-development', 'awaiting-information'],
        ['quote-sent', 'approved'],
        ['awaiting-review', 'revision-requested'],
      ] as const) {
        expect(canChangeStatus(from, to, 'admin'), `${from} → ${to}`).toEqual({
          allowed: true,
          needs: 'note',
        });
      }
    });

    it('is never asked of a customer, even where an admin must give a note', () => {
      for (const [from, to] of [
        ['quote-sent', 'approved'],
        ['awaiting-review', 'revision-requested'],
      ] as const) {
        expect(canChangeStatus(from, to, 'customer')).toEqual({ allowed: true, needs: undefined });
      }
    });

    it('is nothing for a customer who cancels, or for an ordinary step', () => {
      expect(canChangeStatus('received', 'cancelled', 'customer')).toEqual({
        allowed: true,
        needs: undefined,
      });
      expect(canChangeStatus('received', 'under-review', 'admin')).toEqual({
        allowed: true,
        needs: undefined,
      });
    });
  });

  it('answers "no" for a change that is not in the table', () => {
    expect(canChangeStatus('received', 'completed', 'admin')).toEqual({ allowed: false });
    expect(canChangeStatus('completed', 'received', 'admin')).toEqual({ allowed: false });
    expect(allowedNextStatuses('received', 'admin')).toEqual(['under-review', 'cancelled']);
  });
});

/** Sorts "from → to: who" lines the way whatTheCodeAllows lists them (status order, then target). */
function byStatusOrder(a: string, b: string): number {
  const position = (line: string) => {
    const [from, rest] = line.split(' → ');
    const to = rest?.split(':')[0] ?? '';
    return [
      projectStatuses.indexOf(from as (typeof projectStatuses)[number]),
      projectStatuses.indexOf(to as (typeof projectStatuses)[number]),
    ] as const;
  };
  const [aFrom, aTo] = position(a);
  const [bFrom, bTo] = position(b);
  return aFrom - bFrom || aTo - bTo;
}
