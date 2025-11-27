document.addEventListener('DOMContentLoaded', () => {

    // ======== STATE VARIABLES ========
    let userAge = 0;
    let userSex = '';
    let userFamilyHistory = ''; // <-- NEW
    let currentQuestionIndex = 0;
    let riskScore = 0; // 0 = lowest risk, 100 = highest
    let questions = [];

    // Risk weights
    const WEIGHTS = {
        HIGH: 15,
        MEDIUM: 8,
        LOW: 3
    };

    // Track user's answers by category for results breakdown
    let riskByCategory = {
        'Diet & Nutrition': 0,
        'Lifestyle': 0,
        'Medical History': 0,
        'Family & Genetics': 0
    };
    
    let answersCount = {
        'Diet & Nutrition': 0,
        'Lifestyle': 0,
        'Medical History': 0,
        'Family & Genetics': 0
    };

    // ======== DOM ELEMENTS ========
    const screens = {
        onboarding: document.getElementById('screen-onboarding'),
        game: document.getElementById('screen-game'),
        results: document.getElementById('screen-results')
    };

    // --- Onboarding ---
    const onboardingForm = document.getElementById('onboarding-form');
    const ageInput = document.getElementById('age');
    const sexInputs = document.querySelectorAll('input[name="sex"]');
    const familyHistoryInputs = document.querySelectorAll('input[name="family-history"]'); // <-- NEW
    const startButton = document.getElementById('start-game-btn');

    // --- Game ---
    const riskFactorBar = document.getElementById('risk-factor-progress');
    const riskFactorLabel = document.getElementById('risk-factor-label');
    const cardContainer = document.getElementById('card-container');
    const questionCard = document.getElementById('question-card');
    const questionText = document.getElementById('question-text');
    const progressCounter = document.getElementById('progress-counter');
    const feedbackCorrect = document.getElementById('feedback-correct');
    const feedbackWrong = document.getElementById('feedback-wrong');
    const feedbackExplanation = document.getElementById('feedback-explanation').querySelector('p');
    const glowOverlay = document.getElementById('glow-overlay'); // <-- NEW

    // --- Results ---
    const resultsRiskLevel = document.getElementById('results-risk-level');
    const resultsSummary = document.getElementById('results-summary');
    const playAgainBtn = document.getElementById('play-again-btn');

    // ======== QUESTIONS DATABASE (UPDATED) ========
    const allQuestions = [
        // High-Risk
        { prompt: "I've seen blood in my stool or had a big change in bowel habits, but I haven't seen a doctor.", riskWeight: 'HIGH', answerIncreasesRisk: true, explanation: "These are potential warning signs. You must see a doctor to get them checked out." },
        { prompt: "A doctor told me I had colon polyps in the past, but I've missed my follow-up appointment.", riskWeight: 'HIGH', answerIncreasesRisk: true, explanation: "Past polyps increase your risk. Regular follow-ups are critical for prevention." },
        { prompt: "I have been diagnosed with Inflammatory Bowel Disease (IBD), like Crohn's or colitis.", riskWeight: 'HIGH', answerIncreasesRisk: true, explanation: "IBD significantly increases your risk. Regular screening is essential." },
        { prompt: "I was given a take-home screening kit (like a FIT kit) but I haven't sent it back.", riskWeight: 'HIGH', answerIncreasesRisk: true, explanation: "The best test is the one that gets done! Screening is the #1 way to catch CRC early." },
        { id: 'age-gate-over-45', prompt: "I am 45 or older and have *not* had my first colorectal cancer screening.", riskWeight: 'HIGH', answerIncreasesRisk: true, explanation: "Screening is recommended to start at age 45. It's the most effective way to prevent CRC." },
        
        // Medium-Risk
        { prompt: "I am a current smoker.", riskWeight: 'MEDIUM', answerIncreasesRisk: true, explanation: "Smoking increases the risk of many cancers, including colorectal cancer." },
        { prompt: "I drink more than one alcoholic beverage per day on average.", riskWeight: 'MEDIUM', answerIncreasesRisk: true, explanation: "Heavy or regular alcohol use is a known risk factor for CRC." },
        { prompt: "I eat processed meats (like hot dogs, bacon, or ham) most weeks.", riskWeight: 'MEDIUM', answerIncreasesRisk: true, explanation: "Processed meats are strongly linked to an increased risk of colorectal cancer." },
        { prompt: "I eat red meat (like beef or lamb) more than 3 times per week.", riskWeight: 'MEDIUM', answerIncreasesRisk: true, explanation: "High red meat consumption can increase your risk. Try swapping in fish or chicken." },
        { prompt: "I am mostly sedentary and get less than 30 minutes of intentional exercise most days.", riskWeight: 'MEDIUM', answerIncreasesRisk: true, explanation: "A sedentary lifestyle is a key risk factor. Regular activity helps keep your colon healthy." },
        { prompt: "I rarely eat high-fiber foods like fruits, vegetables, or whole grains.", riskWeight: 'MEDIUM', answerIncreasesRisk: true, explanation: "Fiber is crucial for a healthy colon. It helps move waste through your system." },
        { prompt: "I am currently overweight.", riskWeight: 'MEDIUM', answerIncreasesRisk: true, explanation: "Being overweight or obese increases your risk of developing colorectal cancer." },
        { prompt: "I have been diagnosed with Type 2 diabetes.", riskWeight: 'MEDIUM', answerIncreasesRisk: true, explanation: "Type 2 diabetes has been linked to an increased risk of colorectal cancer." },

        // Low-Risk
        { prompt: "I usually choose white bread and white rice over whole-grain options.", riskWeight: 'LOW', answerIncreasesRisk: true, explanation: "Whole grains contain more fiber, which is important for colon health." },
        { prompt: "I often cook my food using high-heat methods like charring, grilling, or barbecuing.", riskWeight: 'LOW', answerIncreasesRisk: true, explanation: "Some studies suggest high-heat cooking may create chemicals linked to cancer risk." },
        { id: 'age-gate-under-45', prompt: "I am under 45, and I have *never* discussed my personal CRC risk with a doctor.", riskWeight: 'LOW', answerIncreasesRisk: true, explanation: "It's never too early to know your risk, especially if you have a family history." }
    ];

    // ======== FUNCTIONS ========

    function switchScreen(screenId) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenId].classList.add('active');
    }

    function validateOnboarding() { 
        const ageValid = ageInput.value >= 18 && ageInput.value <= 99;
        const sexValid = !!document.querySelector('input[name="sex"]:checked');
        const familyHistoryValid = !!document.querySelector('input[name="family-history"]:checked'); 
        startButton.disabled = !(ageValid && sexValid && familyHistoryValid); 
    }

    function startGame() { 
        userAge = parseInt(ageInput.value);
        userSex = document.querySelector('input[name="sex"]:checked').value;
        userFamilyHistory = document.querySelector('input[name="family-history"]:checked').value; 
        
        currentQuestionIndex = 0;
        riskScore = 0;

        // Reset category tracking
        Object.keys(riskByCategory).forEach(key => {
            riskByCategory[key] = 0;
            answersCount[key] = 0;
        });
        

        if (userSex === 'Male') riskScore += 5; 
        if (userFamilyHistory === 'Yes') {
            riskScore += WEIGHTS.HIGH;
            riskByCategory['Family & Genetics'] += WEIGHTS.HIGH;
            answersCount['Family & Genetics']++;
        }
        if (userAge > 50) riskScore += WEIGHTS.MEDIUM; 
        
        questions = allQuestions.filter(q => !q.id); 
        
        if (userAge >= 45) {
            questions.push(allQuestions.find(q => q.id === 'age-gate-over-45'));
        } else {
            questions.push(allQuestions.find(q => q.id === 'age-gate-under-45'));
        }
        
        updateRiskBar();
        loadQuestion();
        switchScreen('game');
    }

    function loadQuestion() {
        if (currentQuestionIndex < questions.length) {
            const q = questions[currentQuestionIndex];
            questionText.textContent = q.prompt;
            progressCounter.textContent = `${currentQuestionIndex + 1} / ${questions.length}`;
            feedbackExplanation.textContent = ''; 
        } else {
            endGame();
        }
    }


    function updateRiskBar(riskIncrease = 0) {
        const previousScore = riskScore - riskIncrease;
        riskScore = Math.max(0, Math.min(100, riskScore));
        
        riskFactorBar.style.width = `${Math.max(1, riskScore)}%`;
        
        // Determine risk level and colors
        let newLevel = '';
        if (riskScore < 33) {
            riskFactorBar.style.backgroundColor = 'var(--color-risk-low)';
            riskFactorLabel.style.color = 'var(--color-risk-low)';
            newLevel = 'LOW RISK';
        } else if (riskScore < 66) {
            riskFactorBar.style.backgroundColor = 'var(--color-risk-medium)';
            riskFactorLabel.style.color = 'var(--color-risk-medium)';
            newLevel = 'MEDIUM RISK';
        } else {
            riskFactorBar.style.backgroundColor = 'var(--color-risk-high)';
            riskFactorLabel.style.color = 'var(--color-risk-high)';
            newLevel = 'HIGH RISK';
        }
        
        // Add animations when risk increases
        if (riskIncrease > 0) {
            // Remove any existing animation classes
            riskFactorBar.classList.remove('risk-bar-pulse', 'risk-bar-shake', 'risk-bar-flash');
            riskFactorLabel.classList.remove('risk-label-glow');
            
            // Trigger reflow to restart animation
            void riskFactorBar.offsetWidth;
            
            // Small increase: pulse
            if (riskIncrease <= 5) {
                riskFactorBar.classList.add('risk-bar-pulse');
            }
            // Medium increase: shake + pulse
            else if (riskIncrease <= 10) {
                riskFactorBar.classList.add('risk-bar-pulse', 'risk-bar-shake');
                riskFactorLabel.classList.add('risk-label-glow');
            }
            // Large increase: all effects
            else {
                riskFactorBar.classList.add('risk-bar-pulse', 'risk-bar-shake', 'risk-bar-flash');
                riskFactorLabel.classList.add('risk-label-glow');
            }
            
            // Check if we crossed a risk threshold
            const previousLevel = previousScore < 33 ? 'LOW' : previousScore < 66 ? 'MEDIUM' : 'HIGH';
            const currentLevel = riskScore < 33 ? 'LOW' : riskScore < 66 ? 'MEDIUM' : 'HIGH';
            
            if (previousLevel !== currentLevel) {
                // Extra emphasis when crossing thresholds
                riskFactorLabel.classList.add('risk-label-glow');
            }
            
            // Clean up animation classes after animations complete
            setTimeout(() => {
                riskFactorBar.classList.remove('risk-bar-pulse', 'risk-bar-shake', 'risk-bar-flash');
                riskFactorLabel.classList.remove('risk-label-glow');
            }, 800);
        }
        riskFactorLabel.textContent = newLevel;
    }

    function categorizeQuestion(prompt) {
        if (prompt.includes('meat') || prompt.includes('fiber') || prompt.includes('grain') || prompt.includes('cook')) {
            return 'Diet & Nutrition';
        } else if (prompt.includes('smoke') || prompt.includes('alcohol') || prompt.includes('exercise') || prompt.includes('sedentary') || prompt.includes('overweight')) {
            return 'Lifestyle';
        } else if (prompt.includes('blood') || prompt.includes('stool') || prompt.includes('polyp') || prompt.includes('IBD') || prompt.includes('diabetes') || prompt.includes('screening')) {
            return 'Medical History';
        } else if (prompt.includes('relative') || prompt.includes('family')) {
            return 'Family & Genetics';
        }
        return 'Medical History';
    }

    /**
     * Handles the user's answer (swipe)
     */
    function handleAnswer(direction) {
        if (direction === 'down') {
            // N/A - just skip
            animateSwipe('down');
            return;
        }

        const question = questions[currentQuestionIndex];
        const userChoseAiyo = (direction === 'left'); // 'Aiyo' is swipe left
        
        let riskIncrease = 0;
        const category = categorizeQuestion(question.prompt);

        if (userChoseAiyo) {
            // User swiped 'Aiyo', which means this is a risk factor for them.
            riskIncrease = (WEIGHTS[question.riskWeight] || WEIGHTS.LOW);
            riskScore += riskIncrease;

            riskByCategory[category] += riskIncrease;
            answersCount[category]++;

            // Standardized feedback: ALWAYS show the default "Aiyo!"
            feedbackWrong.textContent = 'Aiyo!';
            
            // Trigger the 'wrong' (left) animation
            animateSwipe('wrong'); 
        
        } else {
            // User swiped 'Steady'. This is a good answer.
            riskScore -= WEIGHTS.LOW / 2; // Reduce risk slightly
            
            // Standardized feedback: ALWAYS show the default "Steady!"
            feedbackCorrect.textContent = 'Steady!'; 
            
            // Trigger the 'correct' (right) animation
            animateSwipe('correct');
        }

        // Show feedback explanation (this is still valuable)
        feedbackExplanation.textContent = question.explanation || 'Good habit!';

        updateRiskBar(riskIncrease);
    }


    /**
     * Triggers swipe animations and loads next question
     */
    function animateSwipe(type) {
        // Disable further swipes during animation
        isSwiping = true;

        switch (type) {
            case 'correct':
                questionCard.classList.add('swipe-right');
                feedbackCorrect.style.opacity = 1;
                break;
            case 'wrong':
                questionCard.classList.add('swipe-left');
                feedbackWrong.style.opacity = 1;
                break;
            case 'down':
                questionCard.classList.add('swipe-down');
                break;
        }

        // Wait for animation to finish
        setTimeout(() => {
            // Reset card
            questionCard.classList.remove('swipe-left', 'swipe-right', 'swipe-down');
            feedbackCorrect.style.opacity = 0;
            feedbackWrong.style.opacity = 0;
            
            // --- UPDATED: Reset feedback text to standardized defaults ---
            feedbackCorrect.textContent = 'Steady! (NO)'; // Matches index.html
            feedbackWrong.textContent = 'Aiyo! (YES)';     // Matches index.html
            // ------------------------------------------

            // Load next question
            currentQuestionIndex++;
            loadQuestion();
            
            // Re-enable swiping
            isSwiping = false;
        }, 500); // Must match animation duration
    }

    function animateScoreGauge(finalScore) {
        const scoreArc = document.getElementById('score-arc');
        const scoreNumber = document.getElementById('score-number');
        
        if (!scoreArc || !scoreNumber) return;
        
        const maxOffset = 188.5;
        const targetOffset = maxOffset - (finalScore / 100 * maxOffset);
        
        let color = 'var(--color-risk-low)';
        if (finalScore >= 66) color = 'var(--color-risk-high)';
        else if (finalScore >= 33) color = 'var(--color-risk-medium)';
        
        scoreArc.style.stroke = color;
        scoreArc.style.strokeDashoffset = targetOffset;
        
        let currentScore = 0;
        const increment = finalScore / 60;
        const timer = setInterval(() => {
            currentScore += increment;
            if (currentScore >= finalScore) {
                currentScore = finalScore;
                clearInterval(timer);
            }
            scoreNumber.textContent = Math.round(currentScore);
            scoreNumber.style.fill = color;
        }, 30);
    }

    function populateRiskBreakdown() {
        const container = document.getElementById('breakdown-categories');
        if (!container) return;
        
        container.innerHTML = '';
        
        const sortedCategories = Object.entries(riskByCategory)
            .sort((a, b) => b[1] - a[1])
            .filter(([_, risk]) => risk > 0);
        
        sortedCategories.forEach(([category, risk]) => {
            const count = answersCount[category];
            const percentage = Math.min(100, (risk / 45) * 100);
            
            let badge = 'low';
            let badgeText = 'Low';
            if (risk >= 25) {
                badge = 'high';
                badgeText = 'High Impact';
            } else if (risk >= 15) {
                badge = 'medium';
                badgeText = 'Moderate';
            }
            
            let color = 'var(--color-risk-low)';
            if (risk >= 25) color = 'var(--color-risk-high)';
            else if (risk >= 15) color = 'var(--color-risk-medium)';
            
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'risk-category';
            categoryDiv.innerHTML = `
                <div class="category-header">
                    <span class="category-name">${category}</span>
                    <span class="category-badge badge-${badge}">${badgeText}</span>
                </div>
                <div class="category-bar">
                    <div class="category-bar-fill" style="width: 0%; background: ${color};"></div>
                </div>
                <div class="category-count">${count} risk factor${count !== 1 ? 's' : ''} identified</div>
            `;
            container.appendChild(categoryDiv);
            
            setTimeout(() => {
                const barFill = categoryDiv.querySelector('.category-bar-fill');
                barFill.style.width = `${percentage}%`;
            }, 100);
        });
        
        if (sortedCategories.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-risk-low); font-weight: 600;">Great job! No significant risk factors identified.</p>';
        }
    }

    function setupAccordions() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isActive = header.classList.contains('active');
                
                document.querySelectorAll('.accordion-header').forEach(h => {
                    h.classList.remove('active');
                    h.nextElementSibling.classList.remove('active');
                });
                
                if (!isActive) {
                    header.classList.add('active');
                    content.classList.add('active');
                }
            });
        });
    }

    function updateScoreComparison(score) {
        const comparisonElement = document.getElementById('score-comparison');
        if (!comparisonElement) return;
        
        let comparisonText = '';
        
        if (score < 25) {
            comparisonText = 'Your score is <strong>lower than average</strong> for your age group. Great lifestyle choices!';
        } else if (score < 40) {
            comparisonText = 'Your score is <strong>about average</strong> for your age group.';
        } else if (score < 60) {
            comparisonText = 'Your score is <strong>slightly higher than average</strong> for your age group.';
        } else {
            comparisonText = 'Your score is <strong>higher than average</strong> for your age group. Consider talking to your doctor.';
        }
        comparisonElement.innerHTML = comparisonText;
    }

    function endGame() { 
        const finalLabel = riskFactorLabel.textContent;
        resultsRiskLevel.textContent = finalLabel;
        resultsRiskLevel.style.color = riskFactorLabel.style.color;

        let summaryText = '';
        if (riskScore < 33) {
            summaryText = "Your answers show you're making great lifestyle choices. Keep it up!";
        } else if (riskScore < 66) {
            summaryText = "Your answers show a few risk areas, likely related to diet or exercise. Good job being aware!";
        } else {
            summaryText = "Your answers show several key risk factors. It's a great time to talk to a doctor about your personal health and screening options.";
        }
        
        if (userFamilyHistory === 'Yes') {
            summaryText += " The family history you noted is also a key factor to discuss with your doctor.";
        }
        
        resultsSummary.textContent = summaryText;

        // Populate interactive results
        animateScoreGauge(riskScore);
        populateRiskBreakdown();
        setupAccordions();
        updateScoreComparison(riskScore);
        switchScreen('results');
    }

    function resetGame() {
        ageInput.value = '';
        sexInputs.forEach(input => input.checked = false);
        familyHistoryInputs.forEach(input => input.checked = false);
        startButton.disabled = true;
        switchScreen('onboarding');
    }

    // ======== SWIPE DETECTION LOGIC (Unchanged) ========
    let startX = 0, startY = 0, distX = 0, distY = 0, isSwiping = false;
    const swipeThreshold = 80;
    const swipeAngleThreshold = 45;

    cardContainer.addEventListener('mousedown', (e) => {
        if (isSwiping) return;
        startX = e.clientX; startY = e.clientY;
        isSwiping = true;
        questionCard.classList.add('dragging');
        e.preventDefault();
    });
    cardContainer.addEventListener('touchstart', (e) => {
        if (isSwiping) return;
        const touch = e.changedTouches[0];
        startX = touch.clientX; startY = touch.clientY;
        isSwiping = true;
        questionCard.classList.add('dragging');
        e.preventDefault();
    });

    // --- UPDATED with GLOW logic ---
    cardContainer.addEventListener('mousemove', (e) => {
        if (!isSwiping) return;
        distX = e.clientX - startX; distY = e.clientY - startY;
        questionCard.style.transform = `translate(${distX}px, ${distY}px) rotate(${distX / 20}deg)`;

        // --- NEW GLOW LOGIC ---
        if (distX > 20) {
            // Swiping Right (Steady)
            feedbackCorrect.style.opacity = Math.min(distX / 100, 1);
            feedbackWrong.style.opacity = 0;
            // Set glow color to green (using your CSS variable)
            glowOverlay.style.setProperty('--glow-color', 'rgba(76, 175, 80, 0.4)');
            glowOverlay.style.opacity = Math.min(distX / 100, 0.7); // 0.7 max opacity
        } else if (distX < -20) {
            // Swiping Left (Aiyo)
            feedbackWrong.style.opacity = Math.min(Math.abs(distX) / 100, 1);
            feedbackCorrect.style.opacity = 0;
            // Set glow color to red (using your CSS variable)
            glowOverlay.style.setProperty('--glow-color', 'rgba(244, 67, 54, 0.4)');
            glowOverlay.style.opacity = Math.min(Math.abs(distX) / 100, 0.7); // 0.7 max opacity
        } else {
            // Near center, no glow
            glowOverlay.style.opacity = 0;
        }
        // --- END GLOW LOGIC ---
    });

    // --- UPDATED with GLOW logic ---
    cardContainer.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        const touch = e.changedTouches[0];
        distX = touch.clientX - startX; distY = touch.clientY - startY;
        questionCard.style.transform = `translate(${distX}px, ${distY}px) rotate(${distX / 20}deg)`;

        // --- NEW GLOW LOGIC (Identical to mousemove) ---
        if (distX > 20) {
            feedbackCorrect.style.opacity = Math.min(distX / 100, 1);
            feedbackWrong.style.opacity = 0;
            glowOverlay.style.setProperty('--glow-color', 'rgba(76, 175, 80, 0.4)');
            glowOverlay.style.opacity = Math.min(distX / 100, 0.7);
        } else if (distX < -20) {
            feedbackWrong.style.opacity = Math.min(Math.abs(distX) / 100, 1);
            feedbackCorrect.style.opacity = 0;
            glowOverlay.style.setProperty('--glow-color', 'rgba(244, 67, 54, 0.4)');
            glowOverlay.style.opacity = Math.min(Math.abs(distX) / 100, 0.7);
        } else {
            glowOverlay.style.opacity = 0;
        }
        // --- END GLOW LOGIC ---

        e.preventDefault();
    });

    // --- UPDATED with GLOW logic ---
    const endSwipe = (e) => {
        if (!isSwiping) return;
        questionCard.classList.remove('dragging');
        questionCard.style.transform = '';
        feedbackCorrect.style.opacity = 0;
        feedbackWrong.style.opacity = 0;

        glowOverlay.style.opacity = 0; // <-- ADDED: Fades out the glow
        
        const angle = Math.atan2(Math.abs(distY), Math.abs(distX)) * (180 / Math.PI);
        if (Math.abs(distX) > swipeThreshold && angle < swipeAngleThreshold) {
            handleAnswer(distX > 0 ? 'right' : 'left');
        } else if (Math.abs(distY) > swipeThreshold && angle > (90 - swipeAngleThreshold)) {
            if (distY > 0) handleAnswer('down');
            else isSwiping = false;
        } else {
            isSwiping = false;
        }
        distX = 0; distY = 0;
    };
    cardContainer.addEventListener('mouseup', endSwipe);
    cardContainer.addEventListener('mouseleave', endSwipe);
    cardContainer.addEventListener('touchend', endSwipe);

    // ======== EVENT LISTENERS ========
    
    ageInput.addEventListener('input', validateOnboarding);
    sexInputs.forEach(input => input.addEventListener('change', validateOnboarding));
    familyHistoryInputs.forEach(input => input.addEventListener('change', validateOnboarding)); 

    onboardingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        startGame();
    });

    playAgainBtn.addEventListener('click', resetGame);

    // ======== INITIALIZATION ========
    switchScreen('onboarding'); 
});