/* eslint-disable import/first */
if (typeof window !== "undefined") {
  if (typeof window.process === "undefined") {
    window.process = { env: {} };
  }

  if (typeof window.global === "undefined") {
    window.global = window;
  }

  if (!document.querySelector('script[src="https://www.googletagmanager.com/gtag/js?id=AW-18021865313"]')) {
    const googleTagScript = document.createElement('script');
    googleTagScript.async = true;
    googleTagScript.src = 'https://www.googletagmanager.com/gtag/js?id=AW-18021865313';
    document.head.appendChild(googleTagScript);
  }

  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag = window.gtag || gtag;
  window.gtag('js', new Date());
  window.gtag('config', 'AW-18021865313');
}

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { initPwaInstallTracking } from './utils/pwaInstall';

initPwaInstallTracking();

ReactDOM.render(
  <App />,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
