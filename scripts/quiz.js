document.addEventListener("DOMContentLoaded", () => {
    // Screens
    const startScreen = document.getElementById("startScreen");
    const quizScreen = document.getElementById("quizScreen");
    const endScreen = document.getElementById("endScreen");

    // Level buttons
    const basicBtn = document.getElementById("basicBtn");
    const intermediaryBtn = document.getElementById("intermediaryBtn");
    const advanceBtn = document.getElementById("advanceBtn");

    // Quiz UI
    const levelNameEl = document.getElementById("levelName");
    const questionText = document.getElementById("questionText");
    const optionsContainer = document.getElementById("optionsContainer");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const submitAllBtn = document.getElementById("submitAllBtn");
    const restartLevelBtn = document.getElementById("restartLevelBtn");

    // Progress + score
    const qIndexEl = document.getElementById("qIndex");
    const qTotalEl = document.getElementById("qTotal");
    const progressFill = document.getElementById("progressFill");
    const scoreValue = document.getElementById("scoreValue");

    // End UI
    const finalScore = document.getElementById("finalScore");
    const unlockMessage = document.getElementById("unlockMessage");
    const leaderboardDiv = document.getElementById("leaderboard");
    const restartBtn = document.getElementById("restartBtn");
    const backToLevelsBtn = document.getElementById("backToLevelsBtn");
    const nextLevelBtn = document.getElementById("nextLevelBtn");

    // State
    let currentLevel = "Basic";
    let questions = [];
    let currentIndex = 0;
    let selectedTemp = null; // current selection before locking
    let answers = [];        // locked answers by index (or null)
    let locked = [];         // boolean per question: true after NEXT
    let score = 0;

    // Sounds (playful)
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const playTone = (freq = 440, dur = 0.12, type = "sine", vol = 0.06) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = vol;
        o.connect(g); g.connect(ctx.destination);
        o.start();
        setTimeout(() => o.stop(), dur * 1000);
    };
    const sClick = () => { playTone(520, 0.08, "triangle", 0.05); };
    const sSuccess = () => { playTone(700, 0.12, "sine", 0.07); setTimeout(() => playTone(900, 0.12, "sine", 0.07), 120); };
    const sFail = () => { playTone(250, 0.14, "sawtooth", 0.06); };

    // Unlock threshold: 60% correct
    const PERCENT_TO_UNLOCK = 0.6;

    // Question banks (15 each)
    const BASIC_QUESTIONS = [
        { q: "What does INEC stand for in Nigeria?", a: ["International Electoral Council", "Independent National Electoral Commission", "National Voters Committee", "Institute of Elections Nigeria"], c: 1 },
        { q: "What is the minimum voting age in Nigeria?", a: ["16", "17", "18", "19"], c: 2 },
        { q: "Which document is the supreme law of Nigeria?", a: ["Penal Code", "The Constitution", "Electoral Act", "Public Order Act"], c: 1 },
        { q: "Which body registers political parties in Nigeria?", a: ["National Assembly", "INEC", "Supreme Court", "Ministry of Justice"], c: 1 },
        { q: "Local government primarily handles which service?", a: ["Foreign policy", "Primary health and sanitation", "National defense", "Monetary policy"], c: 1 },
        { q: "Which law guides election procedures in Nigeria?", a: ["Penal Code", "Electoral Act", "Companies Act", "Evidence Act"], c: 1 },
        { q: "A key civic duty for citizens is to", a: ["Avoid tax", "Ignore jury service", "Vote and obey the law", "Undermine public order"], c: 2 },
        { q: "At elections, who organizes and supervises the process?", a: ["INEC", "National Assembly", "Judiciary", "Police Service Commission"], c: 0 },
        { q: "Which branch interprets the laws?", a: ["Executive", "Legislature", "Judiciary", "Civil Service"], c: 2 },
        { q: "What does media and information literacy help citizens do?", a: ["Accept information without verifying", "Identify credible sources", "Ignore civic duties", "Rely on rumors"], c: 1 },
        { q: "Citizens should participate in community service because it", a: ["Replaces elections", "Builds social responsibility", "Eliminates taxes", "Removes laws"], c: 1 },
        { q: "Nigeria practices which system of government?", a: ["Unitary", "Confederal", "Federal", "Absolute monarchy"], c: 2 },
        { q: "What is the permanent voter’s card commonly called?", a: ["PVC", "NIN", "TIN", "BVN"], c: 0 },
        { q: "The Electoral Act mainly contains", a: ["Tax rules", "Election procedures", "Military codes", "Trade policies"], c: 1 },
        { q: "Youth engagement in democracy is important because it", a: ["Reduces turnout", "Weakens institutions", "Builds accountable leadership", "Eliminates debates"], c: 2 }
    ];

    const INTERMEDIARY_QUESTIONS = [
        { q: "Which section of the Constitution lists INEC among federal bodies?", a: ["Section 6", "Section 153", "Section 1", "Section 217"], c: 1 },
        { q: "Under the Third Schedule, INEC can", a: ["Appoint judges", "Conduct and supervise elections", "Pass national budgets", "Command the armed forces"], c: 1 },
        { q: "Separation of powers ensures that the Executive", a: ["Interprets laws", "Makes laws", "Enforces laws", "Selects juries"], c: 2 },
        { q: "State governments are primarily responsible for", a: ["Foreign affairs", "Secondary education policy", "Printing currency", "Defense"], c: 1 },
        { q: "A free and fair election includes", a: ["Intimidation", "Transparent counting", "Ballot stuffing", "Violence"], c: 1 },
        { q: "The Nigerian Senate is part of the", a: ["Judiciary", "Executive", "Legislature", "Civil Service"], c: 2 },
        { q: "The Constitution protects fundamental rights such as", a: ["Right to fair hearing", "Right to arbitrary arrest", "Right to censorship", "Right to misinformation"], c: 0 },
        { q: "Which ID is commonly required to register for PVC?", a: ["BVN only", "International passport only", "Any valid recognized ID", "No ID"], c: 2 },
        { q: "Primary responsibility of citizens during elections is to", a: ["Sell votes", "Participate peacefully and vote", "Disrupt polling units", "Avoid registration"], c: 1 },
        { q: "Civic engagement includes", a: ["Spreading fake news", "Community meetings", "Inciting violence", "Ignoring local issues"], c: 1 },
        { q: "The Judiciary’s independence helps to", a: ["Politicize trials", "Ensure rule of law", "Eliminate courts", "Control elections"], c: 1 },
        { q: "What is the role of polling officials?", a: ["Campaigning for parties", "Maintaining order and counting votes", "Altering results", "Ignoring procedures"], c: 1 },
        { q: "Which court is the highest in Nigeria?", a: ["Court of Appeal", "Supreme Court", "High Court", "National Industrial Court"], c: 1 },
        { q: "A credible source when verifying claims is", a: ["Anonymous blog", "Official government or INEC site", "Random WhatsApp forward", "Unverified meme page"], c: 1 },
        { q: "Civic education in schools helps students", a: ["Avoid participation", "Understand rights and duties", "Ignore governance", "Reject responsibility"], c: 1 }
    ];

    const ADVANCE_QUESTIONS = [
        { q: "Federalism in Nigeria means", a: ["Unitary rule", "Power shared between federal and states", "Only local governments rule", "All power to traditional rulers"], c: 1 },
        { q: "Which document outlines citizen rights in detail?", a: ["The Constitution (Chapter IV)", "Company and Allied Matters Act", "Penal Code", "Evidence Act"], c: 0 },
        { q: "A hallmark of credible elections is", a: ["Ballot snatching", "Voter suppression", "Transparent collation", "Violence"], c: 2 },
        { q: "Media literacy helps voters to", a: ["Believe everything", "Spot manipulation and bias", "Avoid information", "Rely on rumors"], c: 1 },
        { q: "In Nigeria, who assents to bills passed by the National Assembly?", a: ["Chief Justice", "President", "INEC Chair", "Inspector General"], c: 1 },
        { q: "An impeachment is conducted by the", a: ["Judiciary alone", "Legislature following constitutional process", "Military council", "Electoral umpire"], c: 1 },
        { q: "Budget appropriation power lies with the", a: ["Judiciary", "Legislature", "Police", "INEC"], c: 1 },
        { q: "Which is NOT a civic duty?", a: ["Paying taxes", "Obeying laws", "Serving the nation if required", "Spreading disinformation"], c: 3 },
        { q: "Which principle guards against concentration of power?", a: ["Centralization", "Separation of powers", "Autocracy", "Oligarchy"], c: 1 },
        { q: "Petitions on election results are handled by", a: ["Markets", "Electoral tribunals", "Local chiefs", "Social media"], c: 1 },
        { q: "An informed electorate relies on", a: ["Verified data and credible sources", "Rumors", "Hearsay", "Satire"], c: 0 },
        { q: "Freedom of expression allows citizens to", a: ["Incite violence", "Criticize within the law", "Defame freely", "Publish hate speech"], c: 1 },
        { q: "INEC’s mandate includes", a: ["Drafting the Constitution", "Conducting elections", "Appointing ministers", "Passing laws"], c: 1 },
        { q: "Rule of law implies", a: ["No one is above the law", "Leaders are above the law", "Laws are optional", "Only citizens obey"], c: 0 },
        { q: "A peaceful transfer of power strengthens", a: ["Democratic stability", "Dictatorship", "Lawlessness", "Anarchy"], c: 0 }
    ];

    // Progress storage per level
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
    function setStoredProgress(p) {
        localStorage.setItem("civicplay_progress", JSON.stringify(p));
    }
    function applyLocks() {
        const p = getStoredProgress();
        const basicUnlock = Math.round(BASIC_QUESTIONS.length * 10 * PERCENT_TO_UNLOCK);
        const interUnlock = Math.round(INTERMEDIARY_QUESTIONS.length * 10 * PERCENT_TO_UNLOCK);
        if (p.basicBest >= basicUnlock) {
            intermediaryBtn.classList.remove("locked");
            intermediaryBtn.removeAttribute("disabled");
        }
        if (p.intermediaryBest >= interUnlock) {
            advanceBtn.classList.remove("locked");
            advanceBtn.removeAttribute("disabled");
        }
    }

    // Start a level
    function startLevel(level) {
        currentLevel = level;
        levelNameEl.textContent = currentLevel;
        questions = (level === "Basic") ? BASIC_QUESTIONS
            : (level === "Intermediary") ? INTERMEDIARY_QUESTIONS
                : ADVANCE_QUESTIONS;

        answers = new Array(questions.length).fill(null);
        locked = new Array(questions.length).fill(false);
        currentIndex = 0;
        selectedTemp = null;
        score = 0;

        qTotalEl.textContent = String(questions.length);
        scoreValue.textContent = "0";
        updateProgressBar();

        startScreen.classList.add("hidden");
        endScreen.classList.add("hidden");
        quizScreen.classList.remove("hidden");

        renderQuestion(true);
    }

    // Render current question
    function renderQuestion(withFade = false) {
        const q = questions[currentIndex];
        qIndexEl.textContent = String(currentIndex + 1);
        questionText.textContent = q.q;
        optionsContainer.innerHTML = "";

        // Build options
        q.a.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.textContent = opt;
            btn.className = "optionBtn";
            if (answers[currentIndex] !== null && answers[currentIndex] === i) {
                btn.classList.add("selected");
            }
            if (locked[currentIndex]) {
                btn.classList.add("disabled");
                btn.disabled = true;
            } else {
                btn.addEventListener("click", () => onSelect(i, btn));
            }
            optionsContainer.appendChild(btn);
            if (withFade) applyFade(btn);
        });

        // Buttons state
        prevBtn.disabled = currentIndex === 0;
        nextBtn.classList.remove("hidden");
        submitAllBtn.classList.add("hidden");

        // Caleb flow: Next disabled until user selects something (if not locked)
        if (locked[currentIndex]) {
            nextBtn.disabled = false; // reviewing answered question
        } else {
            nextBtn.disabled = (selectedTemp === null);
        }

        // Last question → show Submit All instead of Next
        if (currentIndex === questions.length - 1) {
            nextBtn.classList.add("hidden");
            submitAllBtn.classList.remove("hidden");
            submitAllBtn.disabled = locked[currentIndex] ? false : (selectedTemp === null);
        }

        // Fade-in for question text
        if (withFade) applyFade(questionText);

        updateProgressBar();
    }

    function onSelect(index, btn) {
        selectedTemp = index;
        sClick();
        // Visual selection
        Array.from(optionsContainer.querySelectorAll(".optionBtn")).forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");

        // Enable Next (or Submit All) when a choice is made
        if (currentIndex === questions.length - 1) {
            submitAllBtn.disabled = false;
        } else {
            nextBtn.disabled = false;
        }
    }

    // Lock current answer and move next
    function goNext() {
        if (locked[currentIndex]) {
            // already answered, just move
            if (currentIndex < questions.length - 1) {
                currentIndex++;
                selectedTemp = null;
                renderQuestion(true);
            }
            return;
        }

        if (selectedTemp === null) return; // should not happen due to disabled button

        // lock and store
        answers[currentIndex] = selectedTemp;
        locked[currentIndex] = true;
        selectedTemp = null;

        // live score update
        if (answers[currentIndex] === questions[currentIndex].c) {
            score += 10;
            scoreValue.textContent = String(score);
            sSuccess();
        } else {
            sFail();
        }

        // progress
        if (currentIndex < questions.length - 1) {
            currentIndex++;
            renderQuestion(true);
        } else {
            // last question path won’t hit here because we hide Next and show Submit All
            renderQuestion(true);
        }
    }

    // Navigate back without changing answers
    function goPrev() {
        if (currentIndex > 0) {
            currentIndex--;
            selectedTemp = null;
            renderQuestion(true);
        }
    }

    // Submit all answers at the end
    function submitAll() {
        // Lock last one if not locked (user must have selected something to enable button)
        if (!locked[currentIndex] && selectedTemp !== null) {
            answers[currentIndex] = selectedTemp;
            locked[currentIndex] = true;
            selectedTemp = null;
        }

        // Compute score
        score = 0;
        answers.forEach((ans, i) => {
            const correct = getBank()[i].c;
            if (ans === correct) score += 10;
        });
        scoreValue.textContent = String(score);

        // End screen + unlock logic
        quizScreen.classList.add("hidden");
        endScreen.classList.remove("hidden");
        finalScore.textContent = String(score);

        const p = getStoredProgress();
        const levelKey = currentLevel === "Basic" ? "basicBest"
            : currentLevel === "Intermediary" ? "intermediaryBest"
                : "advanceBest";

        if (score > p[levelKey]) p[levelKey] = score;
        setStoredProgress(p);

        // Determine unlock
        const needed = Math.round(getBank().length * 10 * PERCENT_TO_UNLOCK);
        let nextLevelName = null;
        if (score >= needed) {
            sSuccess();
            if (currentLevel === "Basic") nextLevelName = "Intermediary";
            if (currentLevel === "Intermediary") nextLevelName = "Advance";
            unlockMessage.textContent = nextLevelName
                ? `${nextLevelName} is now unlocked!`
                : "";
        } else {
            sFail();
            unlockMessage.textContent = `Score at least ${needed} to unlock the next level.`;
        }

        // Next level button
        if (nextLevelName) {
            nextLevelBtn.classList.remove("hidden");
            nextLevelBtn.dataset.level = nextLevelName;
            nextLevelBtn.textContent = `Go to ${nextLevelName} Level`;
        } else {
            nextLevelBtn.classList.add("hidden");
            nextLevelBtn.removeAttribute("data-level");
        }

        // Leaderboard simple (top 5)
        updateLeaderboard();
        // Reset locks visuals when coming back to level screen
        applyLocks();
    }

    function restartLevel() {
        // keep same level, reset answers
        questions = getBank();
        answers = new Array(questions.length).fill(null);
        locked = new Array(questions.length).fill(false);
        currentIndex = 0;
        selectedTemp = null;
        score = 0;
        scoreValue.textContent = "0";
        qTotalEl.textContent = String(questions.length);

        endScreen.classList.add("hidden");
        startScreen.classList.add("hidden");
        quizScreen.classList.remove("hidden");
        renderQuestion(true);
    }

    function updateLeaderboard() {
        const key = `leaderboard_${currentLevel.toLowerCase()}`;
        let leaderboard = JSON.parse(localStorage.getItem(key)) || [];
        leaderboard.push(score);
        leaderboard.sort((a, b) => b - a);
        leaderboard = leaderboard.slice(0, 5);
        localStorage.setItem(key, JSON.stringify(leaderboard));

        leaderboardDiv.innerHTML = `<h3>Top Civic Leaders — ${currentLevel}</h3>`;
        leaderboard.forEach((s, i) => {
            leaderboardDiv.innerHTML += `<p>${i + 1}. ${s} points</p>`;
        });
    }

    function getBank() {
        return currentLevel === "Basic" ? BASIC_QUESTIONS
            : currentLevel === "Intermediary" ? INTERMEDIARY_QUESTIONS
                : ADVANCE_QUESTIONS;
    }

    function updateProgressBar() {
        const total = getBank().length;
        const answered = locked.filter(Boolean).length;
        const pct = total ? Math.round((answered / total) * 100) : 0;
        progressFill.style.width = pct + "%";
    }

    function applyFade(el) {
        el.classList.remove("fade-in");
        // reflow
        void el.offsetWidth;
        el.classList.add("fade-in");
    }

    // Events
    basicBtn.addEventListener("click", () => { sClick(); startLevel("Basic"); });
    intermediaryBtn.addEventListener("click", () => {
        if (!intermediaryBtn.disabled) { sClick(); startLevel("Intermediary"); }
    });
    advanceBtn.addEventListener("click", () => {
        if (!advanceBtn.disabled) { sClick(); startLevel("Advance"); }
    });

    prevBtn.addEventListener("click", () => { sClick(); goPrev(); });
    nextBtn.addEventListener("click", () => { sClick(); goNext(); });
    submitAllBtn.addEventListener("click", () => { sClick(); submitAll(); });
    restartLevelBtn.addEventListener("click", () => { sClick(); restartLevel(); });

    restartBtn.addEventListener("click", () => { sClick(); restartLevel(); });
    backToLevelsBtn.addEventListener("click", () => {
        sClick();
        endScreen.classList.add("hidden");
        quizScreen.classList.add("hidden");
        startScreen.classList.remove("hidden");
        applyLocks();
    });
    nextLevelBtn.addEventListener("click", (e) => {
        const lvl = e.currentTarget.dataset.level;
        if (lvl) { sClick(); startLevel(lvl); }
    });

    // Init
    applyLocks();
});