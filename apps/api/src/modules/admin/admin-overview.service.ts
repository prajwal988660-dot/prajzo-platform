import { projectStatuses, type AdminOverview, type ProjectStatus } from '@prajzo/shared';
import { recentAudit } from '../audit/audit.service';
import { UserModel } from '../auth/user.model';
import { ContactMessageModel } from '../contact/contact-message.model';
import { ProjectRequestModel } from '../projects/project-request.model';
import { customerSignedOff } from '../projects/project-view';

/** Real counts from the database, and the latest activity. Nothing here is typed in by hand. */
export async function getAdminOverview(): Promise<AdminOverview> {
  const [customers, messages, unread, rows, replies, reviewing, recentActivity] = await Promise.all(
    [
      UserModel.countDocuments({ role: 'customer' }),
      ContactMessageModel.countDocuments({}),
      ContactMessageModel.countDocuments({ status: 'new' }),
      ProjectRequestModel.aggregate<{ _id: ProjectStatus; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ProjectRequestModel.countDocuments({
        status: 'awaiting-information',
        customerReplyPending: true,
      }),
      // Whether the customer has said "it looks good" is read from the project's own history, so the
      // few projects waiting for review are looked at one by one.
      ProjectRequestModel.find({ status: 'awaiting-review' }),
      recentAudit(10),
    ],
  );

  const byStatus = Object.fromEntries(projectStatuses.map((status) => [status, 0])) as Record<
    ProjectStatus,
    number
  >;
  for (const row of rows) byStatus[row._id] = row.count;
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return {
    customers,
    contactMessages: { total: messages, unread },
    projectRequests: {
      total,
      received: byStatus.received,
      byStatus,
      toDo: {
        newRequests: byStatus.received,
        replies,
        accepted: byStatus.approved,
        revisions: byStatus['revision-requested'],
        signedOff: reviewing.filter(customerSignedOff).length,
      },
    },
    recentActivity,
  };
}
