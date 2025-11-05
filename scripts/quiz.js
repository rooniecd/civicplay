// CivicPlay Quiz Engine - Complete
// Flow: Next-first, Submit at end, locks on Next, live score (E1), sounds SFX, background music via WebAudio (afro-chill), MLoop1
// Levels: Basic / Intermediary / Advance - 15 questions each
// UI assumptions: index.html + styles.css provided earlier in this project

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

    // Music toggle button (icon 🔊/🔇)
    const musicToggle = document.getElementById("musicToggle");

    // State
    let currentLevel = "Basic";
    let questions = [];
    let currentIndex = 0;
    let selectedTemp = null; // current selection before locking
    let answers = [];        // locked answers by index (or null)
    let locked = [];         // boolean per question: true after NEXT
    let score = 0;
    let timerInterval = null;
    let timeLeft = 10;
    let timeExpired = []; // track per question

    function updateTimerFace(text) {
        const el = document.getElementById("timerCircle");
        if (!el) return;
        el.textContent = text;
    }

    function startTimer() {
        // si ya está bloqueada o expirada no iniciar
        if (locked[currentIndex] || timeExpired[currentIndex]) {
            updateTimerFace("⏳");
            disableOptions();
            return;
        }

        timeLeft = 10;
        updateTimerFace(timeLeft);

        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerFace(timeLeft);

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timeExpired[currentIndex] = true;
                locked[currentIndex] = true;
                updateTimerFace("⏳");
                disableOptions();

                // permitir avanzar aun sin seleccionar
                if (currentIndex === questions.length - 1) {
                    submitAllBtn.disabled = false;
                } else {
                    nextBtn.disabled = false;
                }

                // mensaje
                const old = quizScreen.querySelector(".timeup-msg");
                if (old) old.remove();
                document.getElementById("explanationBox").textContent = "Time is up! ⏳";
                document.getElementById("explanationBox").style.color = "#cc0000";
                document.getElementById("explanationBox").style.fontWeight = "bold";

            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function disableOptions() {
        const btns = optionsContainer.querySelectorAll(".optionBtn");
        btns.forEach(b => {
            b.classList.add("disabled");
            b.disabled = true;
            b.style.pointerEvents = "none";
            b.style.opacity = "0.6";
        });
    }

    // background music controller
    let bgMusic = new Audio("assets/music.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.25; // volumen suave
    let musicEnabled = true;

    // WebAudio setup (shared for SFX + Music)
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    // ---- SFX (playful) ----
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

    // ---- Background Music (afro-chill groove via WebAudio) ----
    let musicPlaying = false;    // currently playing
    let musicTimer = null;       // loop timer
    let musicBeat = 0;           // beat counter

    // Mini groove generator (no external files).
    function musicStart() {
        if (!musicEnabled) return;
        bgMusic.currentTime = 0;
        bgMusic.play().catch(() => { });
    }

    function musicStop() {
        bgMusic.pause();
    }

    function percussive(freq = 120, attack = 0.005, decay = 0.11, vol = 0.12) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + attack + decay);
        o.connect(g); g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + attack + decay + 0.02);
    }
    function hat(dur = 0.03) {
        const n = ctx.createBufferSource();
        const bufferSize = 4096;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); }
        n.buffer = buffer;
        const bp = ctx.createBiquadFilter();
        bp.type = "highpass";
        bp.frequency.value = 8000;
        const g = ctx.createGain();
        g.gain.value = 0.05;
        n.connect(bp); bp.connect(g); g.connect(ctx.destination);
        n.start();
        n.stop(ctx.currentTime + dur);
    }
    function pluck(freq = 220, dur = 0.12) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + dur + 0.02);
    }

    // Toggle button 🔊/🔇
    if (musicToggle) {
        musicToggle.addEventListener("click", () => {
            musicEnabled = !musicEnabled;
            if (!musicEnabled) {
                bgMusic.pause();
                musicToggle.textContent = "🔇";
            } else {
                bgMusic.play().catch(() => { });
                musicToggle.textContent = "🔊";
            }
        });
    }

    // Unlock threshold: 60% correct
    const PERCENT_TO_UNLOCK = 0.9;

    // ---- Question banks (15 each) ----
    const BASIC_QUESTIONS = [
        {
            q: "What does a democratic system of government primarily ensure?",
            a: ["Single-party rule", "People’s participation in decision-making", "Military control of governance", "Judicial supremacy above citizens"],
            c: 1,
            e: "Democracy is based on popular participation. Citizens have the right to choose who leads them and how the society is managed."
        },
        {
            q: "Which document is considered the highest source of law in Nigeria?",
            a: ["Electoral Act", "Criminal Procedure Code", "The Constitution", "Public Service Rules"],
            c: 2,
            e: "The Constitution is the supreme law of Nigeria. All other laws and actions must align with its provisions."
        },
        {
            q: "Which body is responsible for conducting elections in Nigeria?",
            a: ["INEC", "National Assembly", "Supreme Court", "Federal Ministry of Justice"],
            c: 0,
            e: "INEC (Independent National Electoral Commission) is legally mandated to organize, supervise, and conduct credible elections in Nigeria."
        },
        {
            q: "What is the legal voting age for elections in Nigeria?",
            a: ["16 years", "17 years", "18 years", "19 years"],
            c: 2,
            e: "The Constitution grants the right to vote at 18. This ensures a minimum level of maturity and civic awareness."
        },
        {
            q: "Which level of government is closest to the people and handles community needs?",
            a: ["Federal Government", "State Government", "Local Government", "Judiciary"],
            c: 2,
            e: "Local governments are closest to the grassroots and are responsible for primary sanitation, community development, and basic services."
        },
        {
            q: "What is a key civic duty of every responsible citizen in a democracy?",
            a: ["Evading tax payments", "Avoiding participation in elections", "Voting and obeying the law", "Disobeying government institutions"],
            c: 2,
            e: "Citizens are expected to engage in elections and respect the law to ensure societal order and accountability."
        },
        {
            q: "What term describes citizens actively taking part in political processes?",
            a: ["Civic engagement", "Electoral malpractice", "Political suppression", "Legislative autonomy"],
            c: 0,
            e: "Civic engagement means participating in public decision-making, elections, and community service activities."
        },
        {
            q: "Which branch makes laws for the country?",
            a: ["Executive", "Legislature", "Judiciary", "Civil Defence"],
            c: 1,
            e: "The legislature drafts, debates, and passes laws that govern the nation and protect citizens' rights."
        },
        {
            q: "Who interprets the laws and ensures justice is served?",
            a: ["Legislature", "Executive", "Judiciary", "Political Parties"],
            c: 2,
            e: "The judiciary interprets and applies the law and ensures justice is maintained based on constitutional guidance."
        },
        {
            q: "What is the permanent voter’s card commonly known as in Nigeria?",
            a: ["PVC", "BCN", "NIN", "TIN"],
            c: 0,
            e: "The PVC is used to identify and accredit voters during elections. It is issued by INEC."
        },
        {
            q: "Which law provides details on how elections should be conducted?",
            a: ["Companies Law", "Electoral Act", "Land Use Act", "Finance Act"],
            c: 1,
            e: "The Electoral Act contains rules and procedures guiding elections, campaigns, results, and political party operations."
        },
        {
            q: "Why is youth participation vital in democracy?",
            a: ["Youth weaken government institutions", "Youth reduce accountability", "Youth ensure innovation and future leadership", "Youth do not understand politics"],
            c: 2,
            e: "Young people bring new ideas and shape future leadership. Their participation strengthens democracy and accountability."
        },
        {
            q: "Which of the following is an example of civic responsibility?",
            a: ["Spreading rumors about candidates", "Participating in elections", "Rejecting voter education programs", "Avoiding public service"],
            c: 1,
            e: "Voting and participating in the electoral process ensures that citizens contribute to decisions affecting national development."
        },
        {
            q: "Which Nigerian government tier manages primary health care and local roads?",
            a: ["Federal Government", "State Government", "Local Government", "National Assembly"],
            c: 2,
            e: "Local governments coordinate primary health centers and manage community roads to support basic local infrastructure."
        },
        {
            q: "Why should citizens obey the law in a democratic society?",
            a: ["It prevents elections from taking place", "It ensures public order and civic stability", "It strengthens dictatorship", "It reduces citizen rights"],
            c: 1,
            e: "Obeying the law promotes peace and stability and protects the rights of all citizens."
        },
        {
            q: "What is an election?",
            a: ["A random selection of leaders", "A process of choosing leaders through voting", "A military appointment procedure", "A judicial decision-making process"],
            c: 1,
            e: "An election is the formal method through which people select leaders by casting votes."
        },
        {
            q: "Which agency issues voter registration cards in Nigeria?",
            a: ["National Population Commission", "INEC", "Central Bank of Nigeria", "Federal Road Safety Corps"],
            c: 1,
            e: "INEC registers eligible voters and issues PVCs to enable lawful participation in elections."
        },
        {
            q: "Why is public debate important in democracy?",
            a: ["It blocks public ideas", "It develops informed opinions", "It eliminates political parties", "It weakens public trust"],
            c: 1,
            e: "Debate allows citizens to evaluate different ideas, compare policies, and make informed decisions as voters."
        },
        {
            q: "Which principle ensures that no arm of government becomes too powerful?",
            a: ["Freedom of speech", "Separation of powers", "National unity", "Military oversight"],
            c: 1,
            e: "Separation of powers allocates authority to the executive, legislature, and judiciary to prevent concentration of power."
        },
        {
            q: "Citizens must pay tax because it",
            a: ["Funds government services and infrastructure", "Punishes productive people", "Reduces democracy", "Eliminates elections"],
            c: 0,
            e: "Tax revenue funds public institutions, education, health services, roads, and other common resources."
        },
        {
            q: "How often are general elections normally conducted in Nigeria?",
            a: ["Every year", "Every 2 years", "Every 4 years", "Every 8 years"],
            c: 2,
            e: "Nigeria conducts general elections every 4 years to elect leaders at the federal and state levels."
        },
        {
            q: "Which of the following best describes civic education?",
            a: ["Training soldiers for defense", "Teaching citizens their rights, duties and participation roles", "Organizing entertainment events", "Managing foreign currency exchange"],
            c: 1,
            e: "Civic education helps citizens understand their rights, duties, national values, and responsibility in society."
        },
        {
            q: "What makes an election credible?",
            a: ["Violence and intimidation", "Transparency and fairness", "Vote buying", "Restricting opposition parties"],
            c: 1,
            e: "A credible election is free, fair, and transparent, giving voters equal opportunity to choose leaders."
        },
        {
            q: "The act of citizens contributing ideas to public policy development is called",
            a: ["Civic engagement", "Political suppression", "Illegal assembly", "Judicial misconduct"],
            c: 0,
            e: "Civic engagement involves participation in discussions and decisions that shape community development."
        },
        {
            q: "A government that is run by elected representatives of the citizens is called",
            a: ["Autocracy", "Democracy", "Feudalism", "Dictatorship"],
            c: 1,
            e: "Democracy is the system where leaders are chosen through elections and represent the interests of the people."
        },
        {
            q: "Which agency monitors campaign financing of political parties in Nigeria?",
            a: ["INEC", "CBN", "NCC", "FRSC"],
            c: 0,
            e: "INEC monitors campaign financing to ensure fairness and prevent illegal funding in elections."
        },
        {
            q: "Why is freedom of speech important in a democratic nation?",
            a: ["It allows citizens to express opinions without fear", "It removes democratic elections", "It weakens the judiciary", "It increases corruption"],
            c: 0,
            e: "Freedom of speech empowers citizens to express their views openly, which strengthens accountability."
        },
        {
            q: "What does voters’ education aim to achieve?",
            a: ["Confuse voters about election days", "Guide voters on rights and voting procedures", "Promote voter intimidation", "End elections completely"],
            c: 1,
            e: "Voters’ education ensures that citizens understand their voting rights, responsibilities and how elections are conducted."
        },
        {
            q: "What does the rule of law ensure?",
            a: ["Creating special laws for certain people", "Everyone is subject to the law equally", "Avoiding punishment for officials", "Granting immunity to citizens"],
            c: 1,
            e: "The rule of law ensures that all individuals, including leaders, must obey the law equally without discrimination."
        },
        {
            q: "Why do political parties exist?",
            a: ["To allow multiple organized groups to contest power", "To block youth participation", "To eliminate free elections", "To restrict civic rights"],
            c: 0,
            e: "Political parties aggregate ideas, compete in elections, and provide citizens with choices for leadership."
        }
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

    // ---- Progress storage per level ----
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

    // ---- Level start ----
    function startLevel(level) {
        currentLevel = level;
        levelNameEl.textContent = currentLevel;
        let pool = (level === "Basic") ? BASIC_QUESTIONS
            : (level === "Intermediary") ? INTERMEDIARY_QUESTIONS
                : ADVANCE_QUESTIONS;

        // shuffle pool
        pool = pool.sort(() => Math.random() - 0.5);

        // take first 15 always
        questions = pool.slice(0, 15);


        answers = new Array(questions.length).fill(null);
        locked = new Array(questions.length).fill(false);
        timeExpired = new Array(questions.length).fill(false);

        currentIndex = 0;
        selectedTemp = null;
        score = 0;

        qTotalEl.textContent = String(questions.length);
        scoreValue.textContent = "0";
        updateProgressBar();

        startScreen.classList.add("hidden");
        endScreen.classList.add("hidden");
        quizScreen.classList.remove("hidden");

        document.getElementById("timerBox").style.display = "block";

        renderQuestion(true);

        // Autoplay music per level (authorized by user click)
        if (musicEnabled) musicStart();

        // timer start
        stopTimer();
        startTimer();
    }

    // ---- Render current question ----
    function renderQuestion(withFade = false) {
        const q = questions[currentIndex];
        qIndexEl.textContent = String(currentIndex + 1);
        questionText.textContent = q.q;
        optionsContainer.innerHTML = "";
        document.getElementById("explanationBox").textContent = "";
        document.getElementById("explanationBox").style.color = "";
        document.getElementById("explanationBox").style.fontWeight = "";


        // Randomize options while preserving correct index reference
        let options = q.a.map((opt, idx) => ({ opt, idx })).sort(() => Math.random() - 0.5);

        // Build randomized options
        options.forEach(item => {
            const i = item.idx; // original correct index reference
            const opt = item.opt;
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
        // PREV solo permitido si YA expiró o si YA está locked
        if (currentIndex === 0) {
            prevBtn.disabled = true;
        } else {
            prevBtn.disabled = (!locked[currentIndex] && !timeExpired[currentIndex]);
        }
        nextBtn.classList.remove("hidden");
        submitAllBtn.classList.add("hidden");

        // Next disabled until user selects (if not locked)
        if (locked[currentIndex]) {
            nextBtn.disabled = false;
        } else {
            nextBtn.disabled = (selectedTemp === null);
        }

        // Last question → show Submit All
        if (currentIndex === questions.length - 1) {
            nextBtn.classList.add("hidden");
            submitAllBtn.classList.remove("hidden");
            submitAllBtn.disabled = locked[currentIndex] ? false : (selectedTemp === null);
        }

        if (withFade) applyFade(questionText);
        updateProgressBar();

        // ============= TIMER CONTROL SECTION =============

        // detener timer SIEMPRE al renderizar
        stopTimer();

        // si ya estaba expirada, mostrar ⏳ y bloquear
        if (timeExpired[currentIndex]) {
            updateTimerFace("⏳");
            disableOptions();
        }

    }


    function onSelect(index, btn) {
        if (timeExpired[currentIndex] || locked[currentIndex]) return;

        selectedTemp = index;
        sClick();
        Array.from(optionsContainer.querySelectorAll(".optionBtn")).forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");

        if (currentIndex === questions.length - 1) {
            submitAllBtn.disabled = false;
        } else {
            nextBtn.disabled = false;
        }
    }

    // ---- Navigation ----
    function goNext() {

        // if no answer selected and time not expired, do nothing
        if (selectedTemp === null && !timeExpired[currentIndex] && !locked[currentIndex]) return;

        // lock answer if not locked yet
        if (!locked[currentIndex]) {
            locked[currentIndex] = true;
            answers[currentIndex] = selectedTemp;

            if (!timeExpired[currentIndex]) {
                if (answers[currentIndex] === questions[currentIndex].c) {
                    score += 10;
                    scoreValue.textContent = String(score);
                    sSuccess();
                } else {
                    sFail();
                }
            }
        }

        // SHOW EXPLANATION BOX (always)
        const currentQ = questions[currentIndex];
        if (currentQ.e) {
            document.getElementById("explanationBox").textContent = currentQ.e;
            document.getElementById("explanationBox").style.color = "";
            document.getElementById("explanationBox").style.fontWeight = "normal";
        }

        // STOP TIMER NOW
        stopTimer();

        // GO NEXT after short delay (1 second)
        setTimeout(() => {

            // if last question, go to submit
            if (currentIndex === questions.length - 1) {
                submitAll();
                return;
            }

            currentIndex++;
            selectedTemp = null;
            renderQuestion(true);

            // restart timer only if not expired on new question
            if (!locked[currentIndex] && !timeExpired[currentIndex]) {
                startTimer();
            }

        }, 5000);
    }



    function goPrev() {
        if (currentIndex > 0) {
            currentIndex--;
            selectedTemp = null;
            renderQuestion(true);
            stopTimer();
            if (!locked[currentIndex] && !timeExpired[currentIndex]) startTimer();
        }
    }


    // ---- Submit All ----
    function submitAll() {
        if (!locked[currentIndex] && selectedTemp !== null) {
            answers[currentIndex] = selectedTemp;
            locked[currentIndex] = true;
            if (answers[currentIndex] === questions[currentIndex].c) {
                score += 10;
                scoreValue.textContent = String(score);
            }
            selectedTemp = null;
        }

        quizScreen.classList.add("hidden");
        endScreen.classList.remove("hidden");
        finalScore.textContent = String(score);

        // stop timer at end of level
        stopTimer();


        // Stop music at end of level (MLoop1)
        musicStop();

        const p = getStoredProgress();
        const levelKey = currentLevel === "Basic" ? "basicBest"
            : currentLevel === "Intermediary" ? "intermediaryBest"
                : "advanceBest";
        if (score > p[levelKey]) p[levelKey] = score;
        setStoredProgress(p);

        // Unlock logic
        const needed = Math.round(getBank().length * 10 * PERCENT_TO_UNLOCK);
        let nextLevelName = null;
        if (score >= needed) {
            sSuccess();
            if (currentLevel === "Basic") nextLevelName = "Intermediary";
            if (currentLevel === "Intermediary") nextLevelName = "Advance";
            unlockMessage.textContent = nextLevelName ? `${nextLevelName} is now unlocked!` : "";
        } else {
            sFail();
            unlockMessage.textContent = `😅💪 Try again, score at least ${needed} to unlock the next level!`;
        }

        if (nextLevelName) {
            nextLevelBtn.classList.remove("hidden");
            nextLevelBtn.dataset.level = nextLevelName;
            nextLevelBtn.textContent = `Go to ${nextLevelName} Level`;
        } else {
            nextLevelBtn.classList.add("hidden");
            nextLevelBtn.removeAttribute("data-level");
        }

        updateLeaderboard();
        applyLocks();
    }

    function restartLevel() {
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

        // restart music for level
        if (musicEnabled) {
            musicStop();
            musicStart();
        }
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
        void el.offsetWidth; // reflow to restart
        el.classList.add("fade-in");
    }

    // ---- Events ----
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
    restartLevelBtn.addEventListener("click", () => {
        startLevel(currentLevel);
    });

    restartBtn.addEventListener("click", () => { sClick(); restartLevel(); });
    backToLevelsBtn.addEventListener("click", () => {
        sClick();
        // stop music when leaving level
        musicStop();
        endScreen.classList.add("hidden");
        quizScreen.classList.add("hidden");
        startScreen.classList.remove("hidden");
        applyLocks();
    });
    nextLevelBtn.addEventListener("click", (e) => {
        const lvl = e.currentTarget.dataset.level;
        if (lvl) {
            sClick();
            // change level → restart music cleanly
            musicStop();
            startLevel(lvl);
        }
    });

    // ---- Init ----
    applyLocks();
});

document.getElementById("splashImg").addEventListener("click", () => {
    document.getElementById("splash").style.display = "none";
});