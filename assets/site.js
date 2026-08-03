/* Interim-site interactions: the readiness teaser and the conditions
   explorer. No dependencies, no network calls.

   The eight questions map one-to-one onto the eight assessment categories in
   src/lib/assessments/assessment-shared.ts, and the bands use that file's
   exact thresholds, so a visitor who scores here and again in the product
   after launch is not told two different things. */

(function () {
  "use strict";

  var STORE_KEY = "popiadesk.teaser.v1";

  var QUESTIONS = [
    {
      area: "Governance and accountability",
      text: "Is your Information Officer registered with the Information Regulator?",
    },
    {
      area: "Lawful processing",
      text: "Could you name the lawful basis for each way you use personal information: consent, contract, legal obligation, or legitimate interest?",
    },
    {
      area: "Transparency and data subject rights",
      text: "If someone asked what personal information you hold about them, could you answer inside 30 days?",
    },
    {
      area: "Security and retention",
      text: "Do you know how long you keep each kind of personal information, and what protects it?",
    },
    {
      area: "Third parties and cross-border",
      text: "Has every operator that processes personal information for you signed a written agreement?",
    },
    {
      area: "Consent and marketing",
      text: "Where you market directly, do you hold proof of consent on the current prescribed form?",
    },
    {
      area: "Special personal information",
      text: "Do you know whether you hold special personal information, such as health, biometric, or children's data?",
    },
    {
      area: "Documentation and records",
      text: "Does your business have a current PAIA manual?",
    },
  ];

  var ANSWERS = [
    { label: "Yes", value: 2 },
    { label: "Partly", value: 1 },
    { label: "No", value: 0 },
  ];

  var BANDS = [
    {
      min: 76,
      key: "low",
      label: "Low risk",
      heading: "Ahead of most businesses we see.",
      body: "The groundwork is there. What usually remains at this level is evidence: the records that prove each control was actually in place on the day it mattered.",
    },
    {
      min: 51,
      key: "medium",
      label: "Medium risk",
      heading: "A real base, with gaps you can name.",
      body: "This is the most common result for a business that has started deliberately. Each gap above has a specific document or process behind it, which is the part POPIAdesk does for you.",
    },
    {
      min: 26,
      key: "high",
      label: "High risk",
      heading: "Most businesses start here.",
      body: "Nothing on this list needs a law degree. Worked top to bottom, the whole set is a few afternoons rather than a project.",
    },
    {
      min: 0,
      key: "critical",
      label: "Critical risk",
      heading: "The Act applies to you regardless.",
      body: "There is no small-business exemption in POPIA, so the useful move is to start rather than to audit. Register your Information Officer and publish a privacy policy first; most of the rest hangs off those two.",
    },
  ];

  var CONDITIONS = [
    {
      name: "Accountability",
      detail: "The responsible party must ensure compliance with all conditions.",
    },
    {
      name: "Processing limitation",
      detail: "Information must be processed lawfully and in a reasonable manner.",
    },
    {
      name: "Purpose specification",
      detail:
        "Information must be collected for a specific, explicitly defined, and lawful purpose.",
    },
    {
      name: "Further processing limitation",
      detail:
        "Information must not be processed in a way incompatible with the original purpose.",
    },
    {
      name: "Information quality",
      detail:
        "Steps must be taken to ensure information is complete, accurate, and up to date.",
    },
    {
      name: "Openness",
      detail:
        "Data subjects must be made aware of the collection and processing of their information.",
    },
    {
      name: "Security safeguards",
      detail:
        "Appropriate security measures must be in place to protect personal information.",
    },
    {
      name: "Data subject participation",
      detail:
        "Data subjects have the right to access, correct, and delete their information.",
    },
  ];

  var RING_CIRCUMFERENCE = 2 * Math.PI * 64;

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return { answers: [], conditions: [] };
      var parsed = JSON.parse(raw);
      return {
        answers: Array.isArray(parsed.answers) ? parsed.answers.slice(0, 8) : [],
        conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
      };
    } catch (err) {
      return { answers: [], conditions: [] };
    }
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (err) {
      /* Private browsing and blocked storage are fine; the page still works,
         it just forgets between visits. */
    }
  }

  var state = loadState();

  function bandFor(score) {
    for (var i = 0; i < BANDS.length; i++) {
      if (score >= BANDS[i].min) return BANDS[i];
    }
    return BANDS[BANDS.length - 1];
  }

  function scoreFor(answers) {
    var sum = 0;
    for (var i = 0; i < answers.length; i++) sum += answers[i];
    return Math.round((sum / (QUESTIONS.length * 2)) * 100);
  }

  // --- Readiness teaser ---

  function initQuiz(root) {
    var meterFill = root.querySelector("[data-meter]");
    var stepCount = root.querySelector("[data-step-count]");
    var areaEl = root.querySelector("[data-area]");
    var questionEl = root.querySelector("[data-question]");
    var answersEl = root.querySelector("[data-answers]");
    var backBtn = root.querySelector("[data-back]");
    var quizView = root.querySelector("[data-quiz-view]");
    var resultView = root.querySelector("[data-result-view]");
    var ringValue = root.querySelector("[data-ring-value]");
    var ringNumber = root.querySelector("[data-ring-number]");
    var bandEl = root.querySelector("[data-band]");
    var headingEl = root.querySelector("[data-result-heading]");
    var bodyEl = root.querySelector("[data-result-body]");
    var summaryEl = root.querySelector("[data-result-summary]");
    var copyBtn = root.querySelector("[data-copy]");
    var restartBtn = root.querySelector("[data-restart]");

    ringValue.setAttribute("stroke-dasharray", String(RING_CIRCUMFERENCE));
    ringValue.setAttribute("stroke-dashoffset", String(RING_CIRCUMFERENCE));

    ANSWERS.forEach(function (answer) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn" + (answer.value === 2 ? " btn-brand" : "");
      btn.textContent = answer.label;
      btn.addEventListener("click", function () {
        state.answers = state.answers.slice(0, currentIndex());
        state.answers.push(answer.value);
        saveState(state);
        render(true);
      });
      answersEl.appendChild(btn);
    });

    backBtn.addEventListener("click", function () {
      state.answers.pop();
      saveState(state);
      render(true);
    });

    restartBtn.addEventListener("click", function () {
      state.answers = [];
      saveState(state);
      render(true);
    });

    copyBtn.addEventListener("click", function () {
      var score = scoreFor(state.answers);
      var text =
        "POPIA readiness check: " +
        score +
        "/100 (" +
        bandFor(score).label.toLowerCase() +
        "). popiadesk.co.za";
      var done = function () {
        copyBtn.textContent = "Copied";
        window.setTimeout(function () {
          copyBtn.textContent = "Copy your result";
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {
          fallbackCopy(text, done);
        });
      } else {
        fallbackCopy(text, done);
      }
    });

    function currentIndex() {
      return Math.min(state.answers.length, QUESTIONS.length);
    }

    function animateNumber(target) {
      if (reduceMotion) {
        ringNumber.textContent = String(target);
        return;
      }
      var start = performance.now();
      var duration = 900;
      function tick(now) {
        var t = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        ringNumber.textContent = String(Math.round(target * eased));
        if (t < 1) window.requestAnimationFrame(tick);
      }
      window.requestAnimationFrame(tick);
    }

    function render(moveFocus) {
      var index = currentIndex();
      var complete = index >= QUESTIONS.length;

      meterFill.style.width = (index / QUESTIONS.length) * 100 + "%";
      quizView.hidden = complete;
      resultView.hidden = !complete;
      backBtn.hidden = index === 0;

      if (!complete) {
        var q = QUESTIONS[index];
        stepCount.textContent = "Question " + (index + 1) + " of " + QUESTIONS.length;
        areaEl.textContent = q.area;
        questionEl.textContent = q.text;
        if (moveFocus) questionEl.focus();
        return;
      }

      var score = scoreFor(state.answers);
      var band = bandFor(score);
      var offset = RING_CIRCUMFERENCE * (1 - score / 100);

      bandEl.textContent = band.label;
      bandEl.className = "band band-" + band.key;
      headingEl.textContent = band.heading;
      bodyEl.textContent = band.body;
      summaryEl.textContent =
        "Provisional readiness score: " + score + " out of 100. " + band.label + ".";

      if (reduceMotion) {
        ringValue.style.transition = "none";
        ringValue.setAttribute("stroke-dashoffset", String(offset));
      } else {
        ringValue.setAttribute("stroke-dashoffset", String(RING_CIRCUMFERENCE));
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            ringValue.setAttribute("stroke-dashoffset", String(offset));
          });
        });
      }
      animateNumber(score);
      if (moveFocus) headingEl.focus();
    }

    render(false);
  }

  function fallbackCopy(text, done) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      done();
    } catch (err) {
      /* Nothing sensible left to try; leave the button label alone. */
    }
    document.body.removeChild(area);
  }

  // --- Conditions explorer ---

  function initConditions(root) {
    var grid = root.querySelector("[data-conditions]");
    var tally = root.querySelector("[data-tally]");
    var seen = {};
    state.conditions.forEach(function (i) {
      seen[i] = true;
    });

    CONDITIONS.forEach(function (condition, i) {
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.setAttribute("aria-pressed", seen[i] ? "true" : "false");

      var num = document.createElement("span");
      num.className = "num";
      num.textContent = String(i + 1);

      var name = document.createElement("span");
      name.className = "name";
      name.textContent = condition.name;

      var detail = document.createElement("span");
      detail.className = "detail";
      detail.textContent = condition.detail;
      detail.hidden = !seen[i];

      tile.appendChild(num);
      tile.appendChild(name);
      tile.appendChild(detail);

      tile.addEventListener("click", function () {
        var open = tile.getAttribute("aria-pressed") === "true";
        tile.setAttribute("aria-pressed", open ? "false" : "true");
        detail.hidden = open;
        if (!open && state.conditions.indexOf(i) === -1) {
          state.conditions.push(i);
          saveState(state);
        }
        updateTally();
      });

      grid.appendChild(tile);
    });

    function updateTally() {
      var count = state.conditions.length;
      if (count >= CONDITIONS.length) {
        tally.innerHTML =
          "<strong>All eight.</strong> That is more than most businesses subject to the Act can name.";
        return;
      }
      tally.innerHTML =
        "Opened <strong>" + count + " of " + CONDITIONS.length + "</strong>.";
    }

    updateTally();
  }

  var quizRoot = document.querySelector("[data-teaser]");
  if (quizRoot) initQuiz(quizRoot);

  var conditionsRoot = document.querySelector("[data-explorer]");
  if (conditionsRoot) initConditions(conditionsRoot);
})();
