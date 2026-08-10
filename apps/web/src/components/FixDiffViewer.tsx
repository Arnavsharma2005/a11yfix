import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";

interface FixDiffViewerProps {
  diff: string;
}

export default function FixDiffViewer({ diff }: FixDiffViewerProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
      <ReactDiffViewer
        oldValue=""
        newValue={diff}
        splitView={false}
        compareMethod={DiffMethod.WORDS}
        styles={{
          variables: {
            light: {
              diffViewerBackground: "#ffffff",
              addedBackground: "#ecfdf5",
              wordAddedBackground: "#bbf7d0",
              codeFoldBackground: "#f4f4f5"
            }
          },
          contentText: {
            fontFamily: '"IBM Plex Mono", SFMono-Regular, monospace',
            fontSize: "12px",
            lineHeight: "18px"
          }
        }}
      />
    </div>
  );
}
