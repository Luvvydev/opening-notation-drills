import React from "react";
import { Route, Redirect } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ component: Component, ...rest }) {
  const { user, authLoading } = useAuth();

  return (
    <Route
      {...rest}
      render={(props) => {
        if (authLoading) return null;

        if (!user) {
          const pathname =
            props.location && props.location.pathname ? props.location.pathname : "/profile";
          const search =
            props.location && props.location.search ? props.location.search : "";
          const from = `${pathname}${search}`;
          const signupFirst = pathname === "/my-games";
          const reason = signupFirst ? "my_games_requires_account" : "protected_route";
          const signupSearch = signupFirst
            ? `?source=my_games&from=${encodeURIComponent(from)}&reason=${encodeURIComponent(reason)}`
            : "";

          return (
            <Redirect
              to={{
                pathname: signupFirst ? "/signup" : "/login",
                search: signupSearch,
                state: {
                  from,
                  reason,
                  source: signupFirst ? "my_games" : "protected_route"
                }
              }}
            />
          );
        }

        return <Component {...props} />;
      }}
    />
  );
}
