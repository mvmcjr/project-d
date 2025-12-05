"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
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
import { Gauge } from "lucide-react";
import { UNITS, detectUnit } from "@/lib/conversions";

interface VirtualDynoDialogProps {
    channels: string[];
    onCalculate: (rpmChannel: string, torqueChannel: string, powerUnit: string) => void;
}

export function VirtualDynoDialog({ channels, onCalculate }: VirtualDynoDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [rpmChannel, setRpmChannel] = React.useState<string>("");
    const [torqueChannel, setTorqueChannel] = React.useState<string>("");
    const [powerUnit, setPowerUnit] = React.useState<string>("hp");

    // Filter available channels
    const rpmOptions = React.useMemo(() =>
        channels.filter(c => {
            const info = detectUnit(c);
            return info?.type === 'rpm' || info?.type === 'speed';
        }),
        [channels]);

    const torqueOptions = React.useMemo(() =>
        channels.filter(c => {
            const info = detectUnit(c);
            return info?.type === 'torque';
        }),
        [channels]);

    // Auto-select smart defaults if found
    React.useEffect(() => {
        if (open) {
            const rpm = rpmOptions[0]; // First valid RPM option
            const torque = torqueOptions[0]; // First valid Torque option

            if (rpm) setRpmChannel(rpm);
            if (torque) setTorqueChannel(torque);
        }
    }, [open, rpmOptions, torqueOptions]);

    const handleCalculate = () => {
        if (rpmChannel && torqueChannel && powerUnit) {
            onCalculate(rpmChannel, torqueChannel, powerUnit);
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Gauge className="h-4 w-4" />
                    Virtual Dyno
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Virtual Dyno Configuration</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>RPM Source</Label>
                        <Select value={rpmChannel} onValueChange={setRpmChannel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select RPM channel" />
                            </SelectTrigger>
                            <SelectContent>
                                {rpmOptions.length > 0 ? rpmOptions.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                )) : <SelectItem value="none" disabled>No RPM/Speed channels found</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Torque Source</Label>
                        <Select value={torqueChannel} onValueChange={setTorqueChannel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Torque channel" />
                            </SelectTrigger>
                            <SelectContent>
                                {torqueOptions.length > 0 ? torqueOptions.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                )) : <SelectItem value="none" disabled>No Torque channels found</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Output Power Unit</Label>
                        <Select value={powerUnit} onValueChange={setPowerUnit}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select output unit" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(UNITS.power).map((u) => (
                                    <SelectItem key={u.label} value={u.label}>
                                        {u.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCalculate} disabled={!rpmChannel || !torqueChannel}>
                        Calculate Power
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
