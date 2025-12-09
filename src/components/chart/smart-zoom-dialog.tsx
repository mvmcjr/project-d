"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScanSearch } from "lucide-react";

export interface SmartZoomCriteria {
    field: string;
    operator: '>' | '<' | '=';
    value: number;
}

interface SmartZoomDialogProps {
    fields: string[];
    onZoom: (criteria: SmartZoomCriteria) => void;
}

export function SmartZoomDialog({ fields, onZoom }: SmartZoomDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [field, setField] = React.useState<string>(fields[0] || "");
    const [operator, setOperator] = React.useState<SmartZoomCriteria['operator']>('>');
    const [value, setValue] = React.useState<string>("100");

    // Pre-select useful fields if available
    React.useEffect(() => {
        if (!field && fields.length > 0) {
            const pedal = fields.find(f => f.toLowerCase().includes("accel") || f.toLowerCase().includes("pedal"));
            if (pedal) setField(pedal);
            else setField(fields[0]);
        }
    }, [fields, field]);

    const handleZoom = () => {
        const numVal = parseFloat(value);
        if (!field || isNaN(numVal)) return;

        onZoom({
            field,
            operator,
            value: numVal
        });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" title="Smart Zoom based on rules">
                    <ScanSearch className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Smart Zoom</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Channel</Label>
                        <Select value={field} onValueChange={setField}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select channel" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {fields.map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Operator</Label>
                            <Select value={operator} onValueChange={(v) => setOperator(v as '>' | '<' | '=')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value=">">Greater than (&gt;)</SelectItem>
                                    <SelectItem value="<">Less than (&lt;)</SelectItem>
                                    <SelectItem value="=">Equals (=)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Value</Label>
                            <Input
                                type="number"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleZoom}>Zoom to matching segment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
