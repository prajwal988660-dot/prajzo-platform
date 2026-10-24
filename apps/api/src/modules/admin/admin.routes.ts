import {
  adminCategoryListSchema,
  adminCategoryResponseSchema,
  adminCustomerDetailSchema,
  adminCustomerListQuerySchema,
  adminCustomerListSchema,
  adminDeliveryDateRequestSchema,
  adminMessageListQuerySchema,
  adminMessageListSchema,
  adminMessageResponseSchema,
  adminMessageUpdateSchema,
  adminNoteRequestSchema,
  adminOverviewSchema,
  adminPackageListSchema,
  adminPackageResponseSchema,
  adminProjectListQuerySchema,
  adminProjectListSchema,
  adminStatusChangeSchema,
  auditListQuerySchema,
  auditListSchema,
  categoryCreateSchema,
  categoryInputSchema,
  keySchema,
  packageCreateSchema,
  packageInputSchema,
  type AdminProjectResponse,
} from '@prajzo/shared';
import { Router, type Request } from 'express';
import { AppError } from '../../lib/errors';
import { noStore } from '../../middleware/no-store';
import { requireDatabase } from '../../middleware/require-database';
import { listAudit } from '../audit/audit.service';
import { createGuards, currentUser } from '../auth/guards';
import type { Sessions } from '../auth/session';
import {
  addAdminNote,
  changeProjectStatus,
  findProject,
  listAdminProjects,
  setDeliveryDate,
} from '../projects/admin-project.service';
import type { ProjectEffects } from '../projects/project-effects';
import { toAdminProjectDetail } from '../projects/project-view';
import {
  createCategory,
  createPackage,
  listAdminCategories,
  listAdminPackages,
  updateCategory,
  updatePackage,
} from './admin-catalogue.service';
import { getCustomer, listCustomers } from './admin-customers.service';
import { listMessages, updateMessageStatus } from './admin-messages.service';
import { getAdminOverview } from './admin-overview.service';

/** A piece of the address (a reference, an id, a key). Anything but plain text counts as "not found". */
const param = (req: Request, name: string): string => {
  const value = req.params[name];
  return typeof value === 'string' ? value : '';
};

/** The key of a category or package in the address. A malformed one can't exist, so: not found. */
function keyParam(req: Request, what: string): string {
  const key = keySchema.safeParse(param(req, 'key'));
  if (!key.success) throw new AppError(404, 'NOT_FOUND', `We couldn't find that ${what}.`);
  return key.data;
}

/**
 * Everything administrators can do. The "must be an administrator" check is applied to the
 * whole router, before any route, so no route here can be reached without it (visitors get 401,
 * customers 403). The tests find every route in this router and try each one.
 */
