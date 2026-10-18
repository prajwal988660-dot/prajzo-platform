import { Container } from '../../components/layout/Container';
import { Badge } from '../../components/ui/Badge';
import { usePageTitle } from '../../lib/use-page-title';

/**
 * Phase 1 home page: the hero copy from the brief. The full home page (delivery highlights,
 * categories, packages, FAQ…) and its buttons arrive in Phase 2 and later (docs/ROADMAP.md).
 */
export function HomePage() {
  usePageTitle();
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(56rem_28rem_at_85%_-8%,rgb(54_76_221/0.12),transparent_62%),radial-gradient(40rem_24rem_at_0%_0%,rgb(4_187_255/0.10),transparent_60%)]"
      />
      <Container className="py-24 sm:py-32 lg:py-40">
        <Badge tone="brand">Web development studio</Badge>
        <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
          Your Idea. Your Design. <span className="text-brand-gradient">Our Development.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
          Explore website templates, customize your content, choose your features, and let Prajzo
          bring your digital vision to life.
        </p>
      </Container>
    </section>
  );
}
