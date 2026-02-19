"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REMINDER_TYPES } from "@/lib/constants/reminder-types";
import { createReminder, searchLeads } from "@/lib/actions/reminder-actions";
import type { ReminderType } from "@/lib/types/leads";

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LeadOption {
  id: string;
  parent_name: string;
  student_name: string | null;
  parent_phone: string;
}

export function CreateReminderDialog({
  open,
  onOpenChange,
}: CreateReminderDialogProps) {
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<LeadOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [type, setType] = useState<ReminderType>("follow_up");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSearch(term: string) {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const result = await searchLeads(term);
    setSearchResults(result.data);
    setSearching(false);
  }

  async function handleSubmit() {
    if (!selectedLead) {
      toast.error("Vui long chon lead");
      return;
    }
    if (!date) {
      toast.error("Vui long chon ngay");
      return;
    }

    setSubmitting(true);
    const remindAt = new Date(`${date}T${time}`).toISOString();
    const result = await createReminder(selectedLead.id, remindAt, type, note);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Da tao nhac nho");
      onOpenChange(false);
      resetForm();
    }
    setSubmitting(false);
  }

  function resetForm() {
    setSelectedLead(null);
    setSearchTerm("");
    setSearchResults([]);
    setDate("");
    setTime("09:00");
    setType("follow_up");
    setNote("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tao nhac nho</DialogTitle>
          <DialogDescription>
            Tao nhac nho follow-up cho lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lead search */}
          <div className="space-y-2">
            <Label>Lead</Label>
            {selectedLead ? (
              <div className="flex items-center justify-between p-2 border rounded-md">
                <span className="text-sm">
                  {selectedLead.student_name || selectedLead.parent_name} -{" "}
                  {selectedLead.parent_phone}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLead(null)}
                >
                  Doi
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tim kiem lead..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {searching && (
                  <p className="text-sm text-muted-foreground">Dang tim...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {searchResults.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => {
                          setSelectedLead(lead);
                          setSearchResults([]);
                          setSearchTerm("");
                        }}
                      >
                        <span className="font-medium">
                          {lead.student_name || lead.parent_name}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {lead.parent_phone}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Ngay</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Gio</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Loai nhac nho</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as ReminderType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REMINDER_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>Ghi chu</Label>
            <Textarea
              placeholder="Noi dung ghi chu..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Huy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Dang tao..." : "Tao nhac nho"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
