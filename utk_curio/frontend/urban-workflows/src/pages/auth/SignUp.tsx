import React from "react";
import { Navigate } from "react-router-dom";
import { AuthFormWrapper } from "../../components/AuthForm/AuthFormWrapper";
import { SignUpForm } from "../../components/AuthForm/SignUpForm";
import { useUserContext } from "../../providers/UserProvider";

const SignUp: React.FC = () => {
  const { user, loading, enableUserAuth, googleClientId } = useUserContext();

  if (!loading && (user || !enableUserAuth)) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <AuthFormWrapper>
      <SignUpForm googleClientId={googleClientId} />
    </AuthFormWrapper>
  );
};

export default SignUp;
