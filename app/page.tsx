import { redirect } from "next/navigation";

/* No marketing page yet — send visitors to sign up. */
export default function Home() {
  redirect("/signup");
}
