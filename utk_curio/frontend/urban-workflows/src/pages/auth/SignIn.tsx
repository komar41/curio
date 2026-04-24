import React from "react";
import { Navigate } from "react-router-dom";
import { AuthFormWrapper } from "../../components/AuthForm/AuthFormWrapper";
import { SignInForm } from "../../components/AuthForm/SignInForm";
import { useUserContext } from "../../providers/UserProvider";

const SignIn: React.FC = () => {
  const { user, loading, enableUserAuth, googleClientId } = useUserContext();

  if (!loading && (user || !enableUserAuth)) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <AuthFormWrapper>
      <SignInForm googleClientId={googleClientId} />
    </AuthFormWrapper>
  );
};

export default SignIn;
