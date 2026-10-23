import { siteContact, siteLinks } from '@prajzo/shared';
import { Link } from 'react-router';
import { usePageTitle } from '../../lib/use-page-title';
import { LegalPage } from './LegalPage';

export function TermsPage() {
  usePageTitle('Terms and Conditions');
  return (
    <LegalPage eyebrow="Legal" title="Terms and Conditions" updated="23 October 2026">
      <section>
        <h2>About these terms</h2>
        <p>
          These terms apply when you use this website or work with Prajzo ("we", "us"). Your written
          quote may add details for your project. If the quote and these terms differ, the quote
          applies.
        </p>
      </section>

      <section>
        <h2>Quotes and prices</h2>
        <p>
          Prices shown on this website are starting prices in Indian Rupees. Your final price, scope
          and delivery date are set out in a written quote after we review your requirements. A
          quote is valid for the period stated on it. Applicable taxes, and domain or hosting costs
          if you need them, are shown on the quote.
        </p>
      </section>

      <section>
        <h2>Delivery targets</h2>
        <p>
          Delivery targets, such as within 24 hours, 3 days or 7 days, are aims for eligible
          projects and not guarantees. They depend on the agreed scope, how ready your content is,
          third-party integrations, testing and your approvals. The delivery date in your quote can
          move if content, feedback or approvals arrive late.
        </p>
      </section>

      <section>
        <h2>Payments</h2>
        <p>
          Payment terms, for example an advance and a final payment, are set out in your quote. We
          don't take payments on this website.
        </p>
      </section>

      <section>
        <h2>Your responsibilities</h2>
        <ul>
          <li>Give us accurate information, and content you have the right to use</li>
          <li>Send feedback and approvals in good time</li>
          <li>Keep your own account details (domain, hosting, email) secure</li>
        </ul>
      </section>

      <section>
        <h2>Revisions and changes</h2>
        <p>
          Your quote states the revisions included in the price. Requests beyond the agreed scope or
          revisions are quoted separately before we start them.
        </p>
      </section>

      <section>
        <h2>Ownership</h2>
        <p>
          When your project is fully paid, the website content and files we created for you are
          yours. Third-party parts, such as fonts, plugins and stock images, remain under their own
          licences. We may show your finished website in our portfolio unless you ask us not to.
        </p>
      </section>

      <section>
        <h2>Previews, drafts and demos</h2>
        <p>
          Until your project is fully paid, every preview, draft, demo and sample website we show
          you is provided only so that you can judge our work. It stays ours. You agree not to copy,
          reuse, publish or share its code, designs or content, or to try to extract them.
        </p>
      </section>

      <section>
        <h2>Third-party services</h2>
        <p>
          Domains, hosting, email and other third-party services are governed by their providers'
          own terms, and their costs are separate from our fees.
        </p>
      </section>

      <section>
        <h2>Cancellation</h2>
        <p>
          You or we may cancel a project in writing. Work completed up to that point is payable as
          set out in your quote.
        </p>
      </section>

      <section>
        <h2>Our responsibility</h2>
        <p>
          We do our work with reasonable care and skill, and we fix anything we built that doesn't
          work as agreed. To the extent the law allows, we aren't liable for indirect losses, such
          as lost profits, and our total liability for a project is limited to the amount you paid
          us for it.
        </p>
      </section>

      <section>
        <h2>Using this website</h2>
        <p>
          Please don't misuse this website, for example by sending spam or trying to break its
          security. How we handle personal data is explained in our{' '}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Law and changes</h2>
        <p>
          These terms are governed by the laws of India. We may update them; the date at the top
          shows the latest version. Questions? Email{' '}
          <a href={siteLinks.email}>{siteContact.email}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
