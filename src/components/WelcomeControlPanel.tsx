import { useState } from "react";
import styles from "./WelcomeControlPanel.module.css";

const SUPPORTED_LANGUAGES = ["C#", "Java", "Python"];

interface WelcomeControlPanelProps {
	onGenerateNew: (description: string, languages: string[]) => void;
	isLoading: boolean;
}

export default function WelcomeControlPanel({
	onGenerateNew,
	isLoading,
}: WelcomeControlPanelProps) {
	const [description, setDescription] = useState("");
	const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
	const [validationError, setValidationError] = useState<string | null>(null);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setValidationError(null);

		const trimmedDescription = description.trim();
		if (!trimmedDescription) {
			setValidationError("Please describe your challenge");
			return;
		}

		if (selectedLanguages.length === 0) {
			setValidationError("Please select at least one programming language");
			return;
		}

		onGenerateNew(trimmedDescription, selectedLanguages);
	};

	const toggleLanguage = (language: string) => {
		setSelectedLanguages((prev) =>
			prev.includes(language)
				? prev.filter((lang) => lang !== language)
				: [...prev, language]
		);
		setValidationError(null);
	};

	return (
		<div className={styles.panel}>
			<h2>Generate New Challenge</h2>
			<form onSubmit={handleSubmit} className={styles.form}>
				<div className={styles.inputGroup}>
					<label htmlFor="description">Describe Your Challenge</label>
					<textarea
						id="description"
						value={description}
						onChange={(e) => {
							setDescription(e.target.value);
							setValidationError(null);
						}}
						placeholder="Example: A easy logic problem involving strings or A really challenging security problem"
						className={`${styles.textarea} ${
							validationError && !description.trim() ? styles.error : ""
						}`}
						disabled={isLoading}
						required
					/>
				</div>

				<div className={styles.languageSelection}>
					<label>Select Languages</label>
					<div className={styles.languageButtons}>
						{SUPPORTED_LANGUAGES.map((language) => (
							<button
								key={language}
								type="button"
								className={`${styles.languageButton} ${
									selectedLanguages.includes(language) ? styles.selected : ""
								}`}
								onClick={() => toggleLanguage(language)}
								disabled={isLoading}
							>
								{language}
							</button>
						))}
					</div>
				</div>

				{validationError && (
					<div className={styles.validationError}>{validationError}</div>
				)}

				<button
					type="submit"
					className={`${styles.generateButton} ${
						isLoading ? styles.loading : ""
					}`}
					disabled={
						isLoading || !description.trim() || selectedLanguages.length === 0
					}
				>
					{isLoading ? (
						<>
							<div className={styles.buttonSpinner} />
							Generating Challenge...
						</>
					) : (
						"Generate Challenge"
					)}
				</button>
			</form>
		</div>
	);
}
