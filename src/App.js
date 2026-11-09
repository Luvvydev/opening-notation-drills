import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import './App.css';
import PublicHome from './auth/PublicHome';
import StreakModal from './components/StreakModal';

import { AuthProvider, useAuth } from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';
import ReviewWorkspace from './components/ReviewWorkspace';
import WorkspaceShell from './components/WorkspaceShell';

import { installCloudSync } from './utils/cloudSync';
import { trackDay2Return, trackFirstVisit, trackMembershipMilestones } from './utils/trackEvent';

const Home = lazy(() => import('./components/Home'));
const About = lazy(() => import('./components/About'));
const Practice = lazy(() => import('./components/Practice'));
const OpeningTrainer = lazy(() => import('./components/OpeningTrainer'));
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));
const Profile = lazy(() => import('./components/Profile'));
const Leaderboards = lazy(() => import('./components/Leaderboards'));
const DiscordCallback = lazy(() => import('./components/DiscordCallback'));
const InstallAppPage = lazy(() => import('./components/InstallAppPage'));
const PaymentReturn = lazy(() => import('./components/PaymentReturn'));
const TrainingPage = lazy(() => import('./components/TrainingPage'));
const PublicProfile = lazy(() => import('./components/PublicProfile'));

function CloudSyncInstaller() {
  const { user } = useAuth();

  useEffect(() => {
    const off = installCloudSync(() => user);
    return () => {
      if (off) off();
    };
  }, [user]);

  return null;
}

function AnalyticsInstaller() {
  const { user, userDoc } = useAuth();

  useEffect(() => {
    trackFirstVisit(user);
    trackDay2Return(user);
  }, [user]);

  useEffect(() => {
    trackMembershipMilestones(user, userDoc);
  }, [user, userDoc]);

  return null;
}

class StartupErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    if (typeof window.chessdrillsRecoverStartup === 'function') {
      window.chessdrillsRecoverStartup(error);
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" data-startup-retry="" style={{ padding: 24, fontFamily: 'Arial, sans-serif', lineHeight: 1.5 }}>
          <p>ChessDrills could not finish loading. Please try again.</p>
          <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

class App extends React.Component {
  render () {
    return (
      <StartupErrorBoundary>
      <div className="board-container">
        <BrowserRouter>
          <AuthProvider>
            <CloudSyncInstaller />
            <AnalyticsInstaller />
            <StreakModal />

            <WorkspaceShell>
            <Suspense fallback={<p className="workspace-review-loading" role="status">Loading page…</p>}>
              <Route exact path='/' component={PublicHome} />
              <Route exact path='/home' component={Home} />
              <Route exact path='/openings/library' component={Home} />
              <Route path='/practice' component={Practice} />
              <Route exact path='/training' component={TrainingPage} />
              <Route
                exact
                path='/demo'
                render={(props) => (
                  <OpeningTrainer
                    {...props}
                    location={{
                      ...props.location,
                      search: props.location.search || '?opening=london&demo=1'
                    }}
                  />
                )}
              />
              <Route exact path='/openings' component={OpeningTrainer} />
              <Route path='/about' component={About} />
              <Route path='/leaderboards' component={Leaderboards} />
              <Route path='/install' component={InstallAppPage} />
              <Route exact path='/payment/success' component={PaymentReturn} />
              <Route exact path='/payment/cancel' component={PaymentReturn} />

              <Route path='/discord' component={DiscordCallback} />

              <Route path='/login' component={Login} />
              <Route path='/signup' component={Signup} />

              {/* Public profiles (keep both routes) */}
              <Route path='/profile/u/:username' component={PublicProfile} />
              <Route path='/u/:username' component={PublicProfile} />

              {/* Private profile must be exact so it doesn't swallow /profile/u/:username */}
              <ProtectedRoute exact path='/profile' component={Profile} />
            </Suspense>
            <ReviewWorkspace />
            </WorkspaceShell>
          </AuthProvider>
        </BrowserRouter>
      </div>
      </StartupErrorBoundary>
    );
  }
}

export default App;