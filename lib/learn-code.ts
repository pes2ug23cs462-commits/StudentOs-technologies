/* "Learn to code from zero": short Python lessons for students who have never coded
   (B.Com, BA, BSc, anyone). Each lesson: a small idea, an example to run, and one
   exercise that is checked by running the student's program on set inputs.
   Programs run in the browser with the same Python as the coding problems. */

import { runCode } from "@/lib/coding/runner";

export type Check = { input?: string; output: string };
export type Lesson = {
  id: string;
  title: string;
  mins: number;
  learn: string[];
  example: string;
  exampleInput?: string;
  task: string;
  starter: string;
  checks: Check[];
  hint: string;
  answer: string;
};

export const LESSONS: Lesson[] = [
  {
    id: "print",
    title: "Your first program: print",
    mins: 4,
    learn: [
      "A program is a list of instructions for the computer, read from top to bottom.",
      "print( ) shows something on the screen. Text goes inside quotes: \"like this\". Numbers don't need quotes.",
      "Each print starts a new line.",
    ],
    example: 'print("Namaste!")\nprint("Today I start coding.")\nprint(2026)',
    task: "Print these two lines exactly:\nHello, StudentOS!\nI am learning Python.",
    starter: "# write your two print lines below\n",
    checks: [{ output: "Hello, StudentOS!\nI am learning Python." }],
    hint: "Two lines means two print( ) calls. Copy the text exactly, with the comma and the full stop.",
    answer: 'print("Hello, StudentOS!")\nprint("I am learning Python.")',
  },
  {
    id: "variables",
    title: "Variables and maths",
    mins: 5,
    learn: [
      "A variable is a name that keeps a value, like a labelled box: price = 40",
      "You can do maths with variables: + add, - subtract, * multiply, / divide.",
      "round(x, 2) keeps 2 digits after the decimal point.",
    ],
    example: "price = 40\nqty = 3\ntotal = price * qty\nprint(total)",
    task: "Three exam marks are given. Print the total on the first line and the average (rounded to 2 decimals) on the second line.",
    starter: "m1 = 78\nm2 = 85\nm3 = 90\n# print the total, then the average\n",
    checks: [{ output: "253\n84.33" }],
    hint: "total = m1 + m2 + m3, then average = total / 3. Print round(average, 2).",
    answer: "m1 = 78\nm2 = 85\nm3 = 90\ntotal = m1 + m2 + m3\nprint(total)\nprint(round(total / 3, 2))",
  },
  {
    id: "input",
    title: "Taking input",
    mins: 5,
    learn: [
      "input( ) waits for the user to type something and gives it back as text.",
      "Text and numbers are different: \"50\" is text. int(\"50\") turns it into the number 50.",
      "So for numbers we write: n = int(input())",
    ],
    example: 'name = input("Your name: ")\nprint("Hi", name)',
    exampleInput: "Riya",
    task: "Read the price of one item, then the quantity (each on its own line). Print the total bill.",
    starter: "price = int(input())\n# read the quantity and print the total\n",
    checks: [
      { input: "50\n3", output: "150" },
      { input: "12\n10", output: "120" },
    ],
    hint: "qty = int(input()) and then print(price * qty).",
    answer: "price = int(input())\nqty = int(input())\nprint(price * qty)",
  },
  {
    id: "if",
    title: "Decisions: if and else",
    mins: 5,
    learn: [
      "if lets the program choose. The lines under it run only when the condition is true.",
      "Compare with: >  <  >=  <=  ==  (equal)  !=  (not equal).",
      "The lines inside if and else are pushed right with 4 spaces. Python uses this to know what belongs inside.",
    ],
    example: 'age = 19\nif age >= 18:\n    print("Can vote")\nelse:\n    print("Too young")',
    task: "Read the marks. Print Pass if the marks are 35 or more, otherwise print Fail.",
    starter: "marks = int(input())\n",
    checks: [
      { input: "35", output: "Pass" },
      { input: "34", output: "Fail" },
      { input: "90", output: "Pass" },
    ],
    hint: 'if marks >= 35: then print("Pass"), and else: print("Fail"). Don\'t forget the colons and the 4 spaces.',
    answer: 'marks = int(input())\nif marks >= 35:\n    print("Pass")\nelse:\n    print("Fail")',
  },
  {
    id: "elif",
    title: "More choices: elif",
    mins: 5,
    learn: [
      "elif means \"else if\": check another condition when the first one was false.",
      "Python checks from top to bottom and runs only the first true one.",
    ],
    example: 'temp = 31\nif temp > 35:\n    print("Very hot")\nelif temp > 25:\n    print("Warm")\nelse:\n    print("Pleasant")',
    task: "Read the marks and print the grade: 90 or more → A, 75 or more → B, 60 or more → C, 35 or more → D, below 35 → F.",
    starter: "marks = int(input())\n",
    checks: [
      { input: "95", output: "A" },
      { input: "75", output: "B" },
      { input: "60", output: "C" },
      { input: "40", output: "D" },
      { input: "12", output: "F" },
    ],
    hint: "Start with the highest: if marks >= 90, then elif marks >= 75, and so on, and else for F.",
    answer: 'marks = int(input())\nif marks >= 90:\n    print("A")\nelif marks >= 75:\n    print("B")\nelif marks >= 60:\n    print("C")\nelif marks >= 35:\n    print("D")\nelse:\n    print("F")',
  },
  {
    id: "for",
    title: "Repeat: for loops",
    mins: 6,
    learn: [
      "A loop repeats lines. for i in range(1, 6): runs with i = 1, 2, 3, 4, 5 (it stops before 6).",
      "f-strings put values inside text: f\"{a} x {b}\" becomes 3 x 4.",
    ],
    example: 'for i in range(1, 4):\n    print(f"Day {i}: study 1 hour")',
    task: "Read a number n and print its multiplication table from 1 to 10, in this format:\n5 x 1 = 5\n5 x 2 = 10\n…\n5 x 10 = 50",
    starter: "n = int(input())\n",
    checks: [
      { input: "5", output: Array.from({ length: 10 }, (_, i) => `5 x ${i + 1} = ${5 * (i + 1)}`).join("\n") },
      { input: "12", output: Array.from({ length: 10 }, (_, i) => `12 x ${i + 1} = ${12 * (i + 1)}`).join("\n") },
    ],
    hint: 'for i in range(1, 11): and inside it print(f"{n} x {i} = {n * i}")',
    answer: 'n = int(input())\nfor i in range(1, 11):\n    print(f"{n} x {i} = {n * i}")',
  },
  {
    id: "while",
    title: "Repeat until: while loops",
    mins: 6,
    learn: [
      "while keeps repeating as long as its condition is true.",
      "Change something inside the loop, or it will never stop. n = n - 1 makes n smaller each time.",
    ],
    example: "saved = 0\nmonths = 0\nwhile saved < 1000:\n    saved = saved + 300\n    months = months + 1\nprint(months)",
    task: "Read a number n. Count down from n to 1 (one number per line), then print Go!",
    starter: "n = int(input())\n",
    checks: [
      { input: "3", output: "3\n2\n1\nGo!" },
      { input: "5", output: "5\n4\n3\n2\n1\nGo!" },
    ],
    hint: 'while n >= 1: print(n), then n = n - 1. After the loop (not inside it), print("Go!").',
    answer: 'n = int(input())\nwhile n >= 1:\n    print(n)\n    n = n - 1\nprint("Go!")',
  },
  {
    id: "lists",
    title: "Lists",
    mins: 6,
    learn: [
      "A list keeps many values in order: marks = [78, 85, 90]",
      "sum(marks) adds them, max(marks) finds the biggest, len(marks) counts them.",
      "input().split() breaks a line like \"10 20 30\" into pieces. Turn them into numbers with: [int(x) for x in input().split()]",
    ],
    example: "marks = [78, 85, 90, 66]\nprint(sum(marks))\nprint(max(marks))\nprint(len(marks))",
    task: "Read one line of numbers separated by spaces (daily expenses). Print the total on the first line and the biggest expense on the second.",
    starter: "spends = [int(x) for x in input().split()]\n",
    checks: [
      { input: "120 45 300 60 80", output: "605\n300" },
      { input: "10 10 10", output: "30\n10" },
    ],
    hint: "print(sum(spends)) and then print(max(spends)).",
    answer: "spends = [int(x) for x in input().split()]\nprint(sum(spends))\nprint(max(spends))",
  },
  {
    id: "strings",
    title: "Working with text",
    mins: 5,
    learn: [
      "Text has its own tools: name.upper() makes CAPITALS, name.lower() small letters, len(name) counts letters.",
      "name[0] is the first letter; name[-1] is the last.",
    ],
    example: 'city = "vijayapura"\nprint(city.upper())\nprint(len(city))\nprint(city[0])',
    task: "Read a name. Print it in capital letters on the first line, and how many letters it has on the second.",
    starter: "name = input()\n",
    checks: [
      { input: "riya", output: "RIYA\n4" },
      { input: "Mahesh", output: "MAHESH\n6" },
    ],
    hint: "print(name.upper()) and print(len(name)).",
    answer: "name = input()\nprint(name.upper())\nprint(len(name))",
  },
  {
    id: "functions",
    title: "Functions",
    mins: 6,
    learn: [
      "A function is a named block of steps you can use again: def name(input):",
      "return sends the answer back to where the function was used.",
    ],
    example: "def square(x):\n    return x * x\n\nprint(square(4))\nprint(square(9))",
    task: "Write a function with_gst(amount) that returns the amount plus 18% GST, rounded to 2 decimals. Then read an amount and print with_gst(amount).",
    starter: "def with_gst(amount):\n    # return the amount with 18% GST\n    pass\n\namount = int(input())\nprint(with_gst(amount))\n",
    checks: [
      { input: "100", output: "118.0" },
      { input: "250", output: "295.0" },
      { input: "99", output: "116.82" },
    ],
    hint: "Inside the function: return round(amount * 1.18, 2)",
    answer: "def with_gst(amount):\n    return round(amount * 1.18, 2)\n\namount = int(input())\nprint(with_gst(amount))",
  },
  {
    id: "dicts",
    title: "Dictionaries",
    mins: 6,
    learn: [
      "A dictionary connects a key to a value, like a menu: menu = {\"tea\": 10, \"coffee\": 15}",
      "menu[\"tea\"] gives 10. \"tea\" in menu tells you if the key is there.",
    ],
    example: 'phone = {"Riya": "98450 00000", "Aman": "99000 11111"}\nprint(phone["Aman"])\nprint("Sam" in phone)',
    task: 'The canteen menu is given. Read an item name and print its price. If it\'s not on the menu, print Not on menu.',
    starter: 'menu = {"tea": 10, "coffee": 15, "samosa": 12, "dosa": 40}\nitem = input()\n',
    checks: [
      { input: "dosa", output: "40" },
      { input: "tea", output: "10" },
      { input: "pizza", output: "Not on menu" },
    ],
    hint: 'if item in menu: print(menu[item]) else: print("Not on menu")',
    answer: 'menu = {"tea": 10, "coffee": 15, "samosa": 12, "dosa": 40}\nitem = input()\nif item in menu:\n    print(menu[item])\nelse:\n    print("Not on menu")',
  },
  {
    id: "project",
    title: "Mini project: canteen bill",
    mins: 10,
    learn: [
      "Now put it all together: input, a loop, a dictionary and maths.",
      "Plan first in plain words: read how many items → for each one, read the name and quantity → add price × quantity to the total → print the total.",
    ],
    example: '# a line like "tea 2" can be split into two parts:\nname, qty = "tea 2".split()\nprint(name)\nprint(int(qty) * 10)',
    task: "Read n, then n lines like \"tea 2\" (item and quantity). Using the menu, print the total bill.",
    starter: 'menu = {"tea": 10, "coffee": 15, "samosa": 12, "dosa": 40}\nn = int(input())\ntotal = 0\n# your loop here\n\nprint(total)\n',
    checks: [
      { input: "2\ntea 2\nsamosa 3", output: "56" },
      { input: "3\ndosa 1\ncoffee 2\ntea 1", output: "80" },
    ],
    hint: "for i in range(n): then name, qty = input().split() and total = total + menu[name] * int(qty)",
    answer: 'menu = {"tea": 10, "coffee": 15, "samosa": 12, "dosa": 40}\nn = int(input())\ntotal = 0\nfor i in range(n):\n    name, qty = input().split()\n    total = total + menu[name] * int(qty)\nprint(total)',
  },
];

