import {
  adminCategoryListSchema,
  adminCustomerDetailSchema,
  adminCustomerListSchema,
  adminMessageListSchema,
  adminOverviewSchema,
  apiErrorBodySchema,
  auditListSchema,
  categoryIcons,
  projectStatuses,
} from '@prajzo/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { startTestDatabase } from '../../test/helpers';
import {
  adminAccount,
  adminMoves,
  customerDoes,
  forceStatus,
  inDays,
  newProjectApp,
  projectWithQuote,
  resetEverything,
  sendProject,
  signedInAdmin,
  signedInCustomer,
  type Agent,
} from '../../test/project-helpers';
import { AuditLogModel } from '../audit/audit-log.model';
import { UserModel } from '../auth/user.model';
import { defaultCategories } from '../catalogue/catalogue.defaults';
import { CategoryModel, ServicePackageModel } from '../catalogue/catalogue.models';
import { ensureCatalogueDefaults } from '../catalogue/catalogue.service';
import { ContactMessageModel } from '../contact/contact-message.model';
import { ProjectRequestModel } from '../projects/project-request.model';

let database: { stop: () => Promise<void> };

beforeAll(async () => {
  database = await startTestDatabase();
  await ensureCatalogueDefaults();
});

afterAll(async () => {
  await database.stop();
});

beforeEach(async () => {
  await resetEverything();
  // Put the catalogue back as the defaults make it, whatever an earlier test edited.
  await Promise.all([CategoryModel.deleteMany({}), ServicePackageModel.deleteMany({})]);
  await ensureCatalogueDefaults();
});

const errorOf = (body: unknown) => apiErrorBodySchema.parse(body).error;

// ======================================================================= customers

describe('the customer list', () => {
  it('lists customers only (not administrators), newest first, with how many projects each sent', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const asha = await signedInCustomer(app, 'asha@example.com', 'Asha Rao');
    const ravi = await signedInCustomer(app, 'ravi@example.com', 'Ravi Kumar');
    await sendProject(asha);
    await sendProject(asha, { title: 'A second website' });
    await UserModel.updateOne({ email: 'asha@example.com' }, { phone: '+91 98866 07720' });

    const response = await admin.get('/api/v1/admin/customers');

    expect(response.status).toBe(200);
    const result = adminCustomerListSchema.parse(response.body);
    expect(result.total).toBe(2);
    expect(result.items.map((customer) => customer.email)).toEqual([
      'ravi@example.com',
      'asha@example.com',
    ]);
    expect(result.items[1]).toMatchObject({
      name: 'Asha Rao',
      phone: '+91 98866 07720',
      status: 'active',
      projectCount: 2,
    });
    expect(result.items[0]).toMatchObject({ projectCount: 0, phone: null });
    expect(result.items.map((customer) => customer.email)).not.toContain(adminAccount.email);
    expect(ravi).toBeDefined();
  });

  it('never sends passwords, hashes or sessions', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    await signedInCustomer(app);

    const response = await admin.get('/api/v1/admin/customers');

    expect(JSON.stringify(response.body)).not.toMatch(/password|hash|session|_id|__v/i);
  });

  it('searches by name or email, ignoring case, and pages through the results', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    for (const [index, name] of [
      'Asha Rao',
      'Ravi Kumar',
      'Meera Nair',
      'Ashok Pillai',
      'Dev Patel',
    ].entries()) {
      await signedInCustomer(app, `user${index}@mail${index}.test`, name);
    }
    const find = async (query: string) =>
      adminCustomerListSchema
        .parse((await admin.get(`/api/v1/admin/customers?${query}`)).body)
        .items.map((customer) => customer.name)
        .sort();

    expect(await find('q=ash')).toEqual(['Asha Rao', 'Ashok Pillai']);
    expect(await find('q=MEERA')).toEqual(['Meera Nair']);
    expect(await find('q=mail3')).toEqual(['Ashok Pillai']);
    expect(await find('q=.*')).toEqual([]);
    expect(await find('limit=2&page=1')).toHaveLength(2);
    expect(await find('limit=2&page=3')).toHaveLength(1);
    expect((await admin.get('/api/v1/admin/customers?limit=51')).status).toBe(400);
  });

  it('shows a disabled account as disabled', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    await signedInCustomer(app);
    await UserModel.updateOne({ email: 'asha@example.com' }, { status: 'disabled' });

    const result = adminCustomerListSchema.parse((await admin.get('/api/v1/admin/customers')).body);

    expect(result.items[0]?.status).toBe('disabled');
  });
});

