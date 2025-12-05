"use client";

import * as React from "react";
import { Upload, AlertCircle, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ParsedData } from "@/lib/types";

interface FileUploadProps {
    onDataParsed: (data: ParsedData) => void;
}

export function FileUpload({ onDataParsed }: FileUploadProps) {
    const [isDragActive, setIsDragActive] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleFile = React.useCallback((file: File) => {
        if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
            setError("Please upload a valid CSV file.");
            toast.error("Invalid file type");
            return;
        }

        setError(null);
        setIsLoading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                setIsLoading(false);
                if (results.errors.length > 0) {
                    console.warn("CSV Parsing errors:", results.errors);
                    if (results.data.length === 0) {
                        setError("Failed to parse CSV. Check the format.");
                        toast.error("Parsing failed");
                        return;
                    }
                    toast.warning("CSV parsed with some warnings.");
                }

                const headers = results.meta.fields || [];
                const data = results.data as Record<string, any>[];

                if (headers.length === 0 || data.length === 0) {
                    setError("CSV file appears to be empty.");
                    toast.error("Empty CSV");
                    return;
                }

                onDataParsed({
                    fileName: file.name,
                    headers,
                    data,
                    meta: results.meta,
                });
                toast.success("File uploaded successfully");
            },
            error: (err) => {
                setIsLoading(false);
                setError(err.message);
                toast.error("Error parsing file");
            },
        });
    }, [onDataParsed]);

    const onDrop = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [handleFile]);

    const onDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragActive(true);
    }, []);

    const onDragLeave = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragActive(false);
    }, []);

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };

    return (
        <Card className={`relative overflow-hidden transition-all duration-200 border-2 border-dashed ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}>
            <CardContent className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-4">
                <div className={`p-4 rounded-full transition-colors ${isDragActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {isLoading ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                        <Upload className="w-8 h-8" />
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className="font-semibold text-lg tracking-tight">
                        {isLoading ? "Parsing CSV..." : "Upload Datalog"}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Drag and drop your CSV file here, or click to browse.
                    </p>
                </div>

                {error && (
                    <Alert variant="destructive" className="mt-4 text-left">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <input
                    type="file"
                    accept=".csv,text/csv"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    onChange={onInputChange}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    disabled={isLoading}
                />
            </CardContent>
        </Card>
    );
}
