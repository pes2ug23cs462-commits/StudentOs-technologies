/* Profile setup (“Let’s personalize your journey”) — data shapes, option lists
   and the assessment questions. Answers are saved on the user’s document
   in Firestore as `setup`. */

export type StudentType = "college" | "school" | "professional" | "other";
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type AreaLevel = "beginner" | "intermediate" | "advanced";

export interface SetupData {
  academic: {
    type: StudentType | "";
    college: string;
    course: string;
    year: string;
    field: string;
    specialization: string;
    graduation: string;
  };
  goals: {
    primary: string;
    interests: string[];
    opportunities: string[];
    hours: string;
    formats: string[];
  };
  skills: {
    level: SkillLevel | "";
    areaLevels: Record<string, AreaLevel>;
    familiar: string[];
    experience: string[];
    experienceNote: string;
    tools: string[];
    certifications: "yes" | "maybe" | "no" | "";
  };
  /** question id → option id */
  assessment: Record<string, string>;
  assessmentDone: boolean;
  /** When the 5-minute timer started (ms since epoch) */
  assessmentStartedAt?: number;
  /** furthest step reached (1–6; 6 = plan choice) */
  reached: number;
  /** Result of the assessment */
  level?: Level;
  /** Chosen version of StudentOS */
  plan?: "free" | "premium";
}

export type Level = "beginner" | "intermediate" | "advanced";

export const emptySetup = (): SetupData => ({
  academic: { type: "", college: "", course: "", year: "", field: "", specialization: "", graduation: "" },
  goals: { primary: "", interests: [], opportunities: [], hours: "", formats: [] },
  skills: { level: "", areaLevels: {}, familiar: [], experience: [], experienceNote: "", tools: [], certifications: "" },
  assessment: {},
  assessmentDone: false,
  reached: 1,
});

/* ---------- Step 1 ---------- */
export const STUDENT_TYPES: { value: StudentType; label: string; icon: string }[] = [
  { value: "college", label: "College / University Student", icon: "cap" },
  { value: "school", label: "School Student", icon: "book" },
  { value: "professional", label: "Working Professional (Learning)", icon: "briefcase" },
  { value: "other", label: "Other", icon: "grid" },
];
export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Other"];
export const COURSES = ["B.Tech", "B.E.", "B.Sc", "B.Com", "B.A.", "BBA", "BCA", "M.Tech", "M.Sc", "MBA", "MCA", "Diploma", "Other"];
export const FIELDS = ["Engineering & Technology", "Science", "Commerce", "Arts & Humanities", "Management", "Medicine & Health", "Law", "Design", "Other"];
export const COLLEGE_SUGGESTIONS = [
  "PES University",
  "Northfield Institute of Technology",
  "IIT Bombay",
  "IIT Delhi",
  "BITS Pilani",
  "NIT Trichy",
  "VIT Vellore",
  "Delhi University",
  "Christ University",
  "RV College of Engineering",
  "Manipal Institute of Technology",
  "Anna University",
];
export const graduationYears = (from = new Date().getFullYear()) => Array.from({ length: 8 }, (_, i) => String(from + i));

/* ---------- Step 2 ---------- */
export const PRIMARY_GOALS = [
  { value: "skills", label: "Build my skills", sub: "Learn practical skills and gain real knowledge", icon: "target" },
  { value: "career", label: "Prepare for my career", sub: "Get internships, jobs and career guidance", icon: "briefcase" },
  { value: "academics", label: "Improve academic performance", sub: "Do better in my studies and exams", icon: "book" },
  { value: "explore", label: "Explore my interests", sub: "Discover new fields and opportunities", icon: "compass" },
];
export const INTERESTS = [
  { value: "tech", label: "Technology & IT", icon: "laptop" },
  { value: "business", label: "Business & Management", icon: "chart" },
  { value: "design", label: "Design & Creativity", icon: "palette" },
  { value: "data", label: "Data & Analytics", icon: "chart" },
  { value: "arts", label: "Arts & Humanities", icon: "book" },
  { value: "commerce", label: "Commerce & Finance", icon: "dollar" },
  { value: "health", label: "Health & Life Sciences", icon: "flask" },
  { value: "social", label: "Social Impact", icon: "users" },
  { value: "exams", label: "Competitive Exams", icon: "trophy" },
  { value: "entrepreneurship", label: "Entrepreneurship", icon: "bulb" },
  { value: "projects", label: "Project Building", icon: "cube" },
  { value: "other", label: "Other", icon: "dots" },
];
export const OPPORTUNITIES = ["Internships", "Jobs", "Freelancing", "Research Opportunities", "Startup Opportunities", "Competitions & Hackathons", "Mentorship"];
export const WEEKLY_HOURS = ["< 2 hours", "2 – 5 hours", "5 – 10 hours", "10+ hours"];
export const FORMATS = ["Video Courses", "Interactive Projects", "Reading Materials", "Live Sessions", "Community Learning", "Short Guides"];

