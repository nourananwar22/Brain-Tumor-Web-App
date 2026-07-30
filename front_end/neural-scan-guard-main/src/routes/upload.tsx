import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  FileImage,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import type { Diagnosis } from "@/lib/mock-data";
import { diagnosisTone } from "@/lib/mock-data";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
});

type Stage = "idle" | "uploading" | "analyzing" | "done";

interface Result {
  prediction: "Tumor Detected" | "Healthy";
  type: Diagnosis;
  confidence: number;
  location?: string;
  size?: string;
}

const stages = [
  "Preprocessing MRI volume",
  "Running CNN inference",
  "Segmenting regions of interest",
  "Generating confidence map",
];

function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);
 const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

 const analyze = async () => {
  if (!file) return;

  setStage("uploading");
  setStep(0);

  setStage("analyzing");

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to analyze image");
    }

    const data = await response.json();

    console.log("API Response:", data);


    setStep(0);
    await delay(800);

    setStep(1);
    await delay(800);

    setStep(2);
    await delay(800);

    setStep(3);
    await delay(800);

// بعد ما يخلص الأنيميشن اعرض النتيجة
setResult({
  prediction: data.is_tumor ? "Tumor Detected" : "Healthy",
  type: data.display_name,
  confidence: data.confidence_pct ?? data.confidence * 100,
  location: data.location || "",
  size: data.size || "",
});

setStep(stages.length);
setStage("done");

toast.success("Analysis complete", {
  description: `${data.display_name} · ${(
    data.confidence_pct ?? data.confidence * 100
  ).toFixed(1)}% confidence`,
});
   toast.success("Analysis complete", {
   description: `${data.display_name} · ${data.confidence.toFixed(1)}% confidence`,
   });

  } catch (error) {
    console.error(error);

    toast.error("Analysis failed", {
      description: "Could not connect to the AI server.",
    });

    setStage("idle");
  }
};

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setStage("idle");
    setStep(0);
  };

  const processing = stage === "uploading" || stage === "analyzing";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="New Analysis"
        title="MRI Upload & AI Analysis"
        description="Upload a brain MRI scan in DICOM, PNG, or JPG format. Our clinical-grade AI will analyze it for tumor presence and classification."
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Uploader */}
        <div className="lg:col-span-3 space-y-6">
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => inputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed p-12 md:p-16 text-center cursor-pointer transition-all ${
                dragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".dcm,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div className="grid h-16 w-16 mx-auto place-items-center rounded-2xl gradient-primary shadow-elegant mb-5">
                <UploadCloud className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold">Drop MRI scan here</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                or click to browse — supports DICOM (.dcm), PNG, JPG · max 50MB
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {["DICOM", "T1", "T2", "FLAIR"].map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-4 mb-6">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileImage className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB · {file.type || "DICOM"}
                  </p>
                </div>
                {!processing && (
                  <button
                    onClick={reset}
                    className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="aspect-square max-h-[420px] w-full rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 overflow-hidden relative grid place-items-center">
                {preview ? (
                  <img src={preview} alt="MRI preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center text-slate-300">
                    <Brain className="h-20 w-20 mx-auto opacity-60" />
                    <p className="mt-3 text-sm">DICOM Preview</p>
                  </div>
                )}
                {processing && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm grid place-items-center">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                      <Brain className="h-8 w-8 absolute inset-0 m-auto text-primary" />
                    </div>
                  </div>
                )}
                {result && (
                  <div className="absolute top-3 left-3 right-3 flex justify-between">
                    <span className="text-[10px] font-mono text-slate-200 bg-slate-900/70 px-2 py-1 rounded">
                      SEQ · T1w
                    </span>
                    <span className="text-[10px] font-mono text-slate-200 bg-slate-900/70 px-2 py-1 rounded">
                      ANALYZED · v3.2
                    </span>
                  </div>
                )}
              </div>

              {!processing && !result && (
                <button
                  onClick={analyze}
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 transition"
                >
                  <Sparkles className="h-4 w-4" />
                  Run AI Analysis
                </button>
              )}
              {result && (
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={reset}
                    className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    New scan
                  </button>
                  <button
                    onClick={() => navigate({ to: "/patients" })}
                    className="flex-1 rounded-lg gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant"
                  >
                    View records
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results panel */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card sticky top-6">
            <h3 className="font-display text-lg font-semibold mb-1">Analysis Result</h3>
            <p className="text-xs text-muted-foreground mb-6">
              {stage === "idle" && "Awaiting scan upload"}
              {processing && "AI model is processing..."}
              {stage === "done" && "Analysis complete"}
            </p>

            {stage === "idle" && (
              <div className="py-12 text-center border border-dashed border-border rounded-xl">
                <Brain className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Results will appear here</p>
              </div>
            )}

            {processing && (
              <div className="space-y-3">
                {stages.map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div className={`h-6 w-6 rounded-full grid place-items-center shrink-0 ${
                        done ? "bg-success text-success-foreground" :
                        active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                         active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                         <span className="text-[10px]">{i + 1}</span>}
                      </div>
                      <span className={`text-sm ${active ? "text-foreground font-medium" : done ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <div className={`rounded-xl border p-4 ${diagnosisTone(result.type)}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Prediction</p>
                  <p className="text-2xl font-bold mt-1">{result.prediction}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground">Tumor Type</p>
                    <p className="text-lg font-semibold mt-1">{result.type}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="text-lg font-semibold mt-1">{result.confidence.toFixed(1)}%</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Confidence Score</span>
                    <span className="font-mono">{result.confidence.toFixed(2)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full gradient-primary transition-all duration-1000"
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>

                {result.location && (
                  <div className="pt-4 border-t border-border space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location</span>
                      <span className="font-medium">{result.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated size</span>
                      <span className="font-medium">{result.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-medium font-mono text-xs">NeuroNet v3.2</span>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground leading-relaxed pt-2">
                  ⓘ AI-assisted diagnosis. Requires review by a qualified radiologist before clinical decisions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
