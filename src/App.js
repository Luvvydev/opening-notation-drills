import React, { useEffect } from 'react';
import { HashRouter, Route } from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import About from './components/About';
import Practice from './components/Practice';
import OpeningTrainer from './components/OpeningTrainer';
import StreakModal from './components/StreakModal';

import { AuthProvider, useAuth } from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import Leaderboards from './components/Leaderboards';
import DiscordCallback from './components/DiscordCallback';

import PublicProfile from './components/PublicProfile';
import { installCloudSync } from './utils/cloudSync';

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

class App extends React.Component {
  render () {
    return (
      <div className="board-container">
        <HashRouter basename='/'>
          <AuthProvider>
            <CloudSyncInstaller />
            <StreakModal />

            <Route exact path='/' component={Home} />
            <Route path='/practice' component={Practice} />
            <Route path='/openings' component={OpeningTrainer} />
            <Route path='/about' component={About} />
            <Route path='/leaderboards' component={Leaderboards} />

            <Route path='/discord' component={DiscordCallback} />

            <Route path='/login' component={Login} />
            <Route path='/signup' component={Signup} />
            <ProtectedRoute path='/profile' component={Profile} />

            <Route path='/u/:username' component={PublicProfile} />
          </AuthProvider>
        </HashRouter>
      </div>
    );
  }
}

export default App;
