import Image from "next/image";
import CopyButton from "./CopyButton";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const CodeBlock = ({ language, code }: { language: string; code: string }) => {
  const trimmedCode = code
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");

  return (
    <div className="my-4 bg-[#0a0a0f] rounded-lg overflow-hidden border border-[#ffffff0a]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#ffffff08]">
        <div className="flex items-center gap-2">
          <Image
            src={`/${language}.png`}
            alt={language}
            width={20}
            height={20}
            className="size-4 object-contain"
          />
          <span className="text-sm text-gray-400">{language || "plaintext"}</span>
        </div>
        <CopyButton code={trimmedCode} />
      </div>

      <div className="relative">
        <SyntaxHighlighter
          language={language || "plaintext"}
          style={atomDark}
          customStyle={{
            padding: "1rem",
            background: "transparent",
            margin: 0,
          }}
          showLineNumbers={true}
          wrapLines={true}
        >
          {trimmedCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;
