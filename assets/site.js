/* The interim site's behaviour.
 *
 * The rule this file obeys: no arithmetic here that the product already owns.
 * The score, the risk bands, the questions, the particle physics, the mark's
 * geometry and the counting curve are all imported from modules emitted out of
 * src/ by tools/build.mjs. What is left is the DOM, which is genuinely this
 * site's own: a static page has no React to hand.
 *
 * Everything degrades. The markup ships finished, so with JavaScript off the
 * reader gets the page, the first question (unanswerable, and the page says
 * so), the eight conditions with their text, and every link. With motion off
 * the field paints one still frame and nothing loops.
 */

import {
  assessmentQuestions,
  calculateAssessmentScore,
} from "./core/lib__assessments__assessment-shared.js";
import {
  answerLabel,
  ceilingOf,
  earnedOf,
  maxOf,
  questionById,
  trimMark,
} from "./core/lib__assessments__sheet-scoring-core.js";
import { subjectLabel } from "./core/lib__assessments__subject-labels.js";
import {
  parseHeroAnswers,
  sanitiseHeroAnswers,
  serialiseHeroAnswers,
} from "./core/lib__assessments__hero-handoff-core.js";
import { countedValue, COUNT_DURATION_MS } from "./core/lib__motion__count-core.js";
import {
  arrivalWeights,
  RESTING_WEIGHTS,
  smoothScroll,
} from "./core/lib__motion__stream-core.js";
import {
  createRandom,
  fieldStroke,
  particleCount,
  sampleMarkPoints,
  seedParticles,
  stepField,
  POINTER_AWAY,
} from "./core/lib__motion__particles-core.js";
import { MARK_PATHS, MARK_VIEWBOX } from "./core/components__stream__mark.js";

const root = document.documentElement;
const TOTAL = assessmentQuestions.length;

/* The three the front page asks, in the order recorded on 2026-08-31: the
   privacy policy first, because it is the most widely understood of the
   twenty-five and the most likely early yes. */
const HERO_QUESTION_IDS = ["q11", "q1", "q2"];

/* Help only where the term is not common knowledge, which is the same pair the
   product's own hero glosses. Every word here is read before the reader can
   act, and the budget before the primary action is sixty: q11 asks about a
   privacy policy, which this audience already understands. */
const HERO_HELP = new Set(["q1", "q2"]);
const HANDOFF_KEY = "popiadesk-hero-answers";
const SAVED_KEY = "popiadesk.assessment.v2";
const MOTION_KEY = "popiadesk-stream-motion";

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
};

// --- The reader's motion preference --------------------------------------

/* The operating system decides by default, which the prototype this design
   came from never did. The toggle overrides it in both directions, because
   someone who turns this page's motion on despite their OS setting has said
   something specific about this page. */
const systemReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const storedChoice = store.get(MOTION_KEY);
let motionOn =
  storedChoice === "on" ? true : storedChoice === "off" ? false : !systemReduced;
let choiceMade = storedChoice !== null;

const motionListeners = new Set();

function applyMotion() {
  root.dataset.motion = motionOn ? "on" : "off";
  for (const fn of motionListeners) fn(motionOn);
  const toggle = document.querySelector("[data-motion-toggle]");
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(motionOn));
    toggle.lastChild.textContent = ` Motion ${motionOn ? "on" : "off"}`;
  }
  const offer = document.querySelector("[data-motion-offer]");
  if (offer) offer.hidden = !(systemReduced && !motionOn && !choiceMade);
}

function setMotion(next) {
  motionOn = next;
  choiceMade = true;
  store.set(MOTION_KEY, next ? "on" : "off");
  applyMotion();
}

document
  .querySelector("[data-motion-toggle]")
  ?.addEventListener("click", () => setMotion(!motionOn));
document
  .querySelector("[data-motion-show]")
  ?.addEventListener("click", () => setMotion(true));

// --- The stream ----------------------------------------------------------

/* The surface's one always-on element, and the page's single orchestrated
   moment: the field gathers into the mark, holds it long enough to be read,
   and releases into the stream. It is decoration, it is aria-hidden, and it
   says nothing that is not also said in text.

   It sits behind the page. Painting it in front is what once made the mark
   read as noise over the headline. */
