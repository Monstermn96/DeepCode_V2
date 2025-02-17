import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAI } from "../contexts/AIContext";
import { aiService } from "../services/ai/openai";
import {
	SUPPORTED_LANGUAGES,
	type SupportedLanguage,
} from "../services/ai/openai";
import styles from "./ChallengeView.module.css";

interface TestResult {
	passed: boolean;
	actual?: string;
	explanation?: string;
}

export function ChallengeView() {
	const { challengeId } = useParams();
	const navigate = useNavigate();
	const { currentChallenge, generateChallenge } = useAI();
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
		if (currentChallenge.problem?.starterCode) {
			setCode(currentChallenge.problem.starterCode);
		}

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
		if (!currentChallenge) return;

		try {
			console.log("Running tests for challenge:", challengeId);
			setIsRunning(true);

			const response = await aiService.evaluateCode(
				code,
				currentChallenge.problem.testCases.map((testCase) => ({
					input: testCase.input,
					expectedOutput: testCase.expectedOutput,
				})),
				currentChallenge.problem.language as "C#" | "Java" | "Python"
			);

			console.log("Test results:", response);

			// Map the evaluation response to test results
			const results = response.data.results.map((passed, index) => ({
				passed,
				explanation: response.data.explanations[index],
			}));

			setTestResults(results);
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
			<div className={styles.problemPanel}>
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
								<div>
									Description: <code>{testCase.description}</code>
								</div>
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
					<div className={styles.hints}>
						<h2>Hints</h2>
						<ul>
							{currentChallenge.problem.hints.map((hint, index) => (
								<li key={index}>{hint}</li>
							))}
						</ul>
					</div>
				)}
			</div>

			<div className={styles.editorPanel}>
				<div className={styles.editorHeader}>
					<span>{currentChallenge.problem.language}</span>
				</div>

				<div className={styles.editor}>
					{/* TODO: Integrate Monaco Editor */}
					<textarea
						value={code}
						onChange={(e) => setCode(e.target.value)}
						className={styles.textarea}
						placeholder="Your code here..."
					/>
				</div>
			</div>

			<div className={styles.footerPanel}>
				<div className={styles.footerContent}>
					<div className={styles.inputGroup}>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Describe the challenge you want to generate..."
							className={styles.descriptionInput}
						/>
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
							className={styles.runButton}
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
