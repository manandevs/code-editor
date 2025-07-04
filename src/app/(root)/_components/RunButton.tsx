"use client";
import { getExecutionResult, useCodeEditorStore } from "@/store/useStoreEditorStore";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import React from "react";
import { Loader2, Play } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function RunButton() {
  const user = useUser();
  const { runCode, language, isRunning } =
    useCodeEditorStore();
  const saveExecution = useMutation(api.codeExccution.saveExecution);

  const handleRun = async () => {
    await runCode();

    const result = getExecutionResult()

    if (
      user &&
      result &&
      (result.output || result.error)
    ) {
      try {
        await saveExecution({
          language,
          code: result.code || "", // Ensure code is never undefined
          output: result.output || undefined,
          error: result.error || undefined,
        });
      } catch (error) {
        console.error("Save execution failed:", error);
      }
    }
  };
  return (
    <motion.button
      onClick={handleRun}
      disabled={isRunning}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        group relative inline-flex items-center gap-2.5 px-5 py-2.5
        disabled:cursor-not-allowed
        focus:outline-none
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl opacity-100 transition-opacity group-hover:opacity-90" />

      <div className="relative flex items-center gap-2.5">
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white/70" />
            <span className="text-sm font-medium text-white/90">
              Executing...
            </span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 text-white/90 transition-transform group-hover:scale-110 group-hover:text-white" />
            <span className="text-sm font-medium text-white/90 group-hover:text-white">
              Run Code
            </span>
          </>
        )}
      </div>
    </motion.button>
  );
}