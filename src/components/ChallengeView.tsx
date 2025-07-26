import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { useAI } from "../contexts/AIContext";
import { aiService } from "../services/ai/openai";
import {
	SUPPORTED_LANGUAGES,
	type SupportedLanguage,
} from "../services/ai/openai";
import { CodeEditor } from "./CodeEditor";
import styles from "./ChallengeView.module.css";
import { useAuth } from '../contexts/AuthContext';
import { skillAssessmentService } from '../services/learning/skillAssessmentService';
import { learningPathService } from '../services/learning/learningPathService';
import { UserStatsService } from '../services/stats/userStats';

interface TestResult {
	passed: boolean;
	actual?: string;
	explanation?: string;
}

export function ChallengeView() {
	const { challengeId } = useParams();
	const navigate = useNavigate();
	const { currentChallenge, generateChallenge } = useAI();
	const { user } = useAuth();
	const [code, setCode] = React.useState("");
	const [isRunning, setIsRunning] = React.useState(false);
	const [testResults, setTestResults] = React.useState<TestResult[]>([]);
	const [collapsedTests, setCollapsedTests] = React.useState<{
		[key: number]: boolean;
	}>({});
	const [description, setDescription] = React.useState("");
	const [selectedLanguages, setSelectedLanguages] = React.useState<
		SupportedLanguage[]
	>([]);
	const [isGenerating, setIsGenerating] = React.useState(false);
	const [hintsVisible, setHintsVisible] = React.useState(false);
	const [startTime] = React.useState<number>(Date.now());
	const [attempts, setAttempts] = React.useState(0);
	const [challengeCompleted, setChallengeCompleted] = React.useState(false);

	const toggleTestCase = (index: number) => {
		setCollapsedTests((prev) => ({
			...prev,
			[index]: !prev[index],
		}));
	};

	React.useEffect(() => {
		if (!currentChallenge) {
			console.log("No challenge found, redirecting to dashboard");
			navigate("/dashboard");
			return;
		}

		console.log("Loading challenge:", {
			id: challengeId,
			challenge: currentChallenge,
		});

		// Initialize editor with starter code if available
		// TODO: Add starterCode field to challenge problem type
		// if (currentChallenge.problem?.starterCode) {
		// 	setCode(currentChallenge.problem.starterCode);
		// }

		// Initialize all test cases as collapsed
		if (currentChallenge.problem?.testCases) {
			const initialCollapsedState = currentChallenge.problem.testCases.reduce(
				(acc, _, index) => ({ ...acc, [index]: true }),
				{}
			);
			setCollapsedTests(initialCollapsedState);
		}
	}, [challengeId, currentChallenge, navigate]);

	const handleRunTests = async () => {
		if (!currentChallenge || !user?.userId) return;

		try {
			console.log("Running tests for challenge:", challengeId);
			setIsRunning(true);
			setAttempts(prev => prev + 1);

			const response = await aiService.evaluateCode(
				code,
				currentChallenge.problem.testCases.map((testCase) => ({
					input: testCase.input,
					expectedOutput: testCase.expectedOutput,
				})),
				currentChallenge.problem.language as "C#" | "Java" | "Python",
				user?.userId
			);

			console.log("Test results:", response);

			// Map the evaluation response to test results
			const results = response.data.results.map((passed, index) => ({
				passed,
				explanation: response.data.explanations[index],
			}));

			setTestResults(results);

			// Check if all tests passed
			const allTestsPassed = results.every(result => result.passed);
			
			if (allTestsPassed && !challengeCompleted) {
				setChallengeCompleted(true);
				
				// Calculate time spent
				const timeSpent = Math.round((Date.now() - startTime) / 1000); // in seconds
				
				// Get challenge ID
				const challengeIdStr = currentChallenge.problem.id || `challenge-${Date.now()}`;
				
				try {
					// Update skill assessments
					const analysis = await skillAssessmentService.analyzeChallengeCompletion(
						user.userId,
						challengeIdStr,
						code,
						true, // success
						timeSpent,
						attempts
					);
					
					console.log("Skill analysis completed:", analysis);
					
					// Update user stats
					const statsService = UserStatsService.getInstance();
					await statsService.updateChallengeCompletion(user.userId, true);
					
					// Update learning path progress if user has active paths
					// Note: In a real app, we'd need to track which learning path is active
					const activePaths = await learningPathService.getUserLearningPaths(user.userId);
					for (const path of activePaths) {
						await learningPathService.updateProgress(
							path.id,
							challengeIdStr,
							analysis.skillsUsed
						);
					}
					
					// Show success message
					console.log("Challenge completed successfully! Skills improved:", analysis.skillImprovements);
				} catch (error) {
					console.error("Failed to update progress tracking:", error);
				}
			}
		} catch (error) {
			console.error("Failed to run tests:", error);
		} finally {
			setIsRunning(false);
		}
	};

	const handleGenerateNew = async () => {
		if (!description.trim() || selectedLanguages.length === 0) return;

		try {
			setIsGenerating(true);
			await generateChallenge({
				type: "challenge",
				topic: description,
				languages: selectedLanguages,
			});
		} catch (error) {
			console.error("Failed to generate challenge:", error);
		} finally {
			setIsGenerating(false);
		}
	};

	const toggleLanguage = (language: SupportedLanguage) => {
		setSelectedLanguages((prev) =>
			prev.includes(language)
				? prev.filter((lang) => lang !== language)
				: [...prev, language]
		);
	};

	if (!currentChallenge?.problem) {
		return null;
	}

	return (
		<div className={styles.challengeView}>
			<SimpleBar className={styles.problemPanel}>
				<h1 className={styles.title}>{currentChallenge.problem.title}</h1>
				<div className={styles.description}>
					{currentChallenge.problem.description}
				</div>

				<div className={styles.testCases}>
					<h2>Test Cases</h2>
					{currentChallenge.problem.testCases?.map((testCase, index) => (
						<div key={index} className={styles.testCase}>
							<div
								className={styles.testHeader}
								onClick={() => toggleTestCase(index)}
								role="button"
								tabIndex={0}
								onKeyPress={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										toggleTestCase(index);
									}
								}}
							>
								<div className={styles.testHeaderLeft}>
									<span className={styles.collapseIcon}>
										{collapsedTests[index] ? "▶" : "▼"}
									</span>
									<span>Test {index + 1}</span>
								</div>
								{testResults[index] && (
									<span
										className={`${styles.testResult} ${
											testResults[index].passed ? styles.passed : styles.failed
										}`}
									>
										{testResults[index].passed ? "✓" : "✗"}
									</span>
								)}
							</div>
							<div
								className={`${styles.testDetails} ${
									collapsedTests[index] ? styles.collapsed : ""
								}`}
							>
								<div>
									Input: <code>{testCase.input}</code>
								</div>
								<div>
									Expected: <code>{testCase.expectedOutput}</code>
								</div>
								{testCase.explanation && (
									<div>
										Description: <code>{testCase.explanation}</code>
									</div>
								)}
								{testResults[index] && !testResults[index].passed && (
									<div className={styles.explanation}>
										{testResults[index].explanation}
									</div>
								)}
							</div>
						</div>
					))}
				</div>

				{currentChallenge.problem.hints?.length > 0 && (
					<div
						className={`${styles.hints} ${!hintsVisible ? styles.hidden : ""}`}
					>
						<h2>Hints</h2>
						<ul>
							{currentChallenge.problem.hints.map((hint, index) => (
								<li key={index}>{hint}</li>
							))}
						</ul>
					</div>
				)}
			</SimpleBar>

			<div className={styles.editorPanel}>
				<div className={styles.editorHeader}>
					<span>{currentChallenge.problem.language}</span>
					<button
						className={`${styles.hintToggle} ${
							hintsVisible ? styles.enabled : styles.disabled
						}`}
						onClick={() => setHintsVisible(!hintsVisible)}
						title={hintsVisible ? "Hide Hints" : "Show Hints"}
					>
						{hintsVisible ? "💡 Hints On" : "💡 Hints Off"}
					</button>
				</div>

				<div className={styles.editor}>
					<CodeEditor
						code={code}
						onChange={setCode}
						language={currentChallenge.problem.language}
						height="100%"
					/>
				</div>
			</div>

			<div className={styles.footerPanel}>
				<div className={styles.footerContent}>
					<div className={styles.inputGroup}>
						<SimpleBar className={styles.descriptionWrapper}>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Describe the challenge you want to generate..."
								className={styles.descriptionInput}
							/>
						</SimpleBar>
					</div>

					<div className={styles.languageSelection}>
						<div className={styles.languageButtons}>
							{SUPPORTED_LANGUAGES.map((language) => (
								<button
									key={language}
									type="button"
									className={`${styles.languageButton} ${
										selectedLanguages.includes(language) ? styles.selected : ""
									}`}
									onClick={() => toggleLanguage(language)}
								>
									{language}
								</button>
							))}
						</div>
					</div>

					<div className={styles.footerButtons}>
						<button
							className={styles.generateButton}
							onClick={handleRunTests}
							disabled={isRunning}
						>
							{isRunning ? (
								<>
									<div className={styles.loadingSpinner} />
									Running...
								</>
							) : (
								"Run Tests"
							)}
						</button>

						<button
							className={styles.generateButton}
							onClick={handleGenerateNew}
							disabled={
								isGenerating ||
								!description.trim() ||
								selectedLanguages.length === 0
							}
						>
							{isGenerating ? (
								<>
									<div className={styles.loadingSpinner} />
									Generating...
								</>
							) : (
								"Generate New Challenge"
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