function startField(canvas) {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  let particles = [];
  let segments = new Float32Array(0);
  let markPoints = [];
  let width = 0;
  let height = 0;
  let pointer = POINTER_AWAY;
  let frame = null;
  let startedAt = null;
  let scroll = { position: window.scrollY, velocity: 0 };
  let time = 0;

  function measure() {
    // clientWidth, not innerWidth: the latter includes a classic scrollbar and
    // the fixed box the canvas fills does not.
    width = document.documentElement.clientWidth;
    height = document.documentElement.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    // A fresh seeded generator every build, so the field is the same picture on
    // every load and in every screenshot taken for a visual audit.
    const random = createRandom(11);
    const count = particleCount(width, {
      deviceMemory: navigator.deviceMemory,
      cores: navigator.hardwareConcurrency,
    });
    particles = seedParticles(count, width, height, random);
    segments = new Float32Array(count * 4);
  }

  function sampleMark() {
    const off = document.createElement("canvas");
    off.width = 330;
    off.height = 180;
    const offContext = off.getContext("2d", { willReadFrequently: true });
    if (!offContext) return;
    markPoints = sampleMarkPoints(
      offContext,
      createRandom(29),
      MARK_PATHS,
      MARK_VIEWBOX,
      330,
      180,
    );
  }

  function paint(weights) {
    context.clearRect(0, 0, width, height);
    context.strokeStyle = fieldStroke(weights);
    // A held shape needs a heavier line than a flow does, or the mark reads as
    // a haze; the stream keeps the fine line it has always had.
    context.lineWidth = 1.1 + weights.shield * 0.8;
    context.beginPath();
    for (let i = 0; i < segments.length; i += 4) {
      context.moveTo(segments[i], segments[i + 1]);
      context.lineTo(segments[i + 2], segments[i + 3]);
    }
    context.stroke();
  }

  function advance(weights) {
    stepField({
      particles,
      weights,
      shieldPoints: markPoints,
      viewportWidth: width,
      viewportHeight: height,
      time,
      pointer,
      convergeY: null,
      out: segments,
    });
  }

  /* The reduced-motion page is drawn, not switched off. Returning nothing left
     an empty half where the mark belongs, which is the half-built state the
     standard forbids. The same solver runs to convergence off-screen instead
     of over time. */
  function paintStill() {
    measure();
    const held = { shield: 1, stream: 0, chaos: 0, calm: 0, converge: 0 };
    for (let i = 0; i < 60; i++) {
      time = i * 0.016;
      advance(held);
    }
    // Positioned by the held weight, coloured by the resting one: a converged
    // constellation overlaps itself far more than a dispersed field does, and
    // at the shield's own alpha it lifts the ground under the headline.
    context.clearRect(0, 0, width, height);
    context.strokeStyle = fieldStroke(RESTING_WEIGHTS);
    context.lineWidth = 1.5;
    context.beginPath();
    for (let i = 0; i < segments.length; i += 4) {
      context.moveTo(segments[i], segments[i + 1]);
      context.lineTo(segments[i + 2], segments[i + 3]);
    }
    context.stroke();
  }

  function loop() {
    scroll = smoothScroll(scroll, window.scrollY);
    // The field runs faster while the reader moves, so the page feels like it
    // answers them rather than playing to itself.
    time += 0.008 + Math.min(0.02, Math.abs(scroll.velocity) * 0.0004);
    if (startedAt === null) startedAt = performance.now();
    const elapsed = (performance.now() - startedAt) / 1000;
    const weights = arrivalWeights(elapsed) ?? RESTING_WEIGHTS;
    advance(weights);
    paint(weights);
    frame = window.requestAnimationFrame(loop);
  }

  function stop() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
  }

  function start() {
    if (frame !== null) return;
    startedAt = null;
    frame = window.requestAnimationFrame(loop);
  }

  sampleMark();

  const onResize = () => {
    if (motionOn) {
      measure();
    } else {
      paintStill();
    }
  };
  window.addEventListener("resize", onResize);
  window.addEventListener(
    "pointermove",
    (event) => {
      pointer = { x: event.clientX, y: event.clientY };
    },
    { passive: true },
  );
  for (const event of ["pointerleave", "pointercancel"]) {
    window.addEventListener(event, () => {
      pointer = POINTER_AWAY;
    });
  }
  // A background tab costs nothing.
  document.addEventListener("visibilitychange", () => {
    if (!motionOn) return;
    if (document.hidden) stop();
    else start();
  });

  const respond = (on) => {
    stop();
    if (on) {
      measure();
      start();
    } else {
      paintStill();
    }
  };

  motionListeners.add(respond);
  // Run it once for the state the page is already in. The preference is applied
  // before this module reaches the canvas, so waiting for the next change would
  // leave the field unpainted for the whole visit: measured, zero lit pixels.
  respond(motionOn);
}

