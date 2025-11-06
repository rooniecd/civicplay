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
        {
            q: "Which part of the Nigerian Constitution provides the fundamental rights of citizens?",
            a: ["Chapter I", "Chapter II", "Chapter IV", "Chapter VII"],
            c: 2,
            e: "Chapter IV of the 1999 Constitution (as amended) guarantees rights such as freedom of expression, assembly, and fair hearing."
        },
        {
            q: "What is the main function of the National Assembly in Nigeria?",
            a: ["Interpreting laws", "Implementing policies", "Making laws and reviewing existing ones", "Recruiting civil servants"],
            c: 2,
            e: "The National Assembly is Nigeria’s federal legislature responsible for drafting, debating, and amending laws."
        },
        {
            q: "What is the role of the State House of Assembly?",
            a: ["Makes laws for the state", "Conducts elections", "Runs the Judiciary", "Controls the military"],
            c: 0,
            e: "Each state has a House of Assembly which creates laws that apply within that particular state."
        },
        {
            q: "Who appoints the Chief Justice of Nigeria?",
            a: ["National Assembly", "INEC", "President with Senate confirmation", "Supreme Court directly"],
            c: 2,
            e: "The President nominates the Chief Justice, but the Senate must confirm before appointment becomes valid."
        },
        {
            q: "Which arm of government prosecutes criminal cases?",
            a: ["Executive through the Attorney-General", "Judiciary", "Legislature", "Civil Defence"],
            c: 0,
            e: "The Attorney-General and Ministry of Justice (part of Executive) prosecute criminal cases on behalf of the government."
        },
        {
            q: "What is the main function of the Judiciary in Nigeria?",
            a: ["Hiring cabinet members", "Interpreting laws and ensuring justice", "Printing currency", "Recruiting ministers"],
            c: 1,
            e: "The Judiciary interprets the law and settles disputes to maintain justice and rule of law."
        },
        {
            q: "Which agency investigates corruption and money laundering in Nigeria?",
            a: ["INEC", "EFCC", "FRSC", "NCAA"],
            c: 1,
            e: "The EFCC targets financial crimes like embezzlement, internet fraud, and money laundering."
        },
        {
            q: "Which agency focuses on regulating broadcast media in Nigeria?",
            a: ["CBN", "NBC", "INEC", "NCC"],
            c: 1,
            e: "The National Broadcasting Commission monitors TV and radio content to ensure compliance with guidelines."
        },
        {
            q: "Which agency regulates telecom and digital communication?",
            a: ["NBA", "NCC", "NTA", "ICPC"],
            c: 1,
            e: "The Nigerian Communications Commission (NCC) regulates telecoms, ensures fair competition and protects consumers."
        },
        {
            q: "Which agency fights corruption in public service?",
            a: ["EFCC", "ICPC", "INEC", "Police"],
            c: 1,
            e: "ICPC focuses on corrupt practices inside government offices to improve transparency and accountability."
        },
        {
            q: "Why is investigating information before sharing important?",
            a: ["Truth is optional", "It prevents spreading misinformation", "Rumors are harmless", "All news online is accurate"],
            c: 1,
            e: "Verifying facts protects people from manipulation and maintains trust in the democratic process."
        },
        {
            q: "Which source is most reliable for political information?",
            a: ["Unverified blogs", "Fact-checking platforms", "Anonymous WhatsApp groups", "Random TikTok claims"],
            c: 1,
            e: "Fact-checkers review evidence and data to provide accurate information to the public."
        },
        {
            q: "Which of the following is an example of misinformation?",
            a: ["Verified election results from INEC", "Rumors shared without evidence", "Official government publications", "Peer-reviewed research"],
            c: 1,
            e: "Misinformation is false or inaccurate information that misleads people, especially during elections."
        },
        {
            q: "Which practice helps voters avoid manipulation?",
            a: ["Sharing every political post immediately", "Checking sources and fact-checking claims", "Relying on gossip", "Avoiding public debate"],
            c: 1,
            e: "Fact-checking helps voters separate facts from propaganda, protecting democracy."
        },
        {
            q: "Why do democracies encourage free and independent media?",
            a: ["To block public knowledge", "To help control citizens", "To promote transparency and accountability", "To support fake news"],
            c: 2,
            e: "A free media helps citizens hold government accountable and stay informed."
        },
        {
            q: "Which institution conducts voter registration in Nigeria?",
            a: ["INEC", "Judiciary", "Senate", "Ministry of Interior"],
            c: 0,
            e: "INEC registers voters, issues PVCs, and organizes elections nationwide."
        },
        {
            q: "Which branch approves federal budgets and government spending?",
            a: ["Executive alone", "Judiciary", "National Assembly", "INEC"],
            c: 2,
            e: "The National Assembly reviews and approves budgets to control how public funds are used."
        },
        {
            q: "Which public institution controls the national budget implementation after approval?",
            a: ["Executive branch", "Judiciary branch", "Legislature branch", "Civil society groups"],
            c: 0,
            e: "After the National Assembly approves the budget, the Executive implements and manages how funds are spent."
        },
        {
            q: "Which agency can sanction broadcasting stations that spread hate speech?",
            a: ["NBC", "INEC", "NCC", "Customs Service"],
            c: 0,
            e: "The National Broadcasting Commission regulates broadcast stations and can sanction them for violating content rules."
        },
        {
            q: "Why is media literacy important for civic participation?",
            a: ["It blocks citizens from asking questions", "It reduces access to information", "It helps citizens understand and verify news", "It supports the spread of rumors"],
            c: 2,
            e: "Media literacy strengthens democracy by helping citizens identify facts and reject misleading claims."
        },
        {
            q: "Which organization can fact-check political claims during elections?",
            a: ["Unknown Facebook pages", "Professional fact-checkers", "Deepfake creators", "Anonymous influencers"],
            c: 1,
            e: "Fact-checkers collect evidence and verify information so the public can trust the truth of political claims."
        },
        {
            q: "Which branch of government can declare a law unconstitutional?",
            a: ["Executive", "Judiciary", "Legislature", "INEC"],
            c: 1,
            e: "The Judiciary can strike down any law or policy that violates the Constitution."
        },
        {
            q: "Why should citizens avoid spreading content that encourages violence?",
            a: ["Violent posts attract more followers", "Violence benefits democracy", "Violence destroys peace and undermines elections", "Violence improves free speech"],
            c: 2,
            e: "Violence threatens stability and weakens democratic processes, especially during elections."
        },
        {
            q: "What is the role of the Senate in Nigeria?",
            a: ["Implements laws", "Approves presidential appointments and reviews bills", "Registers voters", "Prints money"],
            c: 1,
            e: "The Senate reviews bills and confirms key appointments like ministers and judges."
        },
        {
            q: "Why is transparency critical in government spending?",
            a: ["It increases corruption", "It helps the public track how funds are used", "It blocks accountability", "It reduces trust in government"],
            c: 1,
            e: "Transparency lets citizens see how public money is used, encouraging responsible governance."
        },
        {
            q: "What can happen if citizens depend entirely on social media rumors?",
            a: ["They make informed decisions", "They risk believing falsehoods", "Their civic knowledge grows stronger", "They become immune to propaganda"],
            c: 1,
            e: "Relying on rumors makes people vulnerable to manipulation during political periods."
        },
        {
            q: "Which organization supervises all elections in Nigeria?",
            a: ["Supreme Court", "INEC", "ICPC", "National Assembly"],
            c: 1,
            e: "INEC is the electoral authority responsible for organizing and regulating elections across Nigeria."
        },
        {
            q: "Which arm of government executes national policies?",
            a: ["Legislature", "Judiciary", "Executive", "Military"],
            c: 2,
            e: "The Executive carries out policies and runs the country’s daily administration through ministries."
        },
        {
            q: "Why do citizens need access to credible public information?",
            a: ["It promotes informed decision-making", "It discourages critical thinking", "It encourages propaganda", "It undermines unity"],
            c: 0,
            e: "Credible information empowers citizens to participate responsibly in democracy."
        },
        {
            q: "Who has the power to declare a state of emergency in Nigeria?",
            a: ["Senate alone", "President with National Assembly approval", "INEC chair", "Supreme Court justices"],
            c: 1,
            e: "The President proposes the emergency, but the National Assembly must approve according to the Constitution."
        },
        {
            q: "What is the major danger of believing information without fact-checking?",
            a: ["Better civic engagement", "Higher transparency", "Risk of manipulation and false decisions", "Improved governance"],
            c: 2,
            e: "Unverified information can mislead voters and damage democratic participation."
        },
        {
            q: "Which institution investigates corruption inside public offices?",
            a: ["EFCC", "ICPC", "INEC", "CBN"],
            c: 1,
            e: "ICPC’s mandate focuses on corrupt practices by government employees and public institutions."
        },
        {
            q: "Which branch controls the national security agencies?",
            a: ["Legislature", "Judiciary", "Executive", "INEC"],
            c: 2,
            e: "The Executive oversees law enforcement and national security through ministries and agencies."
        },
        {
            q: "Why should citizens cross-check political information from multiple sources?",
            a: ["To strengthen false rumors", "To avoid falling for misinformation", "To ignore democratic values", "To block fact-checkers"],
            c: 1,
            e: "Verifying across sources protects people from manipulation and encourages informed civic participation."
        },
        {
            q: "Which agency regulates telephone networks and internet providers in Nigeria?",
            a: ["NBC", "INEC", "NCC", "NTA"],
            c: 2,
            e: "The Nigerian Communications Commission regulates telecom services and ensures fair digital access."
        },
        {
            q: "Why is freedom of the press valuable for democracy?",
            a: ["It allows government to shut down dissent", "It prevents citizens from knowing the truth", "It supports transparency and keeps leaders accountable", "It reduces access to facts"],
            c: 2,
            e: "Free press exposes wrongdoing and informs the public, which strengthens accountability."
        },
        {
            q: "Which body checks government spending and holds the Executive accountable?",
            a: ["Judiciary", "Civil Society Groups", "National Assembly", "INEC"],
            c: 2,
            e: "The legislature reviews budgets and government actions to ensure funds are used correctly."
        },
        {
            q: "Which media behaviour is most harmful during elections?",
            a: ["Sharing verified results", "Promoting honest debates", "Spreading misinformation", "Educating voters"],
            c: 2,
            e: "Misinformation damages trust and can influence voters unfairly."
        },
        {
            q: "Which platform should a citizen trust more for election results?",
            a: ["Official INEC website", "Random influencer posts", "Anonymous WhatsApp forwards", "Unverified Twitter claims"],
            c: 0,
            e: "INEC is the legally authorized source for official election results."
        },
        {
            q: "Which right allows journalists to report without fear of punishment?",
            a: ["Right to rig elections", "Right to violence", "Freedom of expression", "Right to spread rumors"],
            c: 2,
            e: "Freedom of expression protects journalists and enables public access to truthful reporting."
        },
        {
            q: "Why is fact-checking critical especially before elections?",
            a: ["It promotes lies", "It protects voters from false claims", "It blocks free speech", "It confuses citizens"],
            c: 1,
            e: "Fact-checking prevents political actors from misleading voters to gain unfair advantage."
        },
        {
            q: "Which institution can nullify an election if serious fraud is proven?",
            a: ["INEC", "Supreme Court", "NBC", "ICPC"],
            c: 1,
            e: "The Supreme Court can nullify an election if evidence shows that legal procedures were violated."
        },
        {
            q: "Which type of information should citizens be most careful about online?",
            a: ["Official statistics", "Peer reviewed research", "Viral political rumors", "Accredited news reports"],
            c: 2,
            e: "Viral rumors often lack evidence and can manipulate public opinion."
        },
        {
            q: "Which election document specifies how political campaigns must be conducted?",
            a: ["Land Use Act", "Evidence Act", "Electoral Act", "National Youth Policy"],
            c: 2,
            e: "The Electoral Act includes guidelines for campaigns, results, transparency and penalties for violations."
        },
        {
            q: "Which authority approves ministerial appointments in Nigeria?",
            a: ["INEC Chairman", "House of Representatives", "Senate", "Attorney-General"],
            c: 2,
            e: "The Senate confirms and approves nominations for ministers and other key national offices."
        },
        {
            q: "Why should citizens cross-check breaking news during election periods?",
            a: ["Election periods produce more propaganda", "Rumors are always accurate", "Elections do not matter", "Fact-checking is illegal"],
            c: 0,
            e: "Political actors push false narratives to influence voters, so verification is essential."
        },
        {
            q: "Which arm can remove a president from office through impeachment?",
            a: ["Judiciary", "Senate and House of Representatives", "INEC", "Police"],
            c: 1,
            e: "The National Assembly can impeach the president if proven guilty of gross misconduct."
        },
        {
            q: "Which organization educates voters on democratic participation?",
            a: ["INEC", "NCC", "Customs", "NTA Sports"],
            c: 0,
            e: "INEC provides voter education programs and resources to promote informed participation."
        },
        {
            q: "Why is media bias dangerous to democracy?",
            a: ["Bias promotes equal opinions", "Bias ensures neutrality", "Bias can mislead people and distort decision-making", "Bias produces truth"],
            c: 2,
            e: "Media bias manipulates public opinion by presenting information in a skewed way."
        },
        {
            q: "Which institution settles electoral disputes in Nigeria?",
            a: ["INEC", "Courts and tribunals", "Ministry of Defence", "NTA"],
            c: 1,
            e: "Courts and election tribunals handle complaints and disputes arising from the electoral process."
        }
    ];

    const ADVANCE_QUESTIONS = [
        {
            q: "Which constitutional doctrine allows courts to void actions of other branches that violate the Constitution?",
            a: ["Doctrine of Necessity", "Judicial Review", "Separation of Powers", "Federal Character"],
            c: 1,
            e: "Judicial review lets courts strike down unconstitutional laws or actions. It protects the supremacy of the Constitution."
        },
        {
            q: "Which chamber initiates appropriation (money) bills under Nigeria’s federal legislature?",
            a: ["Senate only", "House of Representatives only", "Either chamber", "Joint finance committee only"],
            c: 1,
            e: "The House of Representatives traditionally originates money bills before concurrence by the Senate."
        },
        {
            q: "What is the primary purpose of legislative oversight?",
            a: ["Drafting party manifestos", "Approving judicial promotions", "Holding the Executive accountable for implementation", "Running civil service recruitment"],
            c: 2,
            e: "Oversight examines how ministries and agencies execute laws, budgets, and policies to ensure accountability."
        },
        {
            q: "Which organ can remove a governor for gross misconduct through impeachment?",
            a: ["State High Court", "State House of Assembly", "INEC Resident Commissioner", "Federal Executive Council"],
            c: 1,
            e: "A State House of Assembly can impeach a governor subject to constitutional procedures and judicial review."
        },
        {
            q: "Which best describes ‘federal character’ in Nigeria?",
            a: ["Military zoning of states", "Equitable representation of groups in public service", "Judicial election of ministers", "Rotational presidency by decree"],
            c: 1,
            e: "Federal character promotes fairness by reflecting Nigeria’s diversity in public appointments and opportunities."
        },
        {
            q: "Which body tries petitions arising from National Assembly elections?",
            a: ["Court of Appeal sitting as Tribunal", "Supreme Court", "Federal High Court General Division", "National Industrial Court"],
            c: 0,
            e: "Election petitions are heard by specialized tribunals; appeals for NASS polls terminate at the Court of Appeal."
        },
        {
            q: "Which court finally decides presidential election petitions in Nigeria?",
            a: ["Federal High Court", "Court of Appeal", "Supreme Court", "Customary Court of Appeal"],
            c: 2,
            e: "Presidential election petitions end at the Supreme Court, which gives the final binding decision."
        },
        {
            q: "What is a key role of the Public Accounts Committees in legislatures?",
            a: ["Select cabinet members", "Audit and review government expenditures", "Register political parties", "Approve foreign judges"],
            c: 1,
            e: "PACs scrutinize audit reports and spending to ensure funds are used lawfully and efficiently."
        },
        {
            q: "Which institution issues binding interpretations of the Constitution?",
            a: ["Independent National Electoral Commission", "National Council of State", "The Courts", "Code of Conduct Bureau"],
            c: 2,
            e: "Only courts give authoritative interpretations of constitutional provisions and resolve constitutional disputes."
        },
        {
            q: "Which agency enforces the Code of Conduct for public officers?",
            a: ["Code of Conduct Bureau and Tribunal", "Civil Service Commission", "INEC", "NTA"],
            c: 0,
            e: "The CCB investigates asset declarations and the CCT tries violations to promote integrity in public service."
        },
        {
            q: "What is the main danger of coordinated inauthentic behavior online?",
            a: ["Higher platform security", "Better civic trust", "Manipulated public opinion through fake networks", "Improved data ethics"],
            c: 2,
            e: "Troll farms and botnets simulate consensus, distort narratives, and mislead voters at scale."
        },
        {
            q: "Which signal most reliably indicates a deepfake video?",
            a: ["High resolution only", "Verified watermark from a party", "Facial artifacts and mismatched audio-lip sync", "Large number of shares"],
            c: 2,
            e: "Artifacts, lighting inconsistencies, and audio desync are technical cues. Shares or watermarks are not proof of authenticity."
        },
        {
            q: "Why do platforms label ‘state-controlled media’ sometimes?",
            a: ["To promote engagement", "To disclose possible government influence on content", "To ban domestic outlets", "To rank news by likes"],
            c: 1,
            e: "Labels help users evaluate editorial independence and potential influence, aiding informed consumption."
        },
        {
            q: "Which open-data practice improves election transparency?",
            a: ["Results locked as images only", "Machine-readable polling unit results", "Announcing totals without unit data", "Prohibiting observers’ access"],
            c: 1,
            e: "Publishing granular, machine-readable results enables independent verification and credible parallel checks."
        },
        {
            q: "A ‘metadata’ check on a viral document can help determine what?",
            a: ["Preferred party of the author", "Exact vote totals", "Creation date and edit trail", "Legal validity in court automatically"],
            c: 2,
            e: "Metadata reveals when a file was created or modified, supporting authenticity checks but not legal conclusions by itself."
        },
        {
            q: "Which is a red flag in a political infographic?",
            a: ["Source link provided", "Methodology stated", "No source and exaggerated numbers", "Time-stamped dataset"],
            c: 2,
            e: "Lack of sources and inflated figures indicate propaganda; credible visuals cite data and methods."
        },
        {
            q: "Which body manages asset declaration for top officials?",
            a: ["Code of Conduct Bureau", "NCC", "INEC", "EFCC only"],
            c: 0,
            e: "The CCB receives and verifies asset declarations; the CCT prosecutes violations when necessary."
        },
        {
            q: "Which arm proposes most bills related to revenue and administration?",
            a: ["Judiciary", "Civil society", "Executive", "INEC"],
            c: 2,
            e: "The Executive drafts many policy and budget-related bills which then go through legislative scrutiny."
        },
        {
            q: "Which best practice limits algorithmic manipulation during campaigns?",
            a: ["No content moderation", "Transparent ad libraries and spending data", "Shadow-banning opponents", "Banning all political speech"],
            c: 1,
            e: "Public ad libraries and spend disclosures allow watchdogs to monitor microtargeting and influence operations."
        },
        {
            q: "A reliable approach to verify a purported ‘INEC’ result sheet online is to",
            a: ["Check watermark only", "Compare with official portal uploads and serial numbers", "Trust the most shared version", "Use screenshot color tone"],
            c: 1,
            e: "Cross-reference serials and tallies with the official results portal and observer reports before sharing."
        },
        {
            q: "Which court first hears most federal electoral petitions?",
            a: ["Supreme Court", "Federal High Court", "Election Tribunal at first instance", "Customary Court"],
            c: 2,
            e: "Special tribunals are constituted to hear electoral disputes initially before appellate review."
        },
        {
            q: "What is the principal legal basis for press freedom in Nigeria?",
            a: ["Electoral Act section on media", "Criminal Code carve-out", "Constitutional freedom of expression", "NBC administrative circular"],
            c: 2,
            e: "Freedom of expression in the Constitution underpins a free press, subject to lawful limitations."
        },
        {
            q: "Which oversight tool can the National Assembly use to compel testimony?",
            a: ["Friendly request", "Private letters only", "Subpoena powers under its rules and law", "Executive directive"],
            c: 2,
            e: "Committees can summon witnesses and demand documents to advance investigations into public interest matters."
        },
        {
            q: "What is a common tactic in computational propaganda?",
            a: ["Transparent sourcing", "Coordinated hashtag floods with bots", "Open datasets for verification", "Independent audits of ads"],
            c: 1,
            e: "Bot swarms and scripted accounts amplify narratives, creating artificial trends that mislead audiences."
        },
        {
            q: "Which is the final court for governorship election appeals?",
            a: ["High Court", "Court of Appeal", "Supreme Court", "Tribunal"],
            c: 2,
            e: "Like presidential petitions, governorship election appeals culminate at the Supreme Court."
        },
        {
            q: "Which agency can prosecute money-laundering linked to political financing?",
            a: ["NTA", "INEC media unit", "EFCC", "National Orientation Agency"],
            c: 2,
            e: "EFCC investigates and prosecutes laundering and financial crimes that may taint political funding."
        },
        {
            q: "Which ethical rule helps journalists avoid amplifying falsehoods?",
            a: ["Publish first, verify later", "Clickbait for traffic", "Verification before amplification", "Anonymous rumor quoting"],
            c: 2,
            e: "Verifying claims before repeating them protects audiences from misinformation and maintains trust."
        },
        {
            q: "What is the legal effect of a Supreme Court judgment?",
            a: ["Advisory only", "Binding precedent nationwide", "Applicable to one state only", "Must be reviewed by tribunals"],
            c: 1,
            e: "Supreme Court decisions bind lower courts and guide future cases across the federation."
        },
        {
            q: "Which step best validates a viral polling-unit ‘result’ photo?",
            a: ["Share to crowdsource truth", "Check location EXIF and match figures with official uploads", "Count comments below", "Ask an influencer"],
            c: 1,
            e: "Geodata and figure-matching with official portals or observer logs help confirm authenticity."
        },
        {
            q: "Which office prepares the federal budget proposal?",
            a: ["Office of the Chief Justice", "Office of the Auditor-General", "Federal Ministry of Finance/Budget Office (Executive)", "Senate Appropriations Unit"],
            c: 2,
            e: "The Executive through Finance/Budget offices drafts proposals which the legislature debates and approves."
        },
        {
            q: "Which body can disqualify a candidate for failing asset declaration rules?",
            a: ["Code of Conduct Tribunal", "INEC media team", "Political party chair", "Civil Service Commission"],
            c: 0,
            e: "Breaches of the Code of Conduct can lead to CCT sanctions, including disqualification where applicable."
        },
        {
            q: "What is the key safeguard of ‘separation of powers’?",
            a: ["Fusion of all powers in one branch", "Mutual checks among branches", "Total independence without review", "Direct party control of courts"],
            c: 1,
            e: "Each branch limits the others to prevent abuse; checks and balances uphold constitutional order."
        },
        {
            q: "A quick test to vet a ‘scandal’ tweet is to",
            a: ["Trust engagement numbers", "Search for corroboration in credible outlets and primary documents", "Share instantly to friends", "Judge by meme quality"],
            c: 1,
            e: "Corroboration by established outlets and verifiable records reduces the risk of spreading falsehoods."
        },
        {
            q: "Which body audits government accounts and issues audit queries?",
            a: ["Auditor-General for the Federation", "Attorney-General", "INEC", "NBC"],
            c: 0,
            e: "The Auditor-General examines public accounts and reports irregularities to the legislature for action."
        },
        {
            q: "Which platform feature improves transparency of political ads?",
            a: ["Hidden targeting fields", "Opaque billing", "Public ad libraries searchable by sponsor", "Auto-delete after publishing"],
            c: 2,
            e: "Ad libraries allow citizens and researchers to track who paid, how much, and who was targeted."
        },
        {
            q: "How can citizens track constituency projects credibly?",
            a: ["Anonymous blogs", "Official procurement portals and FOI requests", "Private DM groups", "Only campaign flyers"],
            c: 1,
            e: "Open contracting data and FOI laws help verify project awards, timelines, and actual delivery."
        },
        {
            q: "Which is a legal limit on expression under Nigerian law?",
            a: ["Truthful criticism of leaders", "Calls to violence or incitement", "Publishing verified facts", "Peaceful satire"],
            c: 1,
            e: "Speech that incites violence can be lawfully restricted to protect public order and safety."
        },
        {
            q: "Which body resolves inter-governmental disputes between FG and states?",
            a: ["Revenue Mobilization Commission", "Supreme Court original jurisdiction", "NCC board", "Senate leadership"],
            c: 1,
            e: "Certain disputes between levels of government can be brought directly before the Supreme Court."
        },
        {
            q: "A reliable way to detect a coordinated hashtag campaign is to",
            a: ["Check random memes", "Look for synchronized posting patterns and identical scripts", "Count likes alone", "Read only top comments"],
            c: 1,
            e: "Synchronized timing and repetitive text across many accounts often signals coordination."
        },
        {
            q: "Which tribunal handles asset declaration violations by public officers?",
            a: ["Election Petition Tribunal", "Code of Conduct Tribunal", "Industrial Court", "Customary Court"],
            c: 1,
            e: "The CCT tries breaches of the Code of Conduct, such as false asset declarations or conflicts of interest."
        },
        {
            q: "Which oversight action can follow a damning audit report?",
            a: ["Ignore it publicly", "Referral to anti-corruption agencies and hearings", "Delete the report", "Punish whistleblowers automatically"],
            c: 1,
            e: "Parliamentary hearings and referrals to EFCC/ICPC can enforce accountability and recover losses."
        },
        {
            q: "What improves the credibility of citizen observation networks?",
            a: ["Unverified screenshots", "Standardized forms, geo-tags and open datasets", "Only anonymous tips", "No training for volunteers"],
            c: 1,
            e: "Structured data with location evidence and public access enables independent verification."
        },
        {
            q: "Which court typically hears pre-election matters (e.g., party primaries)?",
            a: ["Customary Court", "Federal/State High Courts", "Election Tribunals first", "Magistrate Courts"],
            c: 1,
            e: "Pre-election disputes often start in High Courts under the Electoral Act and related party laws."
        },
        {
            q: "Which rule reduces dataset ‘cherry-picking’ in political claims?",
            a: ["Hide raw data", "Provide methodology and full dataset", "Use only a single chart", "Delete contradictory figures"],
            c: 1,
            e: "Releasing methods and complete data allows independent replication and guards against selective use."
        },
        {
            q: "Which best describes ‘security votes’ at advanced oversight level?",
            a: ["Fully audited line items", "Discretionary funds with limited transparency", "Citizen crowdfunding", "Court fines"],
            c: 1,
            e: "Security votes are opaque discretionary funds; robust oversight demands clearer rules and reporting."
        },
        {
            q: "Which legal principle protects accused persons in trials?",
            a: ["Presumption of guilt", "Strict liability always", "Presumption of innocence and fair hearing", "Public opinion rule"],
            c: 2,
            e: "Due process requires fair hearing and presumes innocence until guilt is proven by competent evidence."
        },
        {
            q: "Which sign suggests a forged official letter circulating online?",
            a: ["Correct letterhead and reference", "Typos, wrong titles, and unverifiable signatories", "Citations to statutes", "Stamped date"],
            c: 1,
            e: "Inconsistent titles, grammar errors, and missing registry traces often indicate forgery."
        },
        {
            q: "Which actor can request information using the Freedom of Information framework?",
            a: ["Only elected officials", "Any citizen or organization following procedures", "Only journalists", "Only lawyers"],
            c: 1,
            e: "FOI frameworks allow citizens and groups to request official records to advance transparency and accountability."
        },
        {
            q: "What strengthens credibility when publishing investigative findings?",
            a: ["Withholding evidence", "Publishing documents, data and methodology", "Relying on anonymous rumors", "Avoiding right of reply"],
            c: 1,
            e: "Sharing underlying records and methods helps audiences verify conclusions and builds public trust."
        },
        {
            q: "Which statement about appellate hierarchy is correct?",
            a: ["Tribunal > Supreme Court", "High Court > Court of Appeal", "Court of Appeal > High Courts", "Magistrate > Court of Appeal"],
            c: 2,
            e: "Appeals move upward: from trial courts to the Court of Appeal, and ultimately to the Supreme Court."
        },
        {
            q: "Which practice best protects private data in civic tech apps?",
            a: ["Logging all user metadata forever", "Encrypting sensitive data and minimizing collection", "Publishing raw logs", "Sharing datasets by default"],
            c: 1,
            e: "Data minimization and encryption safeguard privacy while allowing legitimate civic-use features."
        },
        {
            q: "What is the value of parallel vote tabulation (PVT) by observers?",
            a: ["Replaces official results", "Offers independent statistical check on results integrity", "Counts social media likes", "Ends court petitions"],
            c: 1,
            e: "PVT independently samples and projects results to detect anomalies and bolster confidence in outcomes."
        }
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