/* Runs a whole program with the given input lines and returns what it printed.
   input() reads the next line; when checking, its prompt text isn't printed, so
   input("Price: ") and input() both pass. */
const WRAP = `
import sys, io, traceback
def __lesson_run(src, stdin, show_prompts):
    lines = iter(stdin.split("\\n")) if stdin else iter(())
    out = io.StringIO()
    def _input(prompt=""):
        try:
            v = next(lines)
        except StopIteration:
            raise EOFError("The program asked for more input than was given.")
        if show_prompts:
            out.write(str(prompt) + v + "\\n")
        return v
    def _print(*a, sep=" ", end="\\n", file=None, flush=False):
        out.write(sep.join(str(x) for x in a) + end)
    g = {"__name__": "__main__", "input": _input, "print": _print}
    try:
        exec(compile(src, "your code", "exec"), g)
    except SyntaxError as e:
        return [out.getvalue(), f"Line {e.lineno}: {e.msg} (check brackets, quotes, colons and spaces)"]
    except Exception as e:
        line = 0
        for f in traceback.extract_tb(e.__traceback__):
            if f.filename == "your code":
                line = f.lineno
        return [out.getvalue(), (f"Line {line}: " if line else "") + type(e).__name__ + ": " + str(e)]
    return [out.getvalue(), ""]
`;

