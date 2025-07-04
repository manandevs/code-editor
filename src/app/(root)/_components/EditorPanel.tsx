"use client";

import React, { useEffect, useState } from "react";
import { Editor } from "@monaco-editor/react";
import Image from "next/image";
import { motion } from "framer-motion";
import { RotateCcwIcon, ShareIcon, TypeIcon } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

import { useCodeEditorStore } from "@/store/useStoreEditorStore";
import { defineMonacoThemes, LANGUAGE_CONFIG } from "../_constants";
import useMounted from "@/hooks/useMounted";
import { EditorPanelSkeleton } from "./EditorPanelSkeleton";
import ShareSnippetDilog from "./ShareSnippetDilog";

import type { editor as MonacoEditor } from "monaco-editor";

function EditorPanel() {
  const mounted = useMounted();
  const { language, theme, fontSize, editor, setFontSize, setEditor } =
    useCodeEditorStore();

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const clerk = useClerk();

  // Load saved code or default code on language change
  useEffect(() => {
    const savedCode = localStorage.getItem(`editor-code-${language}`);
    const fallbackCode = LANGUAGE_CONFIG[language].defaultCode;
    if (editor) {
      editor.setValue(savedCode || fallbackCode);
    }
  }, [language, editor]);

  // Load saved font size
  useEffect(() => {
    const savedFontSize = localStorage.getItem("editor-font-size");
    if (savedFontSize) {
      setFontSize(parseInt(savedFontSize, 10));
    }
  }, [setFontSize]);

  const handleEditorChange = (value?: string) => {
    if (value !== undefined) {
      localStorage.setItem(`editor-code-${language}`, value);
    }
  };

  const handleRefresh = () => {
    const defaultCode = LANGUAGE_CONFIG[language].defaultCode;
    if (editor) {
      editor.setValue(defaultCode);
    }
    localStorage.removeItem(`editor-code-${language}`);
  };

  const handleFontSizeChange = (size: number) => {
    const newSize = Math.min(Math.max(size, 12), 24);
    setFontSize(newSize);
    localStorage.setItem("editor-font-size", newSize.toString());
  };

  const handleEditorMount = (editorInstance: MonacoEditor.IStandaloneCodeEditor) => {
    setEditor(editorInstance);
  };

  if (!mounted) return null;

  return (
    <div className="relative">
      <div className="relative bg-[#12121a]/90 backdrop-blur rounded-xl border border-white/[0.05] p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {/* Left: Language Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-[#1e1e2e] ring-1 ring-white/5 rounded-lg">
              <Image src={`/${language}.png`} alt={`${language} logo`} width={24} height={24} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-white">Code Editor</h2>
              <p className="text-xs text-gray-500">Write and execute your code</p>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* Font Size Slider */}
            <div className="flex items-center gap-3 px-3 py-2 bg-[#1e1e2e] rounded-lg ring-1 ring-white/5">
              <TypeIcon className="size-4 text-gray-400" />
              <input
                type="range"
                min="12"
                max="24"
                value={fontSize}
                onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
                className="w-20 h-1 bg-gray-600 rounded-lg cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-400 min-w-[2rem] text-center">
                {fontSize}
              </span>
            </div>

            {/* Reset Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              aria-label="Reset code"
              className="p-2 bg-[#1e1e2e] hover:bg-[#2a2a3a] rounded-lg ring-1 ring-white/5 transition-colors"
            >
              <RotateCcwIcon className="size-4 text-gray-400" />
            </motion.button>

            {/* Share Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsShareDialogOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg overflow-hidden bg-gradient-to-r
                         from-blue-500 to-blue-600 opacity-90 hover:opacity-100 transition-opacity"
            >
              <ShareIcon className="size-4 text-white" />
              <span className="text-sm font-medium text-white">Share</span>
            </motion.button>
          </div>
        </div>

        {/* Editor */}
        <div className="relative group rounded-xl overflow-hidden ring-1 ring-white/[0.05]">
          {clerk.loaded ? (
            <Editor
              height="600px"
              language={LANGUAGE_CONFIG[language].monacoLanguage}
              theme={theme}
              beforeMount={defineMonacoThemes}
              onMount={handleEditorMount}
              onChange={handleEditorChange}
              options={{
                fontSize,
                fontFamily: "Fira Code",
                fontLigatures: true,
                automaticLayout: true,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                padding: { top: 10, bottom: 20 },
                renderWhitespace: "selection",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                contextmenu: true,
                renderLineHighlight: "all",
                lineHeight: 1.6,
                letterSpacing: 0.75,
                roundedSelection: true,
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
              }}
            />
          ) : (
            <EditorPanelSkeleton />
          )}
        </div>
      </div>

      {/* Share Dialog */}
      {isShareDialogOpen && (
        <ShareSnippetDilog onClose={() => setIsShareDialogOpen(false)} />
      )}
    </div>
  );
}

export default EditorPanel;