describe('one customer', () => {
  it('shows their details and only their own projects, newest first', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const asha = await signedInCustomer(app, 'asha@example.com', 'Asha Rao');
    const ravi = await signedInCustomer(app, 'ravi@example.com', 'Ravi Kumar');
    const first = await sendProject(asha, { title: 'First website' });
    const second = await sendProject(asha, { title: 'Second website' });
    await sendProject(ravi, { title: "Ravi's website" });
    const ashaId = (await UserModel.findOne({ email: 'asha@example.com' }))?.id as string;

    const response = await admin.get(`/api/v1/admin/customers/${ashaId}`);

    expect(response.status).toBe(200);
    const detail = adminCustomerDetailSchema.parse(response.body);
    expect(detail.customer).toMatchObject({ id: ashaId, name: 'Asha Rao', projectCount: 2 });
    expect(detail.projects.map((project) => project.reference)).toEqual([second, first]);
  });

  it('says "not found" for an administrator, an unknown customer, or something that is not an id', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const adminId = (await UserModel.findOne({ email: adminAccount.email }))?.id as string;
    for (const id of [
      adminId,
      '0123456789abcdef01234567',
      'abc',
      '..%2F..',
      '{"$ne":""}',
      '0123456789abcdef0123456',
    ]) {
      const response = await admin.get(`/api/v1/admin/customers/${id}`);
      expect(response.status, id).toBe(404);
    }
  });
});

// ======================================================================= messages

async function addMessages() {
  await ContactMessageModel.create([
    {
      name: 'Asha Rao',
      email: 'asha@example.com',
      phone: '+91 98866 07720',
      websiteType: 'business-websites',
      packageKey: 'quick-launch',
      message: 'I need a website for my studio, with a gallery and a contact form.',
      consentAt: new Date(),
      status: 'new',
      createdAt: new Date('2026-10-20T10:00:00Z'),
    },
    {
      name: 'Ravi Kumar',
      email: 'ravi@example.com',
      websiteType: 'other',
      packageKey: 'not-sure',
      message: 'Can you build something unusual for my shop?',
      consentAt: new Date(),
      status: 'read',
      createdAt: new Date('2026-10-21T10:00:00Z'),
    },
    {
      name: 'Meera Nair',
      email: 'meera@example.com',
      message: 'Thanks, that answered my question.',
      consentAt: new Date(),
      status: 'archived',
      createdAt: new Date('2026-10-22T10:00:00Z'),
    },
  ]);
}

