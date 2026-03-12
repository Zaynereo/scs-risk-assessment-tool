_handleAnswer(dir) {
        const question = this.state.getCurrentQuestion();
        if (!question || this._isExplanationVisible) return;

        this.ui.pulseScreen(dir);
        const userAnswer = (dir === 'left') ? 'No' : 'Yes';

        const targets = question.targets || [{
            cancerType: question.cancerType,
            weight: question.weight,
            yesValue: question.yesValue,
            noValue: question.noValue,
            category: question.category
        }];

        let totalContribution = 0;
        for (const target of targets) {
            const weight = target.weight || 0;
            const riskContribution = weight * (((userAnswer === 'Yes') ? (target.yesValue ?? 100) : (target.noValue ?? 0)) / 100);
            
            this.answers.push({
                questionId: question.id, 
                userAnswer,
                riskContribution, 
                isRisk: riskContribution > 0,
                category: target.category
            });

            if (riskContribution > 0) {
                this.state.addRiskScore(riskContribution);
                this.state.addCategoryRisk(target.category, riskContribution);
            }
            totalContribution += riskContribution;
        }

        const isRisk = totalContribution > 0;
        this.ui.showFeedback(!isRisk);

        // Fix: Trigger mascot state change BEFORE starting the card animation
        this.mascot.startAnimation(isRisk ? 'Shocked' : 'Good');

        const hasMoreQuestions = this.state.nextQuestion();
        this.ui.animateCardSwipe(dir, () => {
            const explanationText = (userAnswer === 'Yes') ? question.explanationYes : question.explanationNo;
            if (explanationText) {
                this._isExplanationVisible = true;
                this.ui.showExplanation(question, userAnswer, this.t('game', 'continueButton'));
                this._onExplanationContinue = () => {
                    this._isExplanationVisible = false;
                    this.ui.hideExplanation();
                    if (hasMoreQuestions) this._showNextQuestion();
                    else this._showResults();
                };
            } else {
                if (hasMoreQuestions) this._showNextQuestion();
                else this._showResults();
            }
        });
    }
