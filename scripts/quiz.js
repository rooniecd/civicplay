let currentQuestion = 0;
let score = 0;
let selectedOption = null;
let questions = [];

const startBtn = document.getElementById("startBtn");
const quizScreen = document.getElementById("quizScreen");
const startScreen = document.getElementById("startScreen");
const feedbackScreen = document.getElementById("feedbackScreen");
const endScreen = document.getElementById("endScreen");
const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("optionsContainer");
const submitBtn = document.getElementById("submitBtn");
const feedbackText = document.getElementById("feedbackText");
const explanationText = document.getElementById("explanationText");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const finalScore = document.getElementById("finalScore");
const scoreValue = document.getElementById("scoreValue");
const leaderboardDiv = document.getElementById("leaderboard");

startBtn.addEventListener("click", startGame);
submitBtn.addEventListener("click", checkAnswer);
nextBtn.addEventListener("click", nextQuestion);
restartBtn.addEventListener("click", restartGame);

function startGame() {
    startScreen.classList.add("hidden");
    quizScreen.classList.remove("hidden");
    score = 0;
    currentQuestion = 0;
    fetch("data/questions.json")
        .then(response => response.json())
        .then(data => {
            questions = data;
            loadQuestion();
            updateScore();
        });
}

function loadQuestion() {
    const q = questions[currentQuestion];
    questionText.textContent = q.question;
    optionsContainer.innerHTML = "";
    selectedOption = null;

    q.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.textContent = opt;
        btn.className = "optionBtn";
        btn.addEventListener("click", () => selectOption(i));
        optionsContainer.appendChild(btn);
    });
}

function selectOption(index) {
    selectedOption = index;
    const buttons = document.querySelectorAll(".optionBtn");
    buttons.forEach((btn, i) => {
        btn.style.backgroundColor = i === index ? "#c8e6c9" : "#e8f5e9";
    });
}

function checkAnswer() {
    if (selectedOption === null) return alert("Please select an answer!");
    const q = questions[currentQuestion];
    quizScreen.classList.add("hidden");
    feedbackScreen.classList.remove("hidden");

    if (selectedOption === q.correct) {
        score += 10;
        feedbackText.textContent = "🎉 Correct!";
    } else {
        feedbackText.textContent = "❌ Try again!";
    }
    explanationText.textContent = q.explanation;
    updateScore();
}

function updateScore() {
    scoreValue.textContent = score;
}

function nextQuestion() {
    feedbackScreen.classList.add("hidden");
    currentQuestion++;

    if (currentQuestion < questions.length) {
        quizScreen.classList.remove("hidden");
        loadQuestion();
    } else {
        endGame();
    }
}

function endGame() {
    quizScreen.classList.add("hidden");
    endScreen.classList.remove("hidden");
    finalScore.textContent = score;
    updateLeaderboard();
}

function restartGame() {
    endScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    score = 0;
    currentQuestion = 0;
    selectedOption = null;
    updateScore();
}

function updateLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
    leaderboard.push(score);
    leaderboard.sort((a, b) => b - a);
    leaderboard = leaderboard.slice(0, 5);
    localStorage.setItem("leaderboard", JSON.stringify(leaderboard));

    leaderboardDiv.innerHTML = "<h3>Top Civic Leaders</h3>";
    leaderboard.forEach((s, i) => {
        leaderboardDiv.innerHTML += `<p>${i + 1}. ${s} points</p>`;
    });
}