/* ---------- Step 3 ---------- */
export const SKILL_LEVELS: { value: SkillLevel; label: string; sub: string; icon: string }[] = [
  { value: "beginner", label: "Beginner", sub: "I’m just getting started", icon: "sprout" },
  { value: "intermediate", label: "Intermediate", sub: "I have some basic knowledge", icon: "chart" },
  { value: "advanced", label: "Advanced", sub: "I’m confident and can work independently", icon: "chart" },
  { value: "expert", label: "Expert", sub: "I have strong experience", icon: "crown" },
];
export const AREAS = [
  { value: "tech", label: "Technology / Programming", icon: "laptop" },
  { value: "design", label: "Design & Creativity", icon: "palette" },
  { value: "data", label: "Data & Analytics", icon: "chart" },
  { value: "business", label: "Business & Management", icon: "briefcase" },
  { value: "communication", label: "Communication & Writing", icon: "chat" },
  { value: "other", label: "Other (please specify)", icon: "dots" },
];
export const FAMILIAR = ["No specific skills yet", "Python", "JavaScript", "Web Development", "Data Analysis", "UI/UX Design", "Content Writing", "Video Editing", "Digital Marketing", "Communication", "Project Management", "Other"];
export const EXPERIENCE = [
  { value: "none", label: "No experience yet", sub: "That’s okay!", icon: "file" },
  { value: "academic", label: "Academic projects", icon: "cap" },
  { value: "internship", label: "Internship experience", icon: "briefcase" },
  { value: "parttime", label: "Part-time work", icon: "clock" },
  { value: "personal", label: "Personal projects", icon: "folder" },
  { value: "other", label: "Other", icon: "dots" },
];
export const TOOLS: { value: string; color: string }[] = [
  { value: "None yet", color: "" },
  { value: "Figma", color: "#a259ff" },
  { value: "Canva", color: "#00c4cc" },
  { value: "GitHub", color: "#6e7681" },
  { value: "VS Code", color: "#2f80ed" },
  { value: "Microsoft Office", color: "#eb3c00" },
  { value: "Google Workspace", color: "#34a853" },
  { value: "Notion", color: "#787774" },
  { value: "Excel", color: "#1d6f42" },
  { value: "Adobe Photoshop", color: "#31a8ff" },
  { value: "Adobe Illustrator", color: "#ff9a00" },
  { value: "Other", color: "" },
];

/* ---------- Labels for the review page ---------- */
export const labelOf = <T extends { value: string; label: string }>(list: T[], v: string) => list.find((x) => x.value === v)?.label ?? "";

/* ---------- Assessment ---------- */
export type QuestionOption = { id: string; title: string; sub: string; icon: string; tone: "blue" | "violet" | "indigo" | "green" };
export type Question = { id: string; category: string; icon: string; prompt: string; help: string; options: QuestionOption[] };

const o = (id: string, title: string, sub: string, icon: string, tone: QuestionOption["tone"]): QuestionOption => ({ id, title, sub, icon, tone });