export function adminRouter({
  sessions,
  effects,
}: {
  sessions: Sessions;
  effects: ProjectEffects;
}): Router {
  const router = Router();
  const { requireAdmin } = createGuards(sessions);
  router.use(noStore, requireDatabase, sessions.middleware, requireAdmin);

  // ---------- Overview and activity
  router.get('/overview', async (_req, res) => {
    res.json(adminOverviewSchema.parse(await getAdminOverview()));
  });

  router.get('/activity', async (req, res) => {
    const { targetType, ...paging } = auditListQuerySchema.parse(req.query);
    res.json(auditListSchema.parse(await listAudit(paging, targetType)));
  });

  // ---------- Projects
  router.get('/project-requests', async (req, res) => {
    const query = adminProjectListQuerySchema.parse(req.query);
    res.json(adminProjectListSchema.parse(await listAdminProjects(query)));
  });

  router.get('/project-requests/:reference', async (req, res) => {
    const project = await findProject(param(req, 'reference'));
    const body: AdminProjectResponse = { project: toAdminProjectDetail(project) };
    res.json(body);
  });

  router.post('/project-requests/:reference/status', async (req, res) => {
    const admin = currentUser(res.locals);
    const input = adminStatusChangeSchema.parse(req.body);
    const { project, from } = await changeProjectStatus(admin, param(req, 'reference'), input);
    req.log.info(
      { adminId: admin.id, reference: project.reference, from, to: input.to },
      'Project status changed',
    );
    await effects.adminChangedStatus(req, admin, project, from, input.to, input.note);
    const body: AdminProjectResponse = { project: toAdminProjectDetail(project) };
    res.json(body);
  });

  router.post('/project-requests/:reference/delivery-date', async (req, res) => {
    const admin = currentUser(res.locals);
    const input = adminDeliveryDateRequestSchema.parse(req.body);
    const { project, from } = await setDeliveryDate(
      admin,
      param(req, 'reference'),
      input.date,
      input.note,
    );
    await effects.adminSetDeliveryDate(req, admin, project, from, input.date, input.note);
    const body: AdminProjectResponse = { project: toAdminProjectDetail(project) };
    res.json(body);
  });

  router.post('/project-requests/:reference/notes', async (req, res) => {
    const admin = currentUser(res.locals);
    const input = adminNoteRequestSchema.parse(req.body);
    const project = await addAdminNote(admin, param(req, 'reference'), input.text);
    await effects.adminAddedNote(req, admin, project);
    const body: AdminProjectResponse = { project: toAdminProjectDetail(project) };
    res.status(201).json(body);
  });

  // ---------- Customers
  router.get('/customers', async (req, res) => {
    const query = adminCustomerListQuerySchema.parse(req.query);
    res.json(adminCustomerListSchema.parse(await listCustomers(query)));
  });

  router.get('/customers/:id', async (req, res) => {
    res.json(adminCustomerDetailSchema.parse(await getCustomer(param(req, 'id'))));
  });

  // ---------- Messages from the contact form
  router.get('/contact-messages', async (req, res) => {
    const query = adminMessageListQuerySchema.parse(req.query);
    res.json(adminMessageListSchema.parse(await listMessages(query)));
  });

  router.patch('/contact-messages/:id', async (req, res) => {
    const admin = currentUser(res.locals);
    const input = adminMessageUpdateSchema.parse(req.body);
    const { message, before } = await updateMessageStatus(param(req, 'id'), input.status);
    if (before !== message.status) {
      await effects.audit(req, {
        actorId: admin._id,
        actorName: admin.name,
        actorRole: 'admin',
        action: 'message.status',
        summary: `Marked the message from ${message.name} as ${message.status}`,
        targetType: 'contact-message',
        targetId: message.id,
      });
    }
    res.json(adminMessageResponseSchema.parse({ message }));
  });

  // ---------- Catalogue: categories
  router.get('/categories', async (_req, res) => {
    res.json(adminCategoryListSchema.parse({ items: await listAdminCategories() }));
  });

  router.post('/categories', async (req, res) => {
    const admin = currentUser(res.locals);
    const input = categoryCreateSchema.parse(req.body);
    const { category, summary } = await createCategory(input);
    await effects.audit(req, {
      actorId: admin._id,
      actorName: admin.name,
      actorRole: 'admin',
      action: 'category.created',
      summary,
      targetType: 'category',
      targetId: category.key,
    });
    res.status(201).json(adminCategoryResponseSchema.parse({ category }));
  });

  router.patch('/categories/:key', async (req, res) => {
    const admin = currentUser(res.locals);
    const key = keyParam(req, 'category');
    const input = categoryInputSchema.parse(req.body);
    const { category, summary } = await updateCategory(key, input);
    await effects.audit(req, {
      actorId: admin._id,
      actorName: admin.name,
      actorRole: 'admin',
      action: 'category.updated',
      summary,
      targetType: 'category',
      targetId: category.key,
    });
    res.json(adminCategoryResponseSchema.parse({ category }));
  });

  // ---------- Catalogue: packages and their prices
  router.get('/packages', async (_req, res) => {
    res.json(adminPackageListSchema.parse({ items: await listAdminPackages() }));
  });

  router.post('/packages', async (req, res) => {
    const admin = currentUser(res.locals);
    const input = packageCreateSchema.parse(req.body);
    const { package: servicePackage, summary } = await createPackage(input);
    await effects.audit(req, {
      actorId: admin._id,
      actorName: admin.name,
      actorRole: 'admin',
      action: 'package.created',
      summary,
      targetType: 'package',
      targetId: servicePackage.key,
    });
    res.status(201).json(adminPackageResponseSchema.parse({ package: servicePackage }));
  });

  router.patch('/packages/:key', async (req, res) => {
    const admin = currentUser(res.locals);
    const key = keyParam(req, 'package');
    const input = packageInputSchema.parse(req.body);
    const { package: servicePackage, summary } = await updatePackage(key, input);
    await effects.audit(req, {
      actorId: admin._id,
      actorName: admin.name,
      actorRole: 'admin',
      action: 'package.updated',
      summary,
      targetType: 'package',
      targetId: servicePackage.key,
    });
    res.json(adminPackageResponseSchema.parse({ package: servicePackage }));
  });

  return router;
}