describe('the contact inbox', () => {
  it('shows what is not archived, newest first, with the website type and package by name', async () => {
    const admin = await signedInAdmin(newProjectApp());
    await addMessages();

    const response = await admin.get('/api/v1/admin/contact-messages');

    expect(response.status).toBe(200);
    const result = adminMessageListSchema.parse(response.body);
    expect(result.items.map((message) => message.name)).toEqual(['Ravi Kumar', 'Asha Rao']);
    expect(result.items[1]).toMatchObject({
      websiteType: 'business-websites',
      websiteTypeTitle: 'Business Websites',
      packageKey: 'quick-launch',
      packageName: 'Quick Launch',
      phone: '+91 98866 07720',
      status: 'new',
    });
    expect(result.items[0]).toMatchObject({
      websiteTypeTitle: 'Something else',
      packageName: 'Not sure yet',
      phone: null,
    });
  });

  it('can show each status, or everything', async () => {
    const admin = await signedInAdmin(newProjectApp());
    await addMessages();
    const names = async (status: string) =>
      adminMessageListSchema
        .parse((await admin.get(`/api/v1/admin/contact-messages?status=${status}`)).body)
        .items.map((message) => message.name)
        .sort();

    expect(await names('new')).toEqual(['Asha Rao']);
    expect(await names('read')).toEqual(['Ravi Kumar']);
    expect(await names('archived')).toEqual(['Meera Nair']);
    expect(await names('inbox')).toEqual(['Asha Rao', 'Ravi Kumar']);
    expect(await names('all')).toEqual(['Asha Rao', 'Meera Nair', 'Ravi Kumar']);
    expect((await admin.get('/api/v1/admin/contact-messages?status=deleted')).status).toBe(400);
  });

  it('searches the name, email and message', async () => {
    const admin = await signedInAdmin(newProjectApp());
    await addMessages();
    const names = async (q: string) =>
      adminMessageListSchema
        .parse(
          (await admin.get(`/api/v1/admin/contact-messages?status=all&q=${encodeURIComponent(q)}`))
            .body,
        )
        .items.map((message) => message.name)
        .sort();

    expect(await names('gallery')).toEqual(['Asha Rao']);
    expect(await names('RAVI@')).toEqual(['Ravi Kumar']);
    expect(await names('unusual')).toEqual(['Ravi Kumar']);
    expect(await names('answered')).toEqual(['Meera Nair']);
    expect(await names('.*')).toEqual([]);
  });

  it('marks a message read, archived, or new again, and records each change', async () => {
    const admin = await signedInAdmin(newProjectApp());
    await addMessages();
    const message = await ContactMessageModel.findOne({ name: 'Asha Rao' });
    const url = `/api/v1/admin/contact-messages/${message?.id as string}`;

    const read = await admin.patch(url).send({ status: 'read' });
    expect(read.status).toBe(200);
    expect((read.body as { message: { status: string } }).message.status).toBe('read');
    expect((await ContactMessageModel.findById(message?.id))?.status).toBe('read');

    await admin.patch(url).send({ status: 'archived' });
    await admin.patch(url).send({ status: 'new' });
    expect((await ContactMessageModel.findById(message?.id))?.status).toBe('new');

    const entries = await AuditLogModel.find({ action: 'message.status' }).sort({ at: 1 });
    expect(entries.map((entry) => entry.summary)).toEqual([
      'Marked the message from Asha Rao as read',
      'Marked the message from Asha Rao as archived',
      'Marked the message from Asha Rao as new',
    ]);
    expect(entries[0]).toMatchObject({
      actorName: 'Prajzo Admin',
      targetType: 'contact-message',
      targetId: message?.id,
    });
  });

  it('writes nothing to the log when the status does not change', async () => {
    const admin = await signedInAdmin(newProjectApp());
    await addMessages();
    const message = await ContactMessageModel.findOne({ name: 'Asha Rao' });

    const response = await admin
      .patch(`/api/v1/admin/contact-messages/${message?.id as string}`)
      .send({ status: 'new' });

    expect(response.status).toBe(200);
    expect(await AuditLogModel.countDocuments({ action: 'message.status' })).toBe(0);
  });

  it('refuses a status that does not exist, and a message that does not exist', async () => {
    const admin = await signedInAdmin(newProjectApp());
    await addMessages();
    const message = await ContactMessageModel.findOne({ name: 'Asha Rao' });

    expect(
      (
        await admin
          .patch(`/api/v1/admin/contact-messages/${message?.id as string}`)
          .send({ status: 'deleted' })
      ).status,
    ).toBe(400);
    expect(
      (await admin.patch(`/api/v1/admin/contact-messages/${message?.id as string}`).send({}))
        .status,
    ).toBe(400);
    for (const id of ['0123456789abcdef01234567', 'abc']) {
      expect(
        (await admin.patch(`/api/v1/admin/contact-messages/${id}`).send({ status: 'read' })).status,
        id,
      ).toBe(404);
    }
    expect((await ContactMessageModel.findById(message?.id))?.status).toBe('new');
  });
});

// ======================================================================= catalogue

