import type { Metadata } from "next";
import { A, B, CONTACT_EMAIL, LegalPage, P, UL } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", description: "What data StudentOS collects, why, and how you control it.", alternates: { canonical: "/privacy" } };

/* Public page. Keep it in step with what the app really does: if a feature starts
   collecting or sharing new data, update this page and the “Last updated” date. */

const sections = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <>
        <P>
          StudentOS is run by StudentOS Technologies (“StudentOS”, “we”, “us”). This policy explains what personal data we collect when you use the StudentOS website and app, why, who we share it with, and the choices you have. It is written for the
          Digital Personal Data Protection Act, 2023 (India) and also follows the YouTube API Services and Google policies that apply to us.
        </P>
        <P>
          For any privacy question or request, email <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
        </P>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <P>We only collect what we need to run StudentOS for you:</P>
        <UL>
          <li>
            <B>Account:</B> your name, email address and password (the password is handled by Google Firebase Authentication; we never see it). If you sign in with Google or GitHub, we receive your name, email and profile picture from them.
          </li>
          <li>
            <B>Profile and setup:</B> student type, college, course, year, field, interests, goals, skills, experience, your answers to the skill assessment and the level it gives, and a profile photo if you add one.
          </li>
          <li>
            <B>Study data:</B> your study plan, schedule, sessions, commitments, goals, course progress (which lessons you watched and for how long), notes, quiz results, certificates, projects, resume details and settings.
          </li>
          <li>
            <B>AI Assistant:</B> the messages you send, the replies, and chat titles. If you attach a file, we read its text (or the image) to answer you. If you use voice input, your recording is sent for transcription.
          </li>
          <li>
            <B>Study materials:</B> when you upload a PDF, Word, PowerPoint, text file or photo, we keep only the text taken from it, not the file itself.
          </li>
          <li>
            <B>Placements:</B> your branch, CGPA, backlogs and batch, the drives you apply to (with your resume and your StudentOS mock interview and coding scores), your round and offer status, and interview experiences you choose to share.
          </li>
          <li>
            <B>Tests and interviews:</B> your answers and scores in practice and company tests (including code you submit), your answers in AI interviews (spoken answers are turned into text), the AI’s report, and the strict-mode warnings
            during a round. In a live interview, the recruiter’s score and notes.
          </li>
          <li>
            <B>Notifications:</B> if you turn on phone or laptop notifications, a device token from Firebase Cloud Messaging.
          </li>
          <li>
            <B>Careers applicants</B> (people applying to work at StudentOS): name, email, phone, college, the resume link or PDF they upload (kept only for hiring, and deleted with the application), and for each round they take (online test, AI interview, AI HR interview, live interview) their answers and scores, the AI’s report, the strict-mode warnings and our team’s notes. Camera and mic are checked on the applicant’s device the same way as for students; nothing is recorded.
          </li>
          <li>
            <B>Face check:</B> if you choose to set it up, a list of numbers describing the shape of your face (not a photo); see “Camera, microphone and live interviews” below.
          </li>
          <li>
            <B>Technical data:</B> basic data your browser sends to any website (such as IP address and browser type), which our hosting and Firebase use to deliver and protect the service.
          </li>
        </UL>
        <P>We do not collect students’ phone numbers (only careers applicants give one), Aadhaar or other ID numbers, or payment details on the Free plan. We do not use advertising or tracking cookies.</P>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <UL>
        <li>To create your account and keep you signed in.</li>
        <li>To build your study plan, suggest courses and videos that fit your profile and assessment, and track your progress.</li>
        <li>To answer you in the AI Assistant, make revision quizzes from your materials, and write course quizzes.</li>
        <li>To issue certificates and let others verify them when you share them.</li>
        <li>To run campus placements: show your shared progress to your college, send your application to the college and company of a drive, run tests and interviews, and tell you about new drives, links and results by email, notification and the in-app bell.</li>
        <li>To keep StudentOS secure, prevent misuse (for example, daily AI limits), and fix problems.</li>
      </UL>
    ),
  },
  {
    id: "share",
    title: "Who we share it with",
    body: (
      <>
        <P>We do not sell your personal data. We share it only with the service providers that run parts of StudentOS for us, and only what each one needs:</P>
        <UL>
          <li>
            <B>Google Firebase</B> (Authentication and Cloud Firestore) stores your account and app data. <A href="https://firebase.google.com/support/privacy">Firebase privacy</A>.
          </li>
          <li>
            <B>AI providers, Groq and Cerebras,</B> process your Assistant messages, attachments, voice recordings, notes for quizzes, and a short summary of your profile (without your name, email or college) to suggest courses and plans. They process it to return an answer under their own terms.
          </li>
          <li>
            <B>YouTube (Google)</B>, see the next section.
          </li>
          <li>
            <B>Resend</B> sends our emails (your email address, name and the message). <B>Firebase Cloud Messaging</B> delivers phone and laptop notifications if you turn them on.
          </li>
          <li>
            <B>Your browser’s speech service</B>: when you tap Speak in an interview, your browser turns your voice into text (in Chrome this is done by Google).
          </li>
          <li>
            <B>Our hosting provider</B> serves the website.
          </li>
        </UL>
        <P>
          The camera face model and the Python runner for coding are downloaded from public CDNs (jsDelivr and Google); no personal data is sent to them. Some of these providers may process data on servers outside India. We may also disclose data if
          the law requires it.
        </P>
      </>
    ),
  },
  {
    id: "youtube",
    title: "YouTube API Services",
    body: (
      <>
        <P>
          StudentOS uses <B>YouTube API Services</B> to find and show educational videos. By watching videos in StudentOS you also agree to the <A href="https://www.youtube.com/t/terms">YouTube Terms of Service</A>, and Google’s handling of that data is
          described in the <A href="https://policies.google.com/privacy">Google Privacy Policy</A>.
        </P>
        <UL>
          <li>We send YouTube only search topics (for example “financial accounting full course”), never your name or email.</li>
          <li>Videos play in YouTube’s own embedded player (privacy-enhanced mode). YouTube may use cookies or similar technology when a video plays.</li>
          <li>We store a video’s ID, title, channel, length and chapters with your course so you can continue where you left off. We refresh this YouTube data, or delete it, at least every 30 days. Popular search results shared by all students are refreshed every 29 days.</li>
          <li>StudentOS does not ask for access to your YouTube or Google account data. If you ever connect one, you can remove access at <A href="https://security.google.com/settings/security/permissions">Google security settings</A>.</li>
        </UL>
      </>
    ),
  },
  {
    id: "camera",
    title: "Camera, microphone and live interviews",
    body: (
      <UL>
        <li>
          <B>Strict mode:</B> the camera and microphone checks run in your browser, on your device. They notice looking away, glancing away again and again, a phone or other device on camera, and a second person. We keep only the result, such as “looked away” or “a second person”, never a photo, video or sound.
        </li>
        <li>
          <B>Face check (optional, only with your consent):</B> if you set it up, we measure the shape of your face (distances between points such as the eyes, nose and jaw) and store only that list of numbers with your account, never a photo or video.
          In strict rounds the camera, on your device, compares the face it sees with those numbers. If the face doesn’t match, you get a warning. If it closely matches another student of your college who is already placed, the round stops
          and your college’s placement cell gets a note to check, which names the account that took the round but not the other student. You can delete your face measurements any time on the Face check page, and they are deleted with your account.
        </li>
        <li>
          <B>Mock interview recordings</B> you choose to save stay on your device and are never uploaded.
        </li>
        <li>
          <B>Live interviews:</B> video and sound go directly between your browser and the recruiter’s (peer to peer). Nothing is recorded by StudentOS. To connect, both browsers exchange network details (including IP addresses) through StudentOS and
          Google’s public STUN servers, so the other side can see your IP address.
        </li>
      </UL>
    ),
  },
  {
    id: "colleges",
    title: "Your college and companies",
    body: (
      <UL>
        <li>
          <B>Your college</B> sees a summary only if you join it and agree to share: your name, class or section, test and practice scores, course progress, activity, placement readiness, and (for degree colleges) your email for drive
          updates. Never your chats, notes or phone. Stop sharing any time and the summary is deleted.
        </li>
        <li>
          <B>When you apply to a drive,</B> your college’s placement cell sees your application, and for a drive StudentOS brings, the company sees it too: your name, email, branch, CGPA, backlogs, batch, resume and your StudentOS scores.
        </li>
        <li>
          <B>Company tests and interviews:</B> the company and your college’s placement cell see your score, the strict-mode warnings and, for the company, your answers, code and the AI’s report. You see that you submitted, not the score.
        </li>
        <li>
          <B>Interview experiences</B> you share are seen by your placement cell, and after it checks them by students of your college, with your branch and batch (your name only if you choose).
        </li>
      </UL>
    ),
  },
  {
    id: "public",
    title: "What is public",
    body: (
      <UL>
        <li>
          <B>Certificates:</B> anyone with a certificate ID or QR code can see that certificate (your name, the course, date, duration and quiz score) on the verify page. They are not listed or searchable.
        </li>
        <li>
          <B>Reviews:</B> if you write a review and tick the box to publish it, your review, rating and the name and course you enter are shown on the StudentOS website after a check for spam and abuse (done automatically, including by our AI provider, or by us). You can edit or delete it any time.
        </li>
        <li>
          <B>Shared chats:</B> if you share an AI chat, anyone with the link can read that copy. You can stop sharing at any time, which deletes the copy.
        </li>
        <li>Nothing else in your account is public. Apart from what you share with your college and companies (above), it is visible only to you.</li>
      </UL>
    ),
  },
  {
    id: "storage",
    title: "Storage and retention",
    body: (
      <>
        <P>
          We keep your data while your account is open. YouTube data is refreshed or deleted within 30 days as described above. In your browser we store small preferences such as your theme and whether locked chats are unlocked in this tab, and
          your answers during a test so a refresh doesn’t lose them.
        </P>
        <P>
          Applications, test and interview results you submitted in a drive are part of that college’s and company’s hiring records, so they are kept for that drive even if you stop sharing. Email us and we will delete them unless the law requires
          us to keep them.
        </P>
        <P>
          When you delete your account (Settings → Account &amp; privacy → Delete account), we delete your profile and app data, saved chats, study materials, shared chat links, your review, your public certificate records and your face measurements. Copies kept by our service providers
          for backup or security may take up to 30 days to disappear.
        </P>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights and choices",
    body: (
      <>
        <P>Under Indian law you can:</P>
        <UL>
          <li>see and download a copy of your main data (Settings → Account &amp; privacy → Download my data);</li>
          <li>correct or update your data (most of it can be edited in the app);</li>
          <li>delete your account and data (Settings → Account &amp; privacy);</li>
          <li>withdraw consent (by deleting your account; this does not affect what happened before);</li>
          <li>nominate someone to act for you in case of death or incapacity;</li>
          <li>raise a grievance with us, and if not resolved, with the Data Protection Board of India.</li>
        </UL>
        <P>
          You can also choose what the AI Assistant may use (schedule, progress, calendar) in Settings → Assistant. Email <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A> for anything you can’t do in the app. We reply within 7 days and complete
          deletion requests within 7 days.
        </P>
      </>
    ),
  },
  {
    id: "children",
    title: "Students under 18",
    body: (
      <P>
        If you are under 18, you may use StudentOS only with the consent of a parent or guardian, who should read this policy with you. School students confirm this when they set up their account, and we keep the date they did. Placement tools and the face check are not offered to school students. We do not knowingly use the data of anyone under 18 for tracking, behavioural monitoring or targeted advertising. If a
        parent or guardian wants their child’s data removed, they can email us.
      </P>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <P>
        Data is sent over HTTPS and stored with Google Firebase. Database rules let each student read and write only their own data; a college’s staff can read only what its students share with it, and companies and test answers are reached only
        through our server, which checks who is asking. Chat lock PINs are stored only as a salted hash. No system is perfectly secure; if a breach affects your data, we will tell you and the authorities as the law requires.
      </P>
    ),
  },
  {
    id: "grievance",
    title: "Grievance officer and changes",
    body: (
      <>
        <P>
          Grievance Officer: Rahul Rathod, Founder, StudentOS Technologies · <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
        </P>
        <P>If we change this policy, we will update the date at the top and, for important changes, tell you in the app before they apply.</P>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      other={{ href: "/terms", label: "Terms and Conditions" }}
      intro={<P>Your study data is yours. This page explains, in plain words, what StudentOS collects, why, and how you stay in control of it.</P>}
      sections={sections}
    />
  );
}
