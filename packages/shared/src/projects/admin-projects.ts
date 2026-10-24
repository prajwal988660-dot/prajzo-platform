import { z } from 'zod';
import { paginatedSchema, paginationQuerySchema } from '../api/pagination';
import { addDays, isCalendarDate, todayInIndia } from '../dates';
import { optionalText, requiredText } from '../text';
import {
  projectDetailSchema,
  projectSummarySchema,
  quoteSchema,
  timelineVariants,
} from './project-request';
import { projectStatusSchema, projectStatuses } from './status';

/** Which projects the admin list shows: the ones still open, every one, or a single status. */
export const adminProjectFilters = ['open', 'all', ...projectStatuses] as const;
export type AdminProjectFilter = (typeof adminProjectFilters)[number];

/** GET /admin/project-requests?status=&q=&page=&limit= */
export const adminProjectListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(adminProjectFilters).default('open'),
  /** Matches the reference number, the project name, or the customer's name or email. */
  q: optionalText(100),
});
export type AdminProjectListQuery = z.output<typeof adminProjectListQuerySchema>;

/** Who has to act next on a project: Prajzo, or the customer. */
export const waitingOnSchema = z.enum(['prajzo', 'customer']);
export type WaitingOn = z.infer<typeof waitingOnSchema>;

export const adminProjectSummarySchema = projectSummarySchema.extend({
  customerName: z.string(),
  customerEmail: z.string(),
  /** Null once the project is completed or cancelled. */
  waitingOn: waitingOnSchema.nullable(),
  /** The customer has answered a question and nobody has moved the project on since. */
  customerReplied: z.boolean(),
});
export type AdminProjectSummary = z.infer<typeof adminProjectSummarySchema>;

export const adminProjectListSchema = paginatedSchema(adminProjectSummarySchema);
export type AdminProjectList = z.infer<typeof adminProjectListSchema>;

/** The admin's view of the timeline also says who on the team did each thing. */
const actorName = z.string();
export const adminTimelineEntrySchema = z.discriminatedUnion('kind', [
  timelineVariants.status.extend({ actorName }),
  timelineVariants.reply.extend({ actorName }),
  timelineVariants.deliveryDate.extend({ actorName }),
  timelineVariants.signOff.extend({ actorName }),
]);
export type AdminTimelineEntry = z.infer<typeof adminTimelineEntrySchema>;

/** Every version of a quote that was sent, newest last. */
export const adminQuoteSchema = quoteSchema.extend({ sentByName: z.string() });
export type AdminQuote = z.infer<typeof adminQuoteSchema>;

/** An internal note: only admins ever see these. */
export const adminNoteSchema = z.object({
  id: z.string(),
  text: z.string(),
  byName: z.string(),
  at: z.string(),
});
export type AdminNote = z.infer<typeof adminNoteSchema>;

export const statusRequirements = ['quote', 'deliveryDate', 'note'] as const;

/** A status the admin may move this project to right now, and what that move needs. */
export const allowedChangeSchema = z.object({
  to: projectStatusSchema,
  needs: z.enum(statusRequirements).nullable(),
});
export type AllowedChange = z.infer<typeof allowedChangeSchema>;

export const adminProjectDetailSchema = projectDetailSchema
  .omit({ timeline: true, quote: true, allowedActions: true })
  .extend({
    source: z.enum(['start-form', 'builder']),
    customer: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      phone: z.string().nullable(),
    }),
    timeline: z.array(adminTimelineEntrySchema),
    quotes: z.array(adminQuoteSchema),
    adminNotes: z.array(adminNoteSchema),
    allowedChanges: z.array(allowedChangeSchema),
    waitingOn: waitingOnSchema.nullable(),
    customerReplied: z.boolean(),
    /** More revisions have been asked for than the accepted quote includes. */
    revisionsOverIncluded: z.boolean(),
  });
export type AdminProjectDetail = z.infer<typeof adminProjectDetailSchema>;

export const adminProjectResponseSchema = z.object({ project: adminProjectDetailSchema });
export type AdminProjectResponse = z.infer<typeof adminProjectResponseSchema>;

/** The largest price a quote may carry: one crore rupees, in paise. */
export const maxQuotePaise = 1_000_000_000;

/** What an admin fills in to send a quote. */
export const quoteInputSchema = z.object({
  amountPaise: z
    .number('Enter the price in rupees')
    .int('Enter a whole number of rupees')
    .min(100, 'Enter the price, at least ₹1')
    .max(maxQuotePaise, 'That is more than ₹1 crore. Please check the price')
    .multipleOf(100, 'Enter a whole number of rupees'),
  scope: requiredText(
    20,
    3000,
    'Describe what the price includes (at least 20 characters)',
    'Keep the scope under 3,000 characters',
  ),
  revisionsIncluded: z
    .number('Enter how many rounds of changes are included')
    .int('Enter a whole number')
    .min(0, 'Enter 0 or more')
    .max(20, 'Enter 20 or fewer'),
});
export type QuoteInput = z.output<typeof quoteInputSchema>;

const calendarDate = (value: string) => isCalendarDate(value);
const notPast = (value: string) => !isCalendarDate(value) || value >= todayInIndia();
const notTooFar = (value: string) =>
  !isCalendarDate(value) || value <= addDays(todayInIndia(), 1095);

/** A delivery date: a real date, today or later, and within three years. */
export const deliveryDateSchema = z
  .string('Choose a date')
  .trim()
  .refine(calendarDate, 'Choose a date from the calendar')
  .refine(notPast, "Choose a date that hasn't passed")
  .refine(notTooFar, 'Choose a date within the next three years');

const optionalDeliveryDate = optionalText(10)
  .refine((value) => value === undefined || calendarDate(value), 'Choose a date from the calendar')
  .refine((value) => value === undefined || notPast(value), "Choose a date that hasn't passed")
  .refine(
    (value) => value === undefined || notTooFar(value),
    'Choose a date within the next three years',
  );

/**
 * POST /admin/project-requests/:reference/status. What else must come with it depends on the
 * move (see statusTransitions): a quote, a delivery date, or a note the customer will see.
 */
export const adminStatusChangeSchema = z.object({
  to: projectStatusSchema,
  note: optionalText(1000),
  quote: quoteInputSchema.optional(),
  confirmedDeliveryDate: optionalDeliveryDate,
});
export type AdminStatusChange = z.output<typeof adminStatusChangeSchema>;

/** POST /admin/project-requests/:reference/delivery-date */
export const adminDeliveryDateRequestSchema = z.object({
  date: deliveryDateSchema,
  note: optionalText(500),
});
export type AdminDeliveryDateRequest = z.output<typeof adminDeliveryDateRequestSchema>;

/** POST /admin/project-requests/:reference/notes */
export const adminNoteRequestSchema = z.object({
  text: requiredText(2, 2000, 'Write the note'),
});
export type AdminNoteRequest = z.output<typeof adminNoteRequestSchema>;
