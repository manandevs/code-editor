import { create } from "zustand";
import { editor } from "monaco-editor";
import { LANGUAGE_CONFIG } from "@/app/(root)/_constants";

interface ExecutionResult {
  code: string;
  output: string;
  error: string | null;
}

interface CodeEditorState {
  language: string;
  theme: string;
  fontSize: number;
  editor: editor.IStandaloneCodeEditor | null;
  output: string;
  error: string | null;
  isRunning: boolean;
  executionResult: ExecutionResult | null;

  // Actions
  setLanguage: (language: string) => void;
  setTheme: (theme: string) => void;
  setFontSize: (fontSize: number) => void;
  setEditor: (editor: editor.IStandaloneCodeEditor) => void;
  getCode: () => string;
  runCode: () => Promise<void>;
}

export const useCodeEditorStore = create<CodeEditorState>((set, get) => ({
  language: "javascript",
  theme: "vs-dark",
  fontSize: 16,
  editor: null,
  output: "",
  error: null,
  isRunning: false,
  executionResult: null,

  setLanguage: (language) => {
    set({ language, output: "", error: null });
  },

  setTheme: (theme) => set({ theme }),

  setFontSize: (fontSize) => set({ fontSize }),

  setEditor: (editor) => set({ editor }),

  getCode: () => {
    const { editor } = get();
    return editor?.getValue() || "";
  },

  runCode: async () => {
    const { language, getCode } = get();
    const code = getCode();

    if (!code) {
      set({ error: "Please enter some code" });
      return;
    }

    set({ isRunning: true, error: null, output: "" });

    try {
      const runtime = LANGUAGE_CONFIG[language].pistonRuntime;

      const response = await fetch("https://emacs.piston.rs/api/v2/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: runtime.language,
          version: runtime.version,
          files: [
            {
              content: code,
            },
          ],
        }),
      });

      const data = await response.json();

      // 1. Handle API-level errors (e.g., invalid language, rate limits)
      if (data.message) {
        set({
          error: data.message,
          executionResult: { code, output: "", error: data.message },
        });
        return;
      }

      // 2. Handle Compilation Errors (C++, Java, Go, Rust)
      if (data.compile && data.compile.code !== 0) {
        const compileError = data.compile.stderr || data.compile.output;
        set({
          error: compileError,
          executionResult: { code, output: "", error: compileError },
        });
        return;
      }

      // 3. Handle Runtime Errors (JavaScript, Python)
      if (data.run && data.run.code !== 0) {
        const runError = data.run.stderr || data.run.output;
        set({
          error: runError,
          executionResult: { code, output: "", error: runError },
        });
        return;
      }

      // 4. Handle Successful Execution
      const output = data.run.output;

      set({
        output: output.trim(),
        error: null,
        executionResult: {
          code,
          output: output.trim(),
          error: null,
        },
      });
    } catch (error: any) {
      console.error("Piston API Error:", error);
      set({
        error:
          "Error running code. The execution server might be temporarily unavailable. Please try again later.",
        executionResult: {
          code,
          output: "",
          error: "Error running code",
        },
      });
    } finally {
      set({ isRunning: false });
    }
  },
}));

// External helper to get the execution result directly (used in RunButton.tsx)
export const getExecutionResult = () => {
  return useCodeEditorStore.getState().executionResult;
};