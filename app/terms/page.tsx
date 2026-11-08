import type { Metadata } from "next";
import Link from "next/link";
import { A, B, CONTACT_EMAIL, LegalPage, P, UL } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Terms and Conditions · StudentOS" };

/* Public page. Free-plan numbers here should match the app
   (FREE_CERT_LIMIT, FREE_DAILY_MESSAGES, FREE_MATERIAL_LIMIT). */

const sections = [
  {
    id: "agree",
    title: "Agreeing to these terms",
    body: (
      <>
        <P>
          These terms are an agreement between you and StudentOS Technologies (“StudentOS”, “we”). By creating an account or using StudentOS you agree to them and to our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>. If you
          don’t agree, please don’t use StudentOS.
        </P>
        <P>If you are under 18, a parent or guardian must agree to these terms for you and supervise your use.</P>
      </>
    ),
  },
  {
    id: "service",
    title: "What StudentOS is",
    body: (
      <P>
        StudentOS is a study planner for students. It builds study plans and schedules, suggests video courses and popular videos (from YouTube) based on your profile, tracks your progress, offers an AI Assistant, revision quizzes, a resume
        creator and StudentOS certificates. We keep improving it, so features may change, be added or be removed.
      </P>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <UL>
        <li>Give true details and keep your login safe. You are responsible for what happens in your account.</li>
        <li>One account per person. Don’t share or sell your account.</li>
        <li>Tell us at {CONTACT_EMAIL} if you think someone else has used your account.</li>
      </UL>
    ),
  },
  {
    id: "free",
    title: "The Free plan",
    body: (
      <>
        <P>The Free plan costs nothing and includes fair-use limits so the service stays available for every student. Currently:</P>
        <UL>
          <li>up to 2 StudentOS certificates;</li>
          <li>up to 60 AI Assistant messages a day (and a few per minute);</li>
          <li>up to 10 study materials.</li>
        </UL>
        <P>We may change these limits. Paid (Premium) features, if offered later, will have their own terms and prices shown before you pay.</P>
      </>
    ),
  },
  {
    id: "use",
    title: "Acceptable use",
    body: (
      <>
        <P>Please don’t:</P>
        <UL>
          <li>break the law, or upload content you don’t have the right to share;</li>
          <li>upload anything harmful, hateful, sexual, or that invades someone’s privacy;</li>
          <li>cheat on quizzes (for example by sharing answers or using scripts), fake watch time, or try to get certificates you didn’t earn;</li>
          <li>misuse the AI Assistant to create harmful content or to get around its limits;</li>
          <li>try to break into, overload, copy or scrape StudentOS, or other students’ data;</li>
          <li>download, copy or re-upload YouTube videos shown in StudentOS.</li>
        </UL>
        <P>We may limit, suspend or close accounts that break these rules.</P>
      </>
    ),
  },
  {
    id: "videos",
    title: "Videos and YouTube",
    body: (
      <P>
        Videos in StudentOS are played from YouTube using YouTube API Services. They belong to their creators, not to StudentOS. By watching them you agree to the <A href="https://www.youtube.com/t/terms">YouTube Terms of Service</A>. We choose videos
        automatically by views and likes; we don’t create or check every video, and a video may be removed by YouTube at any time. If a video stops working, StudentOS picks another one for that module.
      </P>
    ),
  },
  {
    id: "ai",
    title: "AI features",
    body: (
      <P>
        The AI Assistant, study plans, course suggestions and quizzes are made by AI. They can be wrong, out of date or incomplete. Check important information (exam dates, syllabus, tax or legal rules, career decisions) with your college or an official
        source. AI answers are not professional advice.
      </P>
    ),
  },
  {
    id: "certificates",
    title: "Certificates",
    body: (
      <P>
        StudentOS certificates show that you finished a StudentOS course and passed its final quiz. They are not degrees or diplomas and are not accredited by a university or government body. Anyone with the certificate ID can verify it. We may cancel a
        certificate earned by cheating.
      </P>
    ),
  },
  {
    id: "content",
    title: "Your content",
    body: (
      <P>
        Your notes, materials, chats, plans and resume stay yours. You let StudentOS store and process them only to run the service for you (for example, to answer a question about your notes). You can delete them at any time. Content you choose to
        share publicly (like a shared chat link) can be seen by anyone with the link until you stop sharing.
      </P>
    ),
  },
  {
    id: "ours",
    title: "Our content",
    body: <P>The StudentOS name, logo, design, software and certificate design belong to StudentOS Technologies. You may not copy or reuse them without our written permission.</P>,
  },
  {
    id: "liability",
    title: "No guarantees and liability",
    body: (
      <>
        <P>
          StudentOS is provided “as is”. We work to keep it running and accurate, but we don’t promise it will always be available, error-free, or that using it will get you particular marks, jobs or results.
        </P>
        <P>
          To the extent the law allows, StudentOS is not liable for indirect losses, or for losses caused by third-party services (such as YouTube, Google or AI providers). Nothing in these terms limits rights you have under Indian consumer law that cannot
          be limited.
        </P>
      </>
    ),
  },
  {
    id: "ending",
    title: "Ending your use",
    body: <P>You can stop using StudentOS and delete your account at any time in Settings → Account &amp; privacy. We may close an account that breaks these terms, or stop the service, with notice where reasonably possible.</P>,
  },
  {
    id: "law",
    title: "Law, changes and contact",
    body: (
      <>
        <P>These terms are governed by the laws of India, and disputes are subject to the courts of India.</P>
        <P>We may update these terms. We will change the date at the top and, for important changes, tell you in the app before they apply. Continuing to use StudentOS after that means you accept the new terms.</P>
        <P>
          Questions: <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
        </P>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and Conditions"
      other={{ href: "/privacy", label: "Privacy Policy" }}
      intro={<P>The rules for using StudentOS, in plain words. <B>Short version:</B> use it honestly to learn, keep your account safe, and remember that AI answers and YouTube videos can be wrong.</P>}
      sections={sections}
    />
  );
}
