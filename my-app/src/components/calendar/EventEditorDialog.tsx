"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { Dialog } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { RecurrencePicker } from "@/src/components/scheduling/RecurrencePicker";
import { Select } from "@/src/components/ui/select";
import {
  recurrenceFromModel,
  recurrenceToModel,
  type RecurrenceValue,
} from "@/src/lib/recurrence/types";
import { Textarea } from "@/src/components/ui/textarea";
import { useToast } from "@/src/components/ui/toast";
import type { EventDTO, LinkOption } from "@/src/components/calendar/types";
import {
  useCreateEventMutation,
  useDeleteEventMutation,
  useUpdateEventMutation,
} from "@/src/store/scheduleApi";

export interface EventPreset {
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
}

interface EventEditorDialogProps {
  wid: string;
  open: boolean;
  onClose: () => void;
  /** Edit target; null = create mode. Parent keys by id for fresh state. */
  event: EventDTO | null;
  preset?: EventPreset;
  projects: LinkOption[];
}

/** Create/edit dialog. Remount via key on event/preset change. */
export function EventEditorDialog({ wid, open, onClose, event, preset, projects }: EventEditorDialogProps) {
  const { toast } = useToast();
  const [createEvent, { isLoading: creating }] = useCreateEventMutation();
  const [updateEvent, { isLoading: saving }] = useUpdateEventMutation();
  const [deleteEvent] = useDeleteEventMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const initialStart = event ? new Date(event.startsAt) : (preset?.startsAt ?? new Date());
  const fallbackEnd = new Date(initialStart.getTime() + 3600000);
  const initialEnd = event ? new Date(event.endsAt) : (preset?.endsAt ?? fallbackEnd);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startsAt, setStartsAt] = useState<Date | null>(initialStart);
  const [endsAt, setEndsAt] = useState<Date | null>(initialEnd);
  const [allDay, setAllDay] = useState(event?.allDay ?? preset?.allDay ?? false);
  const [recurrence, setRecurrence] = useState<RecurrenceValue>(() =>
    recurrenceFromModel({
      recurrence: event?.recurrence,
      recurrenceInterval: event?.recurrenceInterval,
      recurrenceWeekdays: event?.recurrenceWeekdays,
      recurrenceUntil: event?.recurrenceUntil,
    }),
  );
  const [location, setLocation] = useState(event?.location ?? "");
  const [projectId, setProjectId] = useState(event?.projectId ?? "");
  const [reminder, setReminder] = useState("none");

  async function onSave() {
    if (!title.trim() || !startsAt || !endsAt) {
      toast("Title, start, and end are required.", { tone: "warning" });
      return;
    }
    const model = recurrenceToModel(recurrence, startsAt);
    try {
      if (event) {
        await updateEvent({
          wid,
          id: event.id,
          body: {
            title: title.trim(),
            description: description.trim() || undefined,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            allDay,
            ...model,
            location: location.trim() || undefined,
            projectId: projectId || null,
          },
        }).unwrap();
      } else {
        await createEvent({
          wid,
          body: {
            title: title.trim(),
            description: description.trim() || undefined,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            allDay,
            ...model,
            location: location.trim() || undefined,
            projectId: projectId || undefined,
            reminderMinutesBefore: reminder === "none" ? undefined : Number(reminder),
          },
        }).unwrap();
      }
      onClose();
    } catch {
      toast("Could not save the event.", { tone: "danger" });
    }
  }

  async function onDelete() {
    if (!event) return;
    setConfirmDelete(false);
    try {
      await deleteEvent({ wid, id: event.id }).unwrap();
      onClose();
    } catch {
      toast("Could not delete the event.", { tone: "danger" });
    }
  }

  return (
    <>
      <Dialog
        open={open && !confirmDelete}
        onClose={onClose}
        title={event ? "Edit event" : "New event"}
        description={
          event && event.recurrence !== "none"
            ? "This event repeats — edits apply to the whole series."
            : undefined
        }
        footer={
          <>
            {event ? (
              <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            ) : null}
            <span className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void onSave()} disabled={creating || saving}>
              {creating || saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Input id="event-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
          <Textarea id="event-description" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <span className="grid gap-3 sm:grid-cols-2">
            <DateTimePicker
              label="Starts"
              value={startsAt}
              withTime={!allDay}
              onChange={(next) => next && setStartsAt(next)}
            />
            <DateTimePicker
              label="Ends"
              value={endsAt}
              withTime={!allDay}
              minDate={startsAt ?? undefined}
              onChange={(next) => next && setEndsAt(next)}
            />
          </span>
          <Checkbox
            id="event-allday"
            label="All-day event"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          <span className="grid gap-3 sm:grid-cols-2">
            <RecurrencePicker
              label="Repeats"
              value={recurrence}
              allowCustom
              onChange={setRecurrence}
            />
            <Select id="event-project" label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
          </span>
          <Input id="event-location" label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where?" />
          {!event ? (
            <Select id="event-reminder" label="Reminder" value={reminder} onChange={(e) => setReminder(e.target.value)}>
              <option value="none">No reminder</option>
              <option value="15">15 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="1440">1 day before</option>
            </Select>
          ) : null}
        </div>
      </Dialog>
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete event?"
        description={`"${event?.title}" will be permanently deleted.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void onDelete()}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-zinc-500">Linked reminders stay in place.</p>
      </Dialog>
    </>
  );
}
