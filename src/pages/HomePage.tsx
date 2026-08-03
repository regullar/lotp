import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Camera,
  Check,
  FileUp,
  LockKeyhole,
  MonitorUp,
  ScanLine,
} from 'lucide-react';
import { useI18n } from '../hooks/useI18n';
import { CapabilityChecker, BrowserCapabilities } from '../diagnostics/capabilityChecker';
import opticalWindow from '../assets/optical-window.webp';

interface HomePageProps {
  setActiveTab: (tab: string) => void;
}

/**
 * WHY: make the physical transfer path obvious before technical detail.
 * WORLD: premium privacy utility; near-black shell, optical proof window, mint signal, one cobalt action.
 * AUDIENCE: everyday privacy users choosing Send or Receive without learning the protocol first.
 * FIRST VIEWPORT: direct promise and actions at left; screen-to-camera proof scene at right; three real steps cross the base.
 * FORM: category-standard product-demonstration hero, approved after seed 64e43abc in `.impeccable/mocks/comp-b-optical-window.png`.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
export const HomePage: React.FC<HomePageProps> = ({ setActiveTab }) => {
  const { t } = useI18n();
  const [caps, setCaps] = useState<BrowserCapabilities | null>(null);

  useEffect(() => {
    CapabilityChecker.check().then(setCaps);
  }, []);

  const capabilities = [
    { label: 'Web Workers', supported: caps?.webWorkers },
    { label: 'Camera', supported: caps?.mediaDevices },
    { label: 'Web Crypto', supported: caps?.webCrypto },
    { label: 'Offline PWA', supported: caps?.serviceWorker },
  ];

  const steps = [
    { label: t.chooseFileStep, icon: FileUp },
    { label: t.showCodeStep, icon: MonitorUp },
    { label: t.scanCameraStep, icon: ScanLine },
  ];

  return (
    <div className="home-page">
      <section className="optical-hero" aria-labelledby="home-title">
        <img
          className="optical-hero-art"
          src={opticalWindow}
          alt="A laptop screen sending an optical code directly to a phone camera"
        />
        <div className="optical-hero-shade" />

        <div className="hero-copy">
          <h2 id="home-title">
            {t.heroTitle}<br />
            <span>{t.heroTitleAccent}</span>
          </h2>
          <p>{t.heroDescription}</p>
          <div className="hero-actions">
            <button type="button" className="primary-action" onClick={() => setActiveTab('send')}>
              <ArrowUpFromLine aria-hidden="true" /> {t.sendFile}
            </button>
            <button type="button" className="secondary-action" onClick={() => setActiveTab('receive')}>
              <ArrowDownToLine aria-hidden="true" /> {t.receiveFile}
            </button>
          </div>
          <div className="local-proof"><LockKeyhole aria-hidden="true" /> {t.localOnly}</div>
        </div>

        <ol className="transfer-steps">
          {steps.map(({ label, icon: Icon }, index) => (
            <li key={label}>
              <span className="step-number">{index + 1}</span>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="capability-section" aria-labelledby="capability-title">
        <div className="capability-intro">
          <Camera aria-hidden="true" />
          <div>
            <h3 id="capability-title">{t.browserReady}</h3>
            <p>{t.browserReadyDescription}</p>
          </div>
        </div>
        <div className="capability-list">
          {capabilities.map((item) => (
            <div className="capability-item" key={item.label}>
              <span>{item.label}</span>
              {item.supported === undefined ? (
                <span className="capability-loading" aria-label="Checking" />
              ) : item.supported ? (
                <span className="capability-ok"><Check aria-hidden="true" /> {t.available}</span>
              ) : (
                <span className="capability-warning"><AlertTriangle aria-hidden="true" /> {t.unavailable}</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