const newCategory = {
  key: 'online-courses',
  title: 'Online Courses',
  description: 'Websites that teach: lessons, sign-ups and progress.',
  icon: 'GraduationCap',
  useCases: ['Tutors', 'Training companies'],
  deliveryTier: 'advanced',
  sortOrder: 5,
  active: true,
};

const newPackage = {
  key: 'growth-plan',
  name: 'Growth Plan',
  summary: 'A website that grows with you, with monthly improvements.',
  deliveryTier: 'professional',
  scope: ['Everything in Professional', 'Monthly updates'],
  priceMode: 'from',
  priceAmountPaise: 1_499_900,
  sortOrder: 40,
  active: true,
};

describe('categories', () => {
  it('lists every category, including ones that are switched off, in the order they are shown', async () => {
    const admin = await signedInAdmin(newProjectApp());
    await CategoryModel.updateOne({ key: 'printing-services' }, { active: false });

    const result = adminCategoryListSchema.parse(
      (await admin.get('/api/v1/admin/categories')).body,
    );

    expect(result.items).toHaveLength(defaultCategories.length);
    expect(result.items.find((category) => category.key === 'printing-services')?.active).toBe(
      false,
    );
    const orders = result.items.map((category) => category.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('adds a category, which then shows on the public site', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);

    const response = await admin.post('/api/v1/admin/categories').send(newCategory);

    expect(response.status).toBe(201);
    const publicList = (await request(app).get('/api/v1/categories')).body as {
      items: { key: string; title: string }[];
    };
    expect(publicList.items.find((category) => category.key === 'online-courses')?.title).toBe(
      'Online Courses',
    );
    expect(await AuditLogModel.findOne({ action: 'category.created' })).toMatchObject({
      summary: 'Added the category "Online Courses"',
      targetType: 'category',
      targetId: 'online-courses',
    });
  });

  it('refuses a key that is already used, or is not tidy, and anything missing or wrong', async () => {
    const admin = await signedInAdmin(newProjectApp());
    await admin.post('/api/v1/admin/categories').send(newCategory);

    const duplicate = await admin.post('/api/v1/admin/categories').send(newCategory);
    expect(duplicate.status).toBe(409);
    expect(errorOf(duplicate.body).fields?.key).toBeDefined();

    for (const key of ['Online Courses', 'ab', 'online--courses', '-courses']) {
      expect(
        (await admin.post('/api/v1/admin/categories').send({ ...newCategory, key })).status,
        key,
      ).toBe(400);
    }
    const bad = await admin.post('/api/v1/admin/categories').send({
      ...newCategory,
      key: 'another-one',
      title: 'x',
      icon: 'Rocket',
      deliveryTier: 'instant',
      useCases: ['ok example', ''],
    });
    expect(bad.status).toBe(400);
    expect(Object.keys(errorOf(bad.body).fields ?? {}).sort()).toEqual([
      'deliveryTier',
      'icon',
      'title',
      'useCases.1',
    ]);
    expect(await CategoryModel.countDocuments({ key: 'another-one' })).toBe(0);
  });

  it('edits a category, never changes its key, and says in the log what changed', async () => {
    const admin = await signedInAdmin(newProjectApp());
    const { key: _key, ...fields } = newCategory;

    const response = await admin.patch('/api/v1/admin/categories/business-websites').send({
      ...fields,
      key: 'sneaky-new-key',
      title: 'Websites for Businesses',
      sortOrder: 3,
      icon: 'Building2',
      deliveryTier: 'professional',
    });

    expect(response.status).toBe(200);
    const stored = await CategoryModel.findOne({ key: 'business-websites' });
    expect(stored).toMatchObject({ title: 'Websites for Businesses', sortOrder: 3 });
    expect(await CategoryModel.countDocuments({ key: 'sneaky-new-key' })).toBe(0);
    const entry = await AuditLogModel.findOne({ action: 'category.updated' });
    expect(entry?.summary).toMatch(/^Edited the category "Websites for Businesses" \(.*title.*\)$/);
  });

  it('switches a category off and on: gone from the public site and from new projects, kept on old ones', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const before = await sendProject(customer);
    const current = await CategoryModel.findOne({ key: 'business-websites' });
    const input = {
      title: current?.title,
      description: current?.description,
      icon: current?.icon,
      useCases: current?.useCases,
      deliveryTier: current?.deliveryTier,
      sortOrder: current?.sortOrder,
    };

    await admin
      .patch('/api/v1/admin/categories/business-websites')
      .send({ ...input, active: false });

    const publicOff = (await request(app).get('/api/v1/categories')).body as {
      items: { key: string }[];
    };
    expect(publicOff.items.map((category) => category.key)).not.toContain('business-websites');
    const refused = await customer.post('/api/v1/project-requests').send({
      title: 'Another website',
      categoryKey: 'business-websites',
      description: 'A simple five-page website for my photography studio, with a gallery.',
    });
    expect(refused.status).toBe(400);
    expect((await ProjectRequestModel.findOne({ reference: before }))?.categoryTitle).toBe(
      'Business Websites',
    ); // the project already sent keeps its type
    expect(await AuditLogModel.findOne({ action: 'category.updated' })).toMatchObject({
      summary: 'Switched off the category "Business Websites"',
    });

    await admin
      .patch('/api/v1/admin/categories/business-websites')
      .send({ ...input, active: true });
    const publicOn = (await request(app).get('/api/v1/categories')).body as {
      items: { key: string }[];
    };
    expect(publicOn.items.map((category) => category.key)).toContain('business-websites');
  });

  it('says "not found" for a category that does not exist or a key that cannot exist', async () => {
    const admin = await signedInAdmin(newProjectApp());
    const { key: _key, ...fields } = newCategory;
    for (const key of ['no-such-category', 'Not Valid', 'x']) {
      const response = await admin
        .patch(`/api/v1/admin/categories/${encodeURIComponent(key)}`)
        .send(fields);
      expect(response.status, key).toBe(404);
    }
  });

  it('only offers icons the website can draw, and the default categories all use them', () => {
    for (const category of defaultCategories) {
      expect(categoryIcons as readonly string[], category.key).toContain(category.icon);
    }
  });

  it("keeps an admin's edits when the defaults are loaded again", async () => {
    const admin = await signedInAdmin(newProjectApp());
    const current = await CategoryModel.findOne({ key: 'business-websites' });
    await admin.patch('/api/v1/admin/categories/business-websites').send({
      title: 'My own title',
      description: current?.description,
      icon: current?.icon,
      useCases: current?.useCases,
      deliveryTier: current?.deliveryTier,
      sortOrder: current?.sortOrder,
      active: true,
    });

    await ensureCatalogueDefaults();

    expect((await CategoryModel.findOne({ key: 'business-websites' }))?.title).toBe('My own title');
  });
});

