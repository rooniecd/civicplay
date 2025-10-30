document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById("startBtn");
    const quizScreen = document.getElementById("quizScreen");
    const startScreen = document.getElementById("startScreen");
    const questionText = document.getElementById("questionText");
    const optionsContainer = document.getElementById("optionsContainer");

    startBtn.addEventListener("click", () => {
        startScreen.classList.add("hidden");
        quizScreen.classList.remove("hidden");

        questionText.textContent = "What does INEC stand for in Nigeria?";
        ["International Electoral Council", "Independent National Electoral Commission", "National Voters Committee"].forEach(opt => {
            const btn = document.createElement("button");
            btn.textContent = opt;
            btn.className = "optionBtn";
            optionsContainer.appendChild(btn);
        });
    });
});