const ALL_QUESTIONS: Question[] = [
  { id: "q1", category: "Career & Goals", icon: "target", prompt: "What are you most looking to achieve in the next 6–12 months?", help: "Select one option that best matches your current goal.", options: [o("internship", "Get an internship", "Gain practical experience and real-world exposure.", "briefcase", "blue"), o("skills", "Improve my skills", "Learn and strengthen relevant skills for my career.", "chart", "violet"), o("academics", "Perform better in academics", "Improve my understanding and grades in my courses.", "cap", "indigo"), o("explore", "Explore different career options", "Understand different fields and find the right path for me.", "compass", "green")] },
  { id: "q2", category: "Career & Goals", icon: "target", prompt: "Which kind of role sounds most exciting to you?", help: "Pick the one you’d most like to try.", options: [o("builder", "Building products", "Developer, engineer or maker roles.", "laptop", "blue"), o("creative", "Creative work", "Design, content, media or art.", "palette", "violet"), o("analyst", "Solving problems with data", "Analyst, researcher or scientist roles.", "chart", "indigo"), o("leader", "Leading and organising", "Management, operations or your own startup.", "users", "green")] },
  { id: "q3", category: "Career & Goals", icon: "target", prompt: "How clear are you about your career direction?", help: "There’s no wrong answer here.", options: [o("clear", "Very clear", "I know the role I want.", "target", "green"), o("some", "Somewhat clear", "I have a few options in mind.", "compass", "blue"), o("unsure", "Not sure yet", "I want to explore before deciding.", "bulb", "violet"), o("change", "Thinking of switching", "I want to move to a different field.", "repeat", "indigo")] },
  { id: "q4", category: "Learning Style", icon: "book", prompt: "How do you learn best?", help: "Choose the style that works most often for you.", options: [o("video", "Watching videos", "Lectures, tutorials and walkthroughs.", "video", "blue"), o("doing", "Doing projects", "Learning by building things.", "cube", "green"), o("reading", "Reading", "Books, articles and documentation.", "book", "indigo"), o("people", "Learning with others", "Study groups, classes and mentors.", "users", "violet")] },
  { id: "q5", category: "Learning Style", icon: "book", prompt: "When you get stuck, what do you usually do?", help: "Be honest — it helps us support you.", options: [o("search", "Search online", "Google, YouTube or forums.", "search", "blue"), o("ask", "Ask someone", "A friend, senior or teacher.", "chat", "violet"), o("persist", "Keep trying on my own", "I like to figure it out myself.", "target", "green"), o("skip", "Move on and come back later", "I take a break and return.", "clock", "indigo")] },
  { id: "q6", category: "Learning Style", icon: "book", prompt: "How long can you usually focus in one sitting?", help: "This helps us size your study sessions.", options: [o("short", "Under 30 minutes", "Short bursts work best.", "clock", "violet"), o("medium", "30–60 minutes", "About an hour at a time.", "clock", "blue"), o("long", "1–2 hours", "I can go deep for a while.", "clock", "indigo"), o("vary", "It varies a lot", "Depends on the day.", "repeat", "green")] },
  { id: "q7", category: "Learning Style", icon: "book", prompt: "How do you prefer to check your progress?", help: "Pick what keeps you motivated.", options: [o("quiz", "Quizzes and tests", "Quick checks after each topic.", "check", "blue"), o("project", "Finished projects", "Something I can show.", "cube", "green"), o("streak", "Streaks and goals", "Seeing consistency over time.", "trophy", "violet"), o("feedback", "Feedback from others", "Reviews from mentors or peers.", "chat", "indigo")] },
  { id: "q8", category: "Time & Routine", icon: "clock", prompt: "When do you usually have time to study?", help: "Choose your most reliable time.", options: [o("morning", "Early mornings", "Before classes or work.", "sun", "blue"), o("afternoon", "Afternoons", "Between or after classes.", "clock", "indigo"), o("evening", "Evenings", "After the day’s work is done.", "moon", "violet"), o("weekend", "Mostly weekends", "Weekdays are busy.", "calendar", "green")] },
  { id: "q9", category: "Time & Routine", icon: "clock", prompt: "How consistent is your weekly schedule?", help: "This helps us plan around your week.", options: [o("fixed", "Very fixed", "Same timetable every week.", "calendar", "green"), o("mostly", "Mostly the same", "A few changes now and then.", "calendar", "blue"), o("changing", "Changes often", "Each week looks different.", "repeat", "violet"), o("chaotic", "Hard to predict", "I plan day by day.", "bulb", "indigo")] },
  { id: "q10", category: "Time & Routine", icon: "clock", prompt: "What usually stops you from studying?", help: "Pick the biggest blocker.", options: [o("time", "Not enough time", "Classes and other work take over.", "clock", "blue"), o("motivation", "Low motivation", "Hard to get started.", "bulb", "violet"), o("direction", "Not knowing what to study", "Too many options.", "compass", "indigo"), o("distraction", "Distractions", "Phone, social media and noise.", "bell", "green")] },
  { id: "q11", category: "Time & Routine", icon: "clock", prompt: "How would you like reminders?", help: "You can change this later in settings.", options: [o("before", "Before each session", "A nudge 30 minutes before.", "bell", "blue"), o("daily", "One daily summary", "A plan every morning.", "sun", "indigo"), o("weekly", "Weekly check-in", "A recap on Sundays.", "calendar", "violet"), o("none", "No reminders", "I’ll check the app myself.", "x", "green")] },
  { id: "q12", category: "Skills", icon: "chart", prompt: "Which skill do you most want to build first?", help: "We’ll start your plan here.", options: [o("coding", "Coding", "Programming and software.", "code", "blue"), o("design", "Design", "UI/UX, graphics and visuals.", "palette", "violet"), o("data", "Data", "Analysis, Excel and SQL.", "chart", "indigo"), o("communication", "Communication", "Writing, speaking and presenting.", "chat", "green")] },
  { id: "q13", category: "Skills", icon: "chart", prompt: "How comfortable are you with computers and software?", help: "This helps us pick the right starting point.", options: [o("basic", "Basic", "Browsing, documents and email.", "laptop", "green"), o("comfortable", "Comfortable", "I install and learn new tools easily.", "laptop", "blue"), o("power", "Power user", "Shortcuts, scripts and settings.", "code", "indigo"), o("dev", "Developer", "I write code regularly.", "code", "violet")] },
  { id: "q14", category: "Skills", icon: "chart", prompt: "Have you built anything on your own before?", help: "Projects of any size count.", options: [o("none", "Not yet", "I’m ready to start my first one.", "sprout", "green"), o("small", "Small things", "Assignments or tutorials.", "file", "blue"), o("some", "A few projects", "Things I can show.", "folder", "indigo"), o("many", "Many projects", "Including real users or clients.", "trophy", "violet")] },
  { id: "q15", category: "Skills", icon: "chart", prompt: "How do you feel about maths and logic problems?", help: "Helps us balance theory and practice.", options: [o("love", "I enjoy them", "Puzzles are fun.", "bulb", "green"), o("ok", "They’re okay", "I can manage with practice.", "check", "blue"), o("struggle", "I find them hard", "I need extra support.", "chart", "violet"), o("avoid", "I’d rather avoid them", "Prefer creative or people work.", "palette", "indigo")] },
  { id: "q16", category: "Experience", icon: "briefcase", prompt: "Have you done an internship or job before?", help: "Any kind of work counts.", options: [o("no", "Not yet", "Looking for my first one.", "sprout", "green"), o("intern", "An internship", "At a company or startup.", "briefcase", "blue"), o("parttime", "Part-time work", "Alongside my studies.", "clock", "indigo"), o("full", "Full-time work", "I’ve worked full-time.", "building", "violet")] },
  { id: "q17", category: "Experience", icon: "briefcase", prompt: "Do you have a resume or portfolio ready?", help: "We can help you build one.", options: [o("none", "Neither yet", "I’ll need help starting.", "file", "violet"), o("resume", "A resume", "But no portfolio.", "file", "blue"), o("portfolio", "A portfolio", "Projects online, resume pending.", "folder", "indigo"), o("both", "Both", "Ready to apply.", "check", "green")] },
  { id: "q18", category: "Experience", icon: "briefcase", prompt: "Have you taken part in hackathons or competitions?", help: "Online or offline.", options: [o("no", "Never", "Interested in trying.", "sprout", "green"), o("once", "Once or twice", "Got a taste of it.", "trophy", "blue"), o("often", "Many times", "I enjoy competing.", "trophy", "violet"), o("won", "I’ve won some", "Proud of my results.", "star", "indigo")] },
  { id: "q19", category: "Preferences", icon: "star", prompt: "Which kind of resources do you prefer?", help: "We’ll prioritise these in your plan.", options: [o("free", "Free resources", "YouTube, open courses and docs.", "book", "green"), o("structured", "Structured courses", "Step-by-step with certificates.", "cap", "blue"), o("projects", "Project-based", "Guided builds.", "cube", "violet"), o("mix", "A mix of everything", "Whatever works best.", "layers", "indigo")] },
  { id: "q20", category: "Preferences", icon: "star", prompt: "How challenging should your plan be?", help: "You can adjust this any time.", options: [o("easy", "Gentle", "Steady and stress-free.", "sprout", "green"), o("balanced", "Balanced", "Some stretch, mostly comfortable.", "check", "blue"), o("push", "Push me", "I want to grow quickly.", "chart", "violet"), o("intense", "Intense", "Maximum challenge.", "trophy", "indigo")] },
  { id: "q21", category: "Preferences", icon: "star", prompt: "Would you like to learn with others?", help: "Community features are optional.", options: [o("solo", "Solo", "I prefer studying alone.", "user", "indigo"), o("buddy", "With a study buddy", "One partner to stay accountable.", "users", "blue"), o("group", "In a group", "Small study groups.", "users", "violet"), o("community", "Big community", "Forums, events and challenges.", "megaphone", "green")] },
  { id: "q22", category: "Motivation", icon: "bulb", prompt: "What motivates you the most?", help: "Pick the strongest one.", options: [o("career", "A good career", "Jobs, salary and growth.", "briefcase", "blue"), o("curiosity", "Curiosity", "Learning for its own sake.", "bulb", "violet"), o("impact", "Making an impact", "Helping people and society.", "users", "green"), o("recognition", "Recognition", "Certificates, ranks and praise.", "trophy", "indigo")] },
  { id: "q23", category: "Motivation", icon: "bulb", prompt: "How do you usually react to a missed study day?", help: "This shapes how the assistant nudges you.", options: [o("catchup", "Catch up quickly", "Make it up the next day.", "repeat", "green"), o("move", "Move on", "Just continue the plan.", "arrow", "blue"), o("stress", "Feel stressed", "It throws me off.", "bulb", "violet"), o("quit", "Lose momentum", "Hard to restart.", "clock", "indigo")] },
  { id: "q24", category: "Motivation", icon: "bulb", prompt: "Where do you see yourself in 3 years?", help: "Dream a little — this helps us plan long-term.", options: [o("job", "Working at a great company", "In a role I enjoy.", "building", "blue"), o("higher", "Higher studies", "Master’s or research, in India or abroad.", "cap", "indigo"), o("startup", "Running my own startup", "Building something of my own.", "rocket", "violet"), o("unsure", "Still figuring it out", "Open to possibilities.", "compass", "green")] },
];