describe('packages and prices', () => {
  it('lists every package, including ones that are switched off', async () => {
    const admin = await signedInAdmin(newProjectApp());
    await ServicePackageModel.updateOne({ key: 'advanced-development' }, { active: false });

    const response = await admin.get('/api/v1/admin/packages');

    const items = (response.body as { items: { key: string; active: boolean }[] }).items;
    expect(items.map((item) => item.key)).toEqual([
      'quick-launch',
      'professional-website',
      'advanced-development',
    ]);
    expect(items[2]?.active).toBe(false);
  });

  it('changes a price, which the public site shows at once, and says so in the log', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const current = await ServicePackageModel.findOne({ key: 'quick-launch' });

    const response = await admin.patch('/api/v1/admin/packages/quick-launch').send({
      name: current?.name,
      summary: current?.summary,
      deliveryTier: current?.deliveryTier,
      scope: current?.scope,
      priceMode: 'from',
      priceAmountPaise: 349_900 + 100,
      sortOrder: current?.sortOrder,
      active: true,
    });

    expect(response.status).toBe(200);
    const publicList = (await request(app).get('/api/v1/packages')).body as {
      items: { key: string; priceAmountPaise: number }[];
    };
    expect(publicList.items.find((item) => item.key === 'quick-launch')?.priceAmountPaise).toBe(
      350_000,
    );
    expect(await AuditLogModel.findOne({ action: 'package.updated' })).toMatchObject({
      summary: 'Changed the price of "Quick Launch" from ₹2,999 to ₹3,500',
      targetType: 'package',
      targetId: 'quick-launch',
    });
  });

  it('can change a package to "Request a quote", which has no price', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const current = await ServicePackageModel.findOne({ key: 'quick-launch' });
    const input = {
      name: current?.name,
      summary: current?.summary,
      deliveryTier: current?.deliveryTier,
      scope: current?.scope,
      sortOrder: current?.sortOrder,
      active: true,
    };

    const withPrice = await admin
      .patch('/api/v1/admin/packages/quick-launch')
      .send({ ...input, priceMode: 'quote', priceAmountPaise: 299_900 });
    expect(withPrice.status).toBe(400);
    expect(errorOf(withPrice.body).fields?.priceAmountPaise).toMatch(/Leave the price empty/);

    const quote = await admin
      .patch('/api/v1/admin/packages/quick-launch')
      .send({ ...input, priceMode: 'quote' });
    expect(quote.status).toBe(200);
    expect(
      (await ServicePackageModel.findOne({ key: 'quick-launch' }))?.priceAmountPaise,
    ).toBeNull();
    const publicList = (await request(app).get('/api/v1/packages')).body as {
      items: { key: string; priceMode: string; priceAmountPaise: number | null }[];
    };
    expect(publicList.items.find((item) => item.key === 'quick-launch')).toMatchObject({
      priceMode: 'quote',
      priceAmountPaise: null,
    });
  });

  it('refuses a price that is missing, too small, not whole rupees, or on the wrong kind of package', async () => {
    const admin = await signedInAdmin(newProjectApp());
    const { key: _key, ...fields } = newPackage;
    for (const [overrides, field] of [
      [{ priceAmountPaise: null }, 'priceAmountPaise'],
      [{ priceAmountPaise: 50 }, 'priceAmountPaise'],
      [{ priceAmountPaise: 150_050 }, 'priceAmountPaise'],
      [{ priceAmountPaise: 1_000_000_100 }, 'priceAmountPaise'],
      [{ priceMode: 'sale' }, 'priceMode'],
    ] as const) {
      const response = await admin
        .patch('/api/v1/admin/packages/quick-launch')
        .send({ ...fields, ...overrides });
      expect(response.status, JSON.stringify(overrides)).toBe(400);
      expect(Object.keys(errorOf(response.body).fields ?? {}), JSON.stringify(overrides)).toContain(
        field,
      );
    }
    expect((await ServicePackageModel.findOne({ key: 'quick-launch' }))?.priceAmountPaise).toBe(
      299_900,
    );
  });

  it('adds a package, refusing a key that is already used', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);

    const created = await admin.post('/api/v1/admin/packages').send(newPackage);
    const duplicate = await admin.post('/api/v1/admin/packages').send(newPackage);

    expect(created.status).toBe(201);
    expect(duplicate.status).toBe(409);
    const publicList = (await request(app).get('/api/v1/packages')).body as {
      items: { key: string }[];
    };
    expect(publicList.items.map((item) => item.key)).toContain('growth-plan');
    expect(await AuditLogModel.findOne({ action: 'package.created' })).toMatchObject({
      summary: 'Added the package "Growth Plan"',
    });
  });

  it('switches a package off and on', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const current = await ServicePackageModel.findOne({ key: 'professional-website' });
    const input = {
      name: current?.name,
      summary: current?.summary,
      deliveryTier: current?.deliveryTier,
      scope: current?.scope,
      priceMode: current?.priceMode,
      priceAmountPaise: current?.priceAmountPaise,
      sortOrder: current?.sortOrder,
    };

    await admin
      .patch('/api/v1/admin/packages/professional-website')
      .send({ ...input, active: false });
    const off = (await request(app).get('/api/v1/packages')).body as { items: { key: string }[] };
    expect(off.items.map((item) => item.key)).not.toContain('professional-website');
    expect(await AuditLogModel.findOne({ action: 'package.updated' })).toMatchObject({
      summary: 'Switched off the package "Professional Website"',
    });

    await admin
      .patch('/api/v1/admin/packages/professional-website')
      .send({ ...input, active: true });
    const on = (await request(app).get('/api/v1/packages')).body as { items: { key: string }[] };
    expect(on.items.map((item) => item.key)).toContain('professional-website');
  });
});