// --- Entrances -----------------------------------------------------------

/* The markup carries the finished state, so this hides an element only once it
   has an observer that can bring it back. Anything already on screen is simply
   there: an entrance for content the reader is already looking at is not an
   entrance. */
function startReveals() {
  const items = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!items.length) return;

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

  const arm = (on) => {
    for (const item of items) {
      if (!on) {
        item.dataset.reveal = "in";
        continue;
      }
      // The hero's own entrance is a keyframe on data-enter, not this.
      if (item.dataset.enter === "load") continue;
      const box = item.getBoundingClientRect();
      if (box.top < window.innerHeight && box.bottom > 0) {
        item.dataset.reveal = "in";
        continue;
      }
      item.dataset.reveal = "out";
      observer.observe(item);
    }
  };

  arm(motionOn);
  motionListeners.add(arm);
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

function startAssessment(card) {
  const full = card.hasAttribute("data-full-assessment");
  const ids = full ? assessmentQuestions.map((q) => q.id) : HERO_QUESTION_IDS;

  const scoreBlock = document.querySelector("[data-score]");
  const numberEl = scoreBlock.querySelector("[data-score-number]");
  const remainingEl = scoreBlock.querySelector("[data-score-remaining]");
  const announceEl = scoreBlock.querySelector("[data-score-announce]");
  const ceilingEl = scoreBlock.querySelector("[data-ceiling]");
  const marksEl = scoreBlock.querySelector("[data-marks]");

  let answers = {};
  let shown = 0;

  // Answers given on the front page travel here through the product's own
  // handoff, so "Continue the assessment" continues rather than restarting.
  if (full) {
    try {
      const carried = parseHeroAnswers(sessionStorage.getItem(HANDOFF_KEY));
      sessionStorage.removeItem(HANDOFF_KEY);
      Object.assign(answers, carried);
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
      if (payload) store.set(SAVED_KEY, payload);
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

  function renderScore() {
    const score = calculateAssessmentScore(answers);
    const answered = Object.keys(answers).length;
    const previous = Number(numberEl.textContent) || 0;
    countTo(numberEl, previous, score, (value) => {
      numberEl.textContent = String(value);
    });
    remainingEl.textContent = `${TOTAL - answered} question${TOTAL - answered === 1 ? "" : "s"} to go`;
    announceEl.textContent = `Your POPIA readiness score is ${score} out of 100, from ${answered} of ${TOTAL} questions.`;

    const ceiling = ceilingOf(answers);
    if (answered > 0 && ceiling < 99.95) {
      ceilingEl.hidden = false;
      ceilingEl.textContent = `Best possible total now ${trimMark(ceiling)} of 100.`;
    } else {
      ceilingEl.hidden = true;
    }

    marksEl.replaceChildren();
    for (const id of ids) {
      if (answers[id] === undefined) continue;
      const question = questionById(id);
      const earned = earnedOf(question, answers[id]);
      const item = document.createElement("li");
      const left = document.createElement("span");
      const subject = document.createElement("span");
      subject.className = "subject";
      subject.textContent = subjectLabel(id);
      const answer = document.createElement("span");
      answer.className = "answer";
      answer.textContent = answerLabel(question, answers[id]);
      left.append(subject, answer);
      const mark = document.createElement("span");
      mark.className = "earned";
      if (earned === 0) mark.dataset.zero = "true";
      mark.textContent = `${trimMark(earned)} / ${trimMark(maxOf(question))}`;
      item.append(left, mark);
      marksEl.append(item);
    }
  }

  function renderQuestion(moveFocus) {
    const index = nextUnanswered();
    if (index === -1) {
      renderFinished();
      return;
    }
    const question = questionById(ids[index]);
    const step = full
      ? assessmentQuestions.findIndex((q) => q.id === question.id) + 1
      : index + 1;

    const fieldset = document.createElement("fieldset");
    fieldset.dataset.question = question.id;

    const legend = document.createElement("legend");
    legend.className = "contents";
    const stepEl = document.createElement("span");
    stepEl.className = "question-step";
    stepEl.textContent = `Question ${step} of ${TOTAL}`;
    const textEl = document.createElement("span");
    textEl.className = "question-text";
    textEl.textContent = question.text;
    legend.append(stepEl, textEl);

    const showHelp = full || HERO_HELP.has(question.id);
    const help = document.createElement("p");
    help.className = "question-help";
    help.textContent = question.helpText;

    const options = document.createElement("ul");
    options.className = "options";
    let firstButton = null;
    for (const option of question.options) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      button.textContent = option.label;
      button.addEventListener("click", () => {
        answers[question.id] = option.value;
        shown += 1;
        persist();
        renderScore();
        renderQuestion(true);
      });
      if (!firstButton) firstButton = button;
      li.append(button);
      options.append(li);
    }

    fieldset.append(legend);
    if (showHelp) fieldset.append(help);
    fieldset.append(options);

    // Going back is one tap, because answering is one tap with no confirm step
    // and the cost of that is a mis-tap. The answer is dropped rather than
    // kept: the marks have to leave with it or the number and the answers stop
    // agreeing.
    if (Object.keys(answers).length > 0) {
      const back = document.createElement("button");
      back.type = "button";
      back.className = "step-back";
      const previousId = ids
        .slice(0, index)
        .reverse()
        .find((id) => answers[id] !== undefined);
      if (previousId) {
        back.textContent = `Change the answer to ${subjectLabel(previousId).toLowerCase()}`;
        back.addEventListener("click", () => {
          delete answers[previousId];
          persist();
          renderScore();
          renderQuestion(true);
        });
        fieldset.append(back);
      }
    }

    card.replaceChildren(fieldset);
    // The control the reader was using has just been replaced, so focus moves
    // to its successor. Without this a keyboard user starts again from the top
    // of the page on every question.
    if (moveFocus && firstButton) firstButton.focus({ preventScroll: true });
  }

  function renderFinished() {
    const score = calculateAssessmentScore(answers);
    const wrap = document.createElement("div");
    wrap.className = "after-questions";

    const line = document.createElement("p");
    if (full) {
      line.textContent = `That is all ${TOTAL}. Your score is ${score} out of 100, and it is yours: nothing was sent anywhere.`;
    } else {
      line.textContent = `Three answered, ${TOTAL - Object.keys(answers).length} to go. Your answers carry over.`;
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    if (!full) {
      const go = document.createElement("a");
      go.className = "btn btn-primary";
      go.href = "/assess";
      go.textContent = "Continue the assessment";
      actions.append(go);
    }

    const notify = document.createElement("a");
    notify.className = full ? "btn btn-primary" : "btn btn-secondary";
    notify.href =
      "mailto:hello@popiadesk.co.za?subject=Tell%20me%20when%20POPIAdesk%20opens";
    notify.textContent = "Get a note when it opens";
    actions.append(notify);

    const restart = document.createElement("button");
    restart.type = "button";
    restart.className = "step-back";
    restart.textContent = "Start over";
    restart.addEventListener("click", () => {
      answers = {};
      persist();
      renderScore();
      renderQuestion(true);
    });

    wrap.append(line, actions, restart);
    card.replaceChildren(wrap);
    if (shown > 0)
      (line.setAttribute("tabindex", "-1"), line.focus({ preventScroll: true }));
  }

  renderScore();
  renderQuestion(false);
}

// --- The conditions tally ------------------------------------------------

function startConditions(list) {
  const tally = document.querySelector("[data-tally]");
  if (!tally) return;
  const opened = new Set();
  const items = list.querySelectorAll("details");

  const update = () => {
    if (opened.size >= items.length) {
      tally.innerHTML =
        "<strong>All eight.</strong> That is more than most businesses subject to the Act can name.";
      return;
    }
    tally.textContent = `Opened ${opened.size} of ${items.length}.`;
  };

  items.forEach((details, index) => {
    details.addEventListener("toggle", () => {
      if (details.open) opened.add(index);
      update();
    });
  });

  update();
}

// --- Start ---------------------------------------------------------------

applyMotion();

const canvas = document.getElementById("field");
if (canvas) startField(canvas);

startReveals();

const card = document.querySelector("[data-question-card]");
if (card) startAssessment(card);

const conditions = document.querySelector("[data-conditions]");
if (conditions) startConditions(conditions);
