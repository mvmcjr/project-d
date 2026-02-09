"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight } from "lucide-react";

interface CompareDialogProps {
    channels: string[];
    onEnableCompare: (rpmKey: string, pedalKey: string) => void;
    isCompareMode: boolean;
    onDisableCompare: () => void;
}

export function CompareDialog({ channels, onEnableCompare, isCompareMode, onDisableCompare }: CompareDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [rpmChannel, setRpmChannel] = React.useState<string>("");
    const [pedalChannel, setPedalChannel] = React.useState<string>("");

    // Auto-detect channels
    React.useEffect(() => {
        if (open) {
            const rpm = channels.find(c => /rpm|engine speed/i.test(c));
            const pedal = channels.find(c => /pedal|accel/i.test(c));

            if (rpm) setRpmChannel(rpm);
            if (pedal) setPedalChannel(pedal);
        }
    }, [open, channels]);

    const handleEnable = () => {
        if (rpmChannel && pedalChannel) {
            onEnableCompare(rpmChannel, pedalChannel);
            setOpen(false);
        }
    };

    const handleDisable = () => {
        onDisableCompare();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={isCompareMode ? "secondary" : "outline"}
                    size="sm"
                    className="gap-2"
                >
                    <ArrowLeftRight className="h-4 w-4" />
                    {isCompareMode ? "Compare Active" : "Compare Logs"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Compare Mode</DialogTitle>
                    <DialogDescription>
                        Sync cursor and zoom with another open tab.
                        Select channels to align the pulls (starts when Pedal &gt; 95%).
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>RPM Channel (for alignment)</Label>
                        <Select value={rpmChannel} onValueChange={setRpmChannel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select RPM channel" />
                            </SelectTrigger>
                            <SelectContent>
                                {channels.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Accel. Pedal Channel (for pull detection)</Label>
                        <Select value={pedalChannel} onValueChange={setPedalChannel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Pedal channel" />
                            </SelectTrigger>
                            <SelectContent>
                                {channels.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {isCompareMode && (
                        <Button variant="destructive" onClick={handleDisable}>
                            Stop Compare
                        </Button>
                    )}
                    <Button onClick={handleEnable} disabled={!rpmChannel || !pedalChannel}>
                        {isCompareMode ? "Update Sync" : "Start Compare"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
