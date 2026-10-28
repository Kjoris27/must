import { isConfigured } from "../../lib/auth";
import SignInForm from "./sign-in-form";

export const dynamic = "force-dynamic";

export default function SignIn() {
  return <SignInForm available={isConfigured()} />;
}
