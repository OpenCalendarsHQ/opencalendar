"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RecurringEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEditThis: () => void;
  onEditAll: () => void;
  onDeleteThis: () => void;
  onDeleteAll: () => void;
  action: "edit" | "delete";
}

export function RecurringEventDialog({
  isOpen,
  onClose,
  onEditThis,
  onEditAll,
  onDeleteThis,
  onDeleteAll,
  action,
}: RecurringEventDialogProps) {
  const handleThisAction = action === "edit" ? onEditThis : onDeleteThis;
  const handleAllAction = action === "edit" ? onEditAll : onDeleteAll;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === "edit" ? "Herhalend evenement bewerken" : "Herhalend evenement verwijderen"}
          </DialogTitle>
          <DialogDescription>
            Dit is een herhalend evenement. Wil je alleen dit voorval of alle toekomstige voorvallen {action === "edit" ? "bewerken" : "verwijderen"}?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-4">
          <Button
            onClick={handleThisAction}
            variant="outline"
            className="w-full justify-start"
          >
            <span className="font-medium">Alleen dit evenement</span>
          </Button>

          <Button
            onClick={handleAllAction}
            variant="outline"
            className="w-full justify-start"
          >
            <span className="font-medium">Alle evenementen</span>
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full mt-2"
          >
            Annuleren
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
