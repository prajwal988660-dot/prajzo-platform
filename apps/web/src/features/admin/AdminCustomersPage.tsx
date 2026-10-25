import {
  adminCustomerListSchema,
  type AdminCustomer,
  type AdminCustomerList,
} from '@prajzo/shared';
import { Search, Users } from 'lucide-react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { TextField } from '../../components/ui/Field';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { Pagination, pageFromAddress } from '../../components/ui/Pagination';
import { formatDate } from '../../lib/format';
import { useApi } from '../../lib/use-api';
import { useTypedQuery } from '../../lib/use-typed-query';
import { usePageTitle } from '../../lib/use-page-title';

const pageSize = 20;

/** Everyone who has an account, newest first, with how many projects they have sent. */
export function AdminCustomersPage() {
  usePageTitle('Customers');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = pageFromAddress(searchParams.get('page'));
  const query = (searchParams.get('q') ?? '').trim().slice(0, 100);

  const parameters = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (query) parameters.set('q', query);
  const customers = useApi(`/v1/admin/customers?${parameters.toString()}`, adminCustomerListSchema);

  const [typed, setTyped] = useTypedQuery(query);
  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = typed.trim().slice(0, 100);
    setSearchParams(text ? { q: text } : {});
  };

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>

      <form
        role="search"
        aria-label="Find customers"
        onSubmit={search}
        className="mt-6 grid items-start gap-4 sm:grid-cols-[1fr_auto]"
      >
        <TextField
          type="search"
          label="Search"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          maxLength={100}
          hint="By name or email address."
        />
        <Button type="submit" className="sm:mt-7">
          <Search aria-hidden="true" className="size-4" />
          Search
        </Button>
      </form>

      <div className="mt-8 grid gap-6">
        {customers.status === 'loading' && <LoadingBlock label="Loading the customers" />}
        {customers.status === 'error' && (
          <LoadError message={customers.error.message} onRetry={customers.retry} />
        )}
        {customers.status === 'success' && (
          <Results list={customers.data} page={page} query={query} />
        )}
      </div>
    </Container>
  );
}

function Results({ list, page, query }: { list: AdminCustomerList; page: number; query: string }) {
  const totalPages = Math.max(1, Math.ceil(list.total / list.limit));

  if (list.total === 0) {
    return query ? (
      <EmptyState
        headingLevel={2}
        icon={Users}
        title="No customers match"
        description="Try a different name or email address."
        action={<ButtonLink to="/admin/customers">Show every customer</ButtonLink>}
      />
    ) : (
      <EmptyState
        headingLevel={2}
        icon={Users}
        title="No customers yet"
        description="People appear here when they create an account."
      />
    );
  }
  if (list.items.length === 0) {
    return (
      <EmptyState
        headingLevel={2}
        icon={Users}
        title="There are no customers on this page"
        description="You may have followed an old link."
        action={<ButtonLink to="/admin/customers">Back to the customers</ButtonLink>}
      />
    );
  }

  return (
    <>
      <p className="text-slate-600">
        {list.total === 1 ? '1 customer' : `${list.total} customers`}
        {query ? <> matching &ldquo;{query}&rdquo;</> : null}
      </p>
      <ul aria-label="Customers" className="grid gap-4">
        {list.items.map((customer) => (
          <CustomerRow key={customer.id} customer={customer} />
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} label="Pages of customers" />
    </>
  );
}

function CustomerRow({ customer }: { customer: AdminCustomer }) {
  return (
    <li>
      <Link
        to={`/admin/customers/${customer.id}`}
        className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
      >
        <Card interactive className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink">{customer.name}</p>
            <p className="mt-1 break-all text-sm text-slate-600">{customer.email}</p>
            <p className="text-sm text-slate-600">Joined {formatDate(customer.createdAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">
              {customer.projectCount === 1 ? '1 project' : `${customer.projectCount} projects`}
            </Badge>
            {customer.status === 'disabled' && <Badge tone="danger">Disabled</Badge>}
          </div>
        </Card>
      </Link>
    </li>
  );
}
