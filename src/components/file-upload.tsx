"use client";

import * as React from "react";
import { Upload, AlertCircle, Loader2, Link } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ParsedData } from "@/lib/types";

interface FileUploadProps {
    onDataParsed: (data: ParsedData) => void;
}

export function FileUpload({ onDataParsed }: FileUploadProps) {
    const [isDragActive, setIsDragActive] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [importUrl, setImportUrl] = React.useState("");

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

    const handleUrlImport = async () => {
        if (!importUrl.trim()) return;

        if (!importUrl.includes("bootmod3.net")) {
            setError("Only bootmod3.net URLs are supported");
            toast.error("Invalid URL domain");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/proxy?url=${encodeURIComponent(importUrl)}`);
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || `Failed to fetch: ${response.statusText}`);
            }

            const csvText = await response.text();

            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results) => {
                    setIsLoading(false);
                    if (results.errors.length > 0) {
                        console.warn("CSV Parsing errors:", results.errors);
                        if (results.data.length === 0) {
                            setError("Failed to parse CSV from URL. Check the format.");
                            toast.error("Parsing failed");
                            return;
                        }
                        toast.warning("CSV parsed with some warnings.");
                    }

                    const headers = results.meta.fields || [];
                    const data = results.data as Record<string, any>[];

                    if (headers.length === 0 || data.length === 0) {
                        setError("CSV file from URL appears to be empty.");
                        toast.error("Empty CSV");
                        return;
                    }

                    onDataParsed({
                        fileName: "Bootmod3 Log",
                        headers,
                        data,
                        meta: results.meta,
                    });
                    toast.success("Log imported successfully");
                },
                error: (err: Error) => {
                    setIsLoading(false);
                    setError(err.message);
                    toast.error("Error parsing content");
                },
            });
        } catch (err) {
            setIsLoading(false);
            setError(err instanceof Error ? err.message : "Failed to import from URL");
            toast.error("Import failed");
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
                        {isLoading ? "Processing..." : "Upload Datalog"}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Drag and drop your CSV file here, or click to browse.
                    </p>
                </div>

                <div className="w-full max-w-xs flex items-center gap-2 my-2">
                    <div className="h-px bg-border flex-1" />
                    <span className="text-xs text-muted-foreground font-medium uppercase">Or import via URL</span>
                    <div className="h-px bg-border flex-1" />
                </div>

                <div className="flex w-full max-w-sm items-center space-x-2 z-10">
                    <Input
                        type="url"
                        placeholder="Paste Bootmod3 Log URL"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        disabled={isLoading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUrlImport();
                        }}
                    />
                    <Button type="button" size="icon" onClick={handleUrlImport} disabled={isLoading || !importUrl}>
                        <Link className="h-4 w-4" />
                    </Button>
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