/** The quick assessment: 10 questions. The six skill/experience ones decide the level. */
const PICK = ["q1", "q4", "q8", "q13", "q14", "q15", "q16", "q17", "q18", "q22"];
export const QUESTIONS: Question[] = PICK.map((id) => ALL_QUESTIONS.find((q) => q.id === id)!);
export const ASSESSMENT_SECONDS = 5 * 60;

/* ---------- Level from the assessment ----------
   Uses the skill and experience questions plus the self-rated level from step 3. */
const SCORE: Record<string, Record<string, number>> = {
  q13: { basic: 0, comfortable: 1, power: 2, dev: 3 },
  q14: { none: 0, small: 1, some: 2, many: 3 },
  q15: { love: 3, ok: 2, struggle: 0, avoid: 1 },
  q16: { no: 0, parttime: 1, intern: 2, full: 3 },
  q18: { no: 0, once: 1, often: 2, won: 3 },
};
const SELF: Record<string, number> = { beginner: 0, intermediate: 1.5, advanced: 2.5, expert: 3 };

export function computeLevel(data: SetupData): { level: Level; score: number } {
  let total = 0;
  let max = 0;
  for (const [q, map] of Object.entries(SCORE)) {
    max += 3;
    total += map[data.assessment[q] ?? ""] ?? 0;
  }
  // Self-rating counts double.
  max += 6;
  total += (SELF[data.skills.level] ?? 0) * 2;
  const score = Math.round((total / max) * 100);
  return { level: score < 35 ? "beginner" : score < 68 ? "intermediate" : "advanced", score };
}

export const LEVEL_INFO: Record<Level, { label: string; sub: string }> = {
  beginner: { label: "Beginner", sub: "We’ll start with the foundations and build up step by step." },
  intermediate: { label: "Intermediate", sub: "You know the basics — we’ll focus on projects and deeper skills." },
  advanced: { label: "Advanced", sub: "You’re ready for advanced topics, real projects and opportunities." },
};

/* ---------- Free vs Premium ---------- */
export const PLAN_FEATURES = {
  free: [
    "Dashboard",
    "Learning resources (open courses, limited)",
    "Projects & experience",
    "College timeline",
    "Resume creator",
    "AI assistant",
  ],
  premium: [
    "Dashboard",
    "All learning resources + AI notes and recommendations",
    "StudentOS certificate on completion",
    "Projects & experience",
    "College timeline",
    "AI resume creator",
    "AI tutor with voice",
    "AI mock interview preparation",
  ],
};
