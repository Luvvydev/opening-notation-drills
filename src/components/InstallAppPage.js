import React, { useEffect, useMemo, useRef, useState } from 'react';
import TopNav from './TopNav';
import './InstallAppPage.css';
import {
  initPwaInstallTracking,
  promptPwaInstall,
  subscribeToPwaInstall,
} from '../utils/pwaInstall';

function getDefaultGuide(state) {
  if (state && state.isIOS) return 'ios';
  return 'android';
}

export default function InstallAppPage({ history }) {
  const [installState, setInstallState] = useState({
    canPrompt: false,
    isInstalled: false,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
  });
  const [guide, setGuide] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const detailsRef = useRef(null);
  const didRedirectRef = useRef(false);

  useEffect(() => {
    initPwaInstallTracking();
    const off = subscribeToPwaInstall((next) => {
      setInstallState(next);
      setGuide((current) => current || getDefaultGuide(next));
    });
    return () => off();
  }, []);

  useEffect(() => {
    if (didRedirectRef.current) return;
    if (!installState.isInstalled) return;
    if (!history) return;

    didRedirectRef.current = true;
    history.replace('/');
  }, [installState.isInstalled, history]);

  useEffect(() => {
    setGuide((current) => current || getDefaultGuide(installState));
  }, [installState]);

  const primaryLabel = useMemo(() => {
    if (installState.isInstalled) return 'Already added';
    if (installState.canPrompt) return 'Add to home screen';
    if (installState.isIOS) return installState.isSafari ? 'See iPhone steps' : 'Open in Safari';
    if (installState.isAndroid) return 'See Android steps';
    return 'View steps';
  }, [installState]);

  const supportLabel = useMemo(() => {
    if (installState.isInstalled) return 'Already added on this device.';
    if (installState.canPrompt) return 'This browser can open the install prompt.';
    if (installState.isIOS) return installState.isSafari
      ? 'Use Safari, then Add to Home Screen.'
      : 'Open this page in Safari.';
    if (installState.isAndroid) return 'If no prompt shows, use the browser menu.';
    return 'Use the browser menu.';
  }, [installState]);

  const scrollToDetails = () => {
    if (!detailsRef.current) return;
    detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onPrimaryAction = async () => {
    setFeedback('');

    if (installState.isInstalled) return;

    if (installState.canPrompt) {
      setBusy(true);
      try {
        const result = await promptPwaInstall();
        if (result && result.outcome === 'accepted') {
          setFeedback('Added. Open ChessDrills from your home screen.');
        } else if (result && result.outcome === 'dismissed') {
          setFeedback('Closed. You can try again later.');
        } else {
          setFeedback('Install did not open here. Use the steps below.');
        }
      } catch (_) {
        setFeedback('Install did not open here. Use the steps below.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (installState.isIOS) {
      setGuide('ios');
    } else {
      setGuide('android');
    }
    scrollToDetails();
  };

  return (
    <div className="install-page">
      <TopNav title="Add to Home Screen" />

      <div className="install-wrap">
        <div className="install-card install-card-hero">
          <div className="install-badge">Home screen setup</div>
          <h2 className="install-title">Add ChessDrills to home screen</h2>
          <p className="install-lead">
          </p>

      
        </div>

        <div className="install-card install-card-action">
          <div className="install-action-copy">
            <div className="install-section-label">Status</div>
            <div className="install-support-label">{supportLabel}</div>
          </div>

          <button
            type="button"
            className="install-primary-button"
            onClick={onPrimaryAction}
            disabled={busy || installState.isInstalled}
          >
            {busy ? 'Opening...' : primaryLabel}
          </button>

          {feedback ? <div className="install-feedback">{feedback}</div> : null}
        </div>

        <div className="install-card" ref={detailsRef}>
          <div className="install-guide-toggle" role="tablist" aria-label="Install guides">
            <button
              type="button"
              className={'install-guide-tab ' + (guide === 'ios' ? 'active' : '')}
              onClick={() => setGuide('ios')}
              role="tab"
              aria-selected={guide === 'ios' ? 'true' : 'false'}
            >
              iPhone
            </button>
            <button
              type="button"
              className={'install-guide-tab ' + (guide === 'android' ? 'active' : '')}
              onClick={() => setGuide('android')}
              role="tab"
              aria-selected={guide === 'android' ? 'true' : 'false'}
            >
              Android
            </button>
          </div>

          {guide === 'ios' ? (
            <div className="install-guide-panel" role="tabpanel">
              <div className="install-guide-note">
                Open this page in Safari. Then open Share and tap Add to Home Screen.
              </div>

              <div className="install-step-grid">
                <div className="install-step-card">
                  <div className="install-step-number">1</div>
                  <div className="install-step-title">Open in Safari</div>
                  <div className="install-step-body">
                    If this page is open in another browser, open it in Safari.
                  </div>
                </div>

                <div className="install-step-card">
                  <div className="install-step-number">2</div>
                  <div className="install-step-title">Tap Share</div>
                  <div className="install-step-body">
                    In Safari, open the Share menu.
                  </div>
                </div>

                <div className="install-step-card">
                  <div className="install-step-number">3</div>
                  <div className="install-step-title">Tap Add to Home Screen</div>
                  <div className="install-step-body">
                    Keep the name or edit it, then tap Add.
                  </div>
                </div>
              </div>

              <div className="install-small-note">
                If Add to Home Screen is missing, scroll down in Share, tap Edit Actions, and enable it.
              </div>
            </div>
          ) : (
            <div className="install-guide-panel" role="tabpanel">
              <div className="install-guide-note">
                The install prompt may open here. It may also be in the browser menu.
              </div>

              <div className="install-step-grid">
                <div className="install-step-card">
                  <div className="install-step-number">1</div>
                  <div className="install-step-title">Tap the button above</div>
                  <div className="install-step-body">
                    If the prompt opens here, continue.
                  </div>
                </div>

                <div className="install-step-card">
                  <div className="install-step-number">2</div>
                  <div className="install-step-title">Open the browser menu</div>
                  <div className="install-step-body">
                    Look for Install app or Add to Home screen.
                  </div>
                </div>

                <div className="install-step-card">
                  <div className="install-step-number">3</div>
                  <div className="install-step-title">Confirm</div>
                  <div className="install-step-body">
                    After that, the ChessDrills icon shows on your home screen.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
