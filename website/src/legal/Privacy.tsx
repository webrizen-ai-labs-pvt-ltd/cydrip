import { EMAIL, ISSUES, REPO, WEBRIZEN } from '../site';
import { LegalPage, type LegalSection } from './LegalPage';

const SECTIONS: LegalSection[] = [
  {
    id: 'who',
    title: 'Who we are',
    body: (
      <>
        <p>
          CyDrip is a free, open-source ride and run tracker for Android, built and maintained by Webrizen AI Labs
          (“we”). This policy covers the CyDrip app and this website, cydrip.webrizen.com.
        </p>
        <p>
          The short version: CyDrip has no account, no analytics and no advertising, and we do not run any server that
          receives your rides. What you record stays on your phone.
        </p>
      </>
    ),
  },
  {
    id: 'on-device',
    title: 'What stays on your phone',
    body: (
      <>
        <p>CyDrip stores the following only in the app's private storage on your device:</p>
        <ul>
          <li>Your rides and runs: start and end time, distance, moving time, speed, climb and estimated calories.</li>
          <li>The GPS points of each route (position, altitude, speed and accuracy, about one per second).</li>
          <li>
            A log of every GPS fix the phone delivered during each activity, used to show how well GPS worked. It
            leaves your phone only if you tap Share GPS log.
          </li>
          <li>Your settings: body weight (used only to estimate calories), map view and last activity type.</li>
          <li>The destination you pick in Where to? and its planned route, until you clear it or finish the activity.</li>
        </ul>
        <p>
          We never receive this data. Deleting an activity in the app removes it and its route. Uninstalling the app
          removes everything.
        </p>
      </>
    ),
  },
  {
    id: 'location',
    title: 'Location',
    body: (
      <>
        <p>
          CyDrip asks for location access “while using the app” so it can record your route and show your speed. While
          you record, Android shows a “Recording” notification; this lets GPS keep working when the screen is off or
          you switch apps. CyDrip does not ask for “all the time” location and does not track you when you aren't
          recording.
        </p>
        <p>
          Before a ride, the start screen shows your GPS signal and position only if you have already allowed location.
          Nothing about your location is sent to us.
        </p>
      </>
    ),
  },
  {
    id: 'maps',
    title: 'Map tiles',
    body: (
      <>
        <p>
          To draw the 3D street map, the app downloads map tiles from <a href="https://openfreemap.org">OpenFreeMap</a>,
          which serves <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> data. Like any website you
          load, their servers receive your IP address and which map tiles you ask for, which reveals the general area
          you're viewing. They do not receive your recorded routes, and CyDrip sends no identifier with these requests.
        </p>
        <p>
          If you'd rather not load map tiles, switch to Simple view in the app: it draws your route on a grid and makes
          no network requests.
        </p>
      </>
    ),
  },
  {
    id: 'directions',
    title: 'Directions',
    body: (
      <>
        <p>
          Where to? is optional, and nothing is sent until you use it. Then the app talks to two free OpenStreetMap
          services that need no account:
        </p>
        <ul>
          <li>
            <strong>Place search</strong> by <a href="https://photon.komoot.io">Photon</a>, run by komoot. It receives
            what you type and your position rounded to about 1 km, so nearby places come first.
          </li>
          <li>
            <strong>Routes</strong> by <a href="https://valhalla1.openstreetmap.de">Valhalla</a>, run by{' '}
            <a href="https://www.fossgis.de">FOSSGIS e.V.</a> It receives where the route starts (your position at the
            time) and the destination you picked. If you leave the route during an activity, the app asks again from
            where you are.
          </li>
        </ul>
        <p>
          Like any website, both also see your IP address. Neither receives your recorded rides or runs, and CyDrip
          sends no identifier with these requests.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Sharing and photos',
    body: (
      <p>
        Snap images are created on your phone. They leave it only if you tap Share and pick an app, or tap Save to add
        them to your gallery. Saving asks for permission to add photos; CyDrip does not read your photo library.
      </p>
    ),
  },
  {
    id: 'permissions',
    title: 'Permissions',
    body: (
      <ul>
        <li>
          <strong>Location</strong>: to record activities.
        </li>
        <li>
          <strong>Notifications</strong>: to show that a recording is running.
        </li>
        <li>
          <strong>Photos (add only)</strong>: when you save a Snap to your gallery.
        </li>
        <li>
          <strong>Internet</strong>: to load map tiles and, when you use Where to?, to search places and plan routes.
        </li>
      </ul>
    ),
  },
  {
    id: 'website',
    title: 'This website',
    body: (
      <p>
        This website uses no cookies and no analytics. It is hosted by Vercel, whose servers keep standard access logs
        (such as IP address and browser) to deliver and protect the site. Fonts are loaded from Google Fonts, which also
        receives your IP address. Downloads are served by GitHub.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        CyDrip is not directed at children under 13. We don't collect data from anyone, including children, because
        the app doesn't send us data at all.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes',
    body: (
      <p>
        If we change how CyDrip handles data, we'll update this page and the date at the top. Because the app is open
        source, every change is also visible in the <a href={REPO}>repository history</a>.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <>
        <p>
          CyDrip is developed by <a href={WEBRIZEN}>Webrizen AI Labs</a>. For questions about privacy, email{' '}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a> or open an issue on <a href={ISSUES}>GitHub</a>.
        </p>
        <p>
          <strong>Grievance officer.</strong> If you have a complaint about how CyDrip handles your data, write to our
          grievance officer at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. We respond to complaints within one
          month.
        </p>
      </>
    ),
  },
];

export function Privacy() {
  return (
    <LegalPage
      kicker="Privacy policy"
      title="Your rides stay on your phone."
      summary={[
        ['Account', 'None. Nothing to sign up for.'],
        ['Your data', 'Stored only on your device'],
        ['Analytics and ads', 'None'],
        ['Network', 'Map tiles, plus place search and routes when you use Where to?'],
        ['Contact', EMAIL],
      ]}
      sections={SECTIONS}
    />
  );
}