// ======================================================================= overview and activity

describe('the overview', () => {
  it('starts at zero, with a count for every status', async () => {
    const admin = await signedInAdmin(newProjectApp());

    const overview = adminOverviewSchema.parse((await admin.get('/api/v1/admin/overview')).body);

    expect(overview.customers).toBe(0);
    expect(overview.contactMessages).toEqual({ total: 0, unread: 0 });
    expect(Object.keys(overview.projectRequests.byStatus).sort()).toEqual(
      [...projectStatuses].sort(),
    );
    expect(Object.values(overview.projectRequests.byStatus).every((count) => count === 0)).toBe(
      true,
    );
    expect(overview.projectRequests.toDo).toEqual({
      newRequests: 0,
      replies: 0,
      accepted: 0,
      revisions: 0,
    });
    expect(overview.recentActivity).toEqual([]);
  });

  it('counts projects by status and what is waiting for Prajzo', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const refs: string[] = [];
    for (let index = 0; index < 7; index += 1)
      refs.push(await sendProject(customer, { title: `Website ${index}` }));
    await forceStatus(refs[1]!, 'under-review');
    await forceStatus(refs[2]!, 'awaiting-information', { customerReplyPending: true });
    await forceStatus(refs[3]!, 'awaiting-information', { customerReplyPending: false });
    await forceStatus(refs[4]!, 'approved');
    await forceStatus(refs[5]!, 'revision-requested');
    await forceStatus(refs[6]!, 'completed');
    await ContactMessageModel.create([
      {
        name: 'A',
        email: 'a@example.com',
        message: 'x'.repeat(30),
        consentAt: new Date(),
        status: 'new',
      },
      {
        name: 'B',
        email: 'b@example.com',
        message: 'x'.repeat(30),
        consentAt: new Date(),
        status: 'read',
      },
      {
        name: 'C',
        email: 'c@example.com',
        message: 'x'.repeat(30),
        consentAt: new Date(),
        status: 'new',
      },
    ]);

    const overview = adminOverviewSchema.parse((await admin.get('/api/v1/admin/overview')).body);

    expect(overview.customers).toBe(1);
    expect(overview.contactMessages).toEqual({ total: 3, unread: 2 });
    expect(overview.projectRequests).toMatchObject({ total: 7, received: 1 });
    expect(overview.projectRequests.byStatus).toMatchObject({
      received: 1,
      'under-review': 1,
      'awaiting-information': 2,
      approved: 1,
      'revision-requested': 1,
      completed: 1,
      cancelled: 0,
    });
    expect(overview.projectRequests.toDo).toEqual({
      newRequests: 1,
      replies: 1, // only the one where the customer has answered
      accepted: 1,
      revisions: 1,
    });
  });

  it('shows the ten latest things anyone did, newest first, in plain words', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const refs: string[] = [];
    for (let index = 0; index < 12; index += 1) {
      refs.push(await sendProject(customer, { title: `Website ${index}` }));
    }
    await adminMoves(admin, refs[11]!, { to: 'under-review' });

    const overview = adminOverviewSchema.parse((await admin.get('/api/v1/admin/overview')).body);

    expect(overview.recentActivity).toHaveLength(10);
    expect(overview.recentActivity[0]).toMatchObject({
      actorName: 'Prajzo Admin',
      actorRole: 'admin',
      action: 'project.status',
      summary: `Moved ${refs[11]} from Request Received to Under Review`,
      targetType: 'project',
      targetId: refs[11],
    });
    expect(overview.recentActivity[1]).toMatchObject({
      actorName: 'Asha Rao',
      actorRole: 'customer',
      action: 'project.created',
    });
  });
});

