import { useEffect, useRef, useState } from "react";
import Editor, { BeforeMount } from "@monaco-editor/react";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import "./CodeEditor.css";

// Configure Monaco Editor CDN
loader.config({
	paths: {
		vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
	},
});

interface CodeEditorProps {
	code: string;
	onChange: (value: string) => void;
	language: string;
	readOnly?: boolean;
	height?: string;
}

// Map our language names to Monaco's language identifiers
const getMonacoLanguage = (language: string): string => {
	const languageMap: { [key: string]: string } = {
		"C#": "csharp",
		Java: "java",
		Python: "python",
	};
	return languageMap[language] || language.toLowerCase();
};

// Language-specific snippets and completions
const LANGUAGE_FEATURES = {
	python: {
		snippets: [
			{
				label: "def",
				insertText: "def ${1:function_name}(${2:parameters}):\n\t${3:pass}",
				documentation: "Function definition",
				kind: monaco.languages.CompletionItemKind.Snippet,
			},
			{
				label: "class",
				insertText:
					"class ${1:ClassName}:\n\tdef __init__(self):\n\t\t${2:pass}",
				documentation: "Class definition",
				kind: monaco.languages.CompletionItemKind.Snippet,
			},
			{
				label: "for",
				insertText: "for ${1:item} in ${2:items}:\n\t${3:pass}",
				documentation: "For loop",
				kind: monaco.languages.CompletionItemKind.Snippet,
			},
		],
		keywords: [
			"def",
			"class",
			"if",
			"else",
			"elif",
			"for",
			"while",
			"try",
			"except",
			"finally",
			"with",
			"as",
			"import",
			"from",
			"return",
			"yield",
			"break",
			"continue",
			"pass",
			"raise",
		],
	},
	java: {
		snippets: [
			{
				label: "class",
				insertText: "public class ${1:ClassName} {\n\t${2}\n}",
				documentation: "Class definition",
				kind: monaco.languages.CompletionItemKind.Snippet,
			},
			{
				label: "main",
				insertText: "public static void main(String[] args) {\n\t${1}\n}",
				documentation: "Main method",
				kind: monaco.languages.CompletionItemKind.Snippet,
			},
			{
				label: "sout",
				insertText: "System.out.println(${1});",
				documentation: "Print to console",
				kind: monaco.languages.CompletionItemKind.Snippet,
			},
		],
		keywords: [
			"public",
			"private",
			"protected",
			"class",
			"interface",
			"extends",
			"implements",
			"return",
			"if",
			"else",
			"for",
			"while",
			"do",
			"break",
			"continue",
			"new",
			"try",
			"catch",
			"finally",
			"throw",
			"throws",
		],
	},
	csharp: {
		snippets: [
			{
				label: "class",
				insertText: "public class ${1:ClassName}\n{\n\t${2}\n}",
				documentation: "Class definition",
				kind: monaco.languages.CompletionItemKind.Snippet,
			},
			{
				label: "prop",
				insertText: "public ${1:int} ${2:PropertyName} { get; set; }",
				documentation: "Property",
				kind: monaco.languages.CompletionItemKind.Snippet,
			},
			{
				label: "ctor",
				insertText: "public ${1:ClassName}()\n{\n\t${2}\n}",
				documentation: "Constructor",
				kind: monaco.languages.CompletionItemKind.Snippet,
			},
		],
		keywords: [
			"public",
			"private",
			"protected",
			"class",
			"interface",
			"enum",
			"struct",
			"return",
			"if",
			"else",
			"for",
			"foreach",
			"while",
			"do",
			"break",
			"continue",
			"new",
			"try",
			"catch",
			"finally",
			"throw",
			"using",
			"namespace",
		],
	},
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
	code,
	onChange,
	language,
	readOnly = false,
	height = "100%",
}) => {
	const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
	const monacoRef = useRef<typeof monaco | null>(null);
	const [completionProvider, setCompletionProvider] =
		useState<monaco.IDisposable | null>(null);
	const [hoverProvider, setHoverProvider] = useState<monaco.IDisposable | null>(
		null
	);

	// Function to register language features
	const registerLanguageFeatures = (
		monacoInstance: typeof monaco,
		languageId: string
	) => {
		// Always dispose existing providers
		completionProvider?.dispose();
		hoverProvider?.dispose();
		setCompletionProvider(null);
		setHoverProvider(null);

		const features =
			LANGUAGE_FEATURES[languageId as keyof typeof LANGUAGE_FEATURES];

		if (features) {
			// Register completion provider
			const completion =
				monacoInstance.languages.registerCompletionItemProvider(languageId, {
					provideCompletionItems: (model, position) => {
						const word = model.getWordUntilPosition(position);
						const range = {
							startLineNumber: position.lineNumber,
							endLineNumber: position.lineNumber,
							startColumn: word.startColumn,
							endColumn: word.endColumn,
						};

						const suggestions = [
							...features.snippets,
							...features.keywords.map((keyword) => ({
								label: keyword,
								kind: monaco.languages.CompletionItemKind.Keyword,
								insertText: keyword,
								range,
							})),
						];

						return {
							suggestions: suggestions.map((s) => ({
								...s,
								range,
							})),
						};
					},
				});
			setCompletionProvider(completion);

			// Register hover provider
			const hover = monacoInstance.languages.registerHoverProvider(languageId, {
				provideHover: (model, position) => {
					const word = model.getWordAtPosition(position);
					if (!word) return null;

					const snippet = features.snippets.find((s) => s.label === word.word);
					if (snippet) {
						return {
							contents: [
								{ value: "**" + snippet.label + "**" },
								{ value: snippet.documentation as string },
							],
						};
					}

					return null;
				},
			});
			setHoverProvider(hover);
		}
	};

	// Configure editor before mount
	const beforeMount: BeforeMount = (monacoInstance) => {
		monacoRef.current = monacoInstance;

		// Register language features
		const languageId = getMonacoLanguage(language);
		registerLanguageFeatures(monacoInstance, languageId);

		// Define custom theme (2025 modern dark theme)
		monacoInstance.editor.defineTheme("modernDark", {
			base: "vs-dark",
			inherit: true,
			rules: [
				{ token: "comment", foreground: "6A9955" },
				{ token: "keyword", foreground: "C586C0" },
				{ token: "string", foreground: "CE9178" },
				{ token: "number", foreground: "B5CEA8" },
				{ token: "type", foreground: "4EC9B0" },
			],
			colors: {
				"editor.background": "#1E1E1E",
				"editor.foreground": "#D4D4D4",
				"editor.lineHighlightBackground": "#2F2F2F",
				"editor.selectionBackground": "#264F78",
				"editor.inactiveSelectionBackground": "#3A3D41",
				"editorCursor.foreground": "#AEAFAD",
				"editorWhitespace.foreground": "#404040",
				"editorLineNumber.foreground": "#858585",
				"editorLineNumber.activeForeground": "#C6C6C6",
				"editor.selectionHighlightBackground": "#ADD6FF26",
			},
		});
	};

	// Handle editor mount
	const handleEditorDidMount = (
		editor: monaco.editor.IStandaloneCodeEditor
	) => {
		editorRef.current = editor;

		// Set initial editor options
		editor.updateOptions({
			scrollBeyondLastLine: false,
			minimap: { enabled: false },
			scrollbar: {
				useShadows: true,
				verticalScrollbarSize: 12,
				horizontalScrollbarSize: 12,
				alwaysConsumeMouseWheel: false,
			},
			padding: { top: 16, bottom: 16 },
			fontSize: 14,
			fontFamily:
				"'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
			fontLigatures: true,
			lineHeight: 1.5,
			roundedSelection: true,
			renderLineHighlight: "all",
			renderWhitespace: "selection",
			bracketPairColorization: { enabled: true },
			guides: {
				bracketPairs: true,
				indentation: true,
				highlightActiveIndentation: true,
				bracketPairsHorizontal: true,
			},
			cursorBlinking: "smooth",
			cursorSmoothCaretAnimation: "on",
			smoothScrolling: true,
			contextmenu: true,
			multiCursorModifier: "alt",
			accessibilitySupport: "on",
			wordWrap: "on",
			wrappingStrategy: "advanced",
			formatOnPaste: true,
			formatOnType: true,
			autoClosingBrackets: "always",
			autoClosingQuotes: "always",
			autoSurround: "languageDefined",
			linkedEditing: true,
			showFoldingControls: "always",
			dragAndDrop: true,
			// Initial IntelliSense options (disabled by default)
			quickSuggestions: false,
			suggestOnTriggerCharacters: false,
			acceptSuggestionOnEnter: "off",
			tabCompletion: "off",
			wordBasedSuggestions: "off",
			parameterHints: { enabled: false },
			codeLens: false,
			inlayHints: { enabled: "off" },
			hover: { enabled: false },
		});

		// Force a layout update after mount
		setTimeout(() => {
			editor.layout();
		}, 100);
	};

	// Handle editor content changes
	const handleEditorChange = (value: string | undefined) => {
		onChange(value || "");
	};

	// Update editor layout on window resize
	useEffect(() => {
		const handleResize = () => {
			if (editorRef.current) {
				editorRef.current.layout();
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return (
		<div className="code-editor-container">
			<Editor
				height={height}
				defaultLanguage={getMonacoLanguage(language)}
				value={code}
				onChange={handleEditorChange}
				beforeMount={beforeMount}
				onMount={handleEditorDidMount}
				theme="modernDark"
				options={{
					readOnly,
					automaticLayout: true,
					overviewRulerBorder: false,
					hideCursorInOverviewRuler: true,
					overviewRulerLanes: 0,
					scrollBeyondLastColumn: 0,
					fixedOverflowWidgets: true,
				}}
				loading={
					<div className="editor-loading">
						<div className="loading-spinner"></div>
						<span>Loading editor...</span>
					</div>
				}
				className="monaco-editor-instance"
			/>
		</div>
	);
};
