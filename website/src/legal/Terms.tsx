import { DOWNLOAD, ISSUES, REPO, WEBRIZEN } from '../site';
import { LegalPage, type LegalSection } from './LegalPage';

const SECTIONS: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement',
    body: (
      <p>
        These terms apply when you use the CyDrip app and this website, provided by Webrizen AI Labs (“we”). By
        installing or using CyDrip you agree to them. If you don't agree, please don't use the app.
      </p>
    ),
  },
  {
    id: 'licence',
    title: 'Licence',
    body: (
      <>
        <p>
          CyDrip is open source under the <a href={`${REPO}/blob/main/LICENSE`}>MIT licence</a>. You may use, copy,
          modify and share the source code under that licence. These terms don't limit the rights the MIT licence gives
          you over the code.
        </p>
        <p>
          The CyDrip name and mark identify the official app. Please don't use them in a way that suggests your build or
          fork is the official CyDrip.
        </p>
      </>
    ),
  },
  {
    id: 'safety',
    title: 'Ride safely',
    body: (
      <>
        <p>
          Your safety comes first. Mount your phone securely, set things up before you start, and don't handle the phone
          while riding or running. Watch the road, not the screen. Follow traffic laws and local rules wherever you go.
        </p>
        <p>
          The map shows streets for orientation only. It is not navigation, and it does not show traffic, hazards,
          closures or whether a route is legal or safe to ride.
        </p>
      </>
    ),
  },
  {
    id: 'accuracy',
    title: 'Numbers are estimates',
    body: (
      <p>
        Speed, distance, climb, pace and calories come from your phone's GPS and simple formulas. They can be wrong,
        especially with a weak signal, between tall buildings or under trees. Calories are a rough estimate and not
        medical advice. Don't rely on CyDrip for medical, training or legal decisions.
      </p>
    ),
  },
  {
    id: 'downloads',
    title: 'Getting the app',
    body: (
      <p>
        Download CyDrip only from the official <a href={DOWNLOAD}>GitHub Releases</a> page or stores we list on this
        site. Copies from elsewhere may have been modified, and we can't vouch for them.
      </p>
    ),
  },
  {
    id: 'third-party',
    title: 'Third-party services',
    body: (
      <p>
        The map uses tiles from OpenFreeMap and data © OpenStreetMap contributors. Their availability is outside our
        control, and their own terms apply. If tiles don't load, Simple view keeps working offline.
      </p>
    ),
  },
  {
    id: 'warranty',
    title: 'No warranty',
    body: (
      <p>
        CyDrip is provided free and “as is”, without warranties of any kind, express or implied, including fitness for a
        particular purpose. We don't promise it will be error-free or always available, or that recordings won't be lost
        (for example if your phone stops the app in the background).
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the extent the law allows, Webrizen AI Labs is not liable for any injury, damage, loss of data or other loss
        arising from using CyDrip or relying on its information. Some places don't allow these limits, so they may not
        all apply to you.
      </p>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy',
    body: (
      <p>
        How CyDrip handles data is described in the <a href="/privacy">privacy policy</a>. In short: your rides stay on
        your phone.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes',
    body: (
      <p>
        We may update these terms. We'll change the date at the top when we do. Using CyDrip after an update means you
        accept the new terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions: open an issue on <a href={ISSUES}>GitHub</a> or reach Webrizen AI Labs at{' '}
        <a href={WEBRIZEN}>webrizen.com</a>.
      </p>
    ),
  },
];

export function Terms() {
  return (
    <LegalPage
      kicker="Terms of use"
      title="Free, open source, and ridden at your own risk."
      summary={[
        ['Price', 'Free'],
        ['Source code', 'MIT licence'],
        ['Warranty', 'Provided as is'],
        ['While moving', 'Eyes on the road'],
      ]}
      sections={SECTIONS}
    />
  );
}
