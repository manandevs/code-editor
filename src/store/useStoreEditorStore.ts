import { CodeEditorState } from "@/types";
import { create } from "zustand";
import { Monaco } from "@monaco-editor/react";
import { LANGUAGE_CONFIG } from "@/app/(root)/_constants";

const getInitialState = () => {
  if (typeof window === "undefined") {
    return {
      language: "javascript",
      fontSize: 14,
      theme: "vs-dark",
    };
  }

  const savedLanguage = localStorage.getItem("editor-language") || "javascript";
  const savedTheme = localStorage.getItem("editor-theme") || "vs-dark";
  const savedFontSize = localStorage.getItem("editor-font-size") || "16";

  return {
    language: savedLanguage,
    theme: savedTheme,
    fontSize: Number(savedFontSize),
  };
};

export const useCodeEditorStore = create<CodeEditorState>((set, get) => {
  const initialState = getInitialState();

  return {
    ...initialState,
    output: null,
    isRunning: false,
    error: null,
    editor: null,
    executionResult: null,

    getCode: () => get().editor?.getValue() || "",

    setEditor: (editor: Monaco) => {
      if (typeof window !== "undefined") {
        const savedCode = localStorage.getItem(`editor-code-${get().language}`);
        if (savedCode) editor?.setValue(savedCode);
      }
      set({ editor });
    },

    setTheme: (theme: string) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("editor-theme", theme);
      }
      set({ theme });
    },

    setFontSize: (fontSize: number) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("editor-font-size", fontSize.toString());
      }
      set({ fontSize });
    },

    setLanguage: (language: string) => {
      if (typeof window !== "undefined") {
        const currentCode = get().editor?.getValue();
        if (currentCode) {
          localStorage.setItem(`editor-code-${get().language}`, currentCode);
        }
        localStorage.setItem("editor-language", language);
      }

      set({
        language,
        output: "",
        error: null,
      });
    },

    runCode: async () => {
      const { language, getCode } = get();
      const code = getCode();

      if (!code.trim()) {
        set({ error: "Please enter some code for execution." });
        return;
      }

      set({ isRunning: true, error: null, output: "" });

      try {
        const config = LANGUAGE_CONFIG[language];
        if (!config) throw new Error("Unsupported language selected.");

        const runtime = config.pistonRuntime;

        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            language: runtime.language,
            version: runtime.version,
            files: [{ content: code }],
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log("data back from piston:", data);

        if (data.message) {
          set({
            error: data.message,
            executionResult: { code, output: "", error: data.message },
          });
          return;
        }

        if (data.compile && data.compile.code !== 0) {
          const error = data.compile.stderr || data.compile.output;
          set({
            error,
            executionResult: { code, output: "", error },
          });
          return;
        }

        if (data.run && data.run.code !== 0) {
          const error = data.run.stderr || data.run.output;
          set({
            error,
            executionResult: { code, output: "", error },
          });
          return;
        }

        const output = data.run.output || "";
        set({
          output: output.trim(),
          error: null,
          executionResult: { code, output: output.trim(), error: null },
        });

      } catch (error) {
        console.error("Error running code:", error);
        set({
          error: "Error running code.",
          executionResult: { code, output: "", error: "Error running code." },
        });
      } finally {
        set({ isRunning: false });
      }
    },
  };
});

export const getExecutionResult = () => useCodeEditorStore.getState().executionResult;
