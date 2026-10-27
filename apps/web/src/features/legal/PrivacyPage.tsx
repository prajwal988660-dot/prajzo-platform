import { siteContact, siteLinks } from '@prajzo/shared';
import { usePageMeta } from '../../lib/use-page-meta';
import { LegalPage } from './LegalPage';

export function PrivacyPage() {
  usePageMeta('/privacy');
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" updated="27 October 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          Prajzo ("we", "us") is a web development studio. This policy explains what personal data
          we collect through this website, why we collect it, and the choices you have. Questions?
          Email <a href={siteLinks.email}>{siteContact.email}</a> or call {siteContact.phoneDisplay}
          .
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>When you contact us:</strong> your name, email address, phone number (optional),
            the type of website or package you're interested in, and your message.
          </li>
          <li>
            <strong>When you create an account:</strong> your name, email address, phone number
            (optional) and a password. We store your password only in scrambled form, so we can't
            read it. We also record when you agreed to our terms and when you last signed in.
          </li>
          <li>
            <strong>When you send a project request:</strong> the details you give us, such as the
            project's name and type, your description, the features you want, a preferred date, how
            you'd like to be contacted and any notes, together with the status of your request.
          </li>
          <li>
            <strong>When you visit this website:</strong> basic technical information needed to run
            and protect it, such as your IP address and browser type in our server logs. If a page
            breaks in your browser, it sends us a short error report (the error, the page's address
            without any search terms, and your browser type) so we can fix it. It never includes
            what you typed.
          </li>
        </ul>
        <p>We don't ask for sensitive information, and we don't take payments on this website.</p>
      </section>

      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To reply to your enquiry and prepare a quote</li>
          <li>To run your account and keep your projects together</li>
          <li>To plan, build and deliver your project if you become a client</li>
          <li>To keep this website secure and protect it from spam and misuse</li>
          <li>To meet our legal and accounting obligations</li>
        </ul>
        <p>
          We use your personal data with your consent, which you give when you send us the contact
          form, and for other purposes the law allows, such as keeping our website secure. You can
          withdraw your consent at any time by emailing us. This doesn't affect anything we did
          before you withdrew it.
        </p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>
          We don't sell your personal data. We use trusted service providers to run this website,
          such as hosting, database and email services. They handle data only on our behalf and
          under our instructions. They may store data in India or in other countries, with
          appropriate safeguards. We may also share data where the law requires it.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep contact messages and project requests that don't go ahead for up to 24 months
          after our last conversation. We keep your account until you ask us to delete it. For
          clients, we keep project and billing records for as long as the law requires. After that,
          we delete or anonymise your data.
        </p>
      </section>

      <section>
        <h2>How we protect it</h2>
        <p>
          We use encrypted connections (HTTPS), access controls and secure service providers to
          protect your data. No system is perfectly secure, but we take reasonable steps to keep
          your data safe.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>Under India's Digital Personal Data Protection Act, 2023, you can ask us to:</p>
        <ul>
          <li>tell you what personal data we hold about you and how we use it</li>
          <li>correct, complete or update it</li>
          <li>delete it, where we don't need to keep it by law</li>
          <li>nominate someone to act for you if you are unable to</li>
        </ul>
        <p>
          To make a request or a complaint, email <a href={siteLinks.email}>{siteContact.email}</a>.
          We aim to respond within 30 days. If you're not satisfied with our response, you can
          contact the Data Protection Board of India.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We don't use advertising or tracking cookies. We use one cookie that is strictly necessary
          for the website to work: it keeps you signed in after you create an account or sign in. It
          can't be read by scripts on the page, and it is removed when you sign out or after a
          period without visits.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          Our services are meant for adults. If you are under 18, please ask a parent or guardian to
          contact us on your behalf.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          We may update this policy. The date at the top shows when it last changed. Important
          changes will be highlighted on this website.
        </p>
      </section>
    </LegalPage>
  );
}
