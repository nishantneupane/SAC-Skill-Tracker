import { useState } from "react";

export default function ImportRoster() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file.type !== "text/csv") {
      alert("Only CSV files allowed");
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    // await fetch("/api/import-roster", {
    //   method: "POST",
    //   body: formData,
    // });

    setSelectedFile(null);
  };

  return (
    <div className="p-4 sm:p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg sm:rounded-xl p-6 sm:p-10 flex flex-col items-center text-center mb-4 sm:mb-6 transition ${
          isDragging ? "border-black bg-gray-50" : "border-gray-200"
        }`}
      >
        <svg
          className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mb-2 sm:mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <ellipse cx="12" cy="12" rx="9" ry="4" strokeWidth={1.5} />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 12c0 2.21 4.03 4 9 4s9-1.79 9-4M3 16c0 2.21 4.03 4 9 4s9-1.79 9-4"
          />
        </svg>
        <p className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
          Import Roster Data
        </p>

        <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-5">
          Import swimmer roster, levels, and class assignments from SportsEngine
        </p>

        {/* Hidden file input */}
        <input
          type="file"
          accept=".csv"
          className="hidden"
          id="csvUpload"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <div className="flex gap-3">
          <label
            htmlFor="csvUpload"
            className="cursor-pointer flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Upload CSV
          </label>

          <button
            onClick={handleUpload}
            disabled={!selectedFile}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
              selectedFile
                ? "bg-black text-white hover:opacity-90"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Import
          </button>
        </div>

        {selectedFile && (
          <p className="mt-3 text-xs text-gray-500">
            Selected: {selectedFile.name}
          </p>
        )}
      </div>
      <div>
        <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">
          Supported Import Options:
        </p>
        <ul className="text-xs sm:text-sm text-gray-500 space-y-1">
          <li>• Bulk roster updates from SportsEngine API</li>
          <li>• CSV file upload for manual imports</li>
          <li>• Level and class assignment synchronization</li>
          <li>• Parent contact information updates</li>
        </ul>
      </div>
    </div>
  );
}
