document.addEventListener("DOMContentLoaded", () => {
    const startScreen = document.getElementById("startScreen");
    const quizScreen = document.getElementById("quizScreen");
    const feedbackScreen = document.getElementById("feedbackScreen");
    const endScreen = document.getElementById("endScreen");

    const basicBtn = document.getElementById("basicBtn");
    const intermediaryBtn = document.getElementById("intermediaryBtn");
    const advanceBtn = document.getElementById("advanceBtn");

    const questionText = document.getElementById("questionText");
    const optionsContainer = document.getElementById("optionsContainer");

    const prevBtn = document.getElementById("prevBtn");
    const submitBtn = document.getElementById("submitBtn");
    const nextBtn = document.getElementById("nextBtn");
    const restartLevelBtn = document.getElementById("restartLevelBtn");

    const nextAfterFeedbackBtn = document.getElementById("nextAfterFeedbackBtn");
    const restartBtn = document.getElementById("restartBtn");
    const backToLevelsBtn = document.getElementById("backToLevelsBtn");
    const nextLevelBtn = document.getElementById("nextLevelBtn");

    const feedbackText = document.getElementById("feedbackText");
    const explanationText = document.getElementById("explanationText");
    const scoreValue = document.getElementById("scoreValue");
    const finalScore = document.getElementById("finalScore");
    const leaderboardDiv = document.getElementById("leaderboard");
    const levelNameEl = document.getElementById("levelName");
    const unlockMessage = document.getElementById("unlockMessage");

    const progressFill = document.getElementById("progressFill");
    const progressLabel = document.getElementById("progressLabel");

    let currentLevel = "Basic";
    let currentQuestion = 0;
    let score = 0;
    let selectedOption = null;

    let answers = [];
    let answeredFlags = [];
    let furthestIndex = 0;

    const UNLOCK_THRESHOLD = 30;

    const basicQuestions = [
        {
            question: "What does INEC stand for in Nigeria?",
            options: [
                "International Electoral Council",
                "Independent National Electoral Commission",
                "National Voters Committee",
                "Institute of Elections Nigeria"
            ],
            correct: 1,
            explanation: "INEC means 'Independent National Electoral Commission'. It conducts and oversees elections in Nigeria."
        },
        {
            question: "At what age can a Nigerian citizen register to vote?",
            options: ["16 years", "17 years", "18 years", "21 years"],
            correct: 2,
            explanation: "Citizens must be at least 18 years old to vote according to the Nigerian Constitution."
        },
        {
            question: "Which document is known as the supreme law of Nigeria?",
            options: ["Penal Code", "The Constitution", "Electoral Act", "Public Order Act"],
            correct: 1,
            explanation: "The Constitution is the highest law of Nigeria. All other laws derive their authority from it."
        },
        {
            question: "Which organization promotes youth civic participation in Nigeria?",
            options: ["YIAGA Africa", "World Bank", "UNESCO", "Naira Club"],
            correct: 0,
            explanation: "YIAGA Africa runs civic engagement and democracy programs for Nigerian youth."
        },
        {
            question: "What is one key responsibility of Nigerian citizens?",
            options: [
                "To obey traffic laws only",
                "To participate in civic and national duties",
                "To pay no attention to elections",
                "To avoid community service"
            ],
            correct: 1,
            explanation: "Citizens are expected to participate in civic duties like voting and community service."
        }
    ];

    const intermediaryQuestions = [
        {
            question: "Which body registers political parties in Nigeria?",
            options: ["National Assembly", "INEC", "Supreme Court", "Ministry of Justice"],
            correct: 1,
            explanation: "INEC registers political parties and oversees compliance during elections."
        },
        {
            question: "What is the minimum voting age in Nigeria?",
            options: ["16", "17", "18", "19"],
            correct: 2,
            explanation: "The minimum voting age is 18 as stated in the Constitution."
        },
        {
            question: "Local government primarily handles which of these?",
            options: ["Foreign policy", "Primary health and sanitation", "National defense", "Monetary policy"],
            correct: 1,
            explanation: "Local governments manage community services like primary health, sanitation and markets."
        },
        {
            question: "Which law guides election procedures in Nigeria?",
            options: ["Penal Code", "Electoral Act", "Companies Act", "Evidence Act"],
            correct: 1,
            explanation: "The Electoral Act outlines procedures and guidelines for conducting elections."
        },
        {
            question: "Which is a key civic duty?",
            options: ["Ignoring jury service", "Avoiding tax", "Voting and obeying the law", "Undermining public order"],
            correct: 2,
            explanation: "Voting, paying taxes, and obeying the law are core civic duties."
        }
    ];

    const advanceQuestions = [
        {
            question: "Which section of the Nigerian Constitution establishes INEC?",
            options: ["Section 6", "Section 153", "Section 1", "Section 217"],
            correct: 1,
            explanation: "INEC is listed among Federal Executive Bodies in Section 153 of the 1999 Constitution (as amended)."
        },
        {
            question: "What is a key power of INEC under the Third Schedule?",
            options: [
                "Appointing judges",
                "Conducting and supervising elections",
                "Passing national budgets",
                "Commanding the armed forces"
            ],
            correct: 1,
            explanation: "The Third Schedule assigns INEC functions including organizing and supervising elections."
        },
        {
            question: "Which statement about separation of powers is correct?",
            options: [
                "The Executive makes laws",
                "The Legislature interprets laws",
                "The Judiciary interprets laws",
                "The Judiciary appoints ministers"
            ],
            correct: 2,
            explanation: "The Judiciary interprets laws; the Legislature makes them; the Executive enforces them."
        },
        {
            question: "Which best describes federalism in Nigeria?",
            options: [
                "A unitary system",
                "Power shared between federal and state governments",
                "Only local governments rule",
                "All power to traditional rulers"
            ],
            correct: 1,
            explanation: "Nigeria is a federation where power is shared between federal and state governments."
        },
        {
            question: "What does media and information literacy help citizens do?",
            options: [
                "Accept information without verifying",
                "Identify credible sources and spot misinformation",
                "Ignore civic duties",
                "Rely only on rumors"
            ],
            correct: 1,
            explanation: "MIL helps citizens evaluate sources, verify claims, and resist misinformation."
        }
    ];

    function getStoredProgress() {
        try {
            const data = JSON.parse(localStorage.getItem("civicplay_progress")) || {};
            return {
                basicBest: data.basicBest || 0,
                intermediaryBest: data.intermediaryBest || 0,
                advanceBest: data.advanceBest || 0
            };
        } catch {
            return { basicBest: 0, intermediaryBest: 0, advanceBest: 0 };
        }
    }

    function setStoredProgress(progress) {
        localStorage.setItem("civicplay_progress", JSON.stringify(progress));
    }

    function applyLocks() {
        const { basicBest, intermediaryBest } = getStoredProgress();
        if (basicBest >= UNLOCK_THRESHOLD) {
            intermediaryBtn.classList.remove("locked");
            intermediaryBtn.removeAttribute("disabled");
        }
        if (intermediaryBest >= UNLOCK_THRESHOLD) {
            advanceBtn.classList.remove("locked");
            advanceBtn.removeAttribute("disabled");
        }
    }

    function getQuestionsByLevel() {
        if (currentLevel === "Basic") return basicQuestions;
        if (currentLevel === "Intermediary") return intermediaryQuestions;
        return advanceQuestions;
    }

    function initStateForLevel(total) {
        answers = new Array(total).fill(null);
        answeredFlags = new Array(total).fill(false);
        furthestIndex = 0;
        selectedOption = null;
        score = 0;
        currentQuestion = 0;
        updateScore();
        updateProgress();
    }

    function startLevel(level) {
        currentLevel = level;
        levelNameEl.textContent = currentLevel;
        startScreen.classList.add("hidden");
        feedbackScreen.classList.add("hidden");
        endScreen.classList.add("hidden");
        quizScreen.classList.remove("hidden");
        initStateForLevel(getQuestionsByLevel().length);
        loadQuestion(true);
    }

    function loadQuestion(withFade = false) {
        const qs = getQuestionsByLevel();
        const q = qs[currentQuestion];
        questionText.textContent = q.question;
        optionsContainer.innerHTML = "";
        const previouslySelected = answers[currentQuestion];

        q.options.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.textContent = opt;
            btn.className = "optionBtn";
            if (previouslySelected !== null && i === previouslySelected) btn.classList.add("selected");
            if (answeredFlags[currentQuestion]) {
                btn.classList.add("disabled");
                btn.disabled = true;
            } else {
                btn.addEventListener("click", () => selectOption(i));
            }
            optionsContainer.appendChild(btn);
        });

        submitBtn.disabled = answeredFlags[currentQuestion];
        updateNavButtons();
        updateProgress();

        if (withFade) {
            applyFade(questionText);
            Array.from(optionsContainer.children).forEach(el => applyFade(el));
        }
    }

    function applyFade(el) {
        el.classList.remove("fade-in");
        void el.offsetWidth; // reflow to restart animation
        el.classList.add("fade-in");
    }

    function selectOption(index) {
        selectedOption = index;
        const buttons = document.querySelectorAll(".optionBtn");
        buttons.forEach((btn, i) => {
            btn.classList.remove("selected");
            if (i === index) btn.classList.add("selected");
        });
    }

    function checkAnswer() {
        if (answeredFlags[currentQuestion]) return;
        if (selectedOption === null) {
            alert("Please select an answer!");
            return;
        }
        const qs = getQuestionsByLevel();
        const q = qs[currentQuestion];

        answers[currentQuestion] = selectedOption;
        answeredFlags[currentQuestion] = true;
        if (selectedOption === q.correct) score += 10;

        quizScreen.classList.add("hidden");
        feedbackScreen.classList.remove("hidden");
        feedbackText.textContent = selectedOption === q.correct ? "🎉 Correct!" : "❌ Try again!";
        explanationText.textContent = q.explanation;

        if (currentQuestion > furthestIndex) furthestIndex = currentQuestion;
        updateScore();
    }

    function nextFromFeedback() {
        feedbackScreen.classList.add("hidden");
        const qs = getQuestionsByLevel();
        if (currentQuestion + 1 < qs.length) {
            currentQuestion += 1;
            quizScreen.classList.remove("hidden");
            loadQuestion(true);
        } else {
            endGame();
        }
    }

    function prevQuestion() {
        if (currentQuestion > 0) {
            currentQuestion -= 1;
            feedbackScreen.classList.add("hidden");
            quizScreen.classList.remove("hidden");
            loadQuestion(true);
        }
    }

    function nextQuestion() {
        const qs = getQuestionsByLevel();
        if (currentQuestion + 1 < qs.length && (answeredFlags[currentQuestion] || currentQuestion < furthestIndex)) {
            currentQuestion += 1;
            feedbackScreen.classList.add("hidden");
            quizScreen.classList.remove("hidden");
            loadQuestion(true);
        } else if (currentQuestion + 1 === qs.length && answeredFlags[currentQuestion]) {
            // If this is the last question and it's already answered, go to end
            endGame();
        }
    }

    function updateNavButtons() {
        const qs = getQuestionsByLevel();
        prevBtn.disabled = currentQuestion === 0;
        // Next enabled if we're reviewing (answered) or moving up to furthest seen
        const canGoNext = (currentQuestion < furthestIndex) || answeredFlags[currentQuestion];
        nextBtn.disabled = !(canGoNext && currentQuestion + 1 <= qs.length);
    }

    function updateScore() {
        scoreValue.textContent = score;
    }

    function updateProgress() {
        const total = getQuestionsByLevel().length;
        const answeredCount = answeredFlags.filter(Boolean).length;
        const pct = total ? Math.round((answeredCount / total) * 100) : 0;
        progressFill.style.width = pct + "%";
        progressLabel.textContent = answeredCount + " / " + total;
    }

    function restartLevel() {
        initStateForLevel(getQuestionsByLevel().length);
        loadQuestion(true);
        quizScreen.classList.remove("hidden");
        feedbackScreen.classList.add("hidden");
        endScreen.classList.add("hidden");
    }

    function endGame() {
        quizScreen.classList.add("hidden");
        endScreen.classList.remove("hidden");
        finalScore.textContent = score;

        const progress = getStoredProgress();
        let unlockedText = "";
        let nextLevel = null;

        if (currentLevel === "Basic") {
            if (score > progress.basicBest) progress.basicBest = score;
            if (score >= UNLOCK_THRESHOLD) { unlockedText = "Intermediary is now unlocked! 🎯"; nextLevel = "Intermediary"; }
        } else if (currentLevel === "Intermediary") {
            if (score > progress.intermediaryBest) progress.intermediaryBest = score;
            if (score >= UNLOCK_THRESHOLD) { unlockedText = "Advance is now unlocked! 🚀"; nextLevel = "Advance"; }
        } else {
            if (score > progress.advanceBest) progress.advanceBest = score;
            unlockedText = "";
            nextLevel = null;
        }

        setStoredProgress(progress);
        unlockMessage.textContent = unlockedText;

        // Next level button visibility
        if (nextLevel) {
            nextLevelBtn.classList.remove("hidden");
            nextLevelBtn.dataset.level = nextLevel;
            nextLevelBtn.textContent = `Go to ${nextLevel} Level`;
        } else {
            nextLevelBtn.classList.add("hidden");
            nextLevelBtn.removeAttribute("data-level");
        }

        updateLeaderboard();
        refreshLocksOnEnd();
    }

    function refreshLocksOnEnd() {
        intermediaryBtn.classList.add("locked");
        intermediaryBtn.setAttribute("disabled", "true");
        advanceBtn.classList.add("locked");
        advanceBtn.setAttribute("disabled", "true");
        applyLocks();
    }

    function restartGame() {
        endScreen.classList.add("hidden");
        quizScreen.classList.add("hidden");
        feedbackScreen.classList.add("hidden");
        startScreen.classList.remove("hidden");
        applyLocks();
    }

    function backToLevels() {
        restartGame();
    }

    function updateLeaderboard() {
        const key = `leaderboard_${currentLevel.toLowerCase()}`;
        let leaderboard = JSON.parse(localStorage.getItem(key)) || [];
        leaderboard.push(score);
        leaderboard.sort((a, b) => b - a);
        leaderboard = leaderboard.slice(0, 5);
        localStorage.setItem(key, JSON.stringify(leaderboard));

        leaderboardDiv.innerHTML = `<h3>Top Civic Leaders — ${currentLevel}</h3>`;
        leaderboardDiv.innerHTML += leaderboard.map((s, i) => `<p>${i + 1}. ${s} points</p>`).join("");
    }

    // Event bindings
    basicBtn.addEventListener("click", () => startLevel("Basic"));
    intermediaryBtn.addEventListener("click", () => { if (!intermediaryBtn.disabled) startLevel("Intermediary"); });
    advanceBtn.addEventListener("click", () => { if (!advanceBtn.disabled) startLevel("Advance"); });

    prevBtn.addEventListener("click", prevQuestion);
    nextBtn.addEventListener("click", nextQuestion);
    submitBtn.addEventListener("click", checkAnswer);
    restartLevelBtn.addEventListener("click", restartLevel);

    nextAfterFeedbackBtn.addEventListener("click", nextFromFeedback);
    restartBtn.addEventListener("click", restartGame);
    backToLevelsBtn.addEventListener("click", backToLevels);
    nextLevelBtn.addEventListener("click", (e) => {
        const lvl = e.currentTarget.dataset.level;
        if (lvl) startLevel(lvl);
    });

    applyLocks();
});