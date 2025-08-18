import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ManualAddBookForm } from '../forms/ManualAddBookForm';
import { Book } from '@/types/book';

interface ManualAddBookDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (book: Book) => void;
}

export function ManualAddBookDialog({ 
  isOpen, 
  onClose,
  onSave
}: ManualAddBookDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Book Manually</DialogTitle>
          <DialogDescription>
            Enter the details of the book you want to add to your library.
          </DialogDescription>
        </DialogHeader>
        
        <ManualAddBookForm onSave={onSave} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
