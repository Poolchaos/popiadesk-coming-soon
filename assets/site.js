/* The interim site's behaviour.
 *
 * The rule this file obeys: no arithmetic or verdict here that the product
 * already owns. The score, the ceiling, the advice, the zeros rule, the risk
 * sentences, the questions and the counting curve are imported from modules
 * emitted out of src/ by tools/build.mjs. What is left is the DOM, which is
 * genuinely this site's own: a static page has no React to hand.
 *
 * Everything degrades. The markup ships finished, so with JavaScript off the
 * reader gets the page, the first question (unanswerable, and the page says
 * so), the ledger, the eight conditions with their text, and every link. With
 * reduced motion nothing animates and the score is set rather than counted.
 */

import {
  assessmentQuestions,
  assessmentSections,
  calculateAssessmentScore,
  generateRecommendations,
  getRiskLevel,
} from "./core/lib__assessments__assessment-shared.js";
import {
  answerLabel,
  ceilingOf,
  earnedOf,
  maxOf,
  questionById,
  trimMark,
} from "./core/lib__assessments__sheet-scoring-core.js";
import {
  riskSentenceFor,
  subjectLabel,
  zeroDutiesSentence,
} from "./core/lib__assessments__subject-labels.js";
import {
  parseHeroAnswers,
  sanitiseHeroAnswers,
  serialiseHeroAnswers,
} from "./core/lib__assessments__hero-handoff-core.js";
import { countedValue, COUNT_DURATION_MS } from "./core/lib__motion__count-core.js";

const root = document.documentElement;
const TOTAL = assessmentQuestions.length;

/* The three the front page asks, in the order recorded on 2026-08-31: the
   privacy policy first, because it is the most widely understood of the
   twenty-five and the most likely early yes. */
const HERO_QUESTION_IDS = ["q11", "q1", "q2"];

/* Help only where the term is not common knowledge, the same pair the
   product's own hero glosses: every word here is read before the reader can
   act, and the budget before the primary action is sixty. */
const HERO_HELP = new Set(["q1", "q2"]);

/* What each unanswered row on the front page is about, in the owner's words,
   until it is answered. The same lines as the app's hero ledger. */
const LEDGER_GLOSS = {
  q11: "A notice telling people what you collect and why",
  q1: "Who answers for privacy in your business",
  q2: "A written plan for how you meet POPIA",
};

const HANDOFF_KEY = "popiadesk-hero-answers";
const SAVED_KEY = "popiadesk.assessment.v2";

const store = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* Private mode and blocked storage are fine: the page works, it forgets. */
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* blocked storage holds nothing to remove */
    }
  },
};

/* "General" is the config's word for the one question no section of the Act
   asks; every other question names its section. */
const citation = (reference) =>
  reference === "General"
    ? "Good practice rather than a section of POPIA."
    : `POPIA ${reference}.`;

const sectionLabel = (question) =>
  assessmentSections.find((s) => s.id === question.section)?.label ?? "";

// --- The reader's motion preference --------------------------------------

/* The operating system decides. The stream surface's toggle went with its
   particle field, which the light site does not have (PJ, 2026-10-16), so
   what is left to move is the page's own: entrances, and the score ticking. */
const motionOn = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
root.dataset.motion = motionOn ? "on" : "off";

// --- Entrances -----------------------------------------------------------

/* The markup carries the finished state, so this hides an element only once it
   has an observer that can bring it back. Anything already on screen is simply
   there: an entrance for content the reader is already looking at is not an
   entrance. */
function startReveals() {
  const items = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!items.length) return;
  if (!motionOn) {
    for (const item of items) item.dataset.reveal = "in";
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.dataset.reveal = "in";
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
  );
  for (const item of items) {
    const box = item.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) {
      item.dataset.reveal = "in";
      continue;
    }
    item.dataset.reveal = "out";
    observer.observe(item);
  }
}

// --- The counted score ---------------------------------------------------

