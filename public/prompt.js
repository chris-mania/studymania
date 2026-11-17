// The prompt people copy into ChatGPT, Claude, Gemini, Grok, etc. along with their notes or slides.
// buildPrompt({ test, cram }) adds what the test is like and a short-on-time version.
const BASE_PROMPT = `You are making study cards for Study Mania, an app that teaches a class a little each day with short lessons and multiple-choice quizzes. It works for ANY class. Turn MY NOTES (pasted or attached below: slides, my own notes, a study guide or textbook pages) into cards and exam questions.

{{FOCUS}}BEFORE YOU START
- If no notes are pasted or attached, reply only: "Please paste or attach your notes." Do not make anything up.
- Read ALL of the material, including text in diagrams, charts and tables. Write in the same language as my notes.

WHAT TO MAKE A CARD FOR
- Every term, concept, formula, process/sequence, person/event, and "difference between X and Y" that could be on a multiple-choice exam.
- Definitely include anything my notes mark as important, on the exam, or repeated. Skip filler (title slides, agendas, "questions?").
- Skip anything my notes say is unsure, unverified or unanswered. Never guess.
- Facts must come from my notes, or be standard textbook knowledge that matches them.

PAIR CARDS (less to memorize)
- If 2-3 terms are small, easy and often mixed up (like "groupthink" and "social loafing"), make ONE pair card. At most one pair card per topic. Big concepts and formulas always get their own card.
- Pair card: "term" is "Groupthink vs. Social Loafing"; "simple" gives both meanings in one line; "parts" lists each one: [{"term":"","simple":"","example":"","scenario":""}]; "question" is a short scenario that fits exactly one of them; "answer" is that term's name; "traps" are the other term name(s) in the pair.
- Each part's "scenario" is a NEW tricky situation (different from its "example") that fits ONLY that term but is close enough that the other terms in the pair seem possible, so you have to know the exact difference. Never use any term's name in it. The app quizzes every part, so make each one equally hard.
- Normal cards: "parts" is [].

CARD FIELDS (keep every card as complete as the first one)
- "n": card number, counting up from 1 across all parts.
- "from": where this card came from: the slide or page number (like "Slide 14" or "Page 3"), or for my own notes, the heading or section it was under (like "Prospect Theory"). Use "" if there's nothing to go by.
- "topic": short topic in the order of my notes. Start with the chapter or lecture if there is one, like "Ch 7 · High Effort Decisions". Use the exact same topic names in every part.
- "term": the exact word the class uses. Acronyms go here.
- "full": the acronym's full name, or "".
- "definition": the textbook definition, max 2 sentences. Copy my notes' wording closely if they have one.
- "simple": the same idea in plain words a 15-year-old gets, max 15 words.
- "example": the best real-world example, max 2 sentences: a well-known brand, celebrity, sports team, historical moment, or college-life situation. Vivid and a little fun. It can be a made-up scenario with a real brand, but never state invented numbers or facts as real. For formulas, show a worked example.
- "hook": a short memory trick.
- "answer": the correct meaning REWORDED, not copied from "definition" or "simple".
- "traps": exactly 3 wrong answers. Same length and style as "answer", believable near-misses, but each one must be clearly FALSE based on my notes. At least one should describe what students most often confuse it with. Write them as descriptions, not names of other terms. Never silly, never "all/none of the above".
- "confuse": one line on what it's mixed up with and how to tell them apart, or "".
- "related": 2-4 other terms from these cards, using their exact "term" text.
- "formula": the formula, or "".
- "question": usually "". Only for a sequence or "which is NOT" item: the exact question to ask, with "answer" as the right choice.

EXAM QUESTIONS
For each topic, write 2-3 questions like a professor would put on a test (for pair cards, test different terms of the pair, not always the first one): apply an idea to a short scenario, say which concept a situation shows, compare two ideas, or calculate something. 4 choices, near-miss wrong ones, only terms from that topic or earlier ones. "answer" must be copied exactly from a choice. "why" explains it in one sentence. Before finishing, check that exactly one choice is correct.

HOW TO SEND IT
- Send EVERYTHING in ONE reply: every card and every exam question, in one JSON block. Keep each field short so it all fits. Don't ask me anything first and don't send it in pieces to be safe.
- Only if you truly run out of room partway through: stop right after a complete card, set "parts_total" to how many parts you need, and end with only "Say NEXT for more." When I say NEXT, continue from the next card number.
- Reply with ONLY a JSON code block in this exact shape:
{
  "subject": "short class name",
  "part": 1, "parts_total": 1, "cards_total": 0,
  "source": {"type": "slides", "total": 0, "sections": [], "unreadable": []},
  "cards": [
    {"n":1,"from":"","topic":"","term":"","full":"","definition":"","simple":"","example":"","hook":"","answer":"","traps":["","",""],"confuse":"","related":[],"formula":"","question":"","parts":[]}
  ],
  "questions": [
    {"topic":"","question":"","choices":["","","",""],"answer":"","why":""}
  ]
}
- "source": "type" is "slides", "pages" or "notes". For slides/pages, "total" = how many you received. For notes with headings, "sections" = every main heading in order (use the exact words). "unreadable" = anything you couldn't read, like image-only slides.
- Valid JSON only: straight double quotes around keys and text, no comments, no trailing commas, no line breaks inside text. Inside text, use ' instead of ".

MY NOTES:
`;

const TEST_FOCUS = {
  mc: "THE TEST: multiple choice. Focus on what multiple-choice questions test: key terms, what they mean, and telling look-alike ideas apart. Skip long background, history and stories unless the notes say they're on the test.",
  def: "THE TEST: mostly definitions and vocab. Make a card for every term, keep each \"definition\" close to my notes' exact wording, and make the wrong answers near-miss definitions.",
  concept: "THE TEST: concepts and scenarios. Questions apply ideas to situations. Use the \"question\" field for a short scenario more often, and make most exam questions scenario-based.",
  math: "THE TEST: calculations and formulas. Make a card for every formula with a worked example, and make most exam questions calculations with numbers.",
};
const CRAM_FOCUS = `SHORT ON TIME (my exam is very soon):
- Only make cards for what is most likely to be tested: key terms, definitions, formulas, and anything my notes mark as important, on the exam or repeated. Skip minor examples, background, history, intros and filler.
- Combine small related terms into pair cards whenever you can (2-3 terms per card). This replaces the one-pair-card-per-topic limit below.
- Keep "definition" to 1 sentence and "example" to 1 short sentence. 1-2 exam questions per topic.

`;
window.buildPrompt = ({ test = "", cram = false } = {}) =>
  BASE_PROMPT.replace("{{FOCUS}}", (TEST_FOCUS[test] ? TEST_FOCUS[test] + "\n\n" : "") + (cram ? CRAM_FOCUS : ""));
window.STUDY_PROMPT = window.buildPrompt();
