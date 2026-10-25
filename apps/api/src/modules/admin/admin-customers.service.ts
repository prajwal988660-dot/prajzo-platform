import type {
  AdminCustomer,
  AdminCustomerDetail,
  AdminCustomerList,
  PaginationQuery,
} from '@prajzo/shared';
import type { Types } from 'mongoose';
import { AppError } from '../../lib/errors';
import { escapeRegExp } from '../../lib/regex';
import { UserModel, type UserDocument } from '../auth/user.model';
import { ProjectRequestModel } from '../projects/project-request.model';
import { toProjectSummary } from '../projects/project-view';

const notFound = () => new AppError(404, 'NOT_FOUND', "We couldn't find that customer.");

function toAdminCustomer(user: UserDocument, projectCount: number): AdminCustomer {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    status: user.status,
    projectCount,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

/** How many projects each of these customers has sent. */
async function projectCounts(ids: Types.ObjectId[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await ProjectRequestModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { customerId: { $in: ids } } },
    { $group: { _id: '$customerId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

/** Customer accounts (not administrators), newest first, searched by name or email. */
export async function listCustomers({
  q,
  page,
  limit,
}: PaginationQuery & { q?: string | undefined }): Promise<AdminCustomerList> {
  const filter: Record<string, unknown> = { role: 'customer' };
  if (q) {
    const pattern = new RegExp(escapeRegExp(q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    UserModel.countDocuments(filter),
  ]);
  const counts = await projectCounts(users.map((user) => user._id));
  return {
    items: users.map((user) => toAdminCustomer(user, counts.get(user.id) ?? 0)),
    page,
    limit,
    total,
  };
}

/** One customer with their projects. The id is checked, so nothing odd reaches the database. */
export async function getCustomer(id: string): Promise<AdminCustomerDetail> {
  if (!/^[0-9a-f]{24}$/i.test(id)) throw notFound();
  const user = await UserModel.findOne({ _id: id, role: 'customer' });
  if (!user) throw notFound();
  const [projects, projectCount] = await Promise.all([
    ProjectRequestModel.find({ customerId: user._id }).sort({ createdAt: -1, _id: -1 }).limit(100),
    ProjectRequestModel.countDocuments({ customerId: user._id }),
  ]);
  return {
    customer: toAdminCustomer(user, projectCount),
    projects: projects.map(toProjectSummary),
  };
}