function countTo(element, from, to, onFrame) {
  if (!motionOn) {
    onFrame(to);
    return;
  }
  const started = performance.now();
  const tick = (now) => {
    const t = Math.min((now - started) / COUNT_DURATION_MS, 1);
    onFrame(countedValue(from, to, t));
    if (t < 1) window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}

// --- The assessment ------------------------------------------------------

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function startAssessment(card) {
  const full = card.hasAttribute("data-full-assessment");
  const ids = full ? assessmentQuestions.map((q) => q.id) : HERO_QUESTION_IDS;

  const scoreBlock = document.querySelector("[data-score]");
  const numberEl = scoreBlock.querySelector("[data-score-number]");
  const remainingEl = scoreBlock.querySelector("[data-score-remaining]");
  const announceEl = scoreBlock.querySelector("[data-score-announce]");
  const ceilingEl = scoreBlock.querySelector("[data-ceiling]");
  const carriedEl = scoreBlock.querySelector("[data-carried]");
  const marksEl = document.querySelector("[data-marks]");

  let answers = {};
  let carried = 0;
  let justAnswered = null;
  let shown = 0;

  // Answers given on the front page travel here through the product's own
  // handoff, so "Continue the assessment" continues rather than restarting.
  if (full) {
    try {
      const fromHome = parseHeroAnswers(sessionStorage.getItem(HANDOFF_KEY));
      sessionStorage.removeItem(HANDOFF_KEY);
      Object.assign(answers, fromHome);
      carried = Object.keys(fromHome).length;
    } catch {
      /* no handoff available */
    }
    const saved = store.get(SAVED_KEY);
    if (saved && Object.keys(answers).length === 0) {
      Object.assign(answers, parseHeroAnswers(saved));
    }
  }

  const nextUnanswered = () => ids.findIndex((id) => answers[id] === undefined);

  function persist() {
    if (full) {
      const payload = serialiseHeroAnswers(answers);
      // Nothing answered (after "Start over") removes the saved copy: the
      // privacy notice tells the reader that "Start over" clears it.
      if (payload) store.set(SAVED_KEY, payload);
      else store.remove(SAVED_KEY);
    } else {
      try {
        const payload = serialiseHeroAnswers(sanitiseHeroAnswers(answers));
        if (payload) sessionStorage.setItem(HANDOFF_KEY, payload);
        else sessionStorage.removeItem(HANDOFF_KEY);
      } catch {
        /* the hero still works, the handoff does not */
      }
    }
  }

  function row(id) {
    const question = questionById(id);
    const value = answers[id];
    const item = el("li");
    const left = el("span");
    left.append(el("span", "subject", subjectLabel(id)));
    const mark = el("span", "earned");
    if (value === undefined) {
      item.classList.add("unanswered");
      if (!full && LEDGER_GLOSS[id]) left.append(el("span", "answer", LEDGER_GLOSS[id]));
      mark.dataset.open = "true";
      mark.textContent = `up to ${trimMark(maxOf(question))}`;
    } else {
      if (id === justAnswered) item.classList.add("ink");
      left.append(el("span", "answer", answerLabel(question, value)));
      const earned = earnedOf(question, value);
      if (earned === 0) mark.dataset.zero = "true";
      mark.textContent = `${trimMark(earned)} / ${trimMark(maxOf(question))}`;
    }
    item.append(left, mark);
    return item;
  }

  function renderScore() {
    const score = calculateAssessmentScore(answers);
    const answered = Object.keys(answers).length;
    const previous = Number(numberEl.textContent) || 0;
    if (motionOn && score !== previous) {
      numberEl.classList.remove("tick");
      void numberEl.offsetWidth;
      numberEl.classList.add("tick");
    }
    countTo(numberEl, previous, score, (value) => {
      numberEl.textContent = String(value);
    });
    const left = TOTAL - answered;
    remainingEl.textContent = full
      ? left === 0
        ? "all answered"
        : `${left} to answer`
      : `${left} question${left === 1 ? "" : "s"} to go`;
    announceEl.textContent = `Your POPIA readiness score is ${score} out of 100, from ${answered} of ${TOTAL} questions.`;

    const ceiling = ceilingOf(answers);
    if (answered > 0 && answered < TOTAL && Math.round(ceiling) < 100) {
      ceilingEl.hidden = false;
      ceilingEl.textContent = `Best possible total now ${Math.round(ceiling)} of 100.`;
    } else {
      ceilingEl.hidden = true;
    }
    if (carriedEl) {
      carriedEl.hidden = carried === 0;
      carriedEl.textContent = `${carried} answer${carried === 1 ? "" : "s"} came with you from the front page, already marked.`;
    }

    // On /assess the open question is the row the reader has reached, so the
    // card moves into the list; once all are answered it closes the column,
    // after the marking note.
    const current = full ? ids[nextUnanswered()] : undefined;
    marksEl.replaceChildren();
    for (const id of ids) {
      if (id === current) {
        const item = el("li", "current");
        item.append(card);
        marksEl.append(item);
      } else {
        marksEl.append(row(id));
      }
    }
    if (full && current === undefined) marksEl.parentElement.append(card);
  }

  function renderQuestion(moveFocus) {
    const index = nextUnanswered();
    if (index === -1) {
      renderFinished();
      return;
    }
    const question = questionById(ids[index]);
    // Numbered by the reader's progress, as the app is: answers carried from
    // the front page must not leave "Question 3 of 25" beside three marked.
    const step = Object.keys(answers).length + 1;

    const fieldset = el("fieldset");
    fieldset.dataset.question = question.id;
    const legend = el("legend", "contents");
    legend.append(el("span", "question-step", `Question ${step} of ${TOTAL}`));
    // The area is named, not numbered: "area 1 of 8" left the reader to guess
    // what an area was.
    if (full)
      legend.append(el("span", "question-ref", `Area: ${sectionLabel(question)}`));
    legend.append(el("span", "question-text", question.text));
    fieldset.append(legend);

    // The front page cites the Act above the answers, as the app's hero does;
    // /assess cites it below them with the marks, where whoever wants to check
    // the working will look, and keeps the words before the answers short.
    if (!full)
      fieldset.append(el("p", "question-ref", `POPIA ${question.popiaReference}`));
    if (full || HERO_HELP.has(question.id)) {
      fieldset.append(el("p", "question-help", question.helpText));
    }

    const options = el("ul", "options");
    let firstButton = null;
    for (const option of question.options) {
      const li = el("li");
      const button = el("button", "option", option.label);
      button.type = "button";
      button.addEventListener("click", () => {
        answers[question.id] = option.value;
        justAnswered = question.id;
        shown += 1;
        persist();
        renderScore();
        renderQuestion(true);
      });
      if (!firstButton) firstButton = button;
      li.append(button);
      options.append(li);
    }
    fieldset.append(options);

    if (full) {
      const ref = el(
        "p",
        "question-help",
        `${question.detail ?? citation(question.popiaReference)} `,
      );
      ref.append(el("strong", "", `Worth ${trimMark(maxOf(question))} marks.`));
      fieldset.append(ref);
    }

    // Going back is one tap, because answering is one tap with no confirm step
    // and the cost of that is a mis-tap. The answer is dropped rather than
    // kept: the marks have to leave with it or the number and the answers stop
    // agreeing.
    const previousId = ids
      .slice(0, index)
      .reverse()
      .find((id) => answers[id] !== undefined);
    if (previousId) {
      const back = el(
        "button",
        "step-back",
        `Change the answer to ${subjectLabel(previousId).toLowerCase()}`,
      );
      back.type = "button";
      back.addEventListener("click", () => {
        delete answers[previousId];
        justAnswered = null;
        persist();
        renderScore();
        renderQuestion(true);
      });
      fieldset.append(back);
    }

    card.replaceChildren(fieldset);
    // The control the reader was using has just been replaced, so focus moves
    // to its successor. Without this a keyboard user starts again from the top
    // of the page on every question.
    if (moveFocus && firstButton) firstButton.focus({ preventScroll: true });
  }

  function renderFinished() {
    const score = calculateAssessmentScore(answers);
    const wrap = el("div", "after-questions");
    let lead;

    if (full) {
      lead = el("h2", "", "That is all twenty-five.");
      wrap.append(lead);
      const zeros = zeroDutiesSentence(answers);
      if (zeros) {
        const p = el("p", "score-ceiling", zeros);
        wrap.append(p);
      }
      wrap.append(el("p", "", riskSentenceFor(getRiskLevel(score), answers)));
      wrap.append(
        el(
          "p",
          "",
          `Your score is ${score} out of 100, and it is yours: nothing was sent anywhere.`,
        ),
      );
    } else {
      lead = el(
        "p",
        "",
        `Three answered, ${TOTAL - Object.keys(answers).length} to go. Your answers carry over.`,
      );
      wrap.append(lead);
    }

    const actions = el("div", "actions");
    if (!full) {
      const go = el("a", "btn btn-primary", "Continue the assessment");
      go.href = "/assess";
      actions.append(go);
    }
    const notify = el(
      "a",
      full ? "btn btn-primary" : "btn btn-secondary",
      "Email us to hear when it opens",
    );
    notify.href =
      "mailto:hello@popiadesk.co.za?subject=Tell%20me%20when%20POPIAdesk%20opens";
    actions.append(notify);
    wrap.append(actions);

    const restart = el("button", "step-back", "Start over");
    restart.type = "button";
    restart.addEventListener("click", () => {
      answers = {};
      carried = 0;
      justAnswered = null;
      persist();
      renderScore();
      renderQuestion(true);
    });
    wrap.append(restart);

    if (full) {
      const recommendations = generateRecommendations(answers).slice(0, 5);
      if (recommendations.length > 0) {
        wrap.append(el("h2", "", "What to do first."));
        const list = el("ol", "marks");
        // Each step is named by its subject, because the advice is written to
        // sit under its own question ("Work through what your check found").
        for (const rec of recommendations) {
          const item = el("li");
          const step = el("span");
          step.append(el("span", "subject", subjectLabel(rec.questionId)));
          step.append(el("span", "answer", rec.text));
          item.append(step);
          list.append(item);
        }
        wrap.append(list);
      }
    }

    card.replaceChildren(wrap);
    if (shown > 0) {
      lead.setAttribute("tabindex", "-1");
      lead.focus({ preventScroll: true });
    }
  }

  renderScore();
  renderQuestion(false);
}

// --- Start ---------------------------------------------------------------

startReveals();

const card = document.querySelector("[data-question-card]");
if (card) startAssessment(card);