export type RunOut = { output: string; error: string };

export async function runProgram(code: string, input: string, showPrompts: boolean): Promise<RunOut> {
  const r = await runCode("python", WRAP, "__lesson_run", [{ args: [code, input, showPrompts], expected: null }]);
  if (r.status !== "ok") return { output: "", error: r.error ?? "Your program didn't finish." };
  const c = r.cases[0];
  if (c?.error) return { output: "", error: c.error };
  const [output, error] = (c?.got as [string, string]) ?? ["", ""];
  return { output, error };
}

/** Same printed result, ignoring spaces at line ends and empty lines at the end. */
export const tidy = (s: string) =>
  s
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n+$/, "");

export type CheckResult = { ok: boolean; input?: string; want: string; got: string; error: string };

export async function checkLesson(l: Lesson, code: string): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  for (const c of l.checks) {
    const r = await runProgram(code, c.input ?? "", false);
    out.push({ ok: !r.error && tidy(r.output) === tidy(c.output), input: c.input, want: c.output, got: r.output, error: r.error });
  }
  return out;
}

/* Progress (lessons finished), kept on this device. */
const KEY = "sos.learn-code";
export function loadDone(): string[] {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(j) ? j.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
export function saveDone(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* blocked storage: progress just isn't kept */
  }
}
