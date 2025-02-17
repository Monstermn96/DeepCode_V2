import { useState } from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import styles from "./WelcomeControlPanel.module.css";
import {
	SUPPORTED_LANGUAGES,
	type SupportedLanguage,
} from "../services/ai/openai";

interface WelcomeControlPanelProps {
	onGenerateNew: (description: string, languages: SupportedLanguage[]) => void;
	isLoading: boolean;
}

export default function WelcomeControlPanel({
	onGenerateNew,
	isLoading,
}: WelcomeControlPanelProps) {
	const [description, setDescription] = useState("");
	const [selectedLanguages, setSelectedLanguages] = useState<
		SupportedLanguage[]
	>([]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (description.trim() && selectedLanguages.length > 0) {
			onGenerateNew(description, selectedLanguages);
		}
	};

	const toggleLanguage = (language: SupportedLanguage) => {
		setSelectedLanguages((prev) =>
			prev.includes(language)
				? prev.filter((lang) => lang !== language)
				: [...prev, language]
		);
	};

	return (
		<div className={styles.panel}>
			<h2 className={styles.title}>Generate New Challenge</h2>
			<form onSubmit={handleSubmit} className={styles.form}>
				<div className={styles.inputGroup}>
					<label htmlFor="description">
						Describe Your Challenge
						<span className={styles.required}>*</span>
					</label>
					<SimpleBar className={styles.textareaWrapper}>
						<textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Example: A easy logic problem involving strings or A really challenging security problem"
							className={styles.textarea}
							required
						/>
					</SimpleBar>
					<div className={styles.charCount}>
						{description.length}/500 characters
					</div>
				</div>

				<div className={styles.languageSelection}>
					<label>
						Select Languages
						<span className={styles.required}>*</span>
						<span className={styles.hint}>(Choose at least one)</span>
					</label>
					<div className={styles.languageButtons}>
						{SUPPORTED_LANGUAGES.map((language) => (
							<button
								key={language}
								type="button"
								className={`${styles.languageButton} ${
									selectedLanguages.includes(language) ? styles.selected : ""
								}`}
								onClick={() => toggleLanguage(language)}
								aria-pressed={selectedLanguages.includes(language)}
							>
								{language}
							</button>
						))}
					</div>
				</div>

				<button
					type="submit"
					className={styles.generateButton}
					disabled={
						isLoading || !description.trim() || selectedLanguages.length === 0
					}
				>
					{isLoading ? (
						<>
							<span className={styles.spinner}></span>
							Generating...
						</>
					) : (
						<>
							<span className={styles.icon}>⚡</span>
							Generate Challenge
						</>
					)}
				</button>
			</form>
		</div>
	);
}