describe('the activity log', () => {
  async function busyProject() {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await projectWithQuote(customer, admin);
    await customerDoes(customer, reference, { action: 'accept-quote', quoteVersion: 1 });
    await adminMoves(admin, reference, { to: 'in-development', confirmedDeliveryDate: inDays(9) });
    return { app, admin, customer, reference };
  }

  it('lists what admins and customers did, newest first, a page at a time', async () => {
    const { admin, reference } = await busyProject();

    const all = auditListSchema.parse((await admin.get('/api/v1/admin/activity')).body);

    // created, review, quote, accepted, in development
    expect(all.total).toBe(5);
    expect(all.items.map((entry) => entry.action)).toEqual([
      'project.status',
      'project.quote-accepted',
      'project.status',
      'project.status',
      'project.created',
    ]);
    expect(all.items.every((entry) => entry.targetId === reference)).toBe(true);
    expect(all.items.map((entry) => entry.actorRole)).toEqual([
      'admin',
      'customer',
      'admin',
      'admin',
      'customer',
    ]);

    const second = auditListSchema.parse(
      (await admin.get('/api/v1/admin/activity?limit=2&page=2')).body,
    );
    expect(second.items.map((entry) => entry.action)).toEqual(['project.status', 'project.status']);
  });

  it('can be limited to one kind of thing', async () => {
    const { admin } = await busyProject();
    const current = await CategoryModel.findOne({ key: 'business-websites' });
    await admin.patch('/api/v1/admin/categories/business-websites').send({
      title: 'New title for this',
      description: current?.description,
      icon: current?.icon,
      useCases: current?.useCases,
      deliveryTier: current?.deliveryTier,
      sortOrder: current?.sortOrder,
      active: true,
    });

    const categories = auditListSchema.parse(
      (await admin.get('/api/v1/admin/activity?targetType=category')).body,
    );
    const projects = auditListSchema.parse(
      (await admin.get('/api/v1/admin/activity?targetType=project')).body,
    );

    expect(categories.total).toBe(1);
    expect(projects.total).toBe(5);
    expect((await admin.get('/api/v1/admin/activity?targetType=customer')).status).toBe(400);
  });

  it('has entries that cannot be changed through the website', async () => {
    const { app, admin } = await busyProject();
    const entry = await AuditLogModel.findOne({});
    for (const method of ['patch', 'put', 'delete', 'post'] as const) {
      const response = await admin[method](`/api/v1/admin/activity/${entry?.id as string}`).send(
        {},
      );
      expect(response.status, method).toBe(404);
    }
    expect(await AuditLogModel.countDocuments()).toBe(5);
    expect(app).toBeDefined();
  });

  it('does not stop a change from going through when the log cannot be written', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));
    const failing = vi
      .spyOn(AuditLogModel, 'create')
      .mockRejectedValue(new Error('The log is unavailable'));

    const response = await admin
      .post(`/api/v1/admin/project-requests/${reference}/status`)
      .send({ to: 'under-review' });
    failing.mockRestore();

    expect(response.status).toBe(200);
    expect((await ProjectRequestModel.findOne({ reference }))?.status).toBe('under-review');
  });
});

describe('adding up', () => {
  it('uses a customer count that matches the list', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    for (const index of [1, 2, 3])
      await signedInCustomer(app, `c${index}@example.com`, `Customer ${index}`);
    const overview = adminOverviewSchema.parse((await admin.get('/api/v1/admin/overview')).body);
    const customers = adminCustomerListSchema.parse(
      (await admin.get('/api/v1/admin/customers')).body,
    );
    expect(overview.customers).toBe(customers.total);
    expect(overview.customers).toBe(3);
  });

  it('is unaffected by how many administrators there are', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const otherAdmin: Agent = admin;
    expect(otherAdmin).toBeDefined();
    await UserModel.create({
      name: 'Second Admin',
      email: 'second@example.com',
      passwordHash: 'x',
      role: 'admin',
    });
    const overview = adminOverviewSchema.parse((await admin.get('/api/v1/admin/overview')).body);
    expect(overview.customers).toBe(0);
  });
});
