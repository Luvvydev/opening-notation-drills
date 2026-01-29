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
          return (
            <Redirect
              to={{
                pathname: "/login",
                state: { from: props.location && props.location.pathname ? props.location.pathname : "/profile" }
              }}
            />
          );
        }

        return <Component {...props} />;
      }}
    />
  );
}
