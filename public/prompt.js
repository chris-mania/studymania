// The prompt people copy into ChatGPT, Claude, Gemini, Grok, etc. along with their notes.
window.STUDY_PROMPT = `You are making study material for Study Mania, an app that teaches a class one small lesson a day and then quizzes with multiple choice, so the student never has to cram. It must work for ANY class (business, biology, psychology, history, nursing, law, etc.). Turn MY NOTES (at the bottom: notes, slides, a study guide, or textbook pages) into cards and exam questions.

WHAT TO MAKE A CARD FOR
- Every term, concept, formula, process/sequence, person/event, and "difference between X and Y" that could show up on a multiple-choice exam.
- If my notes mark something as important, on the exam, or repeated, definitely include it. Skip filler.
- My notes may be only part of the course (like one or two chapters). That's fine. Just do what's here.

PAIR SMALL LOOK-ALIKE TERMS (so there's less to memorize)
- If 2-3 terms are minor, easy, and similar or often mixed up (for example "groupthink" and "social loafing"), make them ONE pair card instead of separate cards.
- Pair card: "term" is "Groupthink vs. Social Loafing"; "simple" gives both meanings in one line ("Groupthink: everyone agrees to avoid conflict. Social loafing: slacking off in a group."); "definition" and "example" cover both; and "parts" lists each one: [{"term":"Groupthink","simple":"...","example":"..."},{"term":"Social Loafing","simple":"...","example":"..."}].
- For a pair card, "question" is a short scenario that fits exactly one of them, "answer" is that term's name, and "traps" are the other term(s) plus a believable near-miss.
- Big concepts, formulas and anything my notes stress stay as their own cards. For normal cards, "parts" is [].

CARD FIELDS
- "topic": short topic name in the order of my notes. If the notes have chapter numbers, start with them, like "Ch 5 · Inventory Types". Aim for 3-6 cards per topic.
- "term": the exact word or name the class uses. For an acronym, put the acronym here.
- "full": the full name of an acronym, or "" if it isn't one.
- "definition": the textbook definition. If my notes give a definition, copy it closely. If not, write the standard textbook definition in 1-2 sentences.
- "simple": the same idea in plain words a 15-year-old would get, 15 words max.
- "example": the BEST real-world example you can think of: a well-known company, product, celebrity, sports team, historical moment, or everyday college-student situation. Make it specific, vivid and a little fun, with real numbers when it helps. For a formula, show a worked example with numbers.
- "hook": a short memory trick, like a letter trick, a comparison, a rhyme, or a picture to imagine.
- "answer": the correct meaning REWORDED for a quiz. Do NOT reuse the wording of "definition" or "simple", so students must understand it, not just match words.
- "traps": exactly 3 WRONG answers that are near-misses. Same length and style as "answer", believable, only slightly off. At least one should describe the concept students most often confuse it with. Never silly, never "all/none of the above".
- "confuse": one line on what it's commonly mixed up with and how to tell them apart, or "".
- "related": 2-4 other terms from these cards it connects to, using their exact "term" text.
- "formula": the formula if there is one, else "".
- "question": usually "". Only for a sequence or "which is NOT" item, write the exact question to ask, and make "answer" the right choice.

EXAM QUESTIONS
For each topic also write 2-3 exam-style questions like a professor would put on a test: apply an idea to a short scenario, pick which concept a situation shows, compare two ideas, or calculate something. 4 choices, exactly one correct, and the wrong choices are near-misses. "answer" must be copied exactly from one of the choices. "why" explains the answer in one sentence.

RULES
- Facts must come from my notes, or be standard textbook knowledge that matches them. If something in my notes is unclear, skip it rather than guess.
- Output valid JSON: straight double quotes, no comments, no trailing commas.

OUTPUT
Reply with ONLY one JSON code block in exactly this shape, with no other text before it:
{
  "subject": "short class name",
  "cards": [
    {"topic":"","term":"","full":"","definition":"","simple":"","example":"","hook":"","answer":"","traps":["","",""],"confuse":"","related":[""],"formula":"","question":"","parts":[]}
  ],
  "questions": [
    {"topic":"","question":"","choices":["","","",""],"answer":"","why":""}
  ]
}

If there are more than 30 cards, send the first 30 cards (and the exam questions for those topics) in that block, then stop and write only "Say NEXT for more." When I say NEXT, send the next block in the same shape. Keep going until everything is covered.

MY NOTES:
`;